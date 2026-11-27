# Chris's Meshy downloads (assets/meshy/, not committed) -> small game GLBs.
# blender -b --factory-startup -P export_meshy.py -- <srcDir> <outDir> [name ...]
# Game convention: metres, +z forward, centred x/z, ground y=0. Wheels stay fused to the body (Meshy makes one mesh).
# Lengths are PROPOSAL real-world sizes. Names are ours: no real make or model names.
import bpy, sys, os, math, mathutils
# name: (source file middle, length m, target triangles, yaw degrees that turns the nose to Blender -y)
LIST = {
 'VEH_M_BlueRustPickup': ('Blue_Rusted_Ford', 5.3, 40000, 90),
 'VEH_M_CarnivalBug':    ('Brazilian_Beetle', 4.1, 40000, 90),
 'VEH_M_Wrecker':        ('Create_a_game_ready', 5.6, 45000, 90),
 'VEH_M_DuneBuggy':      ('Desert_Dominator', 4.4, 90000, 90),
 'VEH_M_GoldTowRig':     ('Golden_Tow_Rig', 5.6, 45000, 90),
 'VEH_M_WhiteBug':       ('Highly_detailed_full', 4.1, 40000, 90),
 'VEH_M_BlackRaceTruck': ('Matte_Black_Baja', 4.9, 60000, 90),
 'VEH_M_RedRaceTruck':   ('Red_Thunder', 5.0, 45000, 90),
 'VEH_M_BrownRustPickup':('Rusted_Desert_Pickup', 5.3, 55000, 90),
 'VEH_M_DarkRustPickup': ('Rusty_Pickup_Truck', 5.2, 45000, 90),
 'VEH_M_YellowTrailRig': ('Yellow_Trail_Rig', 4.7, 55000, 90),
 'VEH_M_ExpeditionRig':  ('camion_de_survivant', 4.9, 65000, 90),
 'VEH_M_BlueTwoTone':    ('f100_gta', 5.2, 40000, 90),
}
args = sys.argv[sys.argv.index('--') + 1:]
src, out, only = args[0], args[1], args[2:]
for name, (key, length, target, yaw) in LIST.items():
    if only and name not in only: continue
    path = next(os.path.join(src, f) for f in os.listdir(src) if key in f)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    o = ms[0]; bpy.context.view_layer.objects.active = o; o.select_set(True)
    mw = o.matrix_world.copy(); o.parent = None; o.data.transform(mw); o.matrix_world = mathutils.Matrix()
    o.data.transform(mathutils.Matrix.Rotation(math.radians(yaw), 4, 'Z'))
    def bounds():
        v = [p.co for p in o.data.vertices]
        return [min(c[i] for c in v) for i in range(3)], [max(c[i] for c in v) for i in range(3)]
    lo, hi = bounds()
    o.data.transform(mathutils.Matrix.Scale(length / (hi[1] - lo[1]), 4))
    lo, hi = bounds()
    o.data.transform(mathutils.Matrix.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])))
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0005); bpy.ops.object.mode_set(mode='OBJECT')
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tris > target:
        m = o.modifiers.new('d', 'DECIMATE'); m.ratio = target / tris
        bpy.ops.object.modifier_apply(modifier=m.name)
    # textures: colour 1024, everything else 512
    base = set()
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        for n in mat.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links:
                t = n.inputs['Base Color'].links[0].from_node
                if t.type == 'TEX_IMAGE': base.add(t.image)
    for im in bpy.data.images:
        cap = 1024 if im in base else 512
        if im.size[0] > cap: im.scale(cap, cap); im.pack()
    o.name = name; o.data.name = name
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, name + '.glb'), export_format='GLB', export_image_format='WEBP', export_image_quality=82, export_yup=True)
    lo, hi = bounds()
    print('OUT', name, sum(len(p.vertices) - 2 for p in o.data.polygons), [round(hi[i] - lo[i], 2) for i in range(3)], os.path.getsize(os.path.join(out, name + '.glb')) // 1024, 'KB', flush=True)
