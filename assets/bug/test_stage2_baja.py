from pathlib import Path
import unittest

import numpy as np
from scipy.spatial import cKDTree
import trimesh

from build_baja_parts import object_meshes
from build_stage2_baja import (ARCH_RADIUS, ASSEMBLY_FILE, DEFAULT_PARTS, LIFT,
                              MASKS, PARTS, SHELL_FILE, TIRE_RADIUS, TRACK)
from test_all_terrain_wheels import world_mesh
from test_baja_parts import cylinder_clearance
from test_export import assembly_signature

ROOT = Path(__file__).resolve().parent


class Stage2Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.shell = trimesh.load(ROOT / SHELL_FILE, force='scene', process=False)
        cls.parts = {n: trimesh.load(ROOT / f'STAGE2_{name}.glb', force='scene', process=False)
                     for n, name in PARTS.items()}
        cls.assembly = trimesh.load(ROOT / ASSEMBLY_FILE, force='scene', process=False)

    def test_export_sync_and_geometry(self):
        for filename, scene in [(SHELL_FILE, self.shell), (ASSEMBLY_FILE, self.assembly),
                                *[(f'STAGE2_{PARTS[n]}.glb', scene) for n, scene in self.parts.items()]]:
            self.assertEqual((ROOT / filename).read_bytes(),
                             (ROOT.parents[1] / 'viewer' / 'bug_viewer' / 'public' / 'models' / filename).read_bytes())
            for mesh in scene.geometry.values():
                self.assertTrue(np.isfinite(mesh.vertices).all())
                bad = np.count_nonzero(mesh.area_faces <= 1e-12)
                if bad:
                    source = mesh.metadata.get('source_name')
                    self.assertIsNotNone(source, f'New part has degenerate faces: {filename}')
                    inherited = sum(np.count_nonzero(m.area_faces <= 1e-12)
                                    for m in object_meshes(source))
                    self.assertLessEqual(bad, inherited, f'New degenerate faces: {filename}')
                np.testing.assert_allclose(np.linalg.norm(mesh.vertex_normals, axis=1), 1, atol=1e-5)
        self.assertLess(sum(len(m.faces) for m in self.assembly.geometry.values()), 300000)

    def test_full_body_and_moderate_stance(self):
        roof = max(m.bounds[1, 1] for m in self.shell.geometry.values())
        self.assertAlmostEqual(roof, 1.52394015+LIFT, places=5)
        self.assertAlmostEqual(self.assembly.bounds[0, 1], 0, places=5)
        self.assertAlmostEqual(2*TIRE_RADIUS/.0254, 30, places=4)
        for suffix in ['FL', 'FR', 'RL', 'RR']:
            tire = world_mesh(self.parts[1], f'{suffix}_Tire')
            center = np.array(tire.metadata['center'])
            self.assertAlmostEqual(abs(center[0]), TRACK, places=6)
            self.assertAlmostEqual(center[1], TIRE_RADIUS, places=6)
            self.assertAlmostEqual(center[2], 1.19 if suffix[0] == 'F' else -1.19, places=5)
            self.assertAlmostEqual(tire.bounds[0, 1], 0, places=5)
        for name in ['B_Windshield', 'B_BackWindow', 'B_SideWindows', 'B_InteriorSteeringWheel']:
            self.assertTrue(any(m.metadata['source_name'] == name for m in self.shell.geometry.values()))
            for i, original in enumerate(object_meshes(name, preserve_normals=True)):
                fitted = self.shell.geometry[f'{name}_{i}']
                np.testing.assert_allclose(fitted.vertices, original.vertices+[0,LIFT,0], atol=1e-7)
                np.testing.assert_allclose(fitted.vertex_normals, original.vertex_normals, atol=1e-6)

    def test_rounded_nose_and_integrated_lamps(self):
        nose = self.parts[8]
        self.assertFalse(any('CutFrontApron' in n for n in nose.geometry))
        self.assertGreater(nose.bounds[1, 2], 1.65)
        self.assertGreater(nose.extents[1], .5)
        for name in ['B_HeadlightGlass', 'B_HeadlightTrim', 'B_TurnSignal', 'B_Tailights']:
            for i, original in enumerate(object_meshes(name)):
                fitted = world_mesh(self.parts[7], f'EXTERIOR_Stage2_{name}_{i}')
                np.testing.assert_allclose(fitted.vertices, original.vertices+[0,LIFT,0], atol=1e-7)
        self.assertFalse(any('LampBucket' in n or 'LampMount' in n for n in self.parts[7].geometry))

    def test_wheel_mouth_clearance(self):
        body = [m for m in self.shell.geometry.values() if m.metadata['source_name'] == 'B_Body']
        for suffix in ['FL', 'FR', 'RL', 'RR']:
            tire = world_mesh(self.parts[1], f'{suffix}_Tire')
            self.assertGreaterEqual(cylinder_clearance(body, tire), .005, f'{suffix} fixed body overlap')
            for part in [7, 10]:
                skins = [m for n, m in self.parts[part].geometry.items() if f'Fender_{suffix}_' in n]
                self.assertGreaterEqual(cylinder_clearance(skins, tire), .07,
                                        f'{suffix} high-cut wing clearance')
                self.assertLessEqual(ARCH_RADIUS-TIRE_RADIUS, .10)

    def test_wide_wings_preserve_mounts_and_lamps(self):
        anchors = np.concatenate([m.vertices+[0,LIFT,0] for name in [
            'B_Body', 'B_Body_Hood_Front', 'B_Body_Engine_Lid_Rear',
            'B_Body_Nose_Front', 'B_Body_Tail_Rear'] for m in object_meshes(name)])
        tree = cKDTree(anchors)
        for suffix in ['FL', 'FR', 'RL', 'RR']:
            cut = np.concatenate([m.vertices for n,m in self.parts[7].geometry.items()
                                  if n.startswith('BODY_') and f'Fender_{suffix}_' in n])
            wide = np.concatenate([m.vertices for n,m in self.parts[10].geometry.items()
                                   if n.startswith('BODY_') and f'Fender_{suffix}_' in n])
            shared = cut[tree.query(cut)[0] < .000002]
            self.assertGreater(len(shared), 20)
            self.assertLess(cKDTree(wide).query(shared)[0].max(), .000002)
        for name, mesh in self.parts[7].geometry.items():
            if name.startswith('EXTERIOR_'):
                np.testing.assert_allclose(self.parts[10].geometry[name].vertices, mesh.vertices, atol=1e-7)
        self.assertGreater(self.parts[10].extents[0], self.parts[7].extents[0]+.05)

    def test_rear_bay_and_protection(self):
        self.assertFalse(any('EngineOpeningRail' in n for n in self.parts[9].geometry))
        self.assertGreaterEqual(self.parts[9].bounds[0, 2], -1.57)
        self.assertIn('ENGINE_Crankcase', self.parts[12].geometry)
        self.assertIn('ENGINE_FanShroud', self.parts[12].geometry)
        self.assertLess(self.parts[12].bounds[0, 2], -2.0)
        self.assertGreater(self.parts[12].bounds[0, 1], .40)
        self.assertLess(self.parts[12].bounds[1, 2], -1.1)
        self.assertLess(self.parts[3].bounds[0, 2], self.parts[12].bounds[0, 2]-.04)
        self.assertLess(self.parts[3].bounds[0, 1], self.parts[12].bounds[0, 1])
        self.assertLess(self.parts[3].bounds[1, 1], 1.20)
        self.assertFalse(any('CageBracing' in n or 'CoilSpring' in n for n in self.assembly.geometry))

    def test_assembled_asset_matches_modular_preview(self):
        masks = [prefix for part in DEFAULT_PARTS for prefix in MASKS.get(part, [])]
        expected = trimesh.Scene()
        for name, mesh in self.shell.geometry.items():
            if not any(mesh.metadata['source_name'].startswith(p) for p in masks):
                expected.add_geometry(mesh.copy(), geom_name=name)
        for part in DEFAULT_PARTS:
            for name, mesh in self.parts[part].geometry.items():
                expected.add_geometry(mesh.copy(), geom_name=f'{PARTS[part]}_{name}')
        self.assertEqual(assembly_signature(expected), assembly_signature(self.assembly))

    def test_engine_case_body_spacing(self):
        points = np.concatenate([m.vertices for n,m in self.parts[12].geometry.items()
                                 if any(s in n for s in ['Crankcase', 'Head_', 'ValveCover', 'Sump'])])
        minimum = float('inf')
        for mesh in self.shell.geometry.values():
            if mesh.metadata['source_name'] != 'B_Body':
                continue
            faces = mesh.faces[mesh.triangles[:, :, 2].min(axis=1) < -1.15]
            if not len(faces):
                continue
            rear = trimesh.Trimesh(vertices=mesh.vertices, faces=faces, process=False)
            for batch in np.array_split(points, 8):
                minimum = min(minimum, trimesh.proximity.closest_point_naive(rear, batch)[1].min())
        self.assertTrue(np.isfinite(minimum))
        self.assertGreater(minimum, .02)


if __name__ == '__main__':
    unittest.main()
