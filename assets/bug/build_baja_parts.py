"""Build imported-shell body conversions; run with numpy, scipy and trimesh."""
from pathlib import Path
import json
import shutil
import struct

import numpy as np
from scipy.spatial import ConvexHull, cKDTree
import trimesh
from trimesh.visual.material import PBRMaterial

ROOT = Path(__file__).resolve().parent
VIEWER = ROOT.parents[1] / 'viewer' / 'bug_viewer' / 'public' / 'models'
BASE = trimesh.load(ROOT / 'VEH_001_Beetle_Imported.glb', force='scene', process=False)
PARENTS = {child: parent for parent, child, _ in BASE.graph.to_edgelist()}
NOSE = 1.34
TAIL = -1.68


def source_name(node):
    while node not in SOURCE_NAMES:
        node = PARENTS[node]
    return node


data = (ROOT / 'VEH_001_Beetle_Imported.glb').read_bytes()
length = struct.unpack_from('<I', data, 12)[0]
SOURCE_NAMES = {n['name'] for n in json.loads(data[20:20+length])['nodes']}


def object_meshes(name, *, preserve_normals=False):
    result = []
    for node in BASE.graph.nodes_geometry:
        if source_name(node) == name:
            transform, geometry = BASE.graph[node]
            mesh = BASE.geometry[geometry].copy()
            if preserve_normals:
                mesh.vertex_normals = BASE.geometry[geometry].vertex_normals.copy()
            mesh.apply_transform(transform)
            result.append(mesh)
    if not result:
        raise ValueError(f'Missing imported object: {name}; re-export the modular base first')
    return result


def material(name, rgb, metallic=0, roughness=.75):
    rgb = np.asarray(rgb)/255
    linear = np.where(rgb <= .04045, rgb/12.92, ((rgb+.055)/1.055)**2.4)
    return PBRMaterial(name=name, baseColorFactor=[*linear, 1], metallicFactor=metallic,
                       roughnessFactor=roughness, doubleSided=True)


PAINT = material('Baja_FadedBlue', (115, 156, 166))
FIBER = material('Baja_Fiberglass', (193, 178, 149))
STEEL = material('Baja_EdgeSteel', (104, 105, 100), .65, .6)
DARK = material('Baja_Rubber', (36, 37, 35))


def add(scene, name, mesh, mat=None):
    if mesh is None:
        return
    if mat is not None:
        mesh.visual = trimesh.visual.TextureVisuals(material=mat)
    scene.add_geometry(mesh, node_name=name, geom_name=name)


def clip(mesh, axis, value, keep_below):
    """Clip triangles, interpolating the original corner normals and UVs."""
    return clip_distances(mesh, np.asarray(mesh.vertices)[:, axis]-value,
                          keep_below, (axis, value))


def clip_distances(mesh, distances, keep_below=False, plane=None):
    vertices, normals, uvs, faces = [], [], [], []
    has_uv = mesh.visual.uv is not None
    # Plain array views avoid repeated Trimesh cache hashing for every corner.
    source_vertices = np.asarray(mesh.vertices)
    source_normals = np.asarray(mesh.vertex_normals)
    source_uvs = np.asarray(mesh.visual.uv) if has_uv else None
    for face in np.asarray(mesh.faces):
        polygon = [(source_vertices[i], source_normals[i],
                    source_uvs[i] if source_uvs is not None else np.zeros(2),
                    distances[i]) for i in face]
        output = []
        for a, b in zip(polygon, polygon[1:]+polygon[:1]):
            da, db = a[3], b[3]
            inside_a = da <= 1e-9 if keep_below else da >= -1e-9
            inside_b = db <= 1e-9 if keep_below else db >= -1e-9
            if inside_a:
                output.append(a)
            if inside_a != inside_b:
                t = da/(da-db)
                p = a[0]+t*(b[0]-a[0])
                if plane is not None:
                    p[plane[0]] = plane[1]
                n = a[1]+t*(b[1]-a[1])
                n /= np.linalg.norm(n)
                output.append((p, n, a[2]+t*(b[2]-a[2]), 0))
        for i in range(1, len(output)-1):
            triangle = [output[0], output[i], output[i+1]]
            if np.linalg.norm(np.cross(triangle[1][0]-triangle[0][0],
                                       triangle[2][0]-triangle[0][0])) < 1e-12:
                continue
            start = len(vertices)
            vertices.extend(p[0] for p in triangle)
            normals.extend(p[1] for p in triangle)
            uvs.extend(p[2] for p in triangle)
            faces.append([start, start+1, start+2])
    if not faces:
        return None
    result = trimesh.Trimesh(vertices=vertices, faces=faces, vertex_normals=normals, process=False)
    result.visual = trimesh.visual.TextureVisuals(uv=uvs if has_uv else None,
                                                 material=mesh.visual.material.copy())
    return result


