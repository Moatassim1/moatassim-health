# Fills the GG Gains App Store listing through the App Store Connect API.
# Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, BUILD (optional build number to attach)
import os, sys, time, json, hashlib, jwt, requests

API = 'https://api.appstoreconnect.apple.com'
BUNDLE = 'com.gggains.app'
SITE = 'https://moatassim1.github.io/moatassim-health/'

LOG = []
def note(m): LOG.append(m)
def warn(m): LOG.append('!! ' + m)
import atexit
def flush():
    txt = ' || '.join(LOG).replace('\n', ' ')
    for i in range(0, len(txt), 3500): print('::notice::' + txt[i:i + 3500])
atexit.register(flush)

def token():
    now = int(time.time())
    return jwt.encode({'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'},
                      os.environ['ASC_KEY_P8'], algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'})
TOK = token()
def call(method, path, body=None, ok=(200, 201, 204)):
    r = requests.request(method, API + path, headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'}, data=json.dumps(body) if body is not None else None, timeout=60)
    if r.status_code not in ok:
        raise RuntimeError(f'{method} {path} -> {r.status_code}: {r.text[:700]}')
    return r.json() if r.text else {}

ONLY = [x.strip() for x in os.environ.get('ONLY', '').split(',') if x.strip()]
def step(name, fn):
    if ONLY and not any(o in name for o in ONLY): return
    try:
        fn(); note('OK: ' + name)
    except Exception as e:
        warn('FAILED: ' + name + ' :: ' + str(e)[:1500])

DESC = open(os.path.join(os.path.dirname(__file__), 'store', 'description.txt'), encoding='utf-8').read().strip()
SUBTITLE = 'Track macros. Climb the ranks.'
PROMO = 'Log your food, hit your macros and earn Consistency Points every day. Climb a weekly ladder with your friends and turn daily progress photos into a transformation video.'
KEYWORDS = 'calorie,counter,macro,protein,tracker,diet,food,log,weight,loss,gym,streak,friends,leaderboard'

app = call('GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data'][0]
APP = app['id']
note('App id ' + APP)

def content_rights():
    call('PATCH', f'/v1/apps/{APP}', {'data': {'type': 'apps', 'id': APP, 'attributes': {'contentRightsDeclaration': 'USES_THIRD_PARTY_CONTENT'}}})
step('content rights', content_rights)

infos = call('GET', f'/v1/apps/{APP}/appInfos')['data']
info = next((i for i in infos if i['attributes'].get('appStoreState') in ('PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'WAITING_FOR_REVIEW') or i['attributes'].get('state') in ('PREPARE_FOR_SUBMISSION',)), infos[0])
INFO = info['id']

def categories():
    call('PATCH', f'/v1/appInfos/{INFO}', {'data': {'type': 'appInfos', 'id': INFO, 'relationships': {
        'primaryCategory': {'data': {'type': 'appCategories', 'id': 'HEALTH_AND_FITNESS'}},
        'secondaryCategory': {'data': {'type': 'appCategories', 'id': 'FOOD_AND_DRINK'}}}}})
step('categories', categories)

def info_locs():
    locs = call('GET', f'/v1/appInfos/{INFO}/appInfoLocalizations')['data']
    for l in locs:
        call('PATCH', f'/v1/appInfoLocalizations/{l["id"]}', {'data': {'type': 'appInfoLocalizations', 'id': l['id'], 'attributes': {
            'name': 'GG Gains', 'subtitle': SUBTITLE, 'privacyPolicyUrl': SITE + 'privacy.html'}}})
        note('App info locale ' + l['attributes']['locale'])
step('name, subtitle, privacy URL', info_locs)

def age_rating():
    ar = call('GET', f'/v1/appInfos/{INFO}/ageRatingDeclaration')['data']
    attrs = {k: 'NONE' for k in ['alcoholTobaccoOrDrugUseOrReferences', 'contests', 'gamblingSimulated', 'horrorOrFearThemes', 'matureOrSuggestiveThemes',
             'medicalOrTreatmentInformation', 'profanityOrCrudeHumor', 'sexualContentGraphicAndNudity', 'sexualContentOrNudity', 'violenceCartoonOrFantasy',
             'violenceRealistic', 'violenceRealisticProlongedGraphicOrSadistic', 'gunsOrOtherWeapons']}
    attrs.update({'gambling': False, 'unrestrictedWebAccess': False, 'lootBox': False, 'messagingAndChat': False, 'userGeneratedContent': True,
                  'advertising': False, 'healthOrWellnessTopics': True, 'parentalControls': False, 'ageAssurance': False, 'socialMedia': True})
    for _ in range(8):
        try:
            call('PATCH', f'/v1/ageRatingDeclarations/{ar["id"]}', {'data': {'type': 'ageRatingDeclarations', 'id': ar['id'], 'attributes': attrs}}); return
        except RuntimeError as e:
            s = str(e); bad = [k for k in list(attrs) if f"'{k}'" in s or f'"{k}"' in s or f'/{k}' in s]
            if not bad: raise
            for k in bad: attrs.pop(k, None)
            warn('age rating: dropped unknown fields ' + ','.join(bad))
    raise RuntimeError('age rating did not save')
step('age rating', age_rating)

vers = call('GET', f'/v1/apps/{APP}/appStoreVersions?filter[platform]=IOS&limit=5')['data']
ver = next((v for v in vers if v['attributes'].get('appStoreState') in ('PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED')), None)
if not ver:
    warn('No editable version: ' + json.dumps([(v['attributes']['versionString'], v['attributes']['appStoreState']) for v in vers])); sys.exit(0)
VER = ver['id']
note('Version ' + ver['attributes']['versionString'] + ' state ' + ver['attributes']['appStoreState'])

def version_attrs():
    call('PATCH', f'/v1/appStoreVersions/{VER}', {'data': {'type': 'appStoreVersions', 'id': VER, 'attributes': {
        'copyright': '2026 Moatassim Azizi', 'releaseType': 'MANUAL'}}})
step('copyright and manual release', version_attrs)

def version_locs():
    locs = call('GET', f'/v1/appStoreVersions/{VER}/appStoreVersionLocalizations')['data']
    for l in locs:
        call('PATCH', f'/v1/appStoreVersionLocalizations/{l["id"]}', {'data': {'type': 'appStoreVersionLocalizations', 'id': l['id'], 'attributes': {
            'description': DESC, 'keywords': KEYWORDS, 'promotionalText': PROMO, 'supportUrl': SITE + 'support.html', 'marketingUrl': SITE}}})
    return locs
LOCS = []
def vl(): LOCS.extend(version_locs())
step('description, keywords, promo text, support URL', vl)

def build():
    num = os.environ.get('BUILD', '').strip()
    q = f'/v1/builds?filter[app]={APP}&sort=-uploadedDate&limit=10'
    blds = call('GET', q)['data']
    b = next((x for x in blds if (not num or x['attributes']['version'] == num) and x['attributes'].get('processingState') == 'VALID'), None)
    if not b: raise RuntimeError('No processed build found: ' + json.dumps([(x['attributes']['version'], x['attributes'].get('processingState')) for x in blds]))
    call('PATCH', f'/v1/appStoreVersions/{VER}/relationships/build', {'data': {'type': 'builds', 'id': b['id']}})
    note('Attached build ' + b['attributes']['version'])
step('attach build', build)

def screenshots():
    folder = os.path.join(os.path.dirname(__file__), 'store')
    files = [os.path.join(folder, f'{i}.png') for i in range(1, 7)]
    for l in LOCS:
        sets = call('GET', f'/v1/appStoreVersionLocalizations/{l["id"]}/appScreenshotSets')['data']
        dtype = None
        for t in ('APP_IPHONE_67', 'APP_IPHONE_69'):
            s = next((x for x in sets if x['attributes']['screenshotDisplayType'] == t), None)
            if s: dtype = t; break
        if not s:
            for t in ('APP_IPHONE_67', 'APP_IPHONE_69'):
                try:
                    s = call('POST', '/v1/appScreenshotSets', {'data': {'type': 'appScreenshotSets', 'attributes': {'screenshotDisplayType': t},
                             'relationships': {'appStoreVersionLocalization': {'data': {'type': 'appStoreVersionLocalizations', 'id': l['id']}}}}})['data']; dtype = t; break
                except RuntimeError as e: warn('screenshot set ' + t + ': ' + str(e)[:200])
        if not s: raise RuntimeError('Could not create a screenshot set')
        for old in call('GET', f'/v1/appScreenshotSets/{s["id"]}/appScreenshots')['data']:
            call('DELETE', f'/v1/appScreenshots/{old["id"]}')
        for f in files:
            data = open(f, 'rb').read()
            res = call('POST', '/v1/appScreenshots', {'data': {'type': 'appScreenshots', 'attributes': {'fileName': os.path.basename(f), 'fileSize': len(data)},
                       'relationships': {'appScreenshotSet': {'data': {'type': 'appScreenshotSets', 'id': s['id']}}}}})['data']
            for op in res['attributes']['uploadOperations']:
                part = data[op['offset']:op['offset'] + op['length']]
                hdrs = {h['name']: h['value'] for h in op.get('requestHeaders', [])}
                r = requests.request(op['method'], op['url'], headers=hdrs, data=part, timeout=120)
                if r.status_code >= 300: raise RuntimeError('upload part failed ' + str(r.status_code))
            call('PATCH', f'/v1/appScreenshots/{res["id"]}', {'data': {'type': 'appScreenshots', 'id': res['id'], 'attributes': {
                'uploaded': True, 'sourceFileChecksum': hashlib.md5(data).hexdigest()}}})
        note(f'Uploaded 6 screenshots ({dtype}) for {l["attributes"]["locale"]}')
step('screenshots', screenshots)

def free_price():
    pts = call('GET', f'/v1/apps/{APP}/appPricePoints?filter[territory]=USA&limit=200')['data']
    free = next(p for p in pts if float(p['attributes']['customerPrice']) == 0)
    call('POST', '/v1/appPriceSchedules', {'data': {'type': 'appPriceSchedules', 'relationships': {
        'app': {'data': {'type': 'apps', 'id': APP}},
        'baseTerritory': {'data': {'type': 'territories', 'id': 'USA'}},
        'manualPrices': {'data': [{'type': 'appPrices', 'id': '${price1}'}]}}},
        'included': [{'type': 'appPrices', 'id': '${price1}', 'attributes': {'startDate': None},
                      'relationships': {'appPricePoint': {'data': {'type': 'appPricePoints', 'id': free['id']}}}}]})
step('price: free', free_price)

def availability():
    terrs, nxt = [], '/v1/territories?limit=200'
    while nxt:
        r = call('GET', nxt); terrs += [t['id'] for t in r['data']]
        nxt = (r.get('links') or {}).get('next', '').replace(API, '') or None
    inc = [{'type': 'territoryAvailabilities', 'id': f'${{t{i}}}', 'attributes': {'available': True},
            'relationships': {'territory': {'data': {'type': 'territories', 'id': t}}}} for i, t in enumerate(terrs)]
    call('POST', '/v2/appAvailabilities', {'data': {'type': 'appAvailabilities', 'attributes': {'availableInNewTerritories': True}, 'relationships': {
        'app': {'data': {'type': 'apps', 'id': APP}},
        'territoryAvailabilities': {'data': [{'type': 'territoryAvailabilities', 'id': x['id']} for x in inc]}}}, 'included': inc})
    note(f'Available in {len(terrs)} countries')
step('availability: all countries', availability)

NOTES = open(os.path.join(os.path.dirname(__file__), 'store', 'review-notes.txt'), encoding='utf-8').read().strip()
def review_details():
    attrs = {'contactFirstName': 'Moatassim', 'contactLastName': 'Azizi', 'contactEmail': 'moatassime1310@gmail.com', 'notes': NOTES, 'demoAccountRequired': True}
    try:
        d = call('GET', f'/v1/appStoreVersions/{VER}/appStoreReviewDetail')['data']
    except RuntimeError:
        d = None
    if d:
        call('PATCH', f'/v1/appStoreReviewDetails/{d["id"]}', {'data': {'type': 'appStoreReviewDetails', 'id': d['id'], 'attributes': attrs}})
    else:
        call('POST', '/v1/appStoreReviewDetails', {'data': {'type': 'appStoreReviewDetails', 'attributes': attrs,
             'relationships': {'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': VER}}}}})
step('review contact and notes', review_details)
