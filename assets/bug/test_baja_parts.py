from pathlib import Path
import unittest

import numpy as np
from scipy.spatial import cKDTree
import trimesh
from build_baja_parts import clip, object_meshes

ROOT = Path(__file__).resolve().parent
FILES = ['PART_007_CutBajaFenders.glb', 'PART_008_ShortenedFrontHood.glb',
         'PART_009_RearEngineOpening.glb', 'PART_010_FiberglassWideFenders.glb']


def cylinder_clearance(meshes, wheel):
    center = wheel.bounds.mean(axis=0)
    radius = np.linalg.norm(wheel.vertices[:, 1:]-center[1:], axis=1).max()
    distances = []
    for mesh in meshes:
        cropped = clip(mesh, 0, wheel.bounds[0, 0], False)
        if cropped is not None:
            cropped = clip(cropped, 0, wheel.bounds[1, 0], True)
        if cropped is None:
            continue
        triangles = cropped.triangles[:, :, 1:]-center[1:]
        b = np.roll(triangles, -1, axis=1)
        direction = b-triangles
        denominator = np.sum(direction*direction, axis=2)
        t = np.clip(-np.sum(triangles*direction, axis=2)/np.maximum(denominator, 1e-30), 0, 1)
        distance = np.linalg.norm(triangles+t[:, :, None]*direction, axis=2).min(axis=1)
        cross = direction[:, :, 0]*(-triangles[:, :, 1])-direction[:, :, 1]*(-triangles[:, :, 0])
        edge1 = triangles[:, 1]-triangles[:, 0]
        edge2 = triangles[:, 2]-triangles[:, 0]
        area = np.abs(edge1[:, 0]*edge2[:, 1]-edge1[:, 1]*edge2[:, 0])
        inside = ((cross >= -1e-12).all(axis=1) | (cross <= 1e-12).all(axis=1)) & (area > 1e-12)
        distance[inside] = 0
        distances.append(distance)
    return np.concatenate(distances).min()-radius if distances else float('inf')


class BajaBodyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parts = {name: trimesh.load(ROOT / name, force='scene', process=False) for name in FILES}
        cls.base = trimesh.load(ROOT / 'VEH_001_Beetle_Imported.glb', force='scene', process=False)
        points = []
        for node in cls.base.graph.nodes_geometry:
            transform, key = cls.base.graph[node]
            points.append(trimesh.transform_points(cls.base.geometry[key].vertices, transform))
        cls.base_tree = cKDTree(np.concatenate(points))

    def test_exports_and_geometry(self):
        for name, scene in self.parts.items():
            self.assertEqual((ROOT / name).read_bytes(),
                             (ROOT.parents[1] / 'viewer' / 'bug_viewer' / 'public' / 'models' / name).read_bytes())
            self.assertTrue(scene.geometry)
            for mesh in scene.geometry.values():
                self.assertTrue(np.isfinite(mesh.vertices).all())
                self.assertTrue(np.isfinite(mesh.vertex_normals).all())
                self.assertTrue((np.linalg.norm(mesh.vertex_normals, axis=1) > .9).all())
                self.assertTrue((mesh.area_faces > 1e-12).all())
            self.assertLess(sum(len(m.faces) for m in scene.geometry.values()), 25000)

    def test_fender_mounts_and_width(self):
        for name in [FILES[0], FILES[3]]:
            scene = self.parts[name]
            for axle in ['F', 'R']:
                for side in ['L', 'R']:
                    skins = [m for n, m in scene.geometry.items() if n.startswith('BODY_Baja')
                             and f'Fender_{axle}{side}_' in n]
                    self.assertTrue(skins)
                    vertices = np.concatenate([m.vertices for m in skins])
                    matches = self.base_tree.query(vertices)[0] < .000002
                    self.assertGreater(np.count_nonzero(matches), 20, f'No surviving source mount: {name} {axle}{side}')
                    center = 1.19 if axle == 'F' else -1.19
                    self.assertGreaterEqual(vertices[:, 2].min(), center-.40001)
                    self.assertLessEqual(vertices[:, 2].max(), center+.40001)
        self.assertGreater(self.parts[FILES[3]].extents[0],
                           self.parts[FILES[0]].extents[0]+.15)

    def test_lamps_are_physically_mounted(self):
        for name in [FILES[0], FILES[3]]:
            scene = self.parts[name]
            mounts = {n: m for n, m in scene.geometry.items() if 'BajaLampMount_' in n}
            self.assertEqual(len(mounts), 4)
            for n, mesh in mounts.items():
                suffix = n.split('BajaLampMount_')[1]
                vertices = np.concatenate([m.vertices for key, m in scene.geometry.items()
                                           if 'Fender_'+suffix+'_' in key and key.startswith('BODY_')])
                self.assertLess(cKDTree(vertices).query(mesh.metadata['mount_start'])[0], .000002)
                self.assertGreater(np.linalg.norm(np.array(mesh.metadata['mount_start'])-mesh.metadata['mount_end']), .001)

    def test_shared_fender_seams_stay_fixed(self):
        anchors = np.concatenate([m.vertices for name in [
            'B_Body', 'B_Body_Hood_Front', 'B_Body_Engine_Lid_Rear',
            'B_Body_Nose_Front', 'B_Body_Tail_Rear'] for m in object_meshes(name)])
        tree = cKDTree(anchors)
        intersections = 0
        for axle, center in [('F', 1.19), ('R', -1.19)]:
            for side in ['L', 'R']:
                points = []
                for source in object_meshes(f'B_Body_Fender_{axle}{side}'):
                    shared = tree.query(source.vertices)[0] < .000002
                    retained = (source.vertices[:, 2] >= center-.4) & (source.vertices[:, 2] <= center+.4)
                    points.extend(source.vertices[shared & retained])
                    edges = source.vertices[source.edges_unique[shared[source.edges_unique].all(axis=1)]]
                    for plane in [center-.4, center+.4]:
                        crossing = edges[(edges[:, 0, 2]-plane)*(edges[:, 1, 2]-plane) < 0]
                        t = (plane-crossing[:, 0, 2])/(crossing[:, 1, 2]-crossing[:, 0, 2])
                        points.extend(crossing[:, 0]+t[:, None]*(crossing[:, 1]-crossing[:, 0]))
                        intersections += len(crossing)
                self.assertGreater(len(points), 20)
                for name in [FILES[0], FILES[3]]:
                    vertices = np.concatenate([m.vertices for n, m in self.parts[name].geometry.items()
                                               if n.startswith('BODY_') and f'Fender_{axle}{side}_' in n])
                    self.assertLess(cKDTree(vertices).query(points)[0].max(), .000002,
                                    f'{name} {axle}{side} shared seam moved')
        self.assertGreater(intersections, 0, 'No interpolated mounting edges checked')

    def test_front_and_rear_trimmed_envelopes(self):
        front = self.parts[FILES[1]]
        rear = self.parts[FILES[2]]
        self.assertLessEqual(front.bounds[1, 2], 1.35001)
        self.assertGreaterEqual(rear.bounds[0, 2], -1.70001)
        self.assertIn('BODY_CutFrontApron', front.geometry)
        self.assertFalse(any('ENGINE_' in n for n in rear.geometry))
        self.assertTrue(any('EngineOpeningRail' in n for n in rear.geometry))

    def test_stock_tire_clearance_not_reduced(self):
        for axle in ['F', 'R']:
            for side in ['L', 'R']:
                wheel_name = f'B_{axle}{side}Wheel' if axle == 'F' else f'B_B{side}Wheel'
                wheel = next(m for m in object_meshes(wheel_name) if m.visual.material.name == 'B-tire1')
                original = cylinder_clearance(object_meshes(f'B_Body_Fender_{axle}{side}'), wheel)
                for name in [FILES[0], FILES[3]]:
                    meshes = [m for n, m in self.parts[name].geometry.items()
                              if f'Fender_{axle}{side}_' in n]
                    actual = cylinder_clearance(meshes, wheel)
                    self.assertGreaterEqual(actual, original-.0002, f'{name} {axle}{side} tire clearance reduced')


if __name__ == '__main__':
    unittest.main()
