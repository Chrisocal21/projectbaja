"""Classic full-bodied Stage 2 preview; all outputs are installed in meter/Y-up coordinates."""
from pathlib import Path
import shutil

import numpy as np
from scipy.spatial import cKDTree
import trimesh

from build_all_terrain_wheels import PREPARED, WHEELS, fit_tire
from build_baja_parts import (SOURCE_NAMES, add, clip, clip_distances, material,
                             object_meshes, tube)

ROOT = Path(__file__).resolve().parent
VIEWER = ROOT.parents[1] / 'viewer' / 'bug_viewer' / 'public' / 'models'
LIFT = .14
TIRE_RADIUS = .381
TRACK = .75
ARCH_RADIUS = .475
SHELL_FILE = 'STAGE2_VEH_001_Beetle_Imported.glb'
ASSEMBLY_FILE = 'VEH_002_Stage2Baja.glb'
PARTS = {
    1: 'PART_001_AllTerrainWheelSet', 2: 'PART_002_FrontTubeBumper',
    3: 'PART_003_RearEngineCage', 6: 'PART_006_TrailShockSet',
    7: 'PART_007_CutBajaFenders', 8: 'PART_008_ShortenedFrontHood',
    9: 'PART_009_RearEngineOpening', 10: 'PART_010_FiberglassWideFenders',
    11: 'PART_011_RockerGuards', 12: 'PART_012_AirCooledRearEngine',
}
MASKS = {
    1: ['B_FLWheel', 'B_FRWheel', 'B_BLWheel', 'B_BRWheel'],
    2: ['B_FrontBumper'], 3: ['B_BackBumper'],
    7: ['B_Body_Fender_', 'B_HeadlightGlass', 'B_HeadlightTrim', 'B_TurnSignal', 'B_Tailights'],
    8: ['B_Body_Hood_Front', 'B_Body_Nose_Front', 'B_HoodTrim', 'B_HoodHandle', 'B_HoodLogo'],
    9: ['B_Body_Engine_Lid_Rear', 'B_Body_Tail_Rear', 'B_BackTrim', 'B_BackHandle', 'B_LicensePlate'],
    11: ['B_SideBumper'],
}
DEFAULT_PARTS = [1, 2, 3, 6, 7, 8, 9, 11, 12]
PAINT = material('Stage2_FadedBlue', (115, 156, 166))
STEEL = material('Stage2_Steel', (133, 137, 132), .7, .55)
DARK = material('Stage2_DarkSteel', (49, 52, 49), .35, .7)
RUBBER = material('Stage2_Rubber', (36, 35, 33), roughness=.9)
FIBER = material('Stage2_Fiberglass', (193, 178, 149))


def save(scene, filename):
    if not scene.geometry:
        raise ValueError(f'Empty Stage 2 asset: {filename}')
    path = ROOT / filename
    scene.export(path, include_normals=True)
    shutil.copy2(path, VIEWER / filename)
    print(f'{filename}: {sum(len(m.faces) for m in scene.geometry.values())} triangles')


def trim(mesh, field):
    return clip_distances(mesh, field(np.asarray(mesh.vertices)))


def bay_distance(v):
    return np.maximum.reduce([np.abs(v[:, 0])-.50, v[:, 2]+1.15, v[:, 1]-.78])


def lifted(mesh):
    mesh.apply_translation([0, LIFT, 0])
    return mesh


def edge_roll(scene, mesh, name, cut_distance):
    welded = mesh.copy()
    welded.merge_vertices(merge_norm=True, merge_tex=True)
    rows = trimesh.grouping.group_rows(welded.edges_sorted, require_count=1)
    segments = welded.vertices[welded.edges[rows]]
    if len(segments):
        distance = cut_distance(segments.reshape(-1, 3)).reshape(-1, 2)
        segments = segments[np.max(np.abs(distance), axis=1) < .003]
    segments = [tube(a, b, .004) for a, b in segments if np.linalg.norm(a-b) > 1e-6]
    if segments:
        add(scene, name, trimesh.util.concatenate(segments), DARK)


