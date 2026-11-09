"""Real-world shape for the big map (docs/WORLD_MAP.md, PROPOSAL).

Downloads public elevation tiles (AWS Terrain Tiles, "terrarium" PNGs: SRTM / ETOPO1 incl. sea floor, open data,
attribution in docs/WORLD_MAP.md), stitches the border slice (LA to the tip of Baja, Pacific to the Arizona edge),
and projects it into game metres around Walt's Garage (Imperial Valley, south of the Salton Sea).

Scales (PROPOSAL): horizontal 1:50 (1 real km = 20 game m), vertical 1:12 (a 3,000 m peak = 250 m).
North is -z in the game, east is +x.

Outputs (step 2: game files, nothing in the game reads them yet):
  viewer/bug_viewer/public/terrain/border.png (height + sea mask), border.json
  assets/generated/raw/dem_cache/   downloaded tiles (gitignored)
  assets/mockups/west_preview.png   shaded relief preview, sea in blue, garage marked
  prints the world size and height range

Usage: python assets/pipeline/west_dem.py
"""
import io, math, os, sys, urllib.request
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, 'assets', 'generated', 'raw', 'dem_cache')
OUT = os.path.join(ROOT, 'assets', 'mockups', 'west_preview.png')

# the border slice (lat/lon box)
LAT_N, LAT_S = 34.6, 22.6      # just north of LA .. Cabo San Lucas
LON_W, LON_E = -119.8, -109.2  # Channel Islands .. past Cabo San Lucas (and Phoenix)
HOME = (32.95, -115.55)        # Walt's Garage (PROPOSAL): Imperial Valley, south of the Salton Sea
ZOOM = 8
H_SCALE = 1 / 25               # horizontal: game metres per real metre (Chris: bigger scale, Nov 9)
V_SCALE = 1 / 8                # vertical (PROPOSAL: mountains stay tall enough to feel real)
CELL = 20.0                    # game metres per output cell (= 0.5 real km, about the source detail)
GAME_DIR = os.path.join(ROOT, 'viewer', 'bug_viewer', 'public', 'terrain')

def tile_xy(lat, lon, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * n
    return x, y

def get_tile(z, x, y):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, f'{z}_{x}_{y}.png')
    if not os.path.exists(p):
        url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        with urllib.request.urlopen(url, timeout=60) as r: data = r.read()
        open(p, 'wb').write(data)
    im = np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
    return im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768   # terrarium decode, metres

def mosaic():
    x0, y0 = tile_xy(LAT_N, LON_W, ZOOM); x1, y1 = tile_xy(LAT_S, LON_E, ZOOM)
    tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
    rows = []
    for ty in range(ty0, ty1 + 1):
        rows.append(np.hstack([get_tile(ZOOM, tx, ty) for tx in range(tx0, tx1 + 1)]))
        print(f'  row {ty - ty0 + 1}/{ty1 - ty0 + 1}', file=sys.stderr)
    return np.vstack(rows), tx0, ty0

def sample(big, tx0, ty0, lat, lon):
    """bilinear sample of the mosaic at lat/lon arrays"""
    x, y = tile_xy(lat, lon, ZOOM)
    px = (x - tx0) * 256 - 0.5; py = (y - ty0) * 256 - 0.5
    px = np.clip(px, 0, big.shape[1] - 1.001); py = np.clip(py, 0, big.shape[0] - 1.001)
    i, j = px.astype(int), py.astype(int); fx, fy = px - i, py - j
    a = big[j, i] * (1 - fx) + big[j, i + 1] * fx; b = big[j + 1, i] * (1 - fx) + big[j + 1, i + 1] * fx
    return a * (1 - fy) + b * fy

