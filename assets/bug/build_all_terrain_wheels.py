"""Fit the prepared tread model to the imported Beetle's original rims and tire envelope."""
from pathlib import Path

import numpy as np
import trimesh

from build_baja_parts import add, export, material, object_meshes

ROOT = Path(__file__).resolve().parent
PREPARED = ROOT.parent / 'Tires' / 'TIRE_AllTerrain_Normalized.glb'
WHEELS = {'FL': 'B_FLWheel', 'FR': 'B_FRWheel', 'RL': 'B_BLWheel', 'RR': 'B_BRWheel'}
RUBBER = material('AllTerrain_Rubber', (36, 35, 33), roughness=.9)


def bead_width(vertices, radius):
    bead = vertices[radius <= radius.min()+.001]
    if not ((bead[:, 0] < 0).any() and (bead[:, 0] > 0).any()):
        raise ValueError('Tire bead must span both rim faces')
    return np.array([-bead[:, 0].min(), bead[:, 0].max()])


def fit_tire(source, stock):
    center = stock.bounds.mean(axis=0)
    native = stock.vertices-center
    native_radius = np.linalg.norm(native[:, 1:], axis=1)
    vertices = source.vertices.copy()
    radius = np.linalg.norm(vertices[:, 1:], axis=1)
    inner, outer = radius.min(), radius.max()
    if not (0 < inner < outer):
        raise ValueError('Invalid source tire annulus')
    source_width = bead_width(vertices, radius)
    target_width = bead_width(native, native_radius)
    source_half = np.array([-vertices[:, 0].min(), vertices[:, 0].max()])
    target_half = np.array([-native[:, 0].min(), native[:, 0].max()])
    if (source_half <= source_width).any():
        raise ValueError('Source sidewall has no shoulder beyond its bead')
    # Remap the bead and shoulder separately to meet the stock rim without widening the wheel.
    sides = (vertices[:, 0] >= 0).astype(int)
    x = np.abs(vertices[:, 0])
    bead = source_width[sides]
    mapped = np.where(x <= bead, x/bead*target_width[sides],
                      target_width[sides]+(x-bead)/(source_half[sides]-bead)*
                      (target_half[sides]-target_width[sides]))
    vertices[:, 0] = np.sign(vertices[:, 0])*mapped
    target_outer = min(center[1], np.min(stock.extents[1:]/2))
    target_inner = native_radius.min()
    if target_inner >= target_outer:
        raise ValueError('Stock rim leaves no tire sidewall')
    fitted_radius = target_inner+(radius-inner)/(outer-inner)*(target_outer-target_inner)
    vertices[:, 1:] *= (fitted_radius/radius)[:, None]
    peak = vertices[np.argmax(fitted_radius), 1:]
    angle = np.pi-np.arctan2(peak[1], peak[0])
    c, s = np.cos(angle), np.sin(angle)
    vertices[:, 1:] = vertices[:, 1:] @ np.array([[c, s], [-s, c]])
    if center[0] < 0:
        vertices[:, [0, 2]] *= -1
    result = trimesh.Trimesh(vertices=vertices+center, faces=source.faces.copy(), process=False)
    result.metadata.update(center=center.tolist(), bead_radius=float(target_inner),
                           outer_radius=float(target_outer), source='generic_35_AT_tire_OBJ.zip',
                           sizing='Stock diameter, bead opening and width; not physical 35-inch tires')
    return result


def main():
    prepared = trimesh.load(PREPARED, force='scene', process=False)
    if len(prepared.geometry) != 1:
        raise ValueError('Expected one prepared tread mesh; run prepare_all_terrain_tire.py first')
    node = next(iter(prepared.graph.nodes_geometry))
    transform, key = prepared.graph[node]
    source = prepared.geometry[key].copy()
    source.apply_transform(transform)
    scene = trimesh.Scene()
    for suffix, name in WHEELS.items():
        meshes = object_meshes(name)
        tires = [m for m in meshes if m.visual.material.name == 'B-tire1']
        if len(tires) != 1:
            raise ValueError(f'Expected one stock tire: {name}')
        add(scene, f'{suffix}_Tire', fit_tire(source, tires[0]), RUBBER)
        rims = [m for m in meshes if m.visual.material.name != 'B-tire1']
        if len(rims) != 2:
            raise ValueError(f'Expected stock painted rim and chrome hub: {name}')
        for mesh in rims:
            label = 'WheelFace' if mesh.visual.material.name == 'B-paint1' else 'Hub'
            add(scene, f'{suffix}_{label}', mesh)
    export(scene, 'PART_001_AllTerrainWheelSet.glb')


if __name__ == '__main__':
    main()
