"""Print a scene's top-level objects with tri counts and sizes. blender -b file.blend -P inspect_scene.py  (or -- file.glb to import one)"""
import bpy, sys
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if argv:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    f = argv[0]
    if f.endswith('.glb'): bpy.ops.import_scene.gltf(filepath=f)
    elif f.endswith('.fbx'): bpy.ops.import_scene.fbx(filepath=f)
tot = 0
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    if o.type != 'MESH': continue
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons); tot += tris
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    sz = [max(v[i] for v in bb) - min(v[i] for v in bb) for i in range(3)]
    ctr = [(max(v[i] for v in bb) + min(v[i] for v in bb)) / 2 for i in range(3)]
    print(f'OBJ {o.name:40s} tris={tris:8d} size=({sz[0]:.2f},{sz[1]:.2f},{sz[2]:.2f}) at=({ctr[0]:.1f},{ctr[1]:.1f},{ctr[2]:.1f}) mats={[m.name for m in o.data.materials if m]} coll={[c.name for c in o.users_collection]}')
print('TOTAL', tot, 'objects', len([o for o in bpy.data.objects if o.type == "MESH"]))
for img in bpy.data.images: print('IMG', img.name, img.size[0], img.size[1], img.filepath)
