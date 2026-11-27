"""Experimental connected-weight pass. Pass source and staging directories after --."""
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector


def rig(source, destination):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    matrix = mesh.matrix_world.copy()
    mesh.parent = None
    mesh.data.transform(matrix)
    mesh.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.0001)
    bpy.ops.object.mode_set(mode='OBJECT')
    height = max(v.co.z for v in mesh.data.vertices)
    armature = bpy.data.armatures.new('Skeleton')
    skeleton = bpy.data.objects.new('CharacterRig', armature)
    bpy.context.collection.objects.link(skeleton)
    bpy.context.view_layer.objects.active = skeleton
    bpy.ops.object.mode_set(mode='EDIT')
    segments = {}

    def bone(name, start, end, parent=None):
        a, b = Vector(start)*height, Vector(end)*height
        edit = armature.edit_bones.new(name)
        edit.head, edit.tail = a, b
        if parent:
            edit.parent = armature.edit_bones[parent]
        segments[name] = (a, b-a)

    bone('Hips', (0,0,.48), (0,0,.57))
    bone('Spine', (0,0,.57), (0,0,.8), 'Hips')
    bone('Head', (0,0,.8), (0,0,.98), 'Spine')
    for suffix, side in [('L', 1), ('R', -1)]:
        def limb(name, a, b, parent):
            bone(name+suffix, (a[0]*side,*a[1:]), (b[0]*side,*b[1:]), parent)
        limb('Thigh', (.085,0,.49), (.087,0,.265), 'Hips')
        limb('Shin', (.087,0,.265), (.087,0,.058), 'Thigh'+suffix)
        limb('Foot', (.087,0,.058), (.087,-.075,.034), 'Shin'+suffix)
        limb('UpperArm', (.125,0,.785), (.17,0,.64), 'Spine')
        limb('Forearm', (.17,0,.64), (.17,-.018,.51), 'UpperArm'+suffix)
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.parent = skeleton
    modifier = mesh.modifiers.new('Skin', 'ARMATURE')
    modifier.object = skeleton
    groups = [mesh.vertex_groups.new(name=name) for name in segments]
    weights = np.zeros((len(mesh.data.vertices), len(segments)))
    for vertex in mesh.data.vertices:
        x, _, z = vertex.co / height
        for column, (name, (a, delta)) in enumerate(segments.items()):
            offset = vertex.co-a
            t = max(0, min(1, offset.dot(delta)/delta.length_squared))
            distance = (offset-t*delta).length/height
            influence = 1
            if name.startswith(('UpperArm', 'Forearm')):
                influence = min(1, max(0, (abs(x)-.11)/.07)) * min(1, max(0, (z-.46)/.08))
            weights[vertex.index, column] = influence * (distance**2+.0025)**-2
    weights /= weights.sum(axis=1, keepdims=True)
    edges = np.array([tuple(edge.vertices) for edge in mesh.data.edges])
    a, b = edges.T
    origin, neighbor = np.concatenate((a,b)), np.concatenate((b,a))
    degree = np.maximum(1,np.bincount(origin,minlength=len(weights)))[:,None]
    for _ in range(12):
        adjacent = np.zeros_like(weights)
        np.add.at(adjacent, origin, weights[neighbor])
        weights = (weights + adjacent / degree) * .5
    for i, row in enumerate(weights):
        strongest = np.argsort(row)[-4:]
        total = row[strongest].sum()
        for column in strongest:
            groups[column].add([i], row[column]/total, 'REPLACE')

    scene = bpy.context.scene
    scene.render.fps = 24
    skeleton.animation_data_create()
    # Limit motion against the actual connected surface. These are posed,
    # single-piece meshes, and some have fused clothing or crossed limbs.
    rest = np.array([tuple(vertex.co) for vertex in mesh.data.vertices])
    a, b = edges.T
    rest_lengths = np.linalg.norm(rest[a] - rest[b], axis=1)
    measurable = rest_lengths > height * .0015

    def apply_pose(poses, hip_z, strength):
        for joint in skeleton.pose.bones:
            joint.rotation_mode = 'XYZ'
            joint.rotation_euler = tuple(angle * strength for angle in poses.get(joint.name, (0,0,0)))
        skeleton.pose.bones['Hips'].location = (0, hip_z * strength, 0)

    def stretch():
        bpy.context.view_layer.update()
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        coords = np.empty(len(rest) * 3, dtype=np.float32)
        evaluated.data.vertices.foreach_get('co', coords)
        points = coords.reshape(-1, 3)
        lengths = np.linalg.norm(points[a] - points[b], axis=1)
        return np.quantile(lengths[measurable] / rest_lengths[measurable], .995)

    clips = {'idle': 48, 'walk': 24, 'talk': 48}
    if source.stem.endswith(('_Overalls', '_Coveralls')):
        clips['work'] = 48
    for clip, duration in clips.items():
        frames = []
        for frame in range(0, duration+1, 3):
            phase = math.tau * frame/duration
            s = math.sin(phase)
            poses = {}
            hip_z = 0
            if clip == 'idle':
                poses = {'Spine': (.018*s,0,0), 'Head': (0,.04*s,0)}
            elif clip == 'walk':
                hip_z = -.018 * height * (1-math.cos(2*phase))
                for side, sign in [('L',1), ('R',-1)]:
                    swing = sign*s
                    poses['Thigh'+side] = (.38*swing,0,0)
                    poses['Shin'+side] = (-.43*max(0,-swing),0,0)
                    poses['UpperArm'+side] = (-.23*swing,0,0)
            elif clip == 'talk':
                poses = {'Head': (.08*math.sin(2*phase),.09*s,0),
                         'Spine': (.025*s,0,0), 'ForearmR': (.3*(1-math.cos(phase)),0,0)}
            else:
                hip_z = -.16 * height
                poses = {'Spine': (.34,0,0), 'Head': (-.15,0,0),
                         'ThighL': (.67,0,0), 'ThighR': (.67,0,0),
                         'ShinL': (-1.12,0,0), 'ShinR': (-1.12,0,0),
                         'UpperArmR': (.42,0,0), 'ForearmR': (.56+.24*s,0,0),
                         'UpperArmL': (.42,0,0), 'ForearmL': (.46,0,0)}
            frames.append((frame, poses, hip_z))
        strength = 1
        if clip in ('walk', 'work'):
            for candidate in (1, .8, .65, .5, .4, .3, .2, .1):
                for _, poses, hip_z in frames:
                    apply_pose(poses, hip_z, candidate)
                    if stretch() > 1.35:
                        break
                else:
                    strength = candidate
                    break
            else:
                strength = .075
            print(f'{source.stem} {clip}: motion scale {strength:.3f}', flush=True)
        action = bpy.data.actions.new(clip)
        skeleton.animation_data.action = action
        for frame, poses, hip_z in frames:
            apply_pose(poses, hip_z, strength)
            for pose in skeleton.pose.bones:
                pose.keyframe_insert(data_path='rotation_euler', frame=frame)
            hips = skeleton.pose.bones['Hips']
            hips.keyframe_insert(data_path='location', frame=frame)
        skeleton.animation_data.action = None
        track = skeleton.animation_data.nla_tracks.new()
        track.name = clip
        track.strips.new(clip, 0, action)
    for track in skeleton.animation_data.nla_tracks:
        track.mute = True
    for pose in skeleton.pose.bones:
        pose.rotation_euler = (0,0,0)
        pose.location = (0,0,0)
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB',
                              export_animation_mode='NLA_TRACKS')


src, out = map(Path, sys.argv[sys.argv.index('--')+1:])
runtime = Path(__file__).resolve().parents[2] / 'viewer/bug_viewer/public'
if out.resolve().is_relative_to(runtime):
    raise SystemExit('Use a staging directory for these experimental rigs.')
out.mkdir(parents=True, exist_ok=True)
for source in sorted(src.glob('PERSON_M_*.glb')):
    rig(source, out/source.name)