def shell():
    scene = trimesh.Scene()
    for name in sorted(SOURCE_NAMES):
        for i, mesh in enumerate(object_meshes(name, preserve_normals=True)):
            if name in {'B_Body', 'B_Body_Tail_Rear'}:
                mesh = trim(mesh, bay_distance)
                if mesh is None:
                    continue
            if name == 'B_Body':
                for z in [1.19, -1.19]:
                    mesh = trim(mesh, lambda v: np.maximum(.58-np.abs(v[:, 0]),
                                np.hypot(v[:, 1]-(TIRE_RADIUS-LIFT), v[:, 2]-z)-ARCH_RADIUS))
                    if mesh is None:
                        raise ValueError('Wheel-mouth cuts removed the fixed body')
            if name not in WHEELS.values():
                lifted(mesh)
            mesh.metadata['source_name'] = name
            add(scene, f'{name}_{i}', mesh)
    scene.metadata.update(stage=2, body_lift=LIFT, static_preview=True)
    return scene


def wings(wide=False):
    scene = trimesh.Scene()
    anchors = np.concatenate([m.vertices for name in [
        'B_Body', 'B_Body_Hood_Front', 'B_Body_Engine_Lid_Rear',
        'B_Body_Nose_Front', 'B_Body_Tail_Rear'] for m in object_meshes(name, preserve_normals=True)])
    tree = cKDTree(anchors)
    for axle, z in [('F', 1.19), ('R', -1.19)]:
        for side, sign in [('L', 1), ('R', -1)]:
            for i, mesh in enumerate(object_meshes(f'B_Body_Fender_{axle}{side}', preserve_normals=True)):
                if wide:
                    distance = np.clip(tree.query(mesh.vertices)[0]/.16, 0, 1)
                    outer = np.clip((np.abs(mesh.vertices[:, 0])-.60)/.16, 0, 1)
                    mesh.vertices[:, 0] += sign*.055*outer*distance*distance*(3-2*distance)
                # Open the wheel mouth and sweep away the low stock skirts, not the upper wing.
                mesh = trim(mesh, lambda v: np.hypot(v[:, 1]-(TIRE_RADIUS-LIFT), v[:, 2]-z)-ARCH_RADIUS)
                if mesh is not None:
                    mesh = trim(mesh, lambda v: v[:, 1]-(.40+.12*np.maximum(0, np.abs(v[:, 2]-z)-.25)))
                if mesh is None:
                    continue
                name = f'BODY_Stage2_Fender_{axle}{side}_{i}'
                lifted(mesh)
                add(scene, name, mesh, FIBER if wide else None)
                edge_roll(scene, mesh, f'TRIM_Stage2_Fender_{axle}{side}_{i}',
                          lambda v: np.minimum(
                              np.abs(np.hypot(v[:, 1]-TIRE_RADIUS, v[:, 2]-z)-ARCH_RADIUS),
                              np.abs(v[:, 1]-LIFT-.40-.12*np.maximum(0, np.abs(v[:, 2]-z)-.25))))
    for name in ['B_HeadlightGlass', 'B_HeadlightTrim', 'B_TurnSignal', 'B_Tailights']:
        for i, mesh in enumerate(object_meshes(name, preserve_normals=True)):
            add(scene, f'EXTERIOR_Stage2_{name}_{i}', lifted(mesh))
    return scene


def nose():
    scene = trimesh.Scene()
    for name in ['B_Body_Hood_Front', 'B_Body_Nose_Front']:
        for i, mesh in enumerate(object_meshes(name, preserve_normals=True)):
            if name == 'B_Body_Nose_Front':
                mesh = trim(mesh, lambda v: v[:, 1]-.40-.20*np.maximum(0, v[:, 2]-1.45))
            if mesh is not None:
                lifted(mesh)
                add(scene, f'BODY_Stage2_RoundedNose_{name}_{i}', mesh)
                if name == 'B_Body_Nose_Front':
                    edge_roll(scene, mesh, f'TRIM_Stage2_Nose_{name}_{i}',
                              lambda v: v[:, 1]-LIFT-.40-.20*np.maximum(0, v[:, 2]-1.45))
    return scene


def rear():
    scene = trimesh.Scene()
    for name in ['B_Body_Engine_Lid_Rear', 'B_Body_Tail_Rear']:
        for i, mesh in enumerate(object_meshes(name, preserve_normals=True)):
            mesh = clip(mesh, 2, -1.56, False)
            if mesh is not None:
                mesh = trim(mesh, bay_distance)
            if mesh is not None:
                lifted(mesh)
                add(scene, f'BODY_Stage2_RearDeck_{name}_{i}', mesh)
                edge_roll(scene, mesh, f'TRIM_Stage2_RearDeck_{name}_{i}',
                          lambda v: v[:, 2]+1.56)
    return scene


