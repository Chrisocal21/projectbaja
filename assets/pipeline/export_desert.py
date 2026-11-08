"""
Desert scenery for Baja County -> viewer/bug_viewer/public/models/ENV_Desert.glb, from the user's Unity asset library (never committed).

Two passes (the first needs PIL, so it runs in normal Python; the second runs inside Blender):
  python -I export_desert.py prep <supplyline-unity/Assets> <tmpdir>
  blender -b --factory-startup -P export_desert.py -- build <supplyline-unity/Assets> <tmpdir>

Nodes (base at the origin, Y-up, metres):
  DEAD_TREE_1..7   bare desert trees (Dry_Trees pack, its LOD2 mesh: ~0.5-2k tris), real heights 5-9 m
  ROCK_1..3        beige desert rocks (ZNS3D Free Vegetation Pack)
  BOULDER_1..9     big weathered rocks (ForestVision _Rocks), lichen desaturated to sun-bleached grey
  SHRUB            a desert shrub (ZNS3D), branches decimated
Every rock is scaled so its widest horizontal half-extent is 1 m (the game scales it like the old r=1 icosahedron boulders).
"""
import sys, os

def prep(unity, tmp):
    from PIL import Image
    import numpy as np
    Image.MAX_IMAGE_PIXELS = None
    os.makedirs(tmp, exist_ok=True)
    U = lambda *p: os.path.join(unity, *p)
    def save(src, name, size, fn=None, mode='RGB'):
        im = Image.open(src); im.draft(mode, (size * 2, size * 2)); im = im.convert(mode).resize((size, size), Image.LANCZOS)
        if fn: im = fn(im)
        im.save(os.path.join(tmp, name), quality=90) if name.endswith('.jpg') else im.save(os.path.join(tmp, name))
    def bleach(im):   # lichen-green rock -> warm desert grey
        a = np.asarray(im, dtype=np.float32) / 255; g = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
        warm = np.stack([g * 1.08, g * 0.98, g * 0.86], -1); out = a * 0.2 + warm * 0.8
        return Image.fromarray((np.clip(out * 1.1, 0, 1) * 255).astype(np.uint8))
    save(U('Dry_Trees', 'Materials', 'Bark.tif'), 'bark.jpg', 1024)
    save(U('Dry_Trees', 'Materials', 'Normal.tif'), 'bark_n.jpg', 1024)
    Z = U('ZNS3D', 'FREE_VEGETATION_PACK', 'TEXTURES')
    save(os.path.join(Z, 'ROCKS', 'Rocks_Rocks_BaseMap.png'), 'rock.jpg', 1024)
    save(os.path.join(Z, 'ROCKS', 'Rocks_Rocks_Normal.png'), 'rock_n.jpg', 1024)
    FV = U('ForestVision', 'Materials', 'Grounds', 'Textures')
    save(os.path.join(FV, 'Rocks_1.png'), 'boulder.jpg', 1024, bleach)
    save(os.path.join(FV, 'Rock1_normal.png'), 'boulder_n.jpg', 1024)
    save(os.path.join(Z, 'SHRUB', 'plane_Sbrub_Branch_BaseColor.png'), 'shrub_branch.jpg', 512)
    leaf = [os.path.join(d, f) for d, _, fs in os.walk(U('ZNS3D')) for f in fs if f.lower() == 'shrub_leaf_2.png'][0]
    save(leaf, 'shrub_leaf.png', 512, mode='RGBA')
    print('prepped ->', tmp)

