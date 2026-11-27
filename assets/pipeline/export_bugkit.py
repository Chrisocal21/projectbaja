"""Parts from Chris's Meshy "white baja bug split parts" kit (assets/meshy/white_baja_bug_split_parts.glb, Nov 26).
The kit is an exploded parts sheet: 22 loose pieces laid on the ground. Only the clean ones are used.

  tire  model_part4 (one of the race wheels; part6 has sidewall lettering, so not that one)
        -> public/models/TIRE_DesertRacer.glb: tire only, the rim cut away so the game's rim picker
           (Rims.jsx) fits inside it. Axle along glTF Z, outer radius 0.475 m (like the other TIRE_ files),
           no texture (the game paints tires rubber).

Run: blender -b --factory-startup -P export_bugkit.py -- <kit.glb> <public/models dir>
"""
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Matrix

src, out_dir = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

def tire(part, name, target_tris=14000, cut=0.485):
    o = bpy.data.objects[part]
    for x in list(bpy.context.scene.objects):
        if x is not o: bpy.data.objects.remove(x, do_unlink=True)
    o.data.transform(o.matrix_world); o.matrix_world = Matrix()
    me = o.data
    v = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', v); v = v.reshape(-1, 3)
    c = (v.min(0) + v.max(0)) / 2
    me.transform(Matrix.Translation((-c[0], -c[1], -c[2])))
    v -= c
    R = np.hypot(v[:, 0], v[:, 1]).max()                      # the wheel lies flat: its axle is Blender Z
    # cut away the rim (hub, face and lip all sit inside r = 0.48 R; the tire shell starts at 0.50 R)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[vv for vv in bm.verts if math.hypot(vv.co.x, vv.co.y) < cut * R], context='VERTS')
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=R * 0.002)
    bm.to_mesh(me); bm.free()
    # drop crumbs left by the cut (loose islands far smaller than the tire)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.mesh.separate(type='LOOSE')
    parts = sorted([x for x in bpy.context.scene.objects if x.type == 'MESH'], key=lambda x: -len(x.data.vertices))
    keep = [x for x in parts if len(x.data.vertices) > len(parts[0].data.vertices) * 0.02]
    for x in parts:
        if x not in keep: bpy.data.objects.remove(x, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for x in keep: x.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    if len(keep) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name; o.data.name = name
    d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = min(1.0, target_tris / max(1, tris(o)))
    bpy.ops.object.modifier_apply(modifier=d.name)
    # radius 0.475 m, axle along Blender Y (= glTF Z after export)
    s = 0.475 / R
    o.data.transform(Matrix.Rotation(math.radians(90), 4, 'X') @ Matrix.Scale(s, 4))
    for p in o.data.polygons: p.use_smooth = True
    o.data.materials.clear()
    m = bpy.data.materials.new(name + '_Rubber'); m.diffuse_color = (0.06, 0.055, 0.05, 1); o.data.materials.append(m)
    v = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', v); v = v.reshape(-1, 3)
    print(f'TIRE {name}: tris={tris(o)} halfWidth={(v[:,1].max()-v[:,1].min())/2:.3f} inner r={np.hypot(v[:,0],v[:,2]).min():.3f} outer r={np.hypot(v[:,0],v[:,2]).max():.3f}')
    bpy.ops.export_scene.gltf(filepath=os.path.join(out_dir, name + '.glb'), use_selection=True, export_format='GLB',
                              export_materials='EXPORT', export_texcoords=False, export_normals=True, export_apply=True)

tire('model_part4', 'TIRE_DesertRacer')