def wheels():
    prepared = trimesh.load(PREPARED, force='scene', process=False)
    if len(prepared.geometry) != 1:
        raise ValueError('Expected one prepared supplied tire')
    node = next(iter(prepared.graph.nodes_geometry))
    transform, key = prepared.graph[node]
    source = prepared.geometry[key].copy()
    source.apply_transform(transform)
    scene = trimesh.Scene()
    for suffix, name in WHEELS.items():
        meshes = object_meshes(name, preserve_normals=True)
        stock = next(m for m in meshes if m.visual.material.name == 'B-tire1')
        tire = fit_tire(source, stock)
        old = stock.bounds.mean(axis=0)
        center = np.array([TRACK if old[0] > 0 else -TRACK, TIRE_RADIUS, old[2]])
        vertices = tire.vertices-old
        radius = np.linalg.norm(vertices[:, 1:], axis=1)
        inner = tire.metadata['bead_radius']
        new_radius = inner+(radius-inner)/(tire.metadata['outer_radius']-inner)*(TIRE_RADIUS-inner)
        vertices[:, 1:] *= (new_radius/radius)[:, None]
        vertices[:, 0] *= 1.10
        tire.vertices = vertices+center
        tire.metadata.update(center=center.tolist(), outer_radius=TIRE_RADIUS,
                             sizing='30-inch Stage 2 adaptation; 1.50 m track; static fit')
        add(scene, f'{suffix}_Tire', tire, RUBBER)
        rim = next(m for m in meshes if m.visual.material.name == 'B-paint1')
        rim.vertices[:, 0] = old[0]+(rim.vertices[:, 0]-old[0])*1.10
        rim.apply_translation(center-old)
        add(scene, f'{suffix}_WheelFace', rim, STEEL)
        sign = 1 if old[0] > 0 else -1
        outboard = center+[sign*.128, 0, 0]
        add(scene, f'{suffix}_Hub', tube(outboard-[sign*.012, 0, 0],
                                      outboard+[sign*.012, 0, 0], .065), DARK)
        for i in range(4):
            angle = i*np.pi/2
            bolt = outboard+[0, .11*np.cos(angle), .11*np.sin(angle)]
            add(scene, f'{suffix}_RimBolt_{i}', tube(bolt, bolt+[sign*.012, 0, 0], .009), STEEL)
    return scene


def rods(scene, name, points, radius=.025, mat=DARK):
    add(scene, name, trimesh.util.concatenate([tube(a, b, radius) for a, b in zip(points, points[1:])]), mat)


def front_bumper():
    scene = trimesh.Scene()
    rods(scene, 'PROTECT_Stage2_FrontBar',
         [[-.65,.53,1.80],[-.49,.53,1.88],[.49,.53,1.88],[.65,.53,1.80]], .028)
    rods(scene, 'PROTECT_Stage2_FrontLower', [[-.40,.40,1.72],[-.29,.40,1.88],[.29,.40,1.88],[.40,.40,1.72]], .023)
    for sign in [-1, 1]:
        rods(scene, f'PROTECT_Stage2_FrontMount_{sign}',
             [[sign*.32,.43,1.12],[sign*.32,.40,1.72],[sign*.32,.53,1.88]], .025)
    return scene


def rear_guard():
    scene = trimesh.Scene()
    for y, label in [(.46,'Lower'), (.91,'Upper')]:
        rods(scene, f'PROTECT_Stage2_Rear{label}',
             [[-.55,y,-1.76],[-.55,y,-1.90],[-.53,y,-2.10],
              [-.48,y,-2.17],[-.40,y,-2.19],[.40,y,-2.19],
              [.48,y,-2.17],[.53,y,-2.10],[.55,y,-1.90],[.55,y,-1.76]], .025)
    for sign in [-1, 1]:
        rods(scene, f'PROTECT_Stage2_RearUpright_{sign}',
             [[sign*.55,.46,-1.90],[sign*.55,.91,-1.90]], .025)
        rods(scene, f'PROTECT_Stage2_RearMount_{sign}',
             [[sign*.35,.46,-1.19],[sign*.48,.46,-2.17]], .028)
    return scene


