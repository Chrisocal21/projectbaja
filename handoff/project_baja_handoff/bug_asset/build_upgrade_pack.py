"""Procedural first-pass modular Baja conversion parts for VEH_001.
Axes: x=left/right, y=up, +z=front. Units meters. All GLBs align with Bug base origin.
These are geometric blockouts, NOT production topology / baked PBR assets.
"""
from pathlib import Path
import numpy as np
import trimesh
from trimesh.creation import cylinder, box, icosphere
from trimesh.transformations import rotation_matrix
ROOT=Path(__file__).resolve().parent
RUBBER=[36,35,33,255]; STEEL=[75,78,76,255]; BLACK=[24,26,27,255]; ALLOY=[135,139,135,255]; LIGHT=[221,218,190,255]; AMBER=[215,107,32,255]; RED=[170,30,22,255]

def put(sc,name,mesh,c):
 mesh.visual=trimesh.visual.ColorVisuals(mesh, vertex_colors=np.tile(c,(len(mesh.vertices),1)).astype(np.uint8));sc.add_geometry(mesh,geom_name=name,node_name=name)
def rod(sc,name,points,r,c,sections=12):
 meshes=[]
 for a,b in zip(points[:-1],points[1:]):
  a=np.array(a,float); b=np.array(b,float); v=b-a
  if np.linalg.norm(v)<1e-5:continue
  m=cylinder(radius=r,height=np.linalg.norm(v),sections=sections)
  m.apply_transform(trimesh.geometry.align_vectors([0,0,1],v));m.apply_translation((a+b)*.5);meshes.append(m)
 if meshes:put(sc,name,trimesh.util.concatenate(meshes),c)
def disk(sc,name,center,r,depth,c,segments=32):
 mesh=cylinder(radius=r,height=depth,sections=segments)
 mesh.apply_transform(rotation_matrix(np.pi/2,[0,1,0]));mesh.apply_translation(center);put(sc,name,mesh,c)
def orb(sc,name,center,s,c):
 m=icosphere(subdivisions=2,radius=1);m.apply_scale(s);m.apply_translation(center);put(sc,name,m,c)
def plate(sc,name,ctr,sz,c):
 m=box(extents=sz);m.apply_translation(ctr);put(sc,name,m,c)
def save(sc,name):
 file=ROOT/name;sc.export(file);print(name, len(sc.geometry),'meshes',file.stat().st_size,'bytes')

# 01 - Four wide all-terrain wheels in the vehicle's installed coordinates.
# Wheel assembly geometry is wholly independent of base stock wheels; hide stock wheel nodes when swapping.
s=trimesh.Scene()
for axle,z in [('F',1.19),('R',-1.19)]:
 for sign,side in [(-1,'L'),(1,'R')]:
  x=sign*.82; ctr=[x,.385,z]
  disk(s,f'{axle}{side}_Tire',ctr,.385,.255,RUBBER,48)
  disk(s,f'{axle}{side}_WheelFace',[x+sign*.135,.385,z],.235,.025,ALLOY,32)
  disk(s,f'{axle}{side}_Hub',[x+sign*.156,.385,z],.07,.035,STEEL,16)
  # radial tread blocks, 24 tread positions; modeled intentionally chunky for first silhouette inspection
  for i in range(24):
   a=i*np.pi/12; yy=.385+.381*np.cos(a);zz=z+.381*np.sin(a)
   block=box(extents=[.26,.055,.095]); block.apply_transform(rotation_matrix(-a,[1,0,0]));block.apply_translation([x,yy,zz]);put(s,f'{axle}{side}_Tread_{i:02}',block,RUBBER)
  for i in range(8):
   a=i*2*np.pi/8
   orb(s,f'{axle}{side}_RimBolt_{i}',[x+sign*.174,.385+.175*np.cos(a),z+.175*np.sin(a)],[.015,.014,.014],STEEL)
save(s,'PART_001_AllTerrainWheelSet.glb')