def build(unity, tmp):
    import bpy, bmesh
    from mathutils import Vector
    HERE = os.path.dirname(os.path.abspath(__file__))
    OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'viewer', 'bug_viewer', 'public', 'models', 'ENV_Desert.glb'))
    U = lambda *p: os.path.join(unity, *p)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    keep = []

    def material(name, color, normal=None, alpha=False, rough=0.95):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
        bsdf.inputs['Roughness'].default_value = rough
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(os.path.join(tmp, color))
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        if alpha:   # leaf cards: the game alpha-tests them (Flora.jsx), so plain alpha is enough here
            nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
        if normal:
            nt2 = nt.nodes.new('ShaderNodeTexImage'); nt2.image = bpy.data.images.load(os.path.join(tmp, normal)); nt2.image.colorspace_settings.name = 'Non-Color'
            nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(nt2.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
        return m

    def take(fbx, pick):
        """import an FBX and return the mesh objects whose names pick() accepts, with transforms applied; delete the rest"""
        before = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=fbx)
        new = [o for o in bpy.data.objects if o not in before]
        got = [o for o in new if o.type == 'MESH' and pick(o.name)]
        from mathutils import Matrix
        for o in got:   # bake the full world transform (parents included) into a single-user copy of the mesh: some packs instance one mesh many times
            me = o.data.copy(); m = o.matrix_world.copy(); m.translation = (0, 0, 0); me.transform(m)
            o.animation_data_clear(); o.parent = None; o.matrix_world = Matrix.Identity(4); o.delta_scale = (1, 1, 1); o.delta_rotation_euler = (0, 0, 0); o.data = me
        for o in new:
            if o not in got: bpy.data.objects.remove(o, do_unlink=True)
        return got

    def finish(o, name, mat, unit=None, height=None, scale=None, decimate=None):
        """centre on x/z, base at y=0 (Blender z), optional decimation and scaling, one material"""
        if decimate and len(o.data.polygons) > decimate:
            mod = o.modifiers.new('dec', 'DECIMATE'); mod.ratio = decimate / len(o.data.polygons)
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=mod.name)
        vs = [v.co for v in o.data.vertices]
        mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))); mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
        c = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
        s = scale or (1.0 / max(mx.x - mn.x, mx.y - mn.y) * 2 if unit else (height / (mx.z - mn.z) if height else 1.0))
        for v in o.data.vertices: v.co = (v.co - c) * s
        if unit: o.data.transform(__import__('mathutils').Matrix.Translation((0, 0, -0.15)))   # rocks: sink a little so they sit in the ground
        o.location = (0, 0, 0); o.name = name; o.data.name = name
        if mat: o.data.materials.clear(); o.data.materials.append(mat)
        keep.append(o)

    bark = material('DeadBark', 'bark.jpg', 'bark_n.jpg')
    rock = material('DesertRock', 'rock.jpg', 'rock_n.jpg')
    boulder = material('Boulder', 'boulder.jpg', 'boulder_n.jpg')
    # dead trees: LOD2 of each, one common scale so their natural size differences survive (tallest ~9 m)
    lods = {'Dry3333': 'Dry8873LOD013', 'Dry4195': 'Dry8873LOD007', 'Dry4910': 'Dry8873LOD005', 'Dry5818': 'Dry8873LOD003',
            'Dry6524': 'Dry8873LOD009', 'Dry7509': 'Dry8873LOD001', 'Dry8872': 'Dry8873LOD011'}
    for i, (f, lod) in enumerate(lods.items()):
        o = take(U('Dry_Trees', 'Model', f + '.FBX'), lambda n, lod=lod: n == lod)[0]
        finish(o, f'DEAD_TREE_{i + 1}', bark, scale=None, height=None)
    # common scale from the tallest tree
    tall = max(max(v.co.z for v in o.data.vertices) for o in keep)
    for o in keep:
        for v in o.data.vertices: v.co *= 9.0 / tall
    for i, n in enumerate(['Rock_1', 'Rock_2', 'Rock_3']):
        o = take(U('ZNS3D', 'FREE_VEGETATION_PACK', 'MODELS', n + '.fbx'), lambda nm: True)[0]
        finish(o, f'ROCK_{i + 1}', rock, unit=True)
    fv = take(U('ForestVision', 'Resources', '_Rocks.fbx'), lambda n: n.endswith('_v1') and int(n[6:8]) <= 9)
    for o in sorted(fv, key=lambda o: o.name):
        finish(o, f'BOULDER_{int(o.name[6:8])}', boulder, unit=True, decimate=900)
    sh = take(U('ZNS3D', 'FREE_VEGETATION_PACK', 'MODELS', 'Shrub.fbx'), lambda n: True)
    br = material('ShrubBranch', 'shrub_branch.jpg'); lf = material('ShrubLeaf', 'shrub_leaf.png', alpha=True)
    for o in sh:
        if 'Branch' in o.name:
            mod = o.modifiers.new('dec', 'DECIMATE'); mod.ratio = 0.3; bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=mod.name)
        o.data.materials.clear(); o.data.materials.append(br if 'Branch' in o.name else lf)
    bpy.ops.object.select_all(action='DESELECT')
    for o in sh: o.select_set(True)
    bpy.context.view_layer.objects.active = sh[0]; bpy.ops.object.join()
    finish(sh[0], 'SHRUB', None, height=1.6)   # join kept each part's material slot
    # spread the models out so they don't overlap in a viewer (the game reads each node on its own)
    for i, o in enumerate(keep): o.location = ((i % 6) * 12.0, (i // 6) * 12.0, 0)
    bpy.ops.object.select_all(action='DESELECT')
    for o in keep: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=85,
                              export_apply=True, export_yup=True, export_materials='EXPORT', export_animations=False)
    for o in keep: print('  ', o.name, tuple(round(d, 2) for d in o.dimensions), tuple(round(s, 3) for s in o.scale))
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB', [o.name for o in keep])

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
(prep if args[0] == 'prep' else build)(args[1], args[2])