def rockers():
    scene = trimesh.Scene()
    for sign in [-1, 1]:
        rods(scene, f'PROTECT_Stage2_Rocker_{sign}',
             [[sign*.66,.48,-.68],[sign*.70,.38,-.55],[sign*.70,.38,.52],[sign*.66,.48,.64]], .026)
        for z in [-.48, .45]:
            rods(scene, f'PROTECT_Stage2_RockerMount_{sign}_{z}',
                 [[sign*.53,.38,z],[sign*.70,.38,z]], .022)
    return scene


def running_gear():
    scene = trimesh.Scene()
    for axle, z in [('F', 1.19), ('R', -1.19)]:
        if axle == 'F':
            for y in [.39, .54]:
                rods(scene, f'MECH_Stage2_Beam_{y}', [[-.60,y,z],[.60,y,z]], .039)
        for sign in [-1, 1]:
            hub = np.array([sign*.635,TIRE_RADIUS,z])
            pivot = [sign*.39,.44,z+(.10 if axle == 'F' else .42)]
            rods(scene, f'MECH_Stage2_Arm_{axle}_{sign}', [pivot,hub], .031)
            rods(scene, f'MECH_Stage2_Spindle_{axle}_{sign}', [hub,[sign*TRACK,TIRE_RADIUS,z]], .035)
            if axle == 'R':
                rods(scene, f'MECH_Stage2_Halfshaft_{sign}', [[sign*.18,.40,z],hub], .025, STEEL)
            lower = np.array([sign*.60,.43,z-.035])
            upper = np.array([sign*.43,.84,z+.035])
            middle = lower*.5+upper*.5
            rods(scene, f'MECH_Stage2_ShockBody_{axle}_{sign}', [lower,middle], .036)
            rods(scene, f'MECH_Stage2_ShockRod_{axle}_{sign}', [middle,upper], .013, STEEL)
    return scene


def engine():
    source = ROOT.parents[1] / 'handoff' / 'project_baja_handoff' / 'bug_asset' / 'PART_012_AirCooledRearEngine.glb'
    original = trimesh.load(source, force='scene', process=False)
    if 'ENGINE_Crankcase' not in original.geometry:
        raise ValueError('Historical flat-four geometry is missing')
    scene = trimesh.Scene()
    materials = {
        'ENGINE_FanShroud': DARK, 'ENGINE_AirFilterHousing': DARK,
        'ENGINE_PlugWire': material('Stage2_PlugWire', (119, 57, 42)),
        'ENGINE_Belt': RUBBER, 'ENGINE_Exhaust': material('Stage2_Exhaust', (111, 83, 62), .5),
    }
    for node in original.graph.nodes_geometry:
        transform, key = original.graph[node]
        mesh = original.geometry[key].copy()
        mesh.apply_transform(transform)
        mesh.vertices = (mesh.vertices-[0,.65,-1.65])*.72+[0,.65+LIFT,-1.65]
        mat = next((m for prefix, m in materials.items() if node.startswith(prefix)), STEEL)
        add(scene, node, mesh, mat)
    scene.metadata['limitation'] = 'Refitted flat-four visual blockout; not a rigged or mechanically certified engine'
    return scene


def main():
    base = shell()
    save(base, SHELL_FILE)
    parts = {1:wheels(), 2:front_bumper(), 3:rear_guard(), 6:running_gear(),
             7:wings(), 8:nose(), 9:rear(), 10:wings(True), 11:rockers(), 12:engine()}
    for number, scene in parts.items():
        for mesh in scene.geometry.values():
            mesh.metadata['stage2_part'] = PARTS[number]
        save(scene, f'STAGE2_{PARTS[number]}.glb')
    masks = [prefix for number in DEFAULT_PARTS for prefix in MASKS.get(number, [])]
    assembled = trimesh.Scene()
    for node in base.graph.nodes_geometry:
        transform, key = base.graph[node]
        mesh = base.geometry[key]
        if not any(mesh.metadata['source_name'].startswith(prefix) for prefix in masks):
            add(assembled, node, mesh.copy(include_cache=True))
    for number in DEFAULT_PARTS:
        for name, mesh in parts[number].geometry.items():
            add(assembled, f'{PARTS[number]}_{name}', mesh.copy(include_cache=True))
    assembled.metadata.update(stage=2, tire_diameter=2*TIRE_RADIUS, body_lift=LIFT,
                              wheel_track=2*TRACK, static_preview=True)
    save(assembled, ASSEMBLY_FILE)


if __name__ == '__main__':
    main()