# 02 - Front tube bumper with two angled frame mounts
s=trimesh.Scene()
rod(s,'Front_MainBar',[(-.79,.43,2.22),(-.63,.42,2.28),(0,.41,2.31),(.63,.42,2.28),(.79,.43,2.22)],.042,BLACK)
rod(s,'Front_TopBar',[(-.58,.62,2.19),(-.37,.68,2.24),(.37,.68,2.24),(.58,.62,2.19)],.032,BLACK)
for sign,side in [(-1,'L'),(1,'R')]:
 rod(s,f'Front_Upright_{side}',[(sign*.59,.42,2.27),(sign*.56,.60,2.25)],.027,BLACK)
 rod(s,f'Front_Mount_{side}',[(sign*.40,.40,1.92),(sign*.40,.40,2.29)],.035,STEEL)
save(s,'PART_002_FrontTubeBumper.glb')

# 03 - Rear engine protection cage / rear bumper
s=trimesh.Scene()
rod(s,'Rear_LowerBar',[(-.75,.40,-2.28),(0,.39,-2.32),(.75,.40,-2.28)],.04,BLACK)
rod(s,'Rear_UpperBar',[(-.61,.90,-2.10),(-.51,1.02,-2.13),(0,1.04,-2.16),(.51,1.02,-2.13),(.61,.90,-2.10)],.032,BLACK)
for sign,side in [(-1,'L'),(1,'R')]:
 rod(s,f'Rear_OuterGuard_{side}',[(sign*.72,.39,-2.27),(sign*.72,.72,-2.24),(sign*.61,.90,-2.10)],.032,BLACK)
 rod(s,f'Rear_Diagonal_{side}',[(sign*.65,.42,-2.27),(sign*.38,.92,-2.15)],.029,BLACK)
 rod(s,f'Rear_FrameMount_{side}',[(sign*.40,.36,-1.91),(sign*.40,.40,-2.30)],.034,STEEL)
save(s,'PART_003_RearEngineCage.glb')

# 04 - Pair of auxiliary round lights on removable bumper-mounted supports
s=trimesh.Scene()
for sign,side in [(-1,'L'),(1,'R')]:
 x=sign*.30
 rod(s,f'LampMount_{side}',[(x,.65,2.25),(x,.78,2.26)],.019,STEEL)
 # lamp cylinder axis along z (forward), default cylinder axis z
 housing=cylinder(radius=.115,height=.11,sections=32);housing.apply_translation([x,.84,2.29]);put(s,f'LampHousing_{side}',housing,BLACK)
 face=cylinder(radius=.096,height=.012,sections=32);face.apply_translation([x,.84,2.352]);put(s,f'LampLens_{side}',face,LIGHT)
save(s,'PART_004_BumperAuxLights.glb')

# 05 - front protection / skid plate, with a slight rake
s=trimesh.Scene()
rod(s,'SkidFrontBrace',[(-.53,.30,2.05),(.53,.30,2.05)],.024,STEEL)
plate(s,'SkidPlate_Main',[0,.235,1.86],[1.04,.052,.65],STEEL)
for x,side in [(-.39,'L'),(.39,'R')]:
 rod(s,f'SkidEdgeRail_{side}',[(x,.21,1.60),(x,.30,2.12)],.023,BLACK)
save(s,'PART_005_FrontSkidPlate.glb')

# 06 - replacement taller trail shocks, visually inspect installed clearance; basic cylinders, not mechanical rig
s=trimesh.Scene()
for axle,z in [('F',1.19),('R',-1.19)]:
 for sign,side in [(-1,'L'),(1,'R')]:
  x=sign*.62
  rod(s,f'{axle}{side}_ShockBody',[(x,.38,z),(x,.77,z+(-.04 if axle=='F' else .04))],.049,AMBER)
  rod(s,f'{axle}{side}_ShockRod',[(x,.77,z+(-.04 if axle=='F' else .04)),(x,.92,z+(-.06 if axle=='F' else .06))],.021,ALLOY)
  for i in range(6):
   y=.46+i*.055
   coil=cylinder(radius=.076,height=.013,sections=24);coil.apply_transform(rotation_matrix(np.pi/2,[1,0,0]));coil.apply_translation([x,y,z]);put(s,f'{axle}{side}_SpringRing_{i}',coil,STEEL)
save(s,'PART_006_TrailShockSet.glb')
