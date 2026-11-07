"""Generate one 3D part with the Meshy text-to-3D API and download it as a GLB.

    python meshy_generate.py <name> "<prompt>"                 # step 1: untextured shape (~20 credits) - inspect it first
    python meshy_generate.py <name> --refine-from <preview_id>  # step 2: add textures to a preview you liked (~10 credits)
    python meshy_generate.py <name> "<prompt>" --refine        # both steps at once
    options: [--polycount 30000] [--model latest]
    python meshy_generate.py --balance

Reads MESHY_API_KEY from the project-root .env (git-ignored). Never prints the key.
Output: assets/generated/raw/<name>.glb  (raw files are git-ignored; optimise with opt.mjs, then add a catalog entry)
Spends credits - preview = untextured shape (cheaper), --refine adds textures/PBR on top of the preview.
Prompt tips: ONE isolated part, plain background, e.g. "off-road beetle hood panel only, white fiberglass, isolated, no car".
"""
import argparse, json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BASE = 'https://api.meshy.ai'

def load_key():
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        m = re.match(r'\s*MESHY_API_KEY\s*=\s*(.*?)\s*$', line)
        if m and m.group(1).strip('"\''): return m.group(1).strip('"\'')
    sys.exit('MESHY_API_KEY is empty in .env')

KEY = load_key()
def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit('Meshy API %s %s -> HTTP %s: %s' % (method, path, e.code, e.read().decode()[:400]))

def wait(task_id, label):
    last = -1
    while True:
        t = call('GET', '/openapi/v2/text-to-3d/' + task_id)
        if t['status'] in ('SUCCEEDED', 'FAILED', 'CANCELED'): return t
        if t.get('progress') != last: last = t.get('progress'); print('  %s %s%%' % (label, last), flush=True)
        time.sleep(6)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('name', nargs='?'); ap.add_argument('prompt', nargs='?')
    ap.add_argument('--refine', action='store_true', help='add textures (extra credits)')
    ap.add_argument('--polycount', type=int, default=30000); ap.add_argument('--model', default='latest')
    ap.add_argument('--balance', action='store_true'); ap.add_argument('--refine-from', dest='refine_from')
    a = ap.parse_args()
    if a.balance or not a.name:
        print(call('GET', '/openapi/v1/balance')); return
    if not a.prompt and not a.refine_from: sys.exit('need a prompt (or --refine-from <preview_id>)')
    before = call('GET', '/openapi/v1/balance')['balance']
    print('credits before:', before)
    if a.refine_from:
        pid = a.refine_from; a.refine = True; t = None
    else:
      pid = call('POST', '/openapi/v2/text-to-3d', {'mode': 'preview', 'prompt': a.prompt[:800], 'ai_model': a.model, 'should_remesh': True,
                                                  'target_polycount': a.polycount, 'topology': 'triangle', 'target_formats': ['glb']})['result']
      print('preview task', pid)
      t = wait(pid, 'preview')
      if t['status'] != 'SUCCEEDED': sys.exit('preview failed: %s' % t.get('task_error'))
    if a.refine:
        rid = call('POST', '/openapi/v2/text-to-3d', {'mode': 'refine', 'preview_task_id': pid, 'enable_pbr': True, 'target_formats': ['glb']})['result']
        print('refine task', rid)
        t = wait(rid, 'refine')
        if t['status'] != 'SUCCEEDED': sys.exit('refine failed: %s' % t.get('task_error'))
    out_dir = os.path.join(ROOT, 'assets', 'generated', 'raw'); os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, a.name + '.glb')
    urllib.request.urlretrieve(t['model_urls']['glb'], out)
    after = call('GET', '/openapi/v1/balance')['balance']
    print('preview id (for --refine-from):', pid)
    print('saved %s (%.1f MB) | credits used: %s | remaining: %s' % (out, os.path.getsize(out) / 1e6, before - after, after))

if __name__ == '__main__':
    main()
