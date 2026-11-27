"""Export the three approved pieces from the exploded Baja Bug kit in Blender."""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


PARTS = {
    'model_part11': ('KIT_BugTubeBumper', 'FrontTubeBumperWithSkid', 1.55, 'Z', 180),
    'model_part10': ('KIT_BugRearCage', 'RearTubeCageWithPlate', 1.42, 'Z', -90),
    'model_part15': ('KIT_BugRaceSeat', 'RaceSeat', .82, 'Y', 90),
}


def export(out):
    for source, (file, name, span, axis, angle) in PARTS.items():
        obj = bpy.data.objects[source]
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.data.transform(world)
        obj.matrix_world = Matrix.Identity(4)
        obj.data.transform(Matrix.Rotation(math.radians(angle), 4, axis))
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        xyz = [v.co for v in obj.data.vertices]
        lo = Vector(min(v[i] for v in xyz) for i in range(3))
        hi = Vector(max(v[i] for v in xyz) for i in range(3))
        size = hi-lo
        origin = Vector(((hi.x+lo.x)/2, (hi.y+lo.y)/2, lo.z))
        obj.data.transform(Matrix.Scale(span/max(size), 4) @ Matrix.Translation(-origin))
        modifier = obj.modifiers.new('Triangle budget', 'DECIMATE')
        modifier.ratio = 22000 / sum(len(p.vertices)-2 for p in obj.data.polygons)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        low = min(v.co.z for v in obj.data.vertices)
        obj.data.transform(Matrix.Translation((0, 0, -low)))
        # Plain finishes keep donor text out of the exported parts.
        obj.data.materials.clear()
        material = bpy.data.materials.new(name + 'Finish')
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        seat = source == 'model_part15'
        shader.inputs['Base Color'].default_value = (.046,.043,.04,1) if seat else (.16,.17,.18,1)
        shader.inputs['Metallic'].default_value = 0 if seat else .7
        shader.inputs['Roughness'].default_value = .88 if seat else .57
        obj.data.materials.append(material)
        for face in obj.data.polygons:
            face.material_index = 0
        obj.name = obj.data.name = name
        bpy.ops.export_scene.gltf(filepath=str(out / (file+'.glb')), use_selection=True,
                                  export_format='GLB', export_texcoords=False)


source, destination = (Path(p).resolve() for p in sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
export(destination)
