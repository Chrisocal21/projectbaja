"""Blender background pilot: rebuild four complete wheels for BlueRustPickup."""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


# World coordinates in the game: +X left, +Y up, +Z forward.
SPECS = {
    # left X, right X, front Z, rear Z, tire radius, cut half-width
    'BlueRustPickup': (.887, -.887, 1.881, -1.367, .392, .155),
    'BlueTwoTone': (.913, -.928, 1.866, -1.329, .430, .204),
    'BrownRustPickup': (.918, -.915, 1.643, -1.506, .402, .183),
    'DarkRustPickup': (1.116, -.746, 1.758, -1.391, .400, .178),
}
STEER = 30


def blender_point(game):
    x, y, z = game
    return Vector((x, -z, y))


def wheel_mesh(name, radius):
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
    verts = [(x*radius/.392, r*radius/.392 * math.cos(math.tau*i/sides), r*radius/.392 * math.sin(math.tau*i/sides))
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


def hierarchy(mesh, transform=Matrix.Identity(4), offset=Vector((0, 0, 0))):
    return BVHTree.FromPolygons([transform @ v.co + offset for v in mesh.vertices],
                                [tuple(f.vertices) for f in mesh.polygons])


def liner(name, hub, radius):
    """Dark inner arch and curved ceiling, set outside the steering envelope."""
    sign = 1 if hub.x > 0 else -1
    outer = radius + .085
    inner_x = hub.x - sign * .36
    lip_x = hub.x + sign * .02
    vertices = []
    for x in (inner_x, lip_x):
        vertices += [(x, hub.y + outer*math.cos(math.pi*i/32),
                      hub.z + outer*math.sin(math.pi*i/32)) for i in range(33)]
    vertices.append((inner_x, hub.y, hub.z))
    faces = [(i, i+1, i+34, i+33) for i in range(32)]
    faces += [(66, i+1, i) for i in range(32)]
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(bpy.data.materials['Pickup rubber'])
    for face in data.polygons:
        face.use_smooth = face.index < 32
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
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

    left, right, front, rear, radius, half_width = SPECS[source.stem.removeprefix('VEH_M_')]
    positions = {'Wheel_'+axle+side: (x, radius, z)
                 for axle,z in [('F',front),('R',rear)]
                 for side,x in [('L',left),('R',right)]}
    hubs = {name: blender_point(hub) for name, hub in positions.items()}
    wheels = {name: wheel_mesh(name, radius) for name in hubs}
    original = body.data
    original_tree = hierarchy(original)
    owner = {}
    for face in original.polygons:
        center = face.center
        for name, hub in hubs.items():
            offset = center - hub
            if abs(offset.x) <= half_width and offset.y**2 + offset.z**2 <= (radius+.026)**2:
                owner[face.index] = name
                break
    if set(owner.values()) != set(hubs):
        raise ValueError('One or more wheel regions were empty')
    for name, hub in hubs.items():
        angles = range(-STEER, STEER+1) if name.startswith('Wheel_F') else [0]
        for angle in angles:
            turn = Matrix.Rotation(math.radians(angle), 4, 'Z')
            tire = hierarchy(wheels[name], turn, hub)
            for face, _ in original_tree.overlap(tire):
                owner.setdefault(face, name)

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
    body_tree = hierarchy(body.data)
    for name, pivot in hubs.items():
        wheel = bpy.data.objects.new(name, wheels[name])
        wheel.location = pivot
        bpy.context.collection.objects.link(wheel)
        arch_tree = hierarchy(liner('Liner_'+name, pivot, radius))
        angles = range(-STEER, STEER+1) if name.startswith('Wheel_F') else [0]
        for angle in angles:
            tire = hierarchy(wheels[name], Matrix.Rotation(math.radians(angle), 4, 'Z'), pivot)
            if body_tree.overlap(tire) or arch_tree.overlap(tire):
                raise ValueError(f'{name}: collision at {angle} degrees')
        print(name, positions[name], 'radius', radius, 'clear at', len(angles), 'angles')
    bpy.ops.export_scene.gltf(filepath=str(output.resolve()), export_format='GLB',
                              export_image_format='WEBP', export_image_quality=90)


if __name__ == '__main__':
    main(*(Path(value) for value in sys.argv[sys.argv.index('--') + 1:]))
