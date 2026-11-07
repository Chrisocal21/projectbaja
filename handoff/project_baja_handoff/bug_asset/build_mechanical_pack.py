"""VEH_001 mechanical asset blockouts, meters, +Z forward, +Y up.
Requires numpy and trimesh. Procedural concept geometry, not production PBR/topology.
"""
from pathlib import Path
import numpy as np
import trimesh
from trimesh.creation import box, cylinder, icosphere
from trimesh.transformations import rotation_matrix
import zipfile
P=Path(__file__).resolve().parent
COLORS={
 'cast':[114,118,112,255], 'darkcast':[67,71,68,255], 'steel':[145,149,145,255],
 'rubber':[31,34,33,255], 'black':[22,24,25,255], 'copper':[145,82,49,255],
 'offwhite':[182,167,137,255], 'rust':[110,67,46,255], 'yellow':[180,143,55,255],
 'blue':[79,103,114,255], 'red':[137,49,35,255], 'dust':[101,94,80,255]
}
def put(scene,name,mesh,color):
    color=COLORS.get(color,color)
    mesh.visual=trimesh.visual.ColorVisuals(mesh,vertex_colors=np.tile(np.asarray(color,np.uint8),(len(mesh.vertices),1)))
    scene.add_geometry(mesh,geom_name=name,node_name=name)
def cub(s,n,center,extent,c):
    m=box(extents=extent);m.apply_translation(center);put(s,n,m,c)
def cyl(s,n,center,r,h,c,axis='y',sections=24):
    m=cylinder(radius=r,height=h,sections=sections)
    if axis=='x':m.apply_transform(rotation_matrix(np.pi/2,[0,1,0]))
    elif axis=='y':m.apply_transform(rotation_matrix(np.pi/2,[1,0,0]))
    m.apply_translation(center);put(s,n,m,c)
def orb(s,n,center,ext,c):
    m=icosphere(subdivisions=2);m.apply_scale(ext);m.apply_translation(center);put(s,n,m,c)
def tube(s,n,pts,r,c,sections=10):
    meshes=[]
    for a,b in zip(pts[:-1],pts[1:]):
        a=np.asarray(a,float);b=np.asarray(b,float);v=b-a;dist=np.linalg.norm(v)
        if dist<1e-5:continue
        m=cylinder(radius=r,height=dist,sections=sections)
        m.apply_transform(trimesh.geometry.align_vectors([0,0,1],v));m.apply_translation((a+b)/2);meshes.append(m)
    if meshes:put(s,n,trimesh.util.concatenate(meshes),c)
def ring(s,n,ctr,r,pipe,c,plane='xz',segs=32):
    x,y,z=ctr;pts=[]
    for i in range(segs+1):
        t=i*2*np.pi/segs
        if plane=='xz':pts.append([x+r*np.cos(t),y,z+r*np.sin(t)])
        elif plane=='xy':pts.append([x+r*np.cos(t),y+r*np.sin(t),z])
        else:pts.append([x,y+r*np.cos(t),z+r*np.sin(t)])
    tube(s,n,pts,pipe,c,8)
def export(s,fn):
    out=P/fn;s.export(out)
    test=trimesh.load(out,force='scene')
    assert len(test.geometry)>5
    print(fn,'meshes:',len(test.geometry),'size:',out.stat().st_size)
    return out

