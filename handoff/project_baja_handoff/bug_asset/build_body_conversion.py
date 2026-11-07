"""VEH_001 Baja body conversion — procedural modular GLB *blockout* pack.
Coordinate convention copied from VEH_001_Bug_Base_v01: meters, X transverse,
Y up, +Z forward, origin at ground center. Independent meshes, separate GLBs.
These are silhouette/fit prototypes, not production topology or final textures.
"""
from pathlib import Path
import numpy as np
import trimesh
from trimesh.creation import cylinder, box, icosphere
from build_bug import deck_grid, deck_mesh, wing_mesh, wing_grid, profile, HOOD, DECK
from build_bug import body_section, upper_row
from build_bug import add as add_material

ROOT = Path(__file__).resolve().parent
BLUE=(115,156,166,255)
GRAY=(119,122,120,255)
FIBER=(193,178,149,255)
DARK=(36,37,35,255)
STEEL=(104,105,100,255)
ENGINE=(84,83,77,255)
RUST=(107,78,57,255)


def add(sc, name, mesh, color):
    add_material(sc,name,mesh,np.asarray(color,dtype=float)/255)

def segments(sc,name,points,radius,color,sections=10):
    ms=[]
    for a,b in zip(points[:-1],points[1:]):
        a=np.asarray(a,dtype=float); b=np.asarray(b,dtype=float)
        v=b-a
        if np.linalg.norm(v)<1e-8:continue
        m=cylinder(radius=radius, height=np.linalg.norm(v), sections=sections)
        m.apply_transform(trimesh.geometry.align_vectors([0,0,1],v))
        m.apply_translation((a+b)/2)
        ms.append(m)
    if ms:add(sc,name,trimesh.util.concatenate(ms),color)

def surface(sc, name, grid, color, close_back=True):
    """Regular grid vertices [row][col][xyz], double-sided to survive winding differences."""
    arr=np.asarray(grid,dtype=float)
    u,v,_=arr.shape
    fs=[]
    for i in range(u-1):
        for j in range(v-1):
            a=i*v+j;b=a+1;c=(i+1)*v+j;d=c+1
            fs.extend([[a,c,b],[b,c,d]])
    if close_back:
        fs+= [f[::-1] for f in fs]
    add(sc,name,trimesh.Trimesh(vertices=arr.reshape(-1,3),faces=np.array(fs),process=False),color)

def curved_fender(sc, axle, side, flare=False):
    """Use the stock wing's attachment surface and clear the all-terrain tires."""
    sign=-1 if side=='L' else 1
    zc=1.19 if axle=='F' else -1.19
    grid=wing_grid(axle,sign,'wide' if flare else 'cut')
    wing=wing_mesh(axle,sign,'wide' if flare else 'cut')
    inner=wing.copy()
    inner.vertices[:,1]-=.012
    inner.invert()
    add(sc,f'BODY_Baja{ "Wide" if flare else "Cut" }_Fender_{axle}{side}',
        trimesh.util.concatenate([wing,inner]),
        FIBER if flare else (GRAY if axle=='F' and side=='L' else BLUE))
    lip=[row[-1] for row in grid]
    segments(sc,f'TRIM_FenderLip_{axle}{side}',lip,.014,DARK if flare else STEEL)
    for ind,n in [(0,'FrontCut'),(-1,'RearCut')]:
        segments(sc,f'TRIM_{n}_{axle}{side}',grid[ind],.012,DARK)
    # Lamps move with the shortened wings rather than floating at stock locations.
    lamp=cylinder(radius=.115 if axle=='F' else .065,height=.08,sections=32)
    if axle=='R':
        lamp.apply_transform(trimesh.geometry.align_vectors([0,0,1],[0,0,-1]))
    lamp.apply_translation([sign*.76,.68,zc+(.44 if axle=='F' else -.44)])
    add(sc,f'EXTERIOR_BajaLamp_{axle}{side}',lamp,(221,218,190,255) if axle=='F' else (170,30,22,255))

