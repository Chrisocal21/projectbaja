"""Turn Chris's Nov 26 asset drop into game GLBs (run with Blender 5.2, -b).
Usage: blender -b --factory-startup -P export_nov26_drop.py -- <which> <src> <out.glb> [texdir]
  dirtbike   assets/dirtbike/DirtBike.blend            -> VEH_DirtBike.glb
  oldpickup  assets/truck/car.blend  texdir = unzipped assets/truck/textures.zip, with TX_Car_C/N/MR.jpg made at 1024 px
             (MR = R:255 G:roughness B:metallic)    -> VEH_OldPickup.glb
  dumpster   assets/trash/glb.zip -> Trash_Can_H.glb, texdir = unzipped Textures.zip + Trash_Can_Mat_RM.png -> PROP_Dumpster.glb
  tirestack / truckwheel  assets/Tires/TIRE+1.1.glb  -> PROP_TruckTireStack.glb / PROP_TruckWheel.glb
args: <which> <src> <out.glb> [texdir]
which: dirtbike | oldpickup | dumpster | tirestack
Output rules: metres, +z forward in three (front at Blender -Y), centred on x/z, ground at y = 0."""
import bpy, sys, os, math
from mathutils import Vector, Matrix

which, src, out = sys.argv[sys.argv.index('--') + 1:][:3]
tex = (sys.argv[sys.argv.index('--') + 1:] + [''])[3]

def bbox(objs):
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    return lo, hi

def load_img(path, size=1024, colour=True):
    im = bpy.data.images.load(path)
    if max(im.size) > size: im.scale(size, size)
    if not colour: im.colorspace_settings.name = 'Non-Color'
    return im

def tex_material(name, base, rough=None, normal=None, metal=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = base; nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
    if rough:
        r = nt.nodes.new('ShaderNodeTexImage'); r.image = rough
        sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(r.outputs['Color'], sep.inputs['Color'])
        nt.links.new(sep.outputs['Green'], p.inputs['Roughness'])
        if metal: nt.links.new(sep.outputs['Blue'], p.inputs['Metallic'])
        else: p.inputs['Metallic'].default_value = 0.0
    if normal:
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = normal
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    return m

def place(objs, scale=1.0, flip=False):
    """parent everything to one root, scale, (turn 180 if the nose points +Y), centre x/y, ground to z = 0"""
    root = bpy.data.objects.new('root', None); bpy.context.scene.collection.objects.link(root)
    for o in objs:
        if o.parent is None or o.parent not in objs:
            mw = o.matrix_world.copy(); o.parent = root; o.matrix_world = mw
    root.scale = (scale,) * 3
    if flip: root.rotation_euler = (0, 0, math.pi)
    bpy.context.view_layer.update()
    lo, hi = bbox(objs); c = (lo + hi) / 2
    root.location = Vector((-c.x, -c.y, -lo.z)); bpy.context.view_layer.update()
    lo, hi = bbox(objs)
    print('PLACED', which, 'size xyz %.2f %.2f %.2f' % tuple(hi - lo), 'min', tuple(round(v, 2) for v in lo))
    return root

def keep_only(objs):
    for o in list(bpy.context.scene.objects):
        if o not in objs and o.type != 'EMPTY': bpy.data.objects.remove(o, do_unlink=True)

def export(objs, root):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs + [root]: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_image_format='AUTO', export_animations=False, export_extras=False)
    print('WROTE', out, os.path.getsize(out))

if which == 'dirtbike':
    bpy.ops.wm.open_mainfile(filepath=src)
    try: bpy.ops.file.pack_all()
    except Exception as e: print('PACK', e)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.visible_get()]
    keep_only(objs)
    fw = next(o for o in objs if o.name == 'FrontWheel_GEO'); rw = next(o for o in objs if o.name == 'RearWheel_GEO')
    fy = sum((fw.matrix_world @ Vector(c)).y for c in fw.bound_box) / 8; ry = sum((rw.matrix_world @ Vector(c)).y for c in rw.bound_box) / 8
    print('WHEELS front y %.2f rear y %.2f' % (fy, ry))
    root = place(objs, 1.0, flip=fy > ry)
    for o in objs:   # hub centre of each wheel, for spinning later
        if o.name.endswith('Wheel_GEO'):
            l, h = bbox([o]); print('HUB', o.name, tuple(round(v, 3) for v in (l + h) / 2))
    export(objs, root)

elif which == 'oldpickup':
    if src.lower().endswith('.blend'): bpy.ops.wm.open_mainfile(filepath=src)   # car.blend keeps the UV map; car.glb lost it
    else: bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    keep_only(objs)
    base = load_img(os.path.join(tex, 'TX_Car_C.jpg'))
    mr = load_img(os.path.join(tex, 'TX_Car_MR.jpg'), colour=False)
    nrm = load_img(os.path.join(tex, 'TX_Car_N.jpg'), colour=False)
    mat = tex_material('OldPickup', base, mr, nrm, metal=True)
    for o in objs:
        o.data.materials.clear(); o.data.materials.append(mat)
    lo, hi = bbox(objs); length = max(hi.x - lo.x, hi.y - lo.y)
    root = place(objs, 5.1 / length, flip=False)
    export(objs, root)

elif which == 'dumpster':
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name == 'Trash_can_H']
    keep_only(objs)
    lo, hi = bbox(objs); print('LOD0 raw', tuple(round(v, 2) for v in hi - lo))
    mat = tex_material('Dumpster', load_img(os.path.join(tex, 'Trash_Can_Mat_Base_Color.png')),
                       load_img(os.path.join(tex, 'Trash_Can_Mat_RM.png'), colour=False),
                       load_img(os.path.join(tex, 'Trash_Can_Mat_Normal_OpenGL.png'), colour=False))
    for o in objs: o.data.materials.clear(); o.data.materials.append(mat)
    width = max(hi.x - lo.x, hi.y - lo.y)
    root = place(objs, 1.85 / width)   # PROPOSAL: a 2-yard dumpster is about 1.85 m wide
    export(objs, root)

elif which == 'tirestack':
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    names = {'Cylinder.001', 'Cylinder.002', 'Cylinder.003', 'Cylinder.007', 'Cylinder.009'}
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name in names]
    keep_only(objs)
    root = place(objs, 0.5)   # 2.0 units across -> a 1.0 m truck tire
    export(objs, root)

elif which == 'truckwheel':
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name in {'Cylinder.010', 'Cylinder.011'}]
    keep_only(objs)
    root = place(objs, 0.5)
    export(objs, root)