def main():
    big, tx0, ty0 = mosaic()
    lat0, lon0 = HOME
    kx = 111_320 * math.cos(math.radians(lat0)); kz = 110_574   # real metres per degree (equirectangular around home)
    # game extent of the box
    gx0, gx1 = (LON_W - lon0) * kx * H_SCALE, (LON_E - lon0) * kx * H_SCALE
    gz0, gz1 = -(LAT_N - lat0) * kz * H_SCALE, -(LAT_S - lat0) * kz * H_SCALE
    nx, nz = int((gx1 - gx0) / CELL) + 1, int((gz1 - gz0) / CELL) + 1
    gx = gx0 + np.arange(nx) * CELL; gz = gz0 + np.arange(nz) * CELL
    GX, GZ = np.meshgrid(gx, gz)
    lon = lon0 + GX / H_SCALE / kx; lat = lat0 - GZ / H_SCALE / kz
    h = sample(big, tx0, ty0, lat, lon)
    # despike: the source has a few bad pixels (a 260 m needle on the San Diego shore). A cell more than 400 real m above the median of its 3x3 neighbourhood takes that median.
    from numpy.lib.stride_tricks import sliding_window_view
    med = np.median(sliding_window_view(np.pad(h, 1, mode='edge'), (3, 3)), axis=(-1, -2))
    spikes = (h - med) > 400; h = np.where(spikes, med, h)
    print(f'despiked {spikes.sum()} cells')
    print(f'world box (game m): x {gx0:.0f}..{gx1:.0f}  z {gz0:.0f}..{gz1:.0f}  = {gx1 - gx0:.0f} x {gz1 - gz0:.0f} m, grid {nx}x{nz}')
    print(f'real height range: {h.min():.0f}..{h.max():.0f} m  -> game {h.min() * V_SCALE:.0f}..{h.max() * V_SCALE:.0f} m')

    # sea = below sea level AND connected to the open ocean (flood fill from the box edge); the Salton Sea basin is not the ocean
    sea = np.zeros_like(h, bool); low = h < -2
    stack = [(j, i) for j in range(nz) for i in (0, nx - 1) if low[j, i]] + [(j, i) for i in range(nx) for j in (0, nz - 1) if low[j, i]]
    while stack:
        j, i = stack.pop()
        if sea[j, i] or not low[j, i]: continue
        sea[j, i] = True
        for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            a, b = j + dj, i + di
            if 0 <= a < nz and 0 <= b < nx and not sea[a, b] and low[a, b]: stack.append((a, b))
    lake = (~sea) & (h <= -64)   # the Salton Sea: its surface sits about 70 m below sea level
    print(f'sea cells: {sea.mean() * 100:.0f}%, Salton Sea cells: {lake.sum()}')

    # preview: hillshade + hypsometric colour, sea blue
    gy, gxx = np.gradient(h * V_SCALE, CELL)
    shade = np.clip(0.75 + (-gxx * 0.7 - gy * 0.7) * 2.0, 0.35, 1.25)
    t = np.clip(h / 2500, 0, 1)[..., None]
    land = (1 - t) * np.array([214, 196, 150]) + t * np.array([150, 105, 70])
    img = land * shade[..., None]
    deep = np.clip(-h / 3000, 0, 1)[..., None]
    water = (1 - deep) * np.array([90, 160, 190]) + deep * np.array([25, 60, 105])
    img = np.where(sea[..., None], water, img)
    img = np.where(lake[..., None], np.array([80, 150, 175]), img)
    img = np.clip(img, 0, 255).astype(np.uint8)
    im = Image.fromarray(img)
    # garage marker at (0, 0)
    ci, cj = int(-gx0 / CELL), int(-gz0 / CELL)
    for d in range(-4, 5):
        for (a, b) in ((cj + d, ci), (cj, ci + d)):
            if 0 <= a < nz and 0 <= b < nx: im.putpixel((b, a), (220, 30, 30))
    scale = max(1, 900 // max(nx, nz))
    if max(nx, nz) > 900: im = im.resize((nx * 900 // max(nx, nz), nz * 900 // max(nx, nz)), Image.LANCZOS); nx2 = im.size; scale = 1
    else: nx2 = None
    if nx2 is None: im = im.resize((nx * scale, nz * scale), Image.NEAREST)
    os.makedirs(os.path.dirname(OUT), exist_ok=True); im.save(OUT)
    print('preview:', OUT)
    # game file: int16 decimetres of GAME height, row-major (z rows north->south, x columns west->east), plus sea/lake bits in a uint8 mask
    os.makedirs(GAME_DIR, exist_ok=True)
    # one PNG: R,G = game height in decimetres + 32768 (16 bit), B = 100 * mask (bit0 sea, bit1 Salton Sea). The deep sea floor is flattened at -30 m (never seen; packs smaller)
    mask = (sea.astype(np.uint8) | (lake.astype(np.uint8) << 1))
    gh = np.clip(np.round(h * V_SCALE * 10), -32000, 32000).astype(np.int32)
    gh = np.where(sea, np.maximum(gh, -300), gh) + 32768
    Image.fromarray(np.dstack([(gh >> 8).astype(np.uint8), (gh & 255).astype(np.uint8), (mask * 100).astype(np.uint8)]), 'RGB').save(os.path.join(GAME_DIR, 'border.png'), optimize=True)
    import json
    meta = {'nx': nx, 'nz': nz, 'cell': CELL, 'x0': float(gx0), 'z0': float(gz0), 'file': 'border.png', 'unit': 'R*256+G-32768 = decimetres', 'mask': 'B/100: bit0 sea, bit1 Salton Sea',
            'lakeLevel': round(-71 * V_SCALE, 2), 'hScale': H_SCALE, 'vScale': V_SCALE, 'home': HOME, 'box': [LAT_N, LAT_S, LON_W, LON_E],
            'source': 'AWS Terrain Tiles (terrarium z%d): SRTM, ETOPO1, USGS NED' % ZOOM}
    open(os.path.join(GAME_DIR, 'border.json'), 'w').write(json.dumps(meta, indent=1))
    print('game file:', os.path.join(GAME_DIR, 'border.png'), f'{os.path.getsize(os.path.join(GAME_DIR, "border.png")) / 1e6:.1f} MB')
    np.save(os.path.join(CACHE, 'west_h.npy'), h); np.save(os.path.join(CACHE, 'west_sea.npy'), sea); np.save(os.path.join(CACHE, 'west_lake.npy'), lake)

if __name__ == '__main__':
    main()
