# Swaps the build on version 1.0 and submits it for App Review.
# Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, BUILD
import os, sys, time, json, jwt, requests
API = 'https://api.appstoreconnect.apple.com'
LOG = []
def note(m): LOG.append(m)
def done(code=0):
    txt = ' || '.join(LOG).replace('\n', ' ')
    for i in range(0, len(txt), 3500): print('::notice::' + txt[i:i + 3500])
    sys.exit(code)
now = int(time.time())
TOK = jwt.encode({'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'}, os.environ['ASC_KEY_P8'], algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'})
def call(method, path, body=None):
    r = requests.request(method, API + path, headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'}, data=json.dumps(body) if body is not None else None, timeout=60)
    if r.status_code >= 300: raise RuntimeError(f'{method} {path} -> {r.status_code}: {r.text[:900]}')
    return r.json() if r.text else {}
try:
    APP = call('GET', '/v1/apps?filter[bundleId]=com.gggains.app')['data'][0]['id']
    subs = call('GET', f'/v1/reviewSubmissions?filter[app]={APP}&filter[platform]=IOS&limit=20')['data']
    note('submissions: ' + json.dumps([(s['id'][:8], s['attributes'].get('state')) for s in subs]))
    for s in subs:
        st = s['attributes'].get('state')
        if st in ('READY_FOR_REVIEW',):
            for it in call('GET', f'/v1/reviewSubmissions/{s["id"]}/items')['data']:
                call('DELETE', f'/v1/reviewSubmissionItems/{it["id"]}'); note('removed item from draft submission')
        elif st in ('WAITING_FOR_REVIEW',):
            call('PATCH', f'/v1/reviewSubmissions/{s["id"]}', {'data': {'type': 'reviewSubmissions', 'id': s['id'], 'attributes': {'canceled': True}}}); note('cancelled waiting submission')
            for _ in range(20):
                time.sleep(6)
                if call('GET', f'/v1/reviewSubmissions/{s["id"]}')['data']['attributes'].get('state') not in ('CANCELING',): break
    time.sleep(5)
    vers = call('GET', f'/v1/apps/{APP}/appStoreVersions?filter[platform]=IOS&limit=5')['data']
    ver = vers[0]; note('version state now: ' + ver['attributes']['appStoreState'])
    num = os.environ['BUILD']
    blds = call('GET', f'/v1/builds?filter[app]={APP}&filter[version]={num}')['data']
    if not blds or blds[0]['attributes'].get('processingState') != 'VALID': note(f'build {num} not ready: ' + json.dumps([b['attributes'].get('processingState') for b in blds])); done(1)
    call('PATCH', f'/v1/appStoreVersions/{ver["id"]}/relationships/build', {'data': {'type': 'builds', 'id': blds[0]['id']}}); note('attached build ' + num)
    if os.environ.get('SUBMIT') == 'yes':
        sub = next((s for s in call('GET', f'/v1/reviewSubmissions?filter[app]={APP}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW')['data']), None)
        if not sub:
            sub = call('POST', '/v1/reviewSubmissions', {'data': {'type': 'reviewSubmissions', 'attributes': {'platform': 'IOS'}, 'relationships': {'app': {'data': {'type': 'apps', 'id': APP}}}}})['data']
        call('POST', '/v1/reviewSubmissionItems', {'data': {'type': 'reviewSubmissionItems', 'relationships': {
            'reviewSubmission': {'data': {'type': 'reviewSubmissions', 'id': sub['id']}}, 'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': ver['id']}}}}})
        call('PATCH', f'/v1/reviewSubmissions/{sub["id"]}', {'data': {'type': 'reviewSubmissions', 'id': sub['id'], 'attributes': {'submitted': True}}})
        time.sleep(4)
        note('SUBMITTED. Version state: ' + call('GET', f'/v1/appStoreVersions/{ver["id"]}')['data']['attributes']['appStoreState'])
    done(0)
except Exception as e:
    note('ERROR: ' + str(e)); done(1)