def export(sc, filename):
    dst=ROOT/filename;sc.export(dst,include_normals=True)
    loaded=trimesh.load(dst,force='scene')
    assert len(loaded.geometry)>0 and dst.stat().st_size>500
    print(f'{filename}: {len(loaded.geometry)} meshes, {sum(len(m.faces) for m in loaded.geometry.values())} triangles, {dst.stat().st_size} bytes')

# 1. Cut metal fenders — replacement for original curved street fender mesh nodes.
s=trimesh.Scene()
for a in ('F','R'):
    for side in ('L','R'):curved_fender(s,a,side)
export(s,'PART_007_CutBajaFenders.glb')

# 2. Shortened front hood with a softly curved crown and cut lower apron trim.
s=trimesh.Scene()
hood=deck_grid(front=True,shortened=True)
add(s,'BODY_BajaShortHood',deck_mesh(front=True,shortened=True),BLUE)
segments(s,'TRIM_HoodEdge',hood[-1],.014,STEEL)
segments(s,'TRIM_HoodCenter',[(0,profile(HOOD,z)[1]+.006,z) for z in np.linspace(.90,1.72,35)],.008,STEEL)
# stylized clipped lower nose skin beneath the short hood
surface(s,'BODY_CutFrontApron',[hood[-1],
        [[x*.90,body_section(1.72)[2],z+.08] for x,y,z in hood[-1]]],BLUE)
export(s,'PART_008_ShortenedFrontHood.glb')

# 3. Rear engine access opening / removable frame and short vented cover.
s=trimesh.Scene()
# The base has a full rear lid; remove/hide that while mounting this short lid.
for side,sg in [('L',-1),('R',1)]:
    segments(s,f'BODY_EngineOpeningRail_{side}',
             [(sg*profile(DECK,z)[0],profile(DECK,z)[1]-.11,z) for z in np.linspace(-1.40,-1.94,30)],.024,STEEL)
segments(s,'BODY_EngineOpeningUpper',deck_grid(front=False)[-1],.025,STEEL)
segments(s,'BODY_EngineOpeningLower',upper_row(-1.94),.025,STEEL)
# a half-height deck lid held above a visibly exposed rear engine
add(s,'BODY_BajaPartialDeckLid',deck_mesh(front=False,shortened=True),BLUE)
for i,z in enumerate(np.linspace(-1.42,-1.50,4)):
    y=profile(DECK,z)[1]+.006-.11*(.23/profile(DECK,z)[0])**2
    segments(s,f'TRIM_DeckVent_{i}',[(-.23,y,z),(.23,y,z)],.009,DARK)
# Basic rear-engine silhouette proxy: actual engine will be its own later GLB
m=box(extents=[.62,.39,.42]);m.apply_translation([0,.62,-1.64]);add(s,'ENGINE_PlaceholderBlock',m,ENGINE)
for side,sg in [('L',-1),('R',1)]:
    m=cylinder(radius=.12,height=.28,sections=16)
    m.apply_transform(trimesh.geometry.align_vectors([0,0,1],[1,0,0]));m.apply_translation([sg*.31,.64,-1.65])
    add(s,f'ENGINE_PlaceholderHead_{side}',m,STEEL)
segments(s,'TRIM_RearLowerEdge',[(-.4,.56,-1.93),(0,.55,-1.96),(.4,.56,-1.93)],.02,DARK)
export(s,'PART_009_RearEngineOpening.glb')

# 4. Wide fiberglass-style replacements, separate alternative to cut metal set.
s=trimesh.Scene()
for a in ('F','R'):
    for side in ('L','R'):curved_fender(s,a,side,flare=True)
export(s,'PART_010_FiberglassWideFenders.glb')

# 5. Lower side-panel / rocker protectors, a separate optional conversion.
s=trimesh.Scene()
for side,sg in [('L',-1),('R',1)]:
    grid=[]
    for z in np.linspace(-.69,.72,16):
        grid.append([[sg*.665,.54,z],[sg*.70,.41,z],[sg*.84,.32,z]])
    surface(s,f'BODY_RockerGuard_{side}',grid,FIBER)
    segments(s,f'TRIM_RockerRail_{side}',[(sg*.88,.34,-.70),(sg*.88,.34,.70)],.023,DARK)
export(s,'PART_011_RockerGuards.glb')
