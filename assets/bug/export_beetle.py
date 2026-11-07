"""Export the supplied Blender model without changing its source files.

Run with Blender 4.5+: --background --factory-startup --disable-autoexec
--python-exit-code 1 --python assets\\bug\\export_beetle.py
"""
import math
from collections import defaultdict
from pathlib import Path
import shutil
import sys
import types

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'VEH_001_Beetle_Imported.glb'
VIEWER = ROOT.parents[1] / 'viewer' / 'bug_viewer' / 'public' / 'models'

PANELS = (
    'B_Body_Hood_Front', 'B_Body_Engine_Lid_Rear',
    'B_Body_Fender_FL', 'B_Body_Fender_FR',
    'B_Body_Fender_RL', 'B_Body_Fender_RR',
    'B_Body_Nose_Front', 'B_Body_Tail_Rear',
)


class PanelNormals:
    def __init__(self):
        self.meshes = set()

    def gather_attribute_change(self, name, data, quantized, settings):
        if name == '_BAJA_NORMAL' and settings['gltf_yup']:
            data['data'] = data['data'][:, [0, 2, 1]].copy()
            data['data'][:, 2] *= -1

    def gather_mesh_hook(self, gltf_mesh, blender_mesh, obj, groups, modifiers, materials, settings):
        if blender_mesh.attributes.get('_baja_normal') is None:
            return
        for primitive in gltf_mesh.primitives:
            normals = primitive.attributes.pop('_BAJA_NORMAL')
            primitive.attributes['NORMAL'] = normals
        self.meshes.add(blender_mesh.name)


def label_body_panels(body):
    mesh = body.data
    if len(mesh.vertices) != 1688 or len(mesh.polygons) != 1646:
        raise ValueError('Source body topology changed; panel boundaries need revalidation')
    crease = mesh.attributes.get('crease_edge')
    if crease is None:
        raise ValueError('Source body crease boundaries are missing')
    edge_faces = defaultdict(list)
    for polygon in mesh.polygons:
        for edge in polygon.edge_keys:
            edge_faces[tuple(sorted(edge))].append(polygon.index)
    neighbors = defaultdict(list)
    for edge in mesh.edges:
        faces = edge_faces[tuple(sorted(edge.vertices))]
        if len(faces) == 2 and crease.data[edge.index].value < .001:
            a, b = faces
            if mesh.polygons[a].material_index == mesh.polygons[b].material_index:
                neighbors[a].append(b)
                neighbors[b].append(a)

    def patches(seeds):
        selected = set(seeds)
        queue = list(seeds)
        while queue:
            for neighbor in neighbors[queue.pop()]:
                if neighbor not in selected:
                    selected.add(neighbor)
                    queue.append(neighbor)
        return selected

    hood = patches((87, 105))
    fixed_quarters = patches((0, 2, 187))
    if len(hood) != 60 or len(fixed_quarters) != 138:
        raise ValueError('Native crease patches changed; panel boundaries need revalidation')
    labels = mesh.attributes.new('baja_panel', 'INT', 'FACE')
    for polygon in mesh.polygons:
        x, y, z = body.matrix_world @ polygon.center
        material = mesh.materials[polygon.material_index].name
        region = 0
        if polygon.index in hood:
            region = 1
        elif material in {'B-paint1', 'B-taillight1'} and polygon.index not in fixed_quarters:
            # Source-specific inner wing boundaries follow the native face grid.
            if x < -2.3477 and z < 1.73 and y < .174-(1.0+(x+7.3)*.23):
                region = 2
            elif x > 2.93 and z < 1.90 and y < .174-(2.4-(x-3)*.24):
                region = 4
            elif x > 6.43 and -.5 < z < 2.80 and y > .174-(1.45 if z < 2 else 1.25):
                region = 3
        labels.data[polygon.index].value = region