# PART_012 -- air-cooled rear-mounted engine, stock-ish tune-up setup. Negative Z is rear.
s=trimesh.Scene()
# Main low, compact flat-four: behind rear axle at z=-1.64; exposed when rear deck removed.
cub(s,'ENGINE_Crankcase',[0,.61,-1.65],[.62,.34,.47],'cast')
cub(s,'ENGINE_Sump',[0,.39,-1.64],[.47,.13,.33],'darkcast')
for sign,side in [(-1,'L'),(1,'R')]:
    x=sign*.48
    cub(s,f'ENGINE_Head_{side}',[x,.66,-1.64],[.34,.27,.38],'cast')
    for i in range(6):
        z=-1.81+i*.07
        cub(s,f'ENGINE_CoolingFin_{side}_{i:02}',[x,.66,z],[.39,.31,.015],'steel')
    cub(s,f'ENGINE_ValveCover_{side}',[sign*.69,.67,-1.64],[.085,.22,.34],'darkcast')
    tube(s,f'ENGINE_PushrodTube_{side}',[(sign*.25,.53,-1.61),(sign*.53,.57,-1.61)],.035,'steel')
    # Spark lead routing, intentionally visibly serviced / replaced.
    for i in range(2):
        z=-1.77+i*.23
        tube(s,f'ENGINE_PlugWire_{side}_{i}',[(sign*.15,1.02,-1.49),(sign*.37,1.01,z),(sign*.64,.83,z)],.012,'red')
# fan shroud, upright fan case and pulleys
orb(s,'ENGINE_FanShroud',[0,.95,-1.67],[.36,.30,.19],'black')
cyl(s,'ENGINE_FanPulley',[0,.98,-1.885],.12,.055,'steel',axis='z')
cyl(s,'ENGINE_CrankPulley',[0,.50,-1.895],.105,.048,'darkcast',axis='z')
# visual belt strands
for x,side in [(-.075,'L'),(.075,'R')]:
    tube(s,f'ENGINE_BeltRun_{side}',[(x,.97,-1.92),(x,.52,-1.92)],.014,'rubber')
# round air cleaner on upright intake
cyl(s,'ENGINE_AirFilterHousing',[0,1.15,-1.55],.22,.115,'darkcast')
cyl(s,'ENGINE_AirFilterLid',[0,1.216,-1.55],.23,.026,'cast')
tube(s,'ENGINE_IntakeManifold',[(-.34,.82,-1.55),(0,.98,-1.55),(.34,.82,-1.55)],.035,'steel')
# distributor and fuel details
cyl(s,'ENGINE_Distributor',[.12,1.02,-1.39],.06,.12,'dust')
tube(s,'ENGINE_FuelLine',[(.26,1.17,-1.42),(.32,1.09,-1.62),(.34,.85,-1.72)],.011,'copper')
# dual header tubes to rear muffler
for side,x in [('L',-.49),('R',.49)]:
    tube(s,f'ENGINE_ExhaustHeader_{side}',[(x,.51,-1.75),(x,.34,-1.88),(x*.6,.34,-2.06)],.028,'rust')
cyl(s,'ENGINE_Muffler',[0,.32,-2.08],.095,.65,'darkcast',axis='x')
tube(s,'ENGINE_ExhaustTip',[(.32,.32,-2.09),(.48,.33,-2.17)],.035,'steel')
# servicing details
a=[-.16,.16]
for i,x in enumerate(a):
    cyl(s,f'ENGINE_Bolt_Case_{i}',[x,.80,-1.91],.026,.04,'steel',axis='z')
engine=export(s,'PART_012_AirCooledRearEngine.glb')

