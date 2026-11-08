"""
Export the downloaded pickup (src/Hilux.blend, 204k tris, 4K PNGs) as a game-ready GLB:
  - no brand badge (the 'TOTOYA' object is deleted) - in game it is a generic '84 4x4 pickup
  - modifiers applied, body/interior/wheels decimated (~75k tris total)
  - the single 'Wheels' mesh is split into Wheel_FL/FR/RL/RR (pivot at each hub) so they spin and come off
  - 1K JPEG textures (normal maps 1K too)
  - game axes: +Z forward, Y up, ground at y=0, the wheelbase centred on the origin
Run:  blender -b src/Hilux.blend -P export_truck.py
Writes ../../viewer/bug_viewer/public/models/VEH_010_Pickup.glb
"""
import bpy, bmesh, os
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'viewer', 'bug_viewer', 'public', 'models', 'VEH_010_Pickup.glb'))
RATIO = {'Body': 0.42, 'Interior': 0.22, 'Wheels': 0.30}
TEX = 1024

def select_only(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o

# 1. drop the badge + anything that is not one of our meshes
for o in list(bpy.data.objects):
    if o.name not in RATIO: bpy.data.objects.remove(o, do_unlink=True)

# 2. apply modifiers, decimate
for name, r in RATIO.items():
    o = bpy.data.objects[name]; select_only(o)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = r; d.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier='dec')
    o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)

# 3. game axes: the source faces +Y; the glTF exporter maps Blender -Y -> +Z, so turn 180 deg about Z.
#    then ground (lowest tyre point) to 0 and the wheelbase centre to the origin
rot = Matrix.Rotation(3.14159265, 4, 'Z')
for name in RATIO: bpy.data.objects[name].data.transform(rot)
wv = [v.co for v in bpy.data.objects['Wheels'].data.vertices]
zmin = min(v.z for v in wv); ymid = (min(v.y for v in wv) + max(v.y for v in wv)) / 2
shift = Matrix.Translation((0, -ymid, -zmin))
for name in RATIO: bpy.data.objects[name].data.transform(shift)

# 4. split the wheels by loose part, then group parts into the four corners
w = bpy.data.objects['Wheels']; select_only(w)
bpy.ops.mesh.separate(type='LOOSE')
corners = {}
for o in [o for o in bpy.data.objects if o.name.startswith('Wheels')]:
    c = sum((Vector(v.co) for v in o.data.vertices), Vector()) / max(1, len(o.data.vertices))
    # blender -Y is game +Z forward  ->  front wheels have y < 0; game +x (driver side) = blender -x after export? (x is kept)
    key = ('F' if c.y < 0 else 'R') + ('L' if c.x > 0 else 'R')
    corners.setdefault(key, []).append(o)
for key, objs in corners.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = o.data.name = 'Wheel_' + key
    vs = [v.co for v in o.data.vertices]
    hub = Vector(((min(v.x for v in vs) + max(v.x for v in vs)) / 2, (min(v.y for v in vs) + max(v.y for v in vs)) / 2, (min(v.z for v in vs) + max(v.z for v in vs)) / 2))
    o.data.transform(Matrix.Translation(-hub)); o.location = hub
    print('wheel', key, len(objs), 'parts, hub', tuple(round(x, 3) for x in hub))
bpy.data.objects['Body'].name = 'T_Body'; bpy.data.objects['Interior'].name = 'T_Interior'

# 5. textures: 1K, JPEG on export
for img in bpy.data.images:
    if img.size[0] > TEX:
        img.scale(TEX, TEX * img.size[1] // img.size[0])

tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print('TOTAL tris', tris)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=80,
                          export_apply=True, export_yup=True, export_cameras=False, export_lights=False, use_selection=False)
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