def split_body_panels(body):
    label_body_panels(body)
    source = body.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.copy()
    source.calc_loop_triangles()
    labels = source.attributes.get('baja_panel')
    if labels is None:
        raise ValueError('Body modifiers did not preserve panel labels')
    groups = defaultdict(list)
    for triangle in source.loop_triangles:
        region = labels.data[triangle.polygon_index].value
        if region == 1:
            name = 'B_Body_Hood_Front'
        elif region == 3:
            name = 'B_Body_Engine_Lid_Rear'
        elif region in {2, 4}:
            center = body.matrix_world @ (sum((source.vertices[v].co for v in triangle.vertices), Vector()) / 3)
            side = 'L' if center.y < .174 else 'R'
            axle = 'F' if region == 2 else 'R'
            name = f'B_Body_Fender_{axle}{side}'
        elif region == 0:
            points = [body.matrix_world @ source.vertices[v].co for v in triangle.vertices]
            if min(p.x for p in points) < -5.598:
                name = 'B_Body_Nose_Front'
            elif max(p.x for p in points) > 7.021:
                name = 'B_Body_Tail_Rear'
            else:
                name = 'B_Body'
        else:
            raise ValueError(f'Invalid evaluated panel label: {region}')
        groups[name].append(triangle)
    if set(groups) != {'B_Body', *PANELS}:
        raise ValueError(f'Incomplete body partition: {sorted(groups)}')
    source_normals = [tuple(n.vector) for n in source.corner_normals]
    original_transform = body.matrix_world.copy()
    parts = []
    for name, triangles in groups.items():
        indices = {}
        vertices, faces, loops, materials = [], [], [], []
        for triangle in triangles:
            face = []
            for vertex in triangle.vertices:
                if vertex not in indices:
                    indices[vertex] = len(vertices)
                    vertices.append(tuple(source.vertices[vertex].co))
                face.append(indices[vertex])
            faces.append(face)
            loops.extend(triangle.loops)
            materials.append(source.polygons[triangle.polygon_index].material_index)
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], faces)
        for material in source.materials:
            mesh.materials.append(material)
        for polygon, material in zip(mesh.polygons, materials):
            polygon.material_index = material
            polygon.use_smooth = True
        # Freeze evaluated corner normals before splitting; otherwise seams shade differently.
        mesh.normals_split_custom_set([source_normals[i] for i in loops])
        # Blender packs custom normals; retain full precision for the glTF export hook.
        normals = mesh.attributes.new('_baja_normal', 'FLOAT_VECTOR', 'CORNER')
        for target, index in zip(normals.data, loops):
            target.vector = source_normals[index]
        for layer in source.uv_layers:
            uv = mesh.uv_layers.new(name=layer.name)
            for target, index in zip(uv.data, loops):
                target.uv = layer.data[index].uv
        if name == 'B_Body':
            obj = body
            obj.modifiers.clear()
            obj.data = mesh
        else:
            obj = bpy.data.objects.new(name, mesh)
            bpy.context.scene.collection.objects.link(obj)
            obj.matrix_world = original_transform
            parts.append(obj)
        obj['original_source_name'] = 'B_Body'
    bpy.data.meshes.remove(source)
    print('SEPARATED PANELS:', ', '.join(PANELS))
    return parts


def bounds(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    points = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
    return [Vector([min(p[i] for p in points) for i in range(3)]),
            Vector([max(p[i] for p in points) for i in range(3)])]


def linear_color(rgb):
    return tuple(c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in rgb)


def convert_material(material):
    if not material.use_nodes:
        raise ValueError(f'{material.name}: expected a legacy node material')
    nodes = list(material.node_tree.nodes)
    images = [n.image for n in nodes if n.type == 'TEX_IMAGE' and n.image]
    for image in images:
        if not image.packed_file and not Path(bpy.path.abspath(image.filepath)).is_file():
            print(f'WARNING: {material.name}: missing {image.name}; using plain PBR color')
    diffuse = [n for n in nodes if n.type == 'BSDF_DIFFUSE']
    glossy = [n for n in nodes if n.type == 'BSDF_GLOSSY']
    glass = [n for n in nodes if n.type == 'BSDF_GLASS']
    emission = [n for n in nodes if n.type == 'EMISSION']
    candidates = (glass+diffuse) if material.name in {'B-signallight1', 'B-taillight1'} else diffuse+glossy+emission+glass
    if not candidates:
        raise ValueError(f'{material.name}: no supported source color')
    color = tuple(candidates[0].inputs['Color'].default_value)
    roughness = sum(n.inputs['Roughness'].default_value for n in glossy)/len(glossy) if glossy else .75
    metallic = 1 if material.name == 'B-chrome' else 0
    alpha = 1
    if material.name == 'B-paint1':
        color = (*linear_color((115/255, 156/255, 166/255)), 1)
        roughness = .72
    elif material.name == 'B-window1':
        color = (.12, .18, .20, 1)
        roughness, alpha = .12, .28
    elif material.name == 'B-tire1':
        roughness = .9
    elif material.name == 'B-headlight2':
        roughness = .2
    material.node_tree.nodes.clear()
    output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    shader = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Alpha'].default_value = alpha
    material.diffuse_color = (*color[:3], alpha)
    if alpha < 1:
        material.surface_render_method = 'BLENDED'
    if emission:
        shader.inputs['Emission Color'].default_value = color
        shader.inputs['Emission Strength'].default_value = .2
    material.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])