# PART_013 -- readable suspension assembly with control arms, trailing arms, dampers and hubs.
s=trimesh.Scene()
for axle,z in [('Front',1.19),('Rear',-1.19)]:
    for sign,side in [(-1,'L'),(1,'R')]:
        wheel_x=sign*.76; mount_x=sign*.35
        cyl(s,f'{axle}_{side}_Hub',[wheel_x,.35,z],.11,.16,'steel',axis='x')
        orb(s,f'{axle}_{side}_Knuckle',[sign*.70,.36,z],[.095,.18,.14],'darkcast')
        if axle=='Front':
            for level,yy in [('Lower',.29),('Upper',.66)]:
                tube(s,f'{axle}_{side}_{level}Arm_Fwd',[(mount_x,yy,z+.17),(sign*.68,yy-.015,z)],.037,'steel')
                tube(s,f'{axle}_{side}_{level}Arm_Aft',[(mount_x,yy,z-.17),(sign*.68,yy-.015,z)],.037,'steel')
            tube(s,f'{axle}_{side}_TieRod',[(sign*.39,.49,z-.20),(sign*.69,.48,z-.08)],.023,'steel')
        else:
            # rear trailing arm pivots mounted ahead of rear axle
            tube(s,f'{axle}_{side}_TrailingArm_Main',[(sign*.40,.41,z+.44),(sign*.70,.32,z)],.052,'steel')
            tube(s,f'{axle}_{side}_TrailingArm_Brace',[(sign*.40,.41,z+.44),(sign*.62,.42,z-.17)],.033,'darkcast')
            tube(s,f'{axle}_{side}_Halfshaft',[(sign*.23,.35,z),(sign*.70,.35,z)],.036,'steel')
        # damper + actual polyline coil (no fake stacked discs)
        lower=np.array([sign*.64,.32,z-.03]);upper=np.array([sign*.43,.99,z+.04])
        vec=upper-lower
        mid=lower*.57+upper*.43
        tube(s,f'{axle}_{side}_DamperBody',[lower,mid],.054,'blue')
        tube(s,f'{axle}_{side}_DamperRod',[mid,upper],.021,'steel')
        axis=vec/np.linalg.norm(vec);u=np.cross(axis,[0,0,1]);u=u/np.linalg.norm(u);v=np.cross(axis,u)
        coil=[]
        for i in range(91):
            t=i/90;center=lower+vec*(.16+.69*t)
            p=center+.087*(u*np.cos(2*np.pi*6*t)+v*np.sin(2*np.pi*6*t));coil.append(p.tolist())
        tube(s,f'{axle}_{side}_CoilSpring',coil,.012,'yellow',sections=7)
        orb(s,f'{axle}_{side}_TopMount',upper,[.085,.047,.085],'rubber')
        orb(s,f'{axle}_{side}_LowerMount',lower,[.076,.051,.07],'rubber')
# cross-members make the assembly intelligible in isolation
tube(s,'SUSP_FrontCrossmember',[(-.43,.44,1.20),(.43,.44,1.20)],.055,'darkcast')
tube(s,'SUSP_RearCrossmember',[(-.43,.43,-1.20),(.43,.43,-1.20)],.057,'darkcast')
susp=export(s,'PART_013_SuspensionAssembly.glb')

readme=P/'MECHANICAL_PACK_README.txt'
readme.write_text('''VEH_001 — Mechanical Pack v0.1\n================================\nTarget: Three.js / React Three Fiber. glTF 2.0 (.glb).\nCoordinates: +Z vehicle front, +Y up, +X vehicle right. Units: meters.\nOrigin matches VEH_001_Bug_Base_v01.glb.\n\nPART_012_AirCooledRearEngine.glb\n- Simplified air-cooled flat-four-inspired engine blockout.\n- Case, opposed heads/cooling fins, shroud, fan/belt, air filter, intake, plug wires, exhaust.\n- Install at scene origin (0,0,0); engine located near z=-1.65.\n- Stock body/lid and rear opening prototype may obscure engine.\n\nPART_013_SuspensionAssembly.glb\n- Front arms, steering tie rods, rear trailing arms, driveshafts, hub placeholders, coilovers.\n- Front axle z=+1.19; rear axle z=-1.19.\n- Install at scene origin (0,0,0).\n- Wheel hubs approximately x=+/-0.76.\n- Hide PART_006_TrailShockSet when showing this full assembly to avoid duplicates.\n\nIMPORTANT: These are procedural visual BLOCKOUTS, not mechanically validated\nassemblies, rigged models, final topology, baked textures or certified PBR assets.\nEngine is only exposed if the body geometry is adjusted to leave clearance.\nThe current Bug base has intersecting body geometry and requires actual cutouts.\nAll geometry should be visually inspected and refined before production use.\n\nFor regeneration: python build_mechanical_pack.py\nRequires trimesh and numpy.\n''',encoding='utf-8')
archive=P/'VEH_001_MechanicalPack_v01.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as zf:
    for f in [engine,susp,readme,P/'build_mechanical_pack.py']:zf.write(f,arcname=f.name)
print('ZIP',archive,archive.stat().st_size)
