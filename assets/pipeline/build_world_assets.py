"""
Bake the Baja County terrain assets from the user's local asset libraries (never committed) into small runtime files.

  python -I build_world_assets.py <supplyline-unity/Assets> <supplyline/public/assets/materials>

Writes (viewer/bug_viewer/public):
  terrain/height.bin        1025 x 1025 little-endian uint16, the Bad Raccoon "3D Realistic Terrain" heightmap (eroded ridges,
                            washes, alluvial fans) rescaled to 0..65535. Row r = world z, column c = world x (see county.js).
  terrain/macro.jpg         2048 x 2048, same orientation as height.bin: R = the terrain's painted diffuse as fine light/dark
                            detail (high-passed luminance), G = its baked ambient occlusion. Gives far ground the erosion look.
  textures/ground/albedo.jpg   8 tileable ground layers, 1024 px each, stacked vertically (1024 x 8192) -> a texture array
  textures/ground/normal.jpg   their OpenGL normal maps, same layout
  textures/ground/ground.json  layer names, physical repeat (m) and mean linear colour (the shader divides by it so the
                               surface's own colour stays in charge and the photo supplies only the detail)
Licences: see textures/ground/SOURCES.md (written alongside).
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
UNITY, PH = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.normpath(os.path.join(HERE, '..', '..', 'viewer', 'bug_viewer', 'public'))
TER, GND = os.path.join(PUB, 'terrain'), os.path.join(PUB, 'textures', 'ground')
os.makedirs(TER, exist_ok=True); os.makedirs(GND, exist_ok=True)
U = lambda *p: os.path.join(UNITY, *p)
BR = U('Bad_Raccoon', '3D Realistic Terrain Free')

# ---------------- heightmap ----------------
raw = np.fromfile(os.path.join(BR, 'Terrains', 'Heightmap_2K_A.raw'), dtype='<u2')
n = int(round(raw.size ** 0.5)); hm = raw.reshape(n, n).astype(np.float32)
hm = (hm - hm.min()) / (hm.max() - hm.min())
# 3x3 box blur then every other sample: 2049 -> 1025 without aliasing
pad = np.pad(hm, 1, mode='edge'); blur = sum(pad[1 + dy:1 + dy + n, 1 + dx:1 + dx + n] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
small = blur[::2, ::2]
(np.clip(small, 0, 1) * 65535).round().astype('<u2').tofile(os.path.join(TER, 'height.bin'))
print('height.bin', small.shape)

# ---------------- macro detail from the terrain's own painted diffuse + AO ----------------
M = 2048
def load_gray(p, size):
    im = Image.open(p); im.draft('L', (size, size)); im = im.convert('L')
    return np.asarray(im.resize((size, size), Image.BOX), dtype=np.float32) / 255
diff = load_gray(os.path.join(BR, 'Textures', 'Diffuse_8K_Flat_A.png'), M)
ao = load_gray(os.path.join(BR, 'Textures', 'Ao_4K_Flat_A.png'), M)
# which way round is the painted map relative to the RAW rows? its AO is dark on the steep slopes, so correlate at 512 px
h5 = np.asarray(Image.fromarray(small).resize((512, 512), Image.BOX), dtype=np.float32); gy, gx = np.gradient(h5); slope = np.hypot(gx, gy)
ao5 = np.asarray(Image.fromarray((ao * 255).astype(np.uint8)).resize((512, 512), Image.BOX), dtype=np.float32)
def corr(a, b): a = a - a.mean(); b = b - b.mean(); return float((a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum()))
orients = {'none': lambda a: a, 'flipV': lambda a: a[::-1], 'flipH': lambda a: a[:, ::-1], 'rot180': lambda a: a[::-1, ::-1],
           'transpose': lambda a: a.T, 'transFlipV': lambda a: a.T[::-1], 'transFlipH': lambda a: a.T[:, ::-1], 'antiT': lambda a: a.T[::-1, ::-1]}
scores = {k: -corr(f(ao5), slope) for k, f in orients.items()}
best = max(scores, key=scores.get); print('macro orientation', best, {k: round(v, 3) for k, v in scores.items()})
diff, ao = orients[best](diff), orients[best](ao)
lo = np.asarray(Image.fromarray((diff * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(24)), dtype=np.float32) / 255
hp = np.clip(0.5 + (diff - lo) * 2.2, 0, 1)
aon = np.clip((ao - np.percentile(ao, 2)) / (np.percentile(ao, 98) - np.percentile(ao, 2) + 1e-6), 0, 1)
macro = np.stack([hp, aon, np.zeros_like(hp)], -1)
Image.fromarray((macro * 255).astype(np.uint8)).save(os.path.join(TER, 'macro.jpg'), quality=88)
print('macro.jpg')

# ---------------- ground layers ----------------
FV = U('ForestVision', 'Materials', 'Grounds', 'Textures'); ZT = U('ZNS3D', 'FREE_VEGETATION_PACK', 'TEXTURES', 'TERRAIN')
MN = U('Mini Nature Pack')
def find(root, name):
    for d, _, fs in os.walk(root):
        if name in fs: return os.path.join(d, name)
    raise FileNotFoundError(name)
LAYERS = [  # name, albedo, normal, repeat metres, desaturate
    ('sand',    os.path.join(FV, 'gnd_rockySand_diffuse.png'), os.path.join(FV, 'gnd_rockySand_normal.png'), 4.0, False),
    ('desert',  os.path.join(ZT, 'ROCKY_GROUND', 'plane_Rocky_Ground_BaseColor.png'), os.path.join(ZT, 'ROCKY_GROUND', 'plane_Rocky_Ground_Normal.png'), 5.0, False),
    ('dirt',    U('Polyeler', 'EssentialNaturePack', 'Materials', 'Textures', 'Forest_Road.png'), U('Polyeler', 'EssentialNaturePack', 'Materials', 'Textures', 'Forest_Road_N.png'), 4.0, False),
    ('redsoil', os.path.join(ZT, 'SOIL_GROUND', 'plane_Ground_BaseMap.png'), os.path.join(ZT, 'SOIL_GROUND', 'plane_Ground_Normal.png'), 4.0, False),
    ('gravel',  U('Waldemarst', 'FreeJapaneseGarden', 'Textures', 'Terrain', 'Ground_Gravel_01', 'T_FJG_Ground_Gravel_01_Albedo.png'), U('Waldemarst', 'FreeJapaneseGarden', 'Textures', 'Terrain', 'Ground_Gravel_01', 'T_FJG_Ground_Gravel_01_Normal.png'), 2.5, False),
    ('rock',    find(MN, 'FD_Cliff_2.bmp'), find(MN, 'FD_Cliff_NM_2.bmp'), 7.0, True),
    ('grass',   os.path.join(FV, 'gnd_FieldGrass_Base_Color.png'), os.path.join(FV, 'gnd_FieldGrass_Normal.png'), 3.0, False),
    ('paving',  os.path.join(PH, 'concrete_floor_01', 'Diffuse.jpg'), os.path.join(PH, 'concrete_floor_01', 'nor_gl.jpg'), 2.0, False),
]
S = 1024
def square(p, mode):
    im = Image.open(p); im.draft(mode, (S * 2, S * 2)); im = im.convert(mode)
    w, h = im.size; s = min(w, h); im = im.crop((0, 0, s, s))
    return im.reduce(s // S) if s % S == 0 and s >= S else im.resize((S, S), Image.LANCZOS)   # integer box reduce keeps the tile seamless
srgb2lin = lambda c: np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
alb_strip, nor_strip, meta = [], [], []
for name, ap, np_, rep, desat in LAYERS:
    a = np.asarray(square(ap, 'RGB'), dtype=np.float32) / 255
    if desat:
        g = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
        g = np.clip(0.5 + (g - g.mean()) / (g.std() + 1e-6) * 0.16, 0, 1)
        a = np.stack([g * 1.04, g, g * 0.95], -1).clip(0, 1)
    nm = np.asarray(square(np_, 'RGB'), dtype=np.float32) / 255
    v = nm * 2 - 1; v[..., 2] = np.maximum(v[..., 2], 0.05); v /= np.linalg.norm(v, axis=-1, keepdims=True)
    alb_strip.append(a); nor_strip.append(v * 0.5 + 0.5)
    mean = srgb2lin(a).reshape(-1, 3).mean(0)
    meta.append({'name': name, 'repeat': rep, 'mean': [round(float(x), 4) for x in mean]})
    print(f'{name:8s} {os.path.basename(ap)}  mean(lin) {meta[-1]["mean"]}')
Image.fromarray((np.concatenate(alb_strip, 0) * 255).astype(np.uint8)).save(os.path.join(GND, 'albedo.jpg'), quality=88)
Image.fromarray((np.concatenate(nor_strip, 0) * 255).astype(np.uint8)).save(os.path.join(GND, 'normal.jpg'), quality=92)
json.dump({'size': S, 'layers': meta}, open(os.path.join(GND, 'ground.json'), 'w'), indent=1)
open(os.path.join(GND, 'SOURCES.md'), 'w').write('''# Ground textures + terrain data

Baked by `assets/pipeline/build_world_assets.py` from the user's local asset libraries (originals unchanged, not committed).

| layer | source |
|---|---|
''' + '\n'.join(f'| {name} | `{os.path.relpath(ap, os.path.dirname(UNITY)) if ap.startswith(UNITY) else "Poly Haven (CC0): " + os.path.relpath(ap, PH)}` |' for name, ap, *_ in LAYERS) + '''

- `terrain/height.bin`, `terrain/macro.jpg`: Bad Raccoon, "3D Realistic Terrain Free" (Unity Asset Store) - heightmap, diffuse and AO.
- Unity Asset Store assets are used under the Asset Store EULA (embedded in this game, not redistributed as standalone assets).
- Poly Haven textures: CC0 1.0.
''')
print('done')
