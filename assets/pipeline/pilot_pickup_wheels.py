"""Blender background pilot: rebuild four complete wheels for BlueRustPickup."""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


# World coordinates in the game: +X left, +Y up, +Z forward.
HUBS = {
    'Wheel_FL': ( .887, .374,  1.881),
    'Wheel_FR': (-.887, .374,  1.881),
    'Wheel_RL': ( .887, .375, -1.367),
    'Wheel_RR': (-.887, .375, -1.367),
}
WIDTH_LIMIT = .155


def blender_point(game):
    x, y, z = game
    return Vector((x, -z, y))


def wheel_mesh(name):
    """Turn a closed tire and recessed, unbranded steel wheel around local X."""
    # Axial position, radius, and material for the strip to the next ring.
    profile = [
        (-.137, .001, 2), (-.137, .105, 2), (-.111, .165, 2),
        (-.118, .208, 1), (-.122, .285, 0), (-.112, .354, 0),
        (-.081, .386, 0), (-.053, .392, 0), (.053, .392, 0),
        (.081, .386, 0), (.112, .354, 0), (.122, .285, 0),
        (.118, .208, 1), (.111, .165, 2), (.137, .105, 2),
        (.137, .001, 2),
    ]
    sides = 64
    verts = [(x, r * math.cos(math.tau*i/sides), r * math.sin(math.tau*i/sides))
             for x, r, _ in profile for i in range(sides)]
    faces = []
    for row in range(len(profile)-1):
        for i in range(sides):
            a, b = row*sides+i, row*sides+(i+1)%sides
            faces.append((a, b, b+sides, a+sides))
    faces.extend((tuple(reversed(range(sides))),
                  tuple(range(len(verts)-sides, len(verts)))))
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    for label, rgb, roughness, metallic in (
        ('Pickup rubber', (.032,.028,.024), .93, 0),
        ('Weathered rim lip', (.32,.23,.15), .76, .46),
        ('Recessed steel', (.19,.13,.085), .84, .38),
    ):
        mat = bpy.data.materials.get(label) or bpy.data.materials.new(label)
        mat.diffuse_color = (*rgb, 1)
        mat.roughness = roughness
        mat.metallic = metallic
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = (*rgb, 1)
        shader.inputs['Roughness'].default_value = roughness
        shader.inputs['Metallic'].default_value = metallic
        data.materials.append(mat)
    for face in data.polygons:
        face.material_index = profile[min(face.index//sides, len(profile)-1)][2]
        face.use_smooth = len(face.vertices) == 4
    mesh = bmesh.new()
    mesh.from_mesh(data)
    bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
    mesh.to_mesh(data)
    mesh.free()
    return data


def main(source, output):
    public = Path(__file__).resolve().parents[2] / 'viewer/bug_viewer/public'
    if source.resolve() == output.resolve() or output.resolve().is_relative_to(public):
        raise ValueError('Write the pilot to a separate review path')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
    body, = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    world = body.matrix_world.copy()
    body.parent = None
    body.data.transform(world)
    body.matrix_world = Matrix.Identity(4)

    hubs = {name: blender_point(hub) for name, hub in HUBS.items()}
    original = body.data
    owner = {}
    for face in original.polygons:
        center = face.center
        for name, hub in hubs.items():
            offset = center - hub
            if abs(offset.x) <= WIDTH_LIMIT and offset.y**2 + offset.z**2 <= .395**2:
                owner[face.index] = name
                break
    if set(owner.values()) != set(hubs):
        raise ValueError('One or more wheel regions were empty')

    def partition(name, pivot):
        data = original.copy()
        mesh = bmesh.new()
        mesh.from_mesh(data)
        delete = [face for face in mesh.faces if owner.get(face.index) != name]
        bmesh.ops.delete(mesh, geom=delete, context='FACES')
        mesh.to_mesh(data)
        mesh.free()
        data.transform(Matrix.Translation(-pivot))
        return data

    body.data = partition(None, Vector())
    if len(body.data.polygons) + len(owner) != len(original.polygons):
        raise ValueError('Unexpected face count after removing the fused wheels')
    for name, pivot in hubs.items():
        wheel = bpy.data.objects.new(name, wheel_mesh(name))
        wheel.location = pivot
        bpy.context.collection.objects.link(wheel)
        print(name, HUBS[name], len(wheel.data.polygons))
    bpy.ops.export_scene.gltf(filepath=str(output.resolve()), export_format='GLB',
                              export_image_format='WEBP', export_image_quality=90)


if __name__ == '__main__':
    main(*(Path(value) for value in sys.argv[sys.argv.index('--') + 1:]))
