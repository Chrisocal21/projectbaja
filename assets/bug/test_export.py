import json
import hashlib
from pathlib import Path
import struct
import unittest

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parent
ASSET = ROOT / 'VEH_001_Beetle_Imported.glb'
PANELS = {'B_Body_Hood_Front', 'B_Body_Engine_Lid_Rear',
          'B_Body_Fender_FL', 'B_Body_Fender_FR', 'B_Body_Fender_RL', 'B_Body_Fender_RR'}
ASSEMBLED_SIGNATURE = 'fcd257e68437d09889a9ab173f8405f5745f2a088427b05eb05858232a9ccd17'


def assembly_signature(scene):
    materials = sorted({g.visual.material.name for g in scene.geometry.values()})
    rows = []
    for node in scene.graph.nodes_geometry:
        transform, key = scene.graph[node]
        mesh = scene.geometry[key]
        points = trimesh.transform_points(mesh.vertices, transform)[mesh.faces]
        points = np.rint(points*100000).astype('<i8')
        first = np.lexsort((points[:, :, 2], points[:, :, 1], points[:, :, 0]), axis=-1)[:, 0]
        order = (first[:, None]+np.arange(3)) % 3
        points = np.take_along_axis(points, order[:, :, None], axis=1)
        rows.append(np.column_stack((points.reshape(-1, 9),
                                     np.full(len(mesh.faces), materials.index(mesh.visual.material.name)))))
    rows = np.concatenate(rows)
    rows = rows[np.lexsort(rows.T[::-1])]
    return hashlib.sha256(rows.tobytes()).hexdigest()


class ImportedBeetleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = ASSET.read_bytes()
        magic, version, size = struct.unpack_from('<III', cls.data)
        if (magic, version, size) != (0x46546C67, 2, len(cls.data)):
            raise ValueError('Invalid GLB header')
        length, kind = struct.unpack_from('<II', cls.data, 12)
        if kind != 0x4E4F534A:
            raise ValueError('Missing GLB JSON chunk')
        cls.gltf = json.loads(cls.data[20:20+length])
        cls.scene = trimesh.load(ASSET, force='scene')
        cls.parents = {child: parent for parent, child, _ in cls.scene.graph.to_edgelist()}
        cls.source_nodes = {n['name']: n for n in cls.gltf['nodes']}

    def source_for(self, node):
        while node not in self.source_nodes:
            node = self.parents[node]
        return self.source_nodes[node]

    def mesh_bounds(self, name):
        points = []
        for node in self.scene.graph.nodes_geometry:
            if self.source_for(node)['name'] == name:
                transform, geometry = self.scene.graph[node]
                points.append(trimesh.transform_points(self.scene.geometry[geometry].vertices, transform))
        self.assertTrue(points, f'Missing geometry for {name}')
        vertices = np.concatenate(points)
        return np.array([vertices.min(axis=0), vertices.max(axis=0)])

    def test_vehicle_only_and_source_names(self):
        nodes = self.gltf['nodes']
        self.assertEqual(len(nodes), 64)
        self.assertTrue(all(n['name'].startswith('B_') for n in nodes))
        self.assertTrue(all(n['extras']['source_name'] == n['name'] for n in nodes))
        names = {n['name'] for n in nodes}
        self.assertTrue(PANELS <= names)
        self.assertEqual(len({n['extras']['original_source_name'] for n in nodes}), 56)
        self.assertTrue({'B_Body', 'B_Windshield', 'B_FrontBumper', 'B_BackBumper',
                         'B_FLWheel', 'B_FRWheel', 'B_BLWheel', 'B_BRWheel'} <= names)
        self.assertFalse(self.gltf.get('cameras'))
        self.assertFalse(self.gltf.get('images'))

    def test_normalized_coordinates_and_orientation(self):
        width, height, length = self.scene.extents
        self.assertTrue(1.5 < width < 1.7)
        self.assertTrue(1.4 < height < 1.6)
        self.assertTrue(3.8 < length < 4.1)
        self.assertAlmostEqual(self.scene.bounds[0, 1], 0, places=5)
        centers = {}
        for name in ['B_FLWheel', 'B_FRWheel', 'B_BLWheel', 'B_BRWheel']:
            centers[name] = self.mesh_bounds(name).mean(axis=0)
            self.assertAlmostEqual(abs(centers[name][0]), .65163, places=4)
            self.assertAlmostEqual(centers[name][1], .34572, places=4)
        front = (centers['B_FLWheel']+centers['B_FRWheel'])/2
        rear = (centers['B_BLWheel']+centers['B_BRWheel'])/2
        self.assertAlmostEqual(front[2], 1.19, places=5)
        self.assertAlmostEqual(rear[2], -1.19, places=5)
        self.assertAlmostEqual(np.linalg.norm(front-rear), 2.38, places=5)
        self.assertGreater(self.mesh_bounds('B_FrontBumper').mean(axis=0)[2], front[2])
        self.assertLess(self.mesh_bounds('B_BackBumper').mean(axis=0)[2], rear[2])

    def test_finite_geometry_and_normals(self):
        triangles = 0
        for geometry in self.scene.geometry.values():
            self.assertTrue(np.isfinite(geometry.vertices).all())
            self.assertTrue(np.isfinite(geometry.vertex_normals).all())
            self.assertTrue((np.linalg.norm(geometry.vertex_normals, axis=1) > .9).all())
            triangles += len(geometry.faces)
        self.assertEqual(triangles, 190396)
        for node in self.scene.graph.nodes_geometry:
            transform, _ = self.scene.graph[node]
            source = self.source_for(node)
            # The source includes mirrored objects; normalization must preserve their handedness.
            self.assertGreater(np.linalg.det(transform[:3, :3]) *
                               source['extras']['source_transform_determinant'], 0)

    def test_pbr_materials(self):
        materials = {m['name']: m for m in self.gltf['materials']}
        self.assertTrue(all('pbrMetallicRoughness' in m for m in materials.values()))
        self.assertEqual(materials['B-chrome']['pbrMetallicRoughness'].get('metallicFactor', 1), 1)
        glass = materials['B-window1']
        self.assertEqual(glass['alphaMode'], 'BLEND')
        self.assertAlmostEqual(glass['pbrMetallicRoughness']['baseColorFactor'][3], .28, places=5)
        rgb = np.array([115, 156, 166])/255
        blue = np.where(rgb <= .04045, rgb/12.92, ((rgb+.055)/1.055)**2.4)
        np.testing.assert_allclose(materials['B-paint1']['pbrMetallicRoughness']['baseColorFactor'][:3], blue, atol=1e-6)

    def test_deployment_matches_export(self):
        deployed = ROOT.parents[1] / 'viewer' / 'bug_viewer' / 'public' / 'models' / ASSET.name
        self.assertEqual(self.data, deployed.read_bytes())

    def test_independent_body_panels(self):
        for name in PANELS:
            bounds = self.mesh_bounds(name)
            self.assertTrue((bounds[1] > bounds[0]).all())
            self.assertEqual(self.source_nodes[name]['extras']['original_source_name'], 'B_Body')
        hood = self.mesh_bounds('B_Body_Hood_Front')
        lid = self.mesh_bounds('B_Body_Engine_Lid_Rear')
        self.assertGreater(hood[0, 2], .4)
        self.assertLess(lid[1, 2], -1.4)
        self.assertLess(lid[1, 1], 1.1)
        for axle in ['F', 'R']:
            left = self.mesh_bounds(f'B_Body_Fender_{axle}L')
            right = self.mesh_bounds(f'B_Body_Fender_{axle}R')
            self.assertGreater(left[0, 0], .15)
            self.assertLess(right[1, 0], -.15)
            np.testing.assert_allclose(left[1, 1:], right[1, 1:], atol=1e-5)

    def test_assembled_triangles_materials_and_winding_unchanged(self):
        self.assertEqual(assembly_signature(self.scene), ASSEMBLED_SIGNATURE)
        for mesh in self.gltf['meshes']:
            for primitive in mesh['primitives']:
                self.assertNotIn('_BAJA_NORMAL', primitive['attributes'])


if __name__ == '__main__':
    unittest.main()
