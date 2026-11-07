"""Procedural Classic-body accessories (roof rack, light bar, rear spare carrier, bull bar).
Authored in Stage 2 Baja coordinates (+Z forward, roof top y=1.66, front z=1.86, rear z=-2.06).
The stock Classic body sits 0.14 m lower - the catalog entry applies that offset.
Requires: pip install trimesh numpy scipy.   Run: python build_accessories.py <out_dir>"""
import sys, numpy as np, trimesh as tm
from trimesh.transformations import rotation_matrix as R

STEEL = [28, 30, 28, 255]; BLACK = [12, 12, 12, 255]; LAMP = [255, 236, 170, 255]; RUBBER = [18, 18, 18, 255]; RIM = [120, 120, 125, 255]

def paint(m, c): m.visual.face_colors = c; return m
def tube(a, b, r=0.014, c=STEEL):
    a, b = np.array(a, float), np.array(b, float); v = b - a; L = np.linalg.norm(v)
    m = tm.creation.cylinder(radius=r, height=L, sections=12)
    z = np.array([0, 0, 1.]); ax = np.cross(z, v / L); s = np.linalg.norm(ax)
    if s > 1e-9: m.apply_transform(R(np.arctan2(s, z @ (v / L)), ax / s))
    m.apply_translation((a + b) / 2); return paint(m, c)
def box(size, pos, c=STEEL):
    m = tm.creation.box(extents=size); m.apply_translation(pos); return paint(m, c)
def cat(ms): return tm.util.concatenate(ms)

# Measured on the Stage 2 body: roof peak y=1.664 at z=-0.25 (x=0), roof falls ~0.055 at x=+-0.45 and to ~1.50 at the front edge;
# nose front z=1.861; rear panel z=-1.845 (y .75-.95); rear bumper y .45-.57 to z=-2.062.
def roof_y(z): return float(np.interp(z, [-0.9, -0.75, -0.5, -0.25, 0.0, 0.2, 0.33], [1.587, 1.617, 1.644, 1.664, 1.65, 1.617, 1.581])) - 0.06   # roof height at x=+-0.5

def roof_rack():
    x0, x1, z0, z1, yt = -0.50, 0.50, -0.85, 0.10, 1.725
    ms = []
    for x in (x0, x1):
        for z in (z0, z1): ms.append(tube([x, roof_y(z) - 0.02, z], [x, yt, z], 0.016))   # legs land on the roof
    for x in (x0, x1): ms.append(tube([x, yt, z0], [x, yt, z1]))               # side rails
    for z in (z0, z1): ms.append(tube([x0, yt, z], [x1, yt, z]))               # end rails
    for z in np.linspace(z0, z1, 6)[1:-1]: ms.append(tube([x0, yt - 0.01, z], [x1, yt - 0.01, z], 0.010))   # slats
    ms.append(tube([x0, yt + 0.08, z0], [x1, yt + 0.08, z0], 0.012))           # rear guard rail
    for x in (x0, x1): ms.append(tube([x, yt, z0], [x, yt + 0.08, z0], 0.012))
    return cat(ms)

def light_bar():
    z, w = 0.30, 0.90; y = roof_y(z) + 0.115
    ms = [box([w, 0.07, 0.07], [0, y, z], BLACK)]
    for x in np.linspace(-w / 2 + 0.09, w / 2 - 0.09, 6):
        l = tm.creation.cylinder(radius=0.034, height=0.03, sections=20); l.apply_transform(R(np.pi / 2, [1, 0, 0])); l.apply_translation([x, y, z + 0.05]); ms.append(paint(l, LAMP))
    for x in (-0.33, 0.33): ms.append(tube([x, roof_y(z) - 0.01, z], [x, y - 0.03, z], 0.014, BLACK))   # posts land on the roof
    return cat(ms)

def spare_carrier():
    # tire (rendered by the game from the wheel set) is centred at (0, 0.95, -2.03); rear panel is at z=-1.845
    ms = [box([0.22, 0.22, 0.025], [0, 0.95, -1.852], STEEL)]                       # mounting plate on the rear panel
    ms.append(tube([0, 0.95, -1.85], [0, 0.95, -2.06], 0.035))                      # hub bolt through the tire centre
    ms.append(tube([0, 0.62, -1.90], [0, 0.90, -2.02], 0.02))                       # lower strut from the bumper
    for dx in (-0.12, 0.12): ms.append(tube([dx, 0.95, -1.85], [dx * 1.5, 0.95, -2.04], 0.016))
    return cat(ms)

def bull_bar():
    zf, x = 1.915, 0.40; ms = []
    for sx in (-x, x):
        ms.append(tube([sx, 0.36, zf], [sx, 0.70, zf], 0.022))                  # uprights
        ms.append(tube([sx, 0.40, zf], [sx * 0.9, 0.42, 1.72], 0.022))          # lower mounts into the nose
        ms.append(tube([sx, 0.68, zf], [sx * 0.9, 0.68, 1.74], 0.022))          # upper mounts
    ms.append(tube([-x, 0.70, zf], [x, 0.70, zf], 0.022))                       # top bar
    ms.append(tube([-x, 0.36, zf], [x, 0.36, zf], 0.022))                       # bottom bar
    ms.append(tube([-x, 0.53, zf], [x, 0.53, zf], 0.016))                       # mid bar
    ms.append(tube([0, 0.36, zf], [0, 0.70, zf], 0.016))
    return cat(ms)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    for name, fn in [('ACC_RoofRack', roof_rack), ('ACC_LightBar', light_bar), ('ACC_SpareCarrier', spare_carrier), ('ACC_BullBar', bull_bar)]:
        sc = tm.Scene(); sc.add_geometry(fn(), node_name=name); sc.export('%s/%s.glb' % (out, name))
        print(name, 'ok')
