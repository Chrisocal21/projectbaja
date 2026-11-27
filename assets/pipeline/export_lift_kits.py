"""Blender background script: the loose lift kits (KIT_LIFT_2in / KIT_LIFT_4in) you carry and shelve.
Four orange spacer blocks, two beam adjusters and a handful of bolts, laid out flat.
Metres, origin at the bottom centre, front +z (glTF). Pass the output directory after --.
  blender -b --factory-startup -P export_lift_kits.py -- <out dir>
"""
import sys
from pathlib import Path

import bpy

out = Path(sys.argv[sys.argv.index('--') + 1:][0])
out.mkdir(parents=True, exist_ok=True)


def material(name, color, metal, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    return m


def boxes(name, specs, mat):
    """specs: [(x, y_up, z_forward, sx, sy, sz)] in game axes; Blender is z-up, so game z -> -Blender y."""
    objs = []
    for x, y, z, sx, sy, sz in specs:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y + sy / 2))
        o = bpy.context.object
        o.scale = (sx, sz, sy)
        objs.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.name = o.data.name = name
    o.data.materials.append(mat)
    return o


for inch, block in ((2, 0.13), (4, 0.18)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    orange = material('LiftOrange', (0.58, 0.07, 0.015), 0.4, 0.5)
    steel = material('Steel', (0.1, 0.1, 0.11), 0.6, 0.45)
    zinc = material('Zinc', (0.6, 0.62, 0.65), 0.85, 0.3)
    # four spacer blocks in a 2 x 2, standing up
    boxes('Blocks', [(x, 0, z, 0.07, block, 0.1) for x in (-0.12, 0.12) for z in (-0.09, 0.09)], orange)
    # two beam adjusters lying in front, with their base plates
    boxes('Adjusters', [(x, 0, 0.24, 0.08, 0.09, 0.09) for x in (-0.07, 0.07)] + [(x, 0, 0.24, 0.12, 0.012, 0.13) for x in (-0.07, 0.07)], steel)
    # bolts beside them
    boxes('Bolts', [(0.25, 0, z, 0.016, 0.016, 0.09) for z in (-0.12, -0.06, 0, 0.06, 0.12)], zinc)
    path = out / f'KIT_LIFT_{inch}in.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', export_yup=True)
    print(path, path.stat().st_size, flush=True)
