# Chris's Meshy people (assets/meshy/, not committed) -> small game GLBs. No skeletons: they stand as modelled.
# blender -b --factory-startup -P export_people.py -- <srcDir> <outDir>
# metres, facing +z, centred, feet at y=0. Heights are PROPOSALs.
import bpy, sys, os, mathutils
LIST = {  # out name: (source file middle, height m)
 'PERSON_M_Shopkeeper': ('brown_Carhartt', 1.78), 'PERSON_M_GreyTee': ('Gray_Shirt', 1.76), 'PERSON_M_Woman': ('_woman_', 1.68),
 'PERSON_M_Overalls': ('_Worker_20251028', 1.80), 'PERSON_M_Coveralls': ('WORKER_CHARLIE', 1.78),
 'PERSON_M_YoungMan': ('Young_Man', 1.80), 'PERSON_M_Trekker': ('Casual_Trekker', 1.81), 'PERSON_M_HiVis': ('man_work', 1.79),
}
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
for name, (key, height) in LIST.items():
    path = next(os.path.join(src, f) for f in os.listdir(src) if key in f)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    o = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    mw = o.matrix_world.copy(); o.parent = None; o.data.transform(mw); o.matrix_world = mathutils.Matrix()
    def bounds():
        v = [p.co for p in o.data.vertices]
        return [min(c[i] for c in v) for i in range(3)], [max(c[i] for c in v) for i in range(3)]
    lo, hi = bounds(); o.data.transform(mathutils.Matrix.Scale(height / (hi[2] - lo[2]), 4))
    lo, hi = bounds(); o.data.transform(mathutils.Matrix.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])))
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0003); bpy.ops.object.mode_set(mode='OBJECT')
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    m = o.modifiers.new('d', 'DECIMATE'); m.ratio = min(1, 18000 / tris); bpy.ops.object.modifier_apply(modifier=m.name)
    base = set()
    for mat in bpy.data.materials:
        for n in (mat.node_tree.nodes if mat.use_nodes else []):
            if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links:
                t = n.inputs['Base Color'].links[0].from_node
                if t.type == 'TEX_IMAGE': base.add(t.image)
    for im in bpy.data.images:
        cap = 1024 if im in base else 512
        if im.size[0] > cap: im.scale(cap, cap); im.pack()
    o.name = o.data.name = name
    p = os.path.join(out, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=p, export_format='GLB', export_image_format='WEBP', export_image_quality=85)
    print('OUT', name, os.path.getsize(p) // 1024, 'KB', flush=True)