def export():
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'Beetle1.blend'), load_ui=False)
    objects = [obj for obj in bpy.context.scene.objects
               if obj.type == 'MESH' and obj.name.startswith('B_')]
    if not objects:
        raise ValueError('No Beetle meshes found in the supplied scene')
    by_name = {obj.name: obj for obj in objects}
    required = {'B_Body', 'B_FLWheel', 'B_FRWheel', 'B_BLWheel', 'B_BRWheel', 'B_FrontBumper'}
    if not required <= by_name.keys():
        raise ValueError(f'Missing required source objects: {required-by_name.keys()}')
    depsgraph = bpy.context.evaluated_depsgraph_get()
    object_bounds = {obj.name: bounds(obj, depsgraph) for obj in objects}
    centers = {name: (limits[0]+limits[1])/2 for name, limits in object_bounds.items()}
    front = (centers['B_FLWheel']+centers['B_FRWheel'])/2
    rear = (centers['B_BLWheel']+centers['B_BRWheel'])/2
    wheelbase = rear.x-front.x
    if wheelbase <= 0:
        raise ValueError('Expected source front wheels along negative X')
    scale = 2.38/wheelbase
    center = (front+rear)/2
    center.z = min(limits[0].z for limits in object_bounds.values())
    objects.extend(split_body_panels(by_name['B_Body']))
    # Rotate in Blender's Z-up frame; glTF export then gives Y-up, +Z forward.
    transform = Matrix.Scale(scale, 4) @ Matrix.Rotation(math.pi/2, 4, 'Z') @ Matrix.Translation(-center)
    materials = {m for obj in objects for m in obj.data.materials if m}
    for material in sorted(materials, key=lambda m: m.name):
        convert_material(material)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        original = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = transform @ original
        obj['source_name'] = obj.name
        obj['original_source_name'] = obj.get('original_source_name', obj.name)
        obj['source_transform_determinant'] = original.determinant()
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.update()
    hook = PanelNormals()
    module = types.ModuleType('baja_panel_normals')
    module.glTF2ExportUserExtension = lambda: hook
    sys.modules[module.__name__] = module
    addon = bpy.context.preferences.addons.new()
    addon.module = module.__name__
    try:
        bpy.ops.export_scene.gltf(
            filepath=str(OUTPUT), export_format='GLB', use_selection=True,
            export_apply=True, export_yup=True, export_extras=True,
            export_materials='EXPORT', export_animations=False,
            export_attributes=True, export_cameras=False, export_lights=False,
        )
    finally:
        bpy.context.preferences.addons.remove(addon)
        del sys.modules[module.__name__]
    if hook.meshes != {'B_Body', *PANELS}:
        raise RuntimeError(f'Full-precision normal export incomplete: {sorted(hook.meshes)}')
    if not OUTPUT.is_file() or OUTPUT.stat().st_size < 1000:
        raise RuntimeError('Blender did not produce the expected GLB')
    if not VIEWER.is_dir():
        raise FileNotFoundError(f'Viewer model directory not found: {VIEWER}')
    shutil.copy2(OUTPUT, VIEWER / OUTPUT.name)
    print(f'EXPORTED: {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)')
    print(f'NORMALIZED: {len(objects)} source objects; wheelbase 2.38 m; scale {scale:.8f}')
    print('Legacy procedural shaders simplified to PBR; existing faded-blue paint retained.')


if __name__ == '__main__':
    export()
