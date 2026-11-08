"""Print the Hilux source scene: objects, sizes, poly counts, materials (run: blender -b src/Hilux.blend -P inspect_truck.py)."""
import bpy
from mathutils import Vector

tot = 0
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    if o.type != 'MESH':
        print(f'{o.type:8s} {o.name}  parent={o.parent.name if o.parent else None}')
        continue
    me = o.data
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    tot += tris
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
    mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
    mats = ','.join(m.name for m in me.materials if m)
    mods = ','.join(m.type for m in o.modifiers)
    print(f'MESH {o.name:32s} tris={tris:7d} min=({mn.x:.2f},{mn.y:.2f},{mn.z:.2f}) max=({mx.x:.2f},{mx.y:.2f},{mx.z:.2f}) parent={o.parent.name if o.parent else None} mats=[{mats}] mods=[{mods}]')
print('TOTAL tris', tot)
for m in bpy.data.materials:
    imgs = [n.image.name for n in (m.node_tree.nodes if m.node_tree else []) if n.type == 'TEX_IMAGE' and n.image]
    print('MAT', m.name, imgs)
