import hashlib
from pathlib import Path
import unittest
import zipfile

import numpy as np
import trimesh

from build_all_terrain_wheels import PREPARED, WHEELS
from build_baja_parts import object_meshes
from test_baja_parts import cylinder_clearance

ROOT = Path(__file__).resolve().parent
FILE = ROOT / 'PART_001_AllTerrainWheelSet.glb'
ARCHIVE_HASHES = {
    'generic_35_AT_tire_FBX.zip': '1140bb5f10c414b181e96f14917fb57ff14654211caab0000b26f145bc0f3100',
    'generic_35_AT_tire_OBJ.zip': '9326e4e913f31b86d579f69149b26b440208ce1263d031d720fe12cebecd7af7',
    'generic_35_AT_tire_STD.zip': '1a66bce40a1275b84a969d253ecc45c1c6e047d316dfd9a615e16d739f3d5709',
    'generic_35_AT_tire_STD_usd.zip': 'd5d25d6fe7aa57205bded79658730821f4e2ce6510fe2657f1efe6ebdb0aaf78',
    'generic_35_AT_tire_STL.zip': 'ec0fd84b1fb2a7a1fcf691d732fa462df7d9709fddc1a85c7c13116a58ea4771',
}


def world_mesh(scene, name):
    transform, key = scene.graph[name]
    mesh = scene.geometry[key].copy()
    mesh.apply_transform(transform)
    return mesh


class AllTerrainWheelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scene = trimesh.load(FILE, force='scene', process=False)

    def test_original_archives_and_deployment(self):
        for name, expected in ARCHIVE_HASHES.items():
            self.assertEqual(hashlib.sha256((PREPARED.parent / name).read_bytes()).hexdigest(), expected)
        self.assertEqual(FILE.read_bytes(),
                         (ROOT.parents[1] / 'viewer' / 'bug_viewer' / 'public' / 'models' / FILE.name).read_bytes())

    def test_geometry_and_budget(self):
        self.assertEqual(set(self.scene.graph.nodes_geometry),
                         {f'{s}_{p}' for s in WHEELS for p in ['Tire', 'WheelFace', 'Hub']})
        self.assertLessEqual(sum(len(m.faces) for m in self.scene.geometry.values()), 109000)
        for suffix in WHEELS:
            self.assertLessEqual(len(self.scene.geometry[f'{suffix}_Tire'].faces), 24000)
        for mesh in self.scene.geometry.values():
            self.assertTrue(np.isfinite(mesh.vertices).all())
            self.assertTrue((mesh.area_faces > 1e-12).all())
            np.testing.assert_allclose(np.linalg.norm(mesh.vertex_normals, axis=1), 1, atol=1e-5)

    def test_stock_rims_are_unchanged(self):
        for suffix, name in WHEELS.items():
            for original in object_meshes(name):
                if original.visual.material.name == 'B-tire1':
                    continue
                label = 'WheelFace' if original.visual.material.name == 'B-paint1' else 'Hub'
                fitted = world_mesh(self.scene, f'{suffix}_{label}')
                np.testing.assert_allclose(fitted.vertices, original.vertices, atol=1e-7)
                np.testing.assert_array_equal(fitted.faces, original.faces)
                self.assertEqual(fitted.visual.material.name, original.visual.material.name)

    def test_grounding_envelope_and_bead_fit(self):
        for suffix, name in WHEELS.items():
            stock = next(m for m in object_meshes(name) if m.visual.material.name == 'B-tire1')
            tire = world_mesh(self.scene, f'{suffix}_Tire')
            center = stock.bounds.mean(axis=0)
            np.testing.assert_allclose(tire.metadata['center'], center, atol=1e-7)
            self.assertGreaterEqual(tire.bounds[0, 1], -.000001)
            self.assertLess(abs(tire.bounds[0, 1]), .000001)
            self.assertTrue((tire.bounds[0] >= stock.bounds[0]-.000001).all())
            self.assertTrue((tire.bounds[1] <= stock.bounds[1]+.000001).all())
            radius = np.linalg.norm(tire.vertices[:, 1:]-center[1:], axis=1)
            native_radius = np.linalg.norm(stock.vertices[:, 1:]-center[1:], axis=1)
            self.assertAlmostEqual(radius.min(), native_radius.min(), places=6)
            self.assertLessEqual(radius.max(), native_radius.max()+.000001)
            bead = tire.vertices[radius <= radius.min()+.001, 0]-center[0]
            native_bead = stock.vertices[native_radius <= native_radius.min()+.001, 0]-center[0]
            np.testing.assert_allclose([bead.min(), bead.max()],
                                       [native_bead.min(), native_bead.max()], atol=.0005)

    def test_stock_and_baja_fender_clearance(self):
        for suffix, name in WHEELS.items():
            stock = next(m for m in object_meshes(name) if m.visual.material.name == 'B-tire1')
            tire = world_mesh(self.scene, f'{suffix}_Tire')
            body = object_meshes('B_Body')
            variants = [object_meshes(f'B_Body_Fender_{suffix}')]
            for part in ['PART_007_CutBajaFenders.glb', 'PART_010_FiberglassWideFenders.glb']:
                scene = trimesh.load(ROOT / part, force='scene', process=False)
                variants.append([m for n, m in scene.geometry.items() if f'Fender_{suffix}_' in n])
            for meshes in [body, *variants]:
                self.assertGreaterEqual(cylinder_clearance(meshes, tire),
                                        cylinder_clearance(meshes, stock)-.0002, f'{suffix} clearance reduced')

    def test_simplification_retains_source_surface(self):
        with zipfile.ZipFile(PREPARED.parent / 'generic_35_AT_tire_OBJ.zip') as archive:
            text = archive.read('generic_35_AT_tire.obj').decode('utf-8-sig')
        vertices = np.array([[float(v) for v in line.split()[1:4]]
                             for line in text.splitlines() if line.startswith('v ')])
        extent = np.ptp(vertices, axis=0)
        vertices -= (vertices.min(axis=0)+vertices.max(axis=0))/2
        vertices /= max(extent[1:])
        vertices = vertices[:, [0, 2, 1]]
        vertices[:, 2] *= -1
        scene = trimesh.load(PREPARED, force='scene', process=False)
        mesh = world_mesh(scene, next(iter(scene.graph.nodes_geometry)))
        samples = vertices[np.linspace(0, len(vertices)-1, 512, dtype=int)]
        distances = []
        for batch in np.array_split(samples, 16):
            distances.extend(trimesh.proximity.closest_point_naive(mesh, batch)[1])
        self.assertLess(max(distances), .004, 'Simplification changed sampled source surface by over 0.4% diameter')


if __name__ == '__main__':
    unittest.main()
