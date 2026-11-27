"""Blender background pilot: split BlueRustPickup into body and four wheels."""
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


def main(source, output):
    if source.resolve() == output.resolve():
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
    for name, pivot in hubs.items():
        wheel = bpy.data.objects.new(name, partition(name, pivot))
        wheel.data.name = name
        wheel.location = pivot
        bpy.context.collection.objects.link(wheel)
        print(name, HUBS[name], len(wheel.data.polygons))
    total = sum(len(obj.data.polygons) for obj in bpy.context.scene.objects if obj.type == 'MESH')
    if total != len(original.polygons):
        raise ValueError('Face count changed during split')
    bpy.ops.export_scene.gltf(filepath=str(output.resolve()), export_format='GLB',
                              export_image_format='WEBP', export_image_quality=90)


if __name__ == '__main__':
    main(*(Path(value) for value in sys.argv[sys.argv.index('--') + 1:]))
