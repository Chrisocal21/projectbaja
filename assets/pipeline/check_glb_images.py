"""blender -b -P check_glb_images.py -- file.glb : mean colour / alpha coverage of every image + material setup"""
import bpy, sys
import numpy as np
f = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=f)
for im in bpy.data.images:
    if im.size[0] == 0: continue
    a = np.array(im.pixels[:]).reshape(-1, 4)
    print('IMG', im.name, im.size[:], 'rgb mean', a[:, :3].mean(0).round(3), 'alpha>0.5', round(float((a[:, 3] > 0.5).mean()), 3))
for m in bpy.data.materials:
    print('MAT', m.name, getattr(m, 'blend_method', ''), [n.type for n in m.node_tree.nodes] if m.node_tree else '')
