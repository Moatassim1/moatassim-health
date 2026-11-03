# Read-only health check of the App Store submission: everything that can hold up App Review.
# Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, SUPA_URL, SUPA_KEY (to test the demo login; the password is never printed)
import os, time, json, jwt, requests
API = 'https://api.appstoreconnect.apple.com'
now = int(time.time())
TOK = jwt.encode({'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'}, os.environ['ASC_KEY_P8'], algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'})
OUT = []
def say(ok, m): OUT.append(('OK  ' if ok is True else 'WARN' if ok is None else 'FAIL') + ' ' + m)
def get(p):
    r = requests.get(API + p, headers={'Authorization': 'Bearer ' + TOK}, timeout=60)
    if r.status_code >= 300: raise RuntimeError(f'{p} -> {r.status_code}: {r.text[:300]}')
    return r.json()
def tryget(p):
    try: return get(p)
    except Exception as e: say(None, 'could not read ' + p.split('?')[0] + ': ' + str(e)[:160]); return None
APP = get('/v1/apps?filter[bundleId]=com.gggains.app')['data'][0]['id']
ver = get(f'/v1/apps/{APP}/appStoreVersions?filter[platform]=IOS&limit=3')['data'][0]
va = ver['attributes']; VER = ver['id']
say(va['appStoreState'] in ('WAITING_FOR_REVIEW', 'IN_REVIEW'), f"version {va['versionString']} state {va['appStoreState']} · release {va.get('releaseType')} · copyright {'set' if va.get('copyright') else 'MISSING'}")
subs = get(f'/v1/reviewSubmissions?filter[app]={APP}&filter[platform]=IOS&limit=10')['data']
say(True, 'submissions: ' + ', '.join(f"{s['attributes'].get('state')}@{(s['attributes'].get('submittedDate') or '')[:16]}" for s in subs))
# build
b = tryget(f'/v1/appStoreVersions/{VER}/build')
if b and b.get('data'):
    ba = b['data']['attributes']
    say(ba.get('processingState') == 'VALID', f"build {ba.get('version')} processing {ba.get('processingState')} · expired {ba.get('expired')} · min iOS {ba.get('minOsVersion')}")
    say(ba.get('usesNonExemptEncryption') is False, f"export compliance (usesNonExemptEncryption) = {ba.get('usesNonExemptEncryption')}")
    bd = tryget(f"/v1/builds/{b['data']['id']}/buildBetaDetail")
else: say(False, 'no build attached')
# listing text + screenshots
for l in get(f'/v1/appStoreVersions/{VER}/appStoreVersionLocalizations')['data']:
    a = l['attributes']
    miss = [k for k in ('description', 'keywords', 'supportUrl') if not a.get(k)]
    say(not miss, f"listing {a['locale']}: description {len(a.get('description') or '')} chars, keywords {len(a.get('keywords') or '')} chars" + (f" · MISSING {miss}" if miss else ''))
    for s in get(f"/v1/appStoreVersionLocalizations/{l['id']}/appScreenshotSets")['data']:
        shots = get(f"/v1/appScreenshotSets/{s['id']}/appScreenshots")['data']
        states = [x['attributes'].get('assetDeliveryState', {}).get('state') for x in shots]
        say(all(st == 'COMPLETE' for st in states) and len(shots) >= 1, f"screenshots {s['attributes']['screenshotDisplayType']}: {len(shots)} · states {sorted(set(states))}")
# review details + demo login test
rd = tryget(f'/v1/appStoreVersions/{VER}/appStoreReviewDetail')
if rd and rd.get('data'):
    a = rd['data']['attributes']
    say(bool(a.get('contactEmail') and a.get('contactPhone')), f"review contact: email {'set' if a.get('contactEmail') else 'MISSING'}, phone {'set' if a.get('contactPhone') else 'MISSING'}")
    need = a.get('demoAccountRequired')
    say(bool(a.get('demoAccountName') and a.get('demoAccountPassword')) or not need, f"demo account required={need}, name {'set' if a.get('demoAccountName') else 'MISSING'}, password {'set' if a.get('demoAccountPassword') else 'MISSING'}")
    say(True, 'review notes: ' + (a.get('notes') or '')[:60].replace('\n', ' ') + '…')
    if a.get('demoAccountName') and a.get('demoAccountPassword') and os.environ.get('SUPA_URL'):
        r = requests.post(os.environ['SUPA_URL'] + '/auth/v1/token?grant_type=password', headers={'apikey': os.environ['SUPA_KEY'], 'Content-Type': 'application/json'},
                          json={'email': a['demoAccountName'], 'password': a['demoAccountPassword']}, timeout=30)
        say(r.status_code == 200, f"demo account sign-in on the live server: HTTP {r.status_code}" + ('' if r.status_code == 200 else ' ' + r.text[:120]))
else: say(False, 'no App Review information')
# app info: age rating, categories, privacy URL
info = get(f'/v1/apps/{APP}/appInfos')['data']
for i in info:
    ia = i['attributes']
    say(True, f"appInfo state {ia.get('appStoreState') or ia.get('state')} · age rating {ia.get('appStoreAgeRating')}")
    for l in get(f"/v1/appInfos/{i['id']}/appInfoLocalizations")['data']:
        la = l['attributes']; say(bool(la.get('privacyPolicyUrl')), f"name '{la.get('name')}', subtitle '{la.get('subtitle')}', privacy URL {'set' if la.get('privacyPolicyUrl') else 'MISSING'}")
    ar = tryget(f"/v1/appInfos/{i['id']}/ageRatingDeclaration")
    if ar and ar.get('data'):
        nulls = [k for k, v in ar['data']['attributes'].items() if v is None]
        say(not nulls, 'age rating questions unanswered: ' + (', '.join(nulls) if nulls else 'none'))
# pricing, availability, agreements
pr = tryget(f'/v1/apps/{APP}/appPriceSchedule/manualPrices?include=appPricePoint&limit=5')
if pr: say(bool(pr.get('data')), f"price schedule entries: {len(pr.get('data') or [])}")
av = tryget(f'/v2/appAvailabilities/{APP}')
if av and av.get('data'): say(True, 'availability record present · new territories ' + str(av['data']['attributes'].get('availableInNewTerritories')))
# web pages Apple opens during review
for u in ('privacy.html', 'support.html', 'terms.html', ''):
    try: c = requests.get('https://moatassim1.github.io/moatassim-health/' + u, timeout=20).status_code
    except Exception as e: c = str(e)[:60]
    say(c == 200, f"page /{u or '(home)'} -> {c}")
txt = '\n'.join(OUT)
print(txt)
with open(os.environ.get('GITHUB_STEP_SUMMARY', '/dev/null'), 'a') as f: f.write('```\n' + txt + '\n```\n')
for i in range(0, len(txt), 3500): print('::notice::' + txt[i:i + 3500].replace('\n', ' || '))
