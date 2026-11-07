"""Vehicle 001 procedural roll-cage blocks. Meters, Y-up, +Z-forward.
Exports distinct accessory GLBs; illustrative geometry, not certified safety cages.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import numpy as np
import trimesh
from trimesh.creation import cylinder, box, icosphere
ROOT=Path(__file__).resolve().parent
BLACK=[39,42,43,255]; DARK=[69,73,74,255]; METAL=[124,127,122,255]; BOLT=[159,160,150,255]

def add(sc,name,mesh,color):
    mesh.visual=trimesh.visual.ColorVisuals(mesh, vertex_colors=np.tile(color,(len(mesh.vertices),1)).astype(np.uint8))
    sc.add_geometry(mesh,geom_name=name,node_name=name)

def tube(sc,name,points,r=.028,color=BLACK):
    group=[]
    for a,b in zip(points[:-1],points[1:]):
        a,b=np.array(a,float),np.array(b,float)
        d=b-a
        if np.linalg.norm(d)<1e-5: continue
        m=cylinder(radius=r,height=np.linalg.norm(d),sections=12)
        m.apply_transform(trimesh.geometry.align_vectors([0,0,1],d))
        m.apply_translation((a+b)/2)
        group.append(m)
    for p in points[1:-1]:
        n=icosphere(subdivisions=1,radius=r)
        n.apply_translation(p)
        group.append(n)
    if group: add(sc,name,trimesh.util.concatenate(group),color)

def plate(sc,name,xyz,dim=(.13,.014,.12),color=METAL):
    m=box(extents=dim);m.apply_translation(xyz);add(sc,name,m,color)

def mount(sc,name,xyz):
    plate(sc,f'{name}_FootPlate',xyz)
    x,y,z=xyz
    for i,(dx,dz) in enumerate([(-.045,-.035),(.045,.035)]):
        m=cylinder(radius=.009,height=.018,sections=10)
        m.apply_transform(trimesh.geometry.align_vectors([0,0,1],[0,1,0]))
        m.apply_translation([x+dx,y+.015,z+dz]);add(sc,f'{name}_Bolt{i+1}',m,BOLT)

def export(sc,name):
    path=ROOT/name
    sc.export(path)
    test=trimesh.load(path,force='scene')
    assert len(test.geometry)>0
    print(name, len(test.geometry), 'meshes', path.stat().st_size,'bytes')
    return path

# Interior cage: fits within roof, no door bars (stock doors remain accessible).
s=trimesh.Scene()
# main hoop immediately behind front seats, top corners below roof
for side,x in [('L',-.53),('R',.53)]:
    tube(s,f'MainHoop_Leg_{side}',[(x,.45,-.47),(x,1.01,-.47),(x*.83,1.36,-.49)],.032)
    mount(s,f'MainHoop_Mount_{side}',(x,.45,-.47))
tube(s,'MainHoop_RoofCross',[(-.44,1.36,-.49),(.44,1.36,-.49)],.032)
for side,x in [('L',-.51),('R',.51)]:
    tube(s,f'FrontA_RoofRail_{side}',[(x*.84,1.35,-.48),(x*.83,1.34,.42),(x,1.04,.79),(x,.46,.80)],.028)
    mount(s,f'FrontA_Mount_{side}',(x,.46,.80))
    tube(s,f'RearStay_{side}',[(x*.83,1.33,-.50),(x*.96,.75,-1.10),(x*.96,.45,-1.21)],.028)
    mount(s,f'RearStay_Mount_{side}',(x*.96,.45,-1.21))
tube(s,'FrontRoofCross',[(-.43,1.34,.42),(.43,1.34,.42)],.027)
tube(s,'MainHoop_LowerCross',[(-.53,.66,-.48),(.53,.66,-.48)],.024)
tube(s,'MainHoop_Diagonal',[(-.51,.53,-.49),(.44,1.34,-.49)],.024)
interior=export(s,'PART_014_InteriorRollCage.glb')

# Front structure: forward reinforcement around nose; not a replacement for PART_002 bumper.
s=trimesh.Scene()
for side,x in [('L',-.42),('R',.42)]:
    mount(s,f'FrontFrameMount_{side}',(x,.40,1.25))
    tube(s,f'FrontLongitudinal_{side}',[(x,.43,1.25),(x*.95,.43,1.65),(x*1.10,.47,1.91)],.033)
    tube(s,f'FrontUpright_{side}',[(x*1.10,.47,1.91),(x*1.07,.81,1.75),(x*.84,.95,1.47)],.026)
    tube(s,f'FrontDiagonal_{side}',[(x,.45,1.39),(x*1.07,.81,1.75)],.022)
tube(s,'FrontNoseCross',[(-.46,.48,1.92),(.46,.48,1.92)],.032)
tube(s,'FrontUpperCross',[(-.46,.82,1.74),(.46,.82,1.74)],.026)
front=export(s,'PART_015_FrontCageReinforcement.glb')

# Rear engine-bay bracing: inboard of existing external PART_003 rear engine cage.
s=trimesh.Scene()
for side,x in [('L',-.48),('R',.48)]:
    mount(s,f'RearBraceMount_{side}',(x,.42,-1.32))
    tube(s,f'RearUpperStay_{side}',[(x,.45,-1.34),(x*1.08,.98,-1.58),(x*.97,1.03,-1.94)],.029)
    tube(s,f'RearLowerStay_{side}',[(x,.44,-1.37),(x*1.16,.44,-1.95)],.028)
    tube(s,f'RearDiagonal_{side}',[(x*1.08,.94,-1.62),(x*1.16,.44,-1.95)],.024)
tube(s,'RearUpperCross',[(-.47,1.03,-1.94),(.47,1.03,-1.94)],.028)
tube(s,'RearLowerCross',[(-.56,.44,-1.95),(.56,.44,-1.95)],.030)
rear=export(s,'PART_016_RearCageBracing.glb')

readme=ROOT/'ROLL_CAGE_PACK_README.txt'
readme.write_text('''VEH_001 Classic Bug - Baja Roll Cage Pack v0.1

PART_014_InteriorRollCage.glb
PART_015_FrontCageReinforcement.glb
PART_016_RearCageBracing.glb

Three.js / React Three Fiber compatible GLB (glTF 2.0)
Coordinates: meters, +Y up, +Z vehicle forward; shared vehicle origin.
Parts are independent add-on models aligned approximately to VEH_001_Bug_Base_v01.glb.
Visual blockouts only: simplified metal tube geometry and solid-color materials.
NOT a physically engineered or safety-approved cage.

Notes:
- Cage tubes intersect the current procedural body shell; correct body cutouts and mounting points in the detailed vehicle model.
- Keep PART_003_RearEngineCage as the outer bumper guard; PART_016 is inboard rear bracing.
- Hide or modify conflicting stock panels as necessary; inspect fit inside the R3F scene.
- No UV-baked wear, textures, weld details, vehicle rig or collisions yet.
- Generation source: build_roll_cage_pack.py (requires numpy and trimesh).
''')
zip_file=ROOT/'VEH_001_Baja_RollCagePack_v01.zip'
with ZipFile(zip_file,'w',ZIP_DEFLATED) as z:
    for p in [interior,front,rear,readme,ROOT/'build_roll_cage_pack.py']:
        z.write(p,arcname=p.name)
print('ZIP',zip_file,zip_file.stat().st_size)
