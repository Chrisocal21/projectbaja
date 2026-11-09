"""Real highways for the big map (docs/WORLD_MAP.md step 5, PROPOSAL).

Source: Natural Earth 1:10m roads (public domain, naturalearthdata.com), one centre line per highway, USA + Mexico.
Clips them to the border slice, projects them into game metres exactly like west_dem.py (reads border.json),
simplifies them and writes viewer/bug_viewer/public/terrain/highways.json:
  [{ "name": "I-8", "kind": "major" | "secondary", "pts": [[x, z], ...] }, ...]   (game metres, north = -z)
Also draws them onto assets/mockups/west_roads_preview.png.

Run west_dem.py first. Usage: python assets/pipeline/west_roads.py
"""
import io, json, math, os, urllib.request, zipfile
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, 'assets', 'generated', 'raw', 'ne_roads')
GAME_DIR = os.path.join(ROOT, 'viewer', 'bug_viewer', 'public', 'terrain')
URL = 'https://naciscdn.org/naturalearth/10m/cultural/ne_10m_roads.zip'
KEEP = {'Major Highway': 'major', 'Beltway': 'major', 'Secondary Highway': 'secondary'}
TOL = 25.0     # simplify tolerance, game metres (the source is only good to ~1 real km = 40 game m)

def reader():
    import shapefile   # pip install pyshp
    shp = os.path.join(RAW, 'ne_10m_roads.shp')
    if not os.path.exists(shp):
        os.makedirs(RAW, exist_ok=True)
        with urllib.request.urlopen(URL, timeout=120) as r: zipfile.ZipFile(io.BytesIO(r.read())).extractall(RAW)
    return shapefile.Reader(shp)

def simplify(pts, tol):
    """Douglas-Peucker"""
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); ab = b - a; L = np.hypot(*ab) or 1
    d = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L for p in pts[1:-1]]
    i = int(np.argmax(d))
    if d[i] <= tol: return [pts[0], pts[-1]]
    return simplify(pts[:i + 2], tol)[:-1] + simplify(pts[i + 1:], tol)

def label(d):
    """the sign name: I-8, US-95, CA-86 / AZ-85, Mex 2D, Hwy 12 (Mexican state roads)"""
    n, lvl = (d.get('name') or '').strip(), d.get('level') or ''
    if not n: return ''
    if d.get('sov_a3') == 'MEX' or n.endswith('D'): return ('Hwy ' if lvl == 'State' else 'Mex ') + n
    if lvl == 'Interstate': return 'I-' + n
    if lvl == 'Federal': return 'US-' + n
    lon = d.get('_lon', -116)
    return ('CA-' if lon < -114.65 else 'AZ-') + n   # the Colorado River is about the state line here

def main():
    meta = json.load(open(os.path.join(GAME_DIR, 'border.json')))
    lat0, lon0 = meta['home']; hs = meta['hScale']; N, S, W, E = meta['box']
    kx = 111_320 * math.cos(math.radians(lat0)); kz = 110_574
    proj = lambda lon, lat: ((lon - lon0) * kx * hs, -(lat - lat0) * kz * hs)
    out, total = [], 0.0
    for sr in reader().iterShapeRecords():
        d = sr.record.as_dict(); kind = KEEP.get(d['type'])
        if not kind: continue
        b = sr.shape.bbox; d['_lon'] = (b[0] + b[2]) / 2
        if b[2] < W or b[0] > E or b[3] < S or b[1] > N: continue
        name = label(d)
        parts = list(sr.shape.parts) + [len(sr.shape.points)]
        for k in range(len(parts) - 1):
            run = []
            for lon, lat in sr.shape.points[parts[k]:parts[k + 1]]:
                if S <= lat <= N and W <= lon <= E: run.append(proj(lon, lat))
                elif run: break   # clipped at the box edge
            pts = simplify(run, TOL)
            if len(pts) < 2: continue
            L = sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))
            if L < 150: continue
            total += L
            out.append({'name': name, 'kind': kind, 'pts': [[round(x), round(z)] for x, z in pts]})
    json.dump({'source': 'Natural Earth 1:10m roads (public domain)', 'roads': out}, open(os.path.join(GAME_DIR, 'highways.json'), 'w'), separators=(',', ':'))
    print(f'{len(out)} roads, {total / 1000:.0f} game km, {os.path.getsize(os.path.join(GAME_DIR, "highways.json")) / 1e3:.0f} kB')
    # preview on top of the relief preview
    prev = os.path.join(ROOT, 'assets', 'mockups', 'west_preview.png')
    if os.path.exists(prev):
        im = Image.open(prev).convert('RGB'); g = ImageDraw.Draw(im)
        sx = im.size[0] / (meta['nx'] * meta['cell']); sz = im.size[1] / (meta['nz'] * meta['cell'])
        P = lambda x, z: ((x - meta['x0']) * sx, (z - meta['z0']) * sz)
        for r in out: g.line([P(x, z) for x, z in r['pts']], fill=(200, 30, 30) if r['kind'] == 'major' else (240, 150, 40), width=2 if r['kind'] == 'major' else 1)
        im.save(os.path.join(ROOT, 'assets', 'mockups', 'west_roads_preview.png'))

if __name__ == '__main__':
    main()