def tube(a, b, radius=.009):
    a, b = np.asarray(a), np.asarray(b)
    direction = b-a
    if np.linalg.norm(direction) < 1e-7:
        raise ValueError('Zero-length reinforcement segment')
    mesh = trimesh.creation.cylinder(radius=radius, height=np.linalg.norm(direction), sections=12)
    mesh.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], direction))
    mesh.apply_translation((a+b)/2)
    return mesh


def cut_edges(mesh, plane):
    welded = mesh.copy()
    welded.merge_vertices(merge_norm=True, merge_tex=True)
    rows = trimesh.grouping.group_rows(welded.edges_sorted, require_count=1)
    segments = welded.vertices[welded.edges[rows]]
    return [segment for segment in segments if np.max(np.abs(segment[:, 2]-plane)) < 1e-6
            and np.linalg.norm(segment[1]-segment[0]) > 1e-6]


def contour(meshes, plane):
    points = np.concatenate([m.vertices[np.abs(m.vertices[:, 2]-plane) < 1e-6] for m in meshes])
    points = np.unique(np.round(points, 7), axis=0)
    if len(points) < 3:
        raise ValueError(f'No valid conversion cross-section at Z={plane}')
    hull = ConvexHull(points[:, :2])
    return points[hull.vertices]


def export(scene, filename):
    if not scene.geometry:
        raise ValueError(f'Empty replacement: {filename}')
    path = ROOT / filename
    scene.export(path, include_normals=True)
    shutil.copy2(path, VIEWER / filename)
    print(f'{filename}: {sum(len(m.faces) for m in scene.geometry.values())} triangles')


def lamps(scene, fenders, wide):
    for axle in ['F', 'R']:
        for side, sign in [('L', 1), ('R', -1)]:
            meshes = []
            names = ['B_HeadlightGlass', 'B_HeadlightTrim'] if axle == 'F' else ['B_Tailights']
            for name in names:
                for mesh in object_meshes(name):
                    piece = clip(mesh, 0, 0, sign < 0)
                    if piece is not None:
                        meshes.append(piece)
            if axle == 'R':
                meshes.extend(m for m in object_meshes(f'B_Body_Fender_R{side}')
                              if m.visual.material.name == 'B-taillight1')
            if not meshes:
                raise ValueError(f'Missing source lamps for {axle}{side}')
            bounds = np.array([np.min(np.concatenate([m.vertices for m in meshes]), axis=0),
                               np.max(np.concatenate([m.vertices for m in meshes]), axis=0)])
            original = bounds.mean(axis=0)
            front = axle == 'F'
            target = original.copy()
            target[0] += sign*(.11 if wide else .025)
            target[1] += .09
            target[2] = 1.60 if front else -1.60
            for i, mesh in enumerate(meshes):
                mesh.apply_translation(target-original)
                add(scene, f'EXTERIOR_BajaLamp_{axle}{side}_{i}', mesh)
            radius = max(bounds[1, 0]-bounds[0, 0], bounds[1, 1]-bounds[0, 1])/2
            socket = trimesh.creation.cylinder(radius=radius, height=.035, sections=32)
            socket.apply_translation(target+[0, 0, -.018 if front else .018])
            add(scene, f'EXTERIOR_BajaLampBucket_{axle}{side}', socket, DARK)
            anchor_vertices = np.concatenate([m.vertices for m in fenders[axle+side]])
            back = target+[0, 0, -.035 if front else .035]
            anchor = anchor_vertices[cKDTree(anchor_vertices).query(back)[1]]
            bracket = tube(anchor, back, .018)
            bracket.metadata['mount_start'] = anchor.tolist()
            bracket.metadata['mount_end'] = back.tolist()
            add(scene, f'EXTERIOR_BajaLampMount_{axle}{side}', bracket, STEEL)


