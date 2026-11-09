"""Image-to-3D with Meshy: python meshy_image.py <name> <image.png> [--polycount 30000]
Reads MESHY_API_KEY from the project-root .env (never printed). Spends credits (~30 with texture).
Output: assets/generated/raw/<name>.glb (git-ignored raw file)."""
import base64, json, os, re, sys, time, urllib.request, urllib.error
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KEY = next(m.group(1).strip('"\'') for l in open(os.path.join(ROOT, '.env'), encoding='utf-8') if (m := re.match(r'\s*MESHY_API_KEY\s*=\s*(.*?)\s*$', l)))
def call(method, path, body=None):
    req = urllib.request.Request('https://api.meshy.ai' + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e: sys.exit('Meshy %s -> HTTP %s: %s' % (path, e.code, e.read().decode()[:400]))
name, img = sys.argv[1], sys.argv[2]
poly = int(sys.argv[sys.argv.index('--polycount') + 1]) if '--polycount' in sys.argv else 30000
uri = 'data:image/png;base64,' + base64.b64encode(open(img, 'rb').read()).decode()
tid = call('POST', '/openapi/v1/image-to-3d', {'image_url': uri, 'should_texture': True, 'enable_pbr': True, 'target_polycount': poly, 'ai_model': 'latest'})['result']
print('task', tid, flush=True); last = -1
while True:
    t = call('GET', '/openapi/v1/image-to-3d/' + tid)
    if t['status'] in ('SUCCEEDED', 'FAILED', 'CANCELED'): break
    if t.get('progress') != last: last = t.get('progress'); print(' ', last, '%', flush=True)
    time.sleep(8)
if t['status'] != 'SUCCEEDED': sys.exit('failed: ' + str(t.get('task_error')))
out = os.path.join(ROOT, 'assets', 'generated', 'raw'); os.makedirs(out, exist_ok=True)
urllib.request.urlretrieve(t['model_urls']['glb'], os.path.join(out, name + '.glb')); print('saved', name + '.glb')
