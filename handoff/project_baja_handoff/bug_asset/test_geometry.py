"""Regression checks for exported stock geometry and modular mounting surfaces."""
from pathlib import Path
import unittest

import numpy as np
import trimesh

from build_bug import CABIN, HOOD, body_section, cabin_exponent, deck_mesh, profile, wing_grid

ROOT = Path(__file__).resolve().parent
VIEWER = ROOT.parents[2] / 'viewer' / 'bug_viewer' / 'public' / 'models'


class GeometryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = trimesh.load(ROOT / 'VEH_001_Bug_Base_v01.glb', force='scene')

    def test_stable_stock_names_and_wheel_anchors(self):
        required = {'BODY_Main', 'BODY_Cabin_Roof', 'BODY_Floorpan',
                    'BODY_Hood_Front', 'BODY_Engine_Lid_Rear', 'TRIM_HoodCenter',
                    'GLASS_Windshield', 'GLASS_RearWindow'}
        for side, sign in [('L', -1), ('R', 1)]:
            for stem in ['BODY_Door_', 'GLASS_Door_', 'GLASS_Quarter_',
                         'TRIM_DoorOutline_', 'EXTERIOR_DoorHandle_',
                         'EXTERIOR_Mirror_', 'EXTERIOR_Headlight_',
                         'EXTERIOR_Taillight_', 'EXTERIOR_TurnSignal_',
                         'TRIM_RunningBoard_', 'INTERIOR_Seat_']:
                required.add(stem+side)
            for axle, z in [('F', 1.19), ('R', -1.19)]:
                required.add(f'BODY_Fender_{axle}{side}')
                for suffix in ['Tire', 'SteelRim', 'Hub']:
                    name = f'WHEEL_{axle}{side}_{suffix}'
                    required.add(name)
                    np.testing.assert_allclose(self.base.geometry[name].bounds.mean(axis=0),
                                               [sign*.76, .34, z], atol=1e-6)
        for face in ['Front', 'Rear']:
            required.add('EXTERIOR_Bumper_'+face)
            required.update('EXTERIOR_Overrider_'+face+'_'+side for side in ['L', 'R'])
        self.assertTrue(required <= self.base.geometry.keys())

    def test_rounded_roof_and_broad_wings(self):
        self.assertGreater(profile(CABIN, -.15)[1]-profile(CABIN, .55)[1], .12)
        for axle in ['F', 'R']:
            for side in ['L', 'R']:
                self.assertGreater(self.base.geometry[f'BODY_Fender_{axle}{side}'].extents[0], .35)
        width, height, length = self.base.extents
        self.assertTrue(1.7 < width < 1.9)
        self.assertTrue(1.5 < height < 1.6)
        self.assertTrue(4.1 < length < 4.5)
        self.assertLessEqual(sum(len(m.faces) for m in self.base.geometry.values()), 40000)

    def test_windows_are_cut_out_of_roof(self):
        roof = self.base.geometry['BODY_Cabin_Roof']
        roof_faces = {tuple(np.round(t.reshape(-1), 6)) for t in roof.triangles}
        for name, glass in self.base.geometry.items():
            if not name.startswith('GLASS_'):
                continue
            self.assertGreater(len(glass.faces), 0)
            self.assertEqual(glass.visual.material.alphaMode, 'BLEND')
            self.assertFalse(any(tuple(np.round(t.reshape(-1), 6)) in roof_faces
                                 for t in glass.triangles))

    def test_stock_shell_has_no_open_panel_boundaries(self):
        names = {'BODY_Main', 'BODY_Cabin_Roof', 'BODY_Door_L', 'BODY_Door_R',
                 'BODY_Hood_Front', 'BODY_Engine_Lid_Rear',
                 'BODY_Apron_Front', 'BODY_Apron_Rear'}
        parts = [mesh for name, mesh in self.base.geometry.items()
                 if name in names or name.startswith('GLASS_')]
        shell = trimesh.util.concatenate(parts)
        shell.merge_vertices(digits_vertex=7, merge_norm=True, merge_tex=True)
        self.assertTrue(shell.is_watertight, 'Stock body has open panel boundaries')
        self.assertTrue(shell.is_winding_consistent)
        self.assertEqual(len(shell.split(only_watertight=False)), 1)

    def test_fender_mounts_meet_the_body(self):
        names = ['BODY_Main', 'BODY_Door_L', 'BODY_Door_R',
                 'BODY_Apron_Front', 'BODY_Apron_Rear']
        body = trimesh.util.concatenate([self.base.geometry[name] for name in names])
        for variant in ['stock', 'cut', 'wide']:
            for axle in ['F', 'R']:
                for sign in [-1, 1]:
                    mounts = np.asarray(wing_grid(axle, sign, variant))[:, 0]
                    _, distances, _ = trimesh.proximity.closest_point_naive(body, mounts)
                    self.assertLess(distances.max(), .002, f'{variant} {axle} {sign}')

    def test_panel_normals_are_continuous(self):
        names = {'BODY_Main', 'BODY_Cabin_Roof', 'BODY_Door_L', 'BODY_Door_R',
                 'BODY_Hood_Front', 'BODY_Engine_Lid_Rear',
                 'BODY_Apron_Front', 'BODY_Apron_Rear'}
        normals = {}
        for name, mesh in self.base.geometry.items():
            if name not in names and not name.startswith('GLASS_'):
                continue
            for vertex, normal in zip(mesh.vertices, mesh.vertex_normals):
                key = tuple(np.round(vertex, 7))
                if key in normals:
                    np.testing.assert_allclose(normal, normals[key], atol=1e-5)
                else:
                    normals[key] = normal

    def test_wheel_clearance_for_stock_cut_and_wide_wings(self):
        for variant in ['stock', 'cut', 'wide']:
            for axle, z in [('F', 1.19), ('R', -1.19)]:
                for sign in [-1, 1]:
                    points = grid_mesh_samples(wing_grid(axle, sign, variant))
                    for center_y, radius, low_x, high_x in [
                        (.34, .335, .665, .855), (.385, .436, .685, .98),
                    ]:
                        near_tire = points[(abs(points[:, 0]) >= low_x)
                                           & (abs(points[:, 0]) <= high_x)]
                        radial = np.linalg.norm(near_tire[:, 1:] - [center_y, z], axis=1)
                        self.assertGreater(radial.min()-radius, .015, variant)
        wheels = trimesh.load(ROOT / 'PART_001_AllTerrainWheelSet.glb', force='scene')
        for mesh in wheels.geometry.values():
            z = 1.19 if mesh.vertices[:, 2].mean() > 0 else -1.19
            radial = np.linalg.norm(mesh.vertices[:, 1:] - [.385, z], axis=1)
            self.assertLessEqual(radial.max(), .436)

    def test_hood_surfaces_share_mounting_edge(self):
        stock = deck_mesh()
        short = deck_mesh(shortened=True)
        stock_edge = stock.vertices[np.isclose(stock.vertices[:, 2], .90)]
        short_edge = short.vertices[np.isclose(short.vertices[:, 2], .90)]
        np.testing.assert_allclose(stock_edge, short_edge)
        self.assertGreater(profile(HOOD, .90)[1]-profile(HOOD, 1.94)[1], .45)
        self.assertGreater(self.base.geometry['BODY_Hood_Front'].face_normals[:, 1].mean(), .5)
        conversion = trimesh.load(ROOT / 'PART_008_ShortenedFrontHood.glb', force='scene')
        np.testing.assert_allclose(
            self.base.geometry['BODY_Hood_Front'].visual.material.baseColorFactor,
            conversion.geometry['BODY_BajaShortHood'].visual.material.baseColorFactor,
            atol=1,
        )

    def test_cage_stays_under_new_roof(self):
        cage = trimesh.load(ROOT / 'PART_014_InteriorRollCage.glb', force='scene')
        for mesh in cage.geometry.values():
            for x, y, z in mesh.vertices[mesh.vertices[:, 1] > 1.1]:
                width, belt, _ = body_section(z)
                top = profile(CABIN, z)[1]
                self.assertLess(abs(x), width)
                roof_y = belt+(top-belt)*(1-(x/width)**2)**(cabin_exponent(z)/2)
                self.assertGreater(roof_y-y, .01)

    def test_exported_assets_are_finite_and_deployed(self):
        names = ['VEH_001_Bug_Base_v01', 'PART_007_CutBajaFenders',
                 'PART_008_ShortenedFrontHood', 'PART_009_RearEngineOpening',
                 'PART_010_FiberglassWideFenders', 'PART_011_RockerGuards']
        for name in names:
            path = ROOT / (name+'.glb')
            self.assertTrue(path.read_bytes() == (VIEWER / path.name).read_bytes(),
                            name+' is not synced to the viewer')
            scene = trimesh.load(path, force='scene')
            for mesh in scene.geometry.values():
                self.assertTrue(np.isfinite(mesh.vertices).all(), name)
                self.assertTrue(np.isfinite(mesh.vertex_normals).all(), name)
                self.assertTrue((mesh.area_faces > 1e-10).all(), name)


def grid_mesh_samples(grid):
    arr = np.asarray(grid)
    # Triangle centroids catch clipping between vertices as well as at the lip.
    a, b, c, d = arr[:-1, :-1], arr[:-1, 1:], arr[1:, :-1], arr[1:, 1:]
    return np.concatenate([arr.reshape(-1, 3), ((a+b+c)/3).reshape(-1, 3),
                           ((b+c+d)/3).reshape(-1, 3)])


if __name__ == '__main__':
    unittest.main()
