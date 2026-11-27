"""Blender background script. Pass source and staging model directories after --."""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def rig(source, destination):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    matrix = mesh.matrix_world.copy()
    mesh.parent = None
    mesh.data.transform(matrix)
    mesh.matrix_world.identity()
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
    groups = {name: mesh.vertex_groups.new(name=name) for name in segments}
    for vertex in mesh.data.vertices:
        x, _, z = vertex.co / height
        side = 'L' if x >= 0 else 'R'
        if z < .45:
            names = ['Thigh'+side, 'Shin'+side, 'Foot'+side, 'Hips']
        elif z > .845:
            names = ['Head', 'Spine']
        else:
            names = ['Hips', 'Spine', 'Head']
            if abs(x) > .105:
                names += ['UpperArm'+side, 'Forearm'+side]
        weights = []
        for name in names:
            a, delta = segments[name]
            offset = vertex.co-a
            t = max(0, min(1, offset.dot(delta)/delta.length_squared))
            distance = (offset-t*delta).length/height
            weights.append(((distance**2+.0009)**-2.5, name))
        strongest = sorted(weights, reverse=True)[:4]
        total = sum(weight for weight, _ in strongest)
        for weight, name in strongest:
            groups[name].add([vertex.index], weight/total, 'REPLACE')

    scene = bpy.context.scene
    scene.render.fps = 24
    skeleton.animation_data_create()
    clips = {'idle': 48, 'walk': 24, 'talk': 48}
    if source.stem.endswith(('_Overalls', '_Coveralls')):
        clips['work'] = 48
    for clip, duration in clips.items():
        action = bpy.data.actions.new(clip)
        skeleton.animation_data.action = action
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
            for pose in skeleton.pose.bones:
                pose.rotation_mode = 'XYZ'
                pose.rotation_euler = poses.get(pose.name, (0,0,0))
                pose.keyframe_insert(data_path='rotation_euler', frame=frame)
            hips = skeleton.pose.bones['Hips']
            hips.location = (0,hip_z,0)
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
out.mkdir(parents=True, exist_ok=True)
for source in sorted(src.glob('PERSON_M_*.glb')):
    rig(source, out/source.name)
