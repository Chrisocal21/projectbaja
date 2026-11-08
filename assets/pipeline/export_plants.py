"""
Trim the downloaded plant packs (assets/plants, ~2.3 GB, never committed) into one small game GLB of flora:
  TREE_A, TREE_B            the two low-poly trees from Realistic+Trees+.blend (bark + leaf cards)
  GRASS_DEAD_1/2            long dead grass clumps          (plant_assets_3.6LTS.blend)
  BUSH_GRASS_1/2/3          grass bushes (decimated)
  FERN_1/2/3, NETTLE_1/2    shade plants for the farm + canyon (decimated)
Each node: base at the origin, Y-up (+Z forward), meters. Textures are 512 px; separate alpha maps are packed into the
colour texture's alpha channel so three.js can alpha-test the leaf cards.
Run (two passes, one per source file):
  blender -b plants/Realistic+Trees+.blend      -P pipeline/export_plants.py -- trees
  blender -b plants/plant_assets_3.6LTS.blend   -P pipeline/export_plants.py -- plants
Writes ../viewer/bug_viewer/public/models/ENV_Trees.glb and ENV_Plants.glb
"""
import bpy, os, sys
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.normpath(os.path.join(HERE, '..', '..', 'viewer', 'bug_viewer', 'public', 'models'))
mode = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'plants'
TEX = 512

if mode == 'trees':
    GROUPS = {'TREE_A': (['Bark_9.001', 'Leaf_6.001'], 1.0), 'TREE_B': (['Bark_9.002', 'Leaf_6.002'], 1.0)}
    OUT = os.path.join(MODELS, 'ENV_Trees.glb')
else:
    GROUPS = {'GRASS_DEAD_1': (['long_dead_grass1'], 0.5), 'GRASS_DEAD_2': (['long_dead_grass2'], 0.5),
              'BUSH_GRASS_1': (['grass_bush'], 0.25), 'BUSH_GRASS_2': (['grass_bush2'], 0.2), 'BUSH_GRASS_3': (['grass_bush3'], 0.28),
              'FERN_1': (['ferns1'], 0.18), 'FERN_2': (['ferns2'], 0.25), 'FERN_3': (['ferns3'], 0.4),
              'NETTLE_1': (['stinging nettles 1'], 0.35), 'NETTLE_2': (['stinging nettles 2'], 0.35)}
    OUT = os.path.join(MODELS, 'ENV_Plants.glb')

keep = {n for names, _ in GROUPS.values() for n in names}
for o in list(bpy.data.objects):
    if o.name not in keep: bpy.data.objects.remove(o, do_unlink=True)

def sel(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def img_pixels(img, w, h):
    im = img.copy(); im.scale(w, h)
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4); bpy.data.images.remove(im); return a

def fix_material(mat):
    """one Principled BSDF: colour texture (alpha packed in), normal map dropped, alpha-clip"""
    if not mat or not mat.use_nodes: return
    nodes = mat.node_tree.nodes
    imgs = [n.image for n in nodes if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] > 0]
    def find(*keys):
        for k in keys:
            for im in imgs:
                if k in im.name.lower(): return im
        return None
    col = find('diffuse', 'diff', 'basecolor', '_bc', 'leaf.png', 'branch.png', 'bark.png', 'leaf', 'branch', 'bark') or (imgs[0] if imgs else None)
    if col and any(k in col.name.lower() for k in ('nor', 'normal', 'roug', 'orm', 'sss', 'disp')):
        col = next((im for im in imgs if not any(k in im.name.lower() for k in ('nor', 'normal', 'roug', 'orm', 'sss', 'disp', 'alpha'))), col)
    alpha = find('alpha', '_o.')
    if not col: return
    S = 1024 if any(k in mat.name.lower() for k in ('grass', 'bush')) else TEX
    px = img_pixels(col, S, S)
    if alpha:   # thin blades vanish when an alpha map is averaged down: max-pool from 2x and boost instead
        pa = img_pixels(alpha, S * 2, S * 2)[:, :, 0].reshape(S, 2, S, 2).max(axis=(1, 3))
        px[:, :, 3] = np.clip(pa * 1.6, 0, 1)
    out = bpy.data.images.new(mat.name + '_col', S, S, alpha=True); out.pixels = px.ravel().tolist(); out.pack()
    has_alpha = alpha is not None or px[:, :, 3].min() < 0.95
    nodes.clear()
    o = nodes.new('ShaderNodeOutputMaterial'); b = nodes.new('ShaderNodeBsdfPrincipled'); t = nodes.new('ShaderNodeTexImage'); t.image = out
    L = mat.node_tree.links; L.new(t.outputs['Color'], b.inputs['Base Color']); L.new(b.outputs['BSDF'], o.inputs['Surface'])
    b.inputs['Roughness'].default_value = 0.9
    if has_alpha:
        L.new(t.outputs['Alpha'], b.inputs['Alpha'])
        try: mat.blend_method = 'CLIP'; mat.alpha_threshold = 0.5
        except Exception: pass
        try: mat.surface_render_method = 'DITHERED'
        except Exception: pass
    print('  material', mat.name, 'colour', col.name, 'alpha', alpha.name if alpha else ('in colour' if has_alpha else 'none'))

done = set()
for name, (parts, ratio) in GROUPS.items():
    objs = [bpy.data.objects[n] for n in parts if n in bpy.data.objects]
    if not objs: print('MISSING', name); continue
    for o in objs:
        sel([o])
        for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
        if ratio < 1:
            d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = ratio; bpy.ops.object.modifier_apply(modifier='dec')
        o.data = o.data.copy(); o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)
        for m in o.data.materials:
            if m and m.name not in done: fix_material(m); done.add(m.name)
    sel(objs)
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = o.data.name = name
    vs = [v.co for v in o.data.vertices]
    base = Vector(((min(v.x for v in vs) + max(v.x for v in vs)) / 2, (min(v.y for v in vs) + max(v.y for v in vs)) / 2, min(v.z for v in vs)))
    o.data.transform(Matrix.Translation(-base)); o.location = (0, 0, 0)
    h = max(v.z for v in o.data.vertices[:] and [v.co for v in o.data.vertices])
    print(name, 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons), 'height', round(h, 2))

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_image_format='AUTO', export_apply=True, export_yup=True, use_selection=False, export_cameras=False, export_lights=False)
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
