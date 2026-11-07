"""Normalize and simplify the supplied OBJ using Blender 4.5+, without changing its ZIP."""
import hashlib
from pathlib import Path
import tempfile
import zipfile

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent / 'Tires'
ARCHIVE = ROOT / 'generic_35_AT_tire_OBJ.zip'
OUTPUT = ROOT / 'TIRE_AllTerrain_Normalized.glb'
TRIANGLE_BUDGET = 24000


def main():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    with zipfile.ZipFile(ARCHIVE) as archive:
        data = archive.read('generic_35_AT_tire.obj')
    print('WARNING: supplied OBJ material file is absent; fitted tires use plain rubber PBR.')
    with tempfile.TemporaryDirectory(prefix='baja-tire-') as directory:
        obj = Path(directory) / 'generic_35_AT_tire.obj'
        obj.write_bytes(data)
        bpy.ops.wm.obj_import(filepath=str(obj), forward_axis='Y', up_axis='Z')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if len(meshes) != 1:
        raise ValueError(f'Expected one supplied tire mesh, found {len(meshes)}')
    tire = meshes[0]
    bpy.context.view_layer.objects.active = tire
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    points = [v.co.copy() for v in tire.data.vertices]
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    extent = high-low
    if not (300 < extent.x < 330 and 880 < extent.y < 910 and 880 < extent.z < 910):
        raise ValueError(f'Source tire bounds/orientation changed: {tuple(extent)}')
    center = (low+high)/2
    diameter = max(extent.y, extent.z)
    for vertex in tire.data.vertices:
        vertex.co = (vertex.co-center)/diameter
    tire.data.calc_loop_triangles()
    original_triangles = len(tire.data.loop_triangles)
    if original_triangles != 92686:
        raise ValueError(f'Source tire topology changed: {original_triangles} triangles')
    modifier = tire.modifiers.new('ViewerTriangleBudget', 'DECIMATE')
    modifier.ratio = TRIANGLE_BUDGET/original_triangles
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    tire.data.calc_loop_triangles()
    triangles = len(tire.data.loop_triangles)
    if not (10000 <= triangles <= TRIANGLE_BUDGET):
        raise ValueError(f'Unexpected simplified tire budget: {triangles}')
    tire.name = 'TIRE_AllTerrain_Source'
    tire['source_archive'] = ARCHIVE.name
    tire['source_sha256'] = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
    tire['source_triangles'] = original_triangles
    tire['simplified_triangles'] = triangles
    tire['normalization'] = 'Centered; nominal unit diameter; axle +X; fit separately to stock rims'
    bpy.ops.object.select_all(action='DESELECT')
    tire.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB',
                              use_selection=True, export_yup=True, export_normals=True,
                              export_texcoords=False, export_materials='NONE', export_extras=True)
    print(f'{OUTPUT.name}: {original_triangles} -> {triangles} triangles')


if __name__ == '__main__':
    main()