def fenders(wide):
    scene, fitted = trimesh.Scene(), {}
    anchors = np.concatenate([m.vertices for name in [
        'B_Body', 'B_Body_Hood_Front', 'B_Body_Engine_Lid_Rear',
        'B_Body_Nose_Front', 'B_Body_Tail_Rear'] for m in object_meshes(name)])
    tree = cKDTree(anchors)
    for axle, center in [('F', 1.19), ('R', -1.19)]:
        for side, sign in [('L', 1), ('R', -1)]:
            fitted[axle+side] = []
            for i, mesh in enumerate(object_meshes(f'B_Body_Fender_{axle}{side}')):
                if wide:
                    distance = tree.query(mesh.vertices)[0]
                    weight = np.clip(distance/.16, 0, 1)
                    weight = weight*weight*(3-2*weight)
                    mesh.vertices[:, 0] += sign*.14*weight
                mesh = clip(mesh, 2, center+.40, True)
                if mesh is not None:
                    mesh = clip(mesh, 2, center-.40, False)
                if mesh is None:
                    continue
                fitted[axle+side].append(mesh)
                add(scene, f'BODY_Baja{"Wide" if wide else "Cut"}_Fender_{axle}{side}_{i}',
                    mesh, FIBER if wide else PAINT)
                for plane, label in [(center-.40, 'Back'), (center+.40, 'Front')]:
                    edges = cut_edges(mesh, plane)
                    if edges:
                        trim = trimesh.util.concatenate([tube(a, b) for a, b in edges])
                        add(scene, f'TRIM_FenderEdge_{axle}{side}_{label}_{i}', trim, DARK if wide else STEEL)
    lamps(scene, fitted, wide)
    export(scene, 'PART_010_FiberglassWideFenders.glb' if wide else 'PART_007_CutBajaFenders.glb')


def hood():
    scene, pieces = trimesh.Scene(), []
    for name in ['B_Body_Hood_Front', 'B_Body_Nose_Front']:
        for i, source in enumerate(object_meshes(name)):
            mesh = clip(source, 2, NOSE, True)
            if mesh is not None:
                pieces.append(mesh)
                add(scene, f'BODY_BajaShortHood_{name}_{i}', mesh)
    edge = contour(pieces, NOSE)
    cap = trimesh.Trimesh(vertices=edge, faces=[[0, i, i+1] for i in range(1, len(edge)-1)], process=False)
    add(scene, 'BODY_CutFrontApron', cap, PAINT)
    for i, (a, b) in enumerate(zip(edge, np.roll(edge, -1, axis=0))):
        add(scene, f'TRIM_HoodEdge_{i}', tube(a, b), STEEL)
    export(scene, 'PART_008_ShortenedFrontHood.glb')


def rear():
    scene, pieces = trimesh.Scene(), []
    for name in ['B_Body_Engine_Lid_Rear', 'B_Body_Tail_Rear']:
        for i, source in enumerate(object_meshes(name)):
            mesh = clip(source, 2, TAIL, False)
            if mesh is not None:
                pieces.append(mesh)
                add(scene, f'BODY_BajaPartialDeck_{name}_{i}', mesh)
    edge = contour(pieces, TAIL)
    for i, (a, b) in enumerate(zip(edge, np.roll(edge, -1, axis=0))):
        add(scene, f'BODY_EngineOpeningRail_{i}', tube(a, b, .018), STEEL)
    export(scene, 'PART_009_RearEngineOpening.glb')


if __name__ == '__main__':
    fenders(False)
    fenders(True)
    hood()
    rear()
