"""Rounded, unbranded classic Bug blockout. Meters, Y up, +Z forward.

Run this script, then build_body_conversion.py, and copy the exported GLBs
into the viewer's public/models directory. Requires numpy and trimesh.
"""
from pathlib import Path

import numpy as np
import trimesh
from trimesh.creation import box, cylinder, icosphere
from trimesh.transformations import rotation_matrix

OUT = Path(__file__).resolve().parent
BLUE = [.45, .61, .65, 1]
PRIMER = [.47, .48, .47, 1]
METAL = [.50, .50, .49, 1]
RUBBER = [.105, .105, .105, 1]
GLASS = [.13, .22, .25, .72]
TRIM = [.14, .15, .14, 1]
LIGHT = [.78, .75, .63, 1]
RED = [.64, .13, .08, 1]
SEAT = [.38, .30, .23, 1]


def add(scene, name, mesh, color):
    glass = color is GLASS
    rgba = np.asarray(color, dtype=float).copy()
    rgba[:3] = np.where(rgba[:3] <= .04045, rgba[:3]/12.92,
                        ((rgba[:3]+.055)/1.055)**2.4)
    material = trimesh.visual.material.PBRMaterial(
        baseColorFactor=np.round(rgba * 255).astype(np.uint8),
        metallicFactor=.65 if color is METAL else 0,
        roughnessFactor=.38 if glass else (.42 if color is METAL else .82),
        alphaMode='BLEND' if glass else 'OPAQUE',
        doubleSided=glass,
    )
    mesh.visual = trimesh.visual.TextureVisuals(material=material)
    scene.add_geometry(mesh, geom_name=name, node_name=name)


def profile(stations, z):
    """Cubic Hermite interpolation keeps the silhouette smooth between stations."""
    values = np.asarray(stations, dtype=float)
    zs, ys = values[:, 0], values[:, 1:]
    slopes = np.gradient(ys, zs, axis=0)
    i = int(np.clip(np.searchsorted(zs, z) - 1, 0, len(zs) - 2))
    span = zs[i + 1] - zs[i]
    t = np.clip((z - zs[i]) / span, 0, 1)
    return ((2*t**3 - 3*t**2 + 1)*ys[i]
            + (t**3 - 2*t**2 + t)*span*slopes[i]
            + (-2*t**3 + 3*t**2)*ys[i + 1]
            + (t**3 - t**2)*span*slopes[i + 1])


def grid_mesh(grid, reverse=False):
    arr = np.asarray(grid, dtype=float)
    rows, cols, _ = arr.shape
    faces = []
    for i in range(rows - 1):
        for j in range(cols - 1):
            a = i*cols + j
            faces.extend([[a, a + 1, a + cols],
                          [a + 1, a + cols + 1, a + cols]])
    if reverse:
        faces = [f[::-1] for f in faces]
    return trimesh.Trimesh(vertices=arr.reshape(-1, 3), faces=faces, process=False)


def tube(scene, name, points, radius, color, sections=12):
    points = np.asarray(points, dtype=float)
    points = points[np.r_[True, np.linalg.norm(np.diff(points, axis=0), axis=1) > 1e-8]]
    if len(points) < 2:
        raise ValueError('Tube path needs at least two distinct points')
    closed = np.linalg.norm(points[0]-points[-1]) < 1e-8
    if closed:
        points = points[:-1]
        tangents = np.roll(points, -1, axis=0)-np.roll(points, 1, axis=0)
    else:
        tangents = np.gradient(points, axis=0)
    lengths = np.linalg.norm(tangents, axis=1)
    if (lengths < 1e-8).any():
        raise ValueError('Tube path has an undefined tangent')
    tangents /= lengths[:, None]
    reference = np.eye(3)[np.argmin(np.max(abs(tangents), axis=0))]
    u = np.cross(tangents, reference)
    u /= np.linalg.norm(u, axis=1)[:, None]
    v = np.cross(tangents, u)
    angles = np.arange(sections)*2*np.pi/sections
    rings = points[:, None, :] + radius*(np.cos(angles)[None, :, None]*u[:, None, :]
                                        + np.sin(angles)[None, :, None]*v[:, None, :])
    vertices = rings.reshape(-1, 3).tolist()
    faces = []
    for i in range(len(points) if closed else len(points)-1):
        following = (i+1) % len(points)
        for j in range(sections):
            a, b = i*sections+j, i*sections+(j+1) % sections
            c, d = following*sections+j, following*sections+(j+1) % sections
            faces.extend([[a, b, c], [b, d, c]])
    if not closed:
        for i, reverse in [(0, True), (len(points)-1, False)]:
            center = len(vertices)
            vertices.append(points[i].tolist())
            for j in range(sections):
                face = [center, i*sections+j, i*sections+(j+1) % sections]
                faces.append(face[::-1] if reverse else face)
    add(scene, name, trimesh.Trimesh(vertices=vertices, faces=faces, process=False), color)


def orb(scene, name, center, scale, color):
    mesh = icosphere(subdivisions=2, radius=1)
    mesh.apply_scale(scale)
    mesh.apply_translation(center)
    add(scene, name, mesh, color)


def cub(scene, name, center, size, color):
    mesh = box(extents=size)
    mesh.apply_translation(center)
    add(scene, name, mesh, color)


def wing_grid(axle, sign, variant='stock'):
    """A broad crowned wing ending at an open wheel lip, not a tube arch."""
    zc = 1.19 if axle == 'F' else -1.19
    stock = variant == 'stock'
    wide = variant == 'wide'
    outer = 1.06 if wide else (.91 if stock else .99)
    lip_radius = .49 if stock else .465
    center_y = .35 if stock else .385
    theta = np.linspace(-.18 if stock else .04,
                        np.pi + (.18 if stock else -.04), 37)
    grid = []
    for angle in theta:
        row = []
        inner_z = zc + (.72 if stock else .55)*np.cos(angle)
        inner_y = center_y + .56*np.sin(angle)
        _, belt, sill = body_section(inner_z)
        mount = side_point(inner_z, sign, np.clip((belt-inner_y)/(belt-sill), 0, 1))
        for t in np.linspace(0, 1, 9):
            radius_y = (1-t)*.56 + t*lip_radius + .13*np.sin(np.pi*t)
            radius_z = (1-t)*(.72 if stock else .55) + t*lip_radius
            x = sign*(abs(mount[0]) + (outer-abs(mount[0]))*np.sin(t*np.pi/2))
            y = center_y + radius_y*np.sin(angle) + (mount[1]-inner_y)*(1-t)
            row.append([x, y,
                        zc + radius_z*np.cos(angle)])
        grid.append(row)
    return grid


def wing_mesh(axle, sign, variant='stock'):
    return grid_mesh(wing_grid(axle, sign, variant), reverse=sign < 0)


HOOD = [(.90, .54, 1.07), (1.12, .51, 1.03), (1.40, .45, .91),
        (1.72, .34, .70), (1.94, .19, .51), (2.04, .08, .44)]
DECK = [(-2.04, .08, .44), (-1.94, .26, .60), (-1.65, .43, .86),
        (-1.40, .48, 1.08)]
CABIN = [(-1.40, .48, 1.08), (-1.25, .55, 1.27),
         (-.95, .61, 1.43), (-.55, .64, 1.53),
         (-.15, .65, 1.56), (.25, .64, 1.53),
         (.55, .61, 1.43), (.75, .57, 1.24), (.90, .54, 1.07)]
BELT = [(-1.40, .97), (-.80, .99), (.35, .99), (.90, .96)]
DOOR_REAR, DOOR_FRONT = -.32, .72
ANGLES = np.unique(np.r_[np.linspace(0, np.pi, 33), .001, .50, .64,
                         np.pi-.64, np.pi-.50, np.pi-.001])
SIDE_LEVELS = np.linspace(0, 1, 13)
BODY_ZS = np.unique(np.r_[np.linspace(-2.04, 2.04, 85),
                         -1.94, -1.65, -1.52, -1.40, -1.34, -1.11, -.38,
                         DOOR_REAR, .54, .67, DOOR_FRONT, .85, .90, 1.72])


def body_section(z):
    if CABIN[0][0]-1e-8 <= z <= CABIN[-1][0]+1e-8:
        width = profile(CABIN, z)[0]
        belt = profile(BELT, z)[0]
    else:
        width, top = profile(HOOD if z > 0 else DECK, z)
        belt = top-.11
    return width, belt, min(.36, belt-.045)


def side_point(z, sign, level):
    width, belt, sill = body_section(z)
    x = width + .012*np.sin(np.pi*level) - .035*level**2
    return [sign*x, (1-level)*belt+level*sill, z]


def cabin_exponent(z):
    distance = min(z-CABIN[0][0], CABIN[-1][0]-z)
    t = np.clip(distance/.23, 0, 1)
    blend = t*t*(3-2*t)
    return 2*(1-blend)+.35*blend


def upper_point(z, angle):
    width, belt, _ = body_section(z)
    if CABIN[0][0] <= z <= CABIN[-1][0]:
        top = profile(CABIN, z)[1]
        exponent = cabin_exponent(z)
    else:
        top = profile(HOOD if z > 0 else DECK, z)[1]
        exponent = 2
    sine = 0 if angle == 0 or angle == np.pi else np.sin(angle)
    return [width*np.cos(angle), belt+(top-belt)*sine**exponent, z]


def upper_row(z, window_layout=False):
    row = []
    for angle in ANGLES:
        mapped_z = z
        if window_layout and CABIN[0][0] < z < CABIN[-1][0]:
            side_angle = min(angle, np.pi-angle)
            if side_angle <= .64:
                height = (side_angle/.64)**.55
            else:
                height = (np.pi/2-side_angle)/(np.pi/2-.64)
            landmarks = [-1.40, -1.11, -.38, DOOR_REAR, .67, .90]
            borders = [-1.40, -1.11+.24*height, -.38, DOOR_REAR, .67-.20*height, .90]
            mapped_z = np.interp(z, landmarks, borders)
        row.append(upper_point(mapped_z, angle))
    return row


def deck_grid(front=True, shortened=False):
    stations = HOOD if front else DECK
    start, end = stations[0][0], stations[-1][0]
    if shortened:
        if front:
            end = 1.72
        else:
            start = -1.52
    grid = []
    zs = np.unique(np.r_[BODY_ZS[(BODY_ZS >= start) & (BODY_ZS <= end)], start, end])
    for z in zs:
        grid.append(upper_row(z))
    return grid


def deck_mesh(front=True, shortened=False):
    mesh = body_meshes()['BODY_Hood_Front' if front else 'BODY_Engine_Lid_Rear']
    if shortened:
        z = mesh.triangles_center[:, 2]
        mesh = split_mesh(mesh, np.flatnonzero(z <= 1.72 if front else z >= -1.52))
    return mesh


def split_mesh(mesh, faces):
    used, indices = np.unique(mesh.faces[faces].reshape(-1), return_inverse=True)
    return trimesh.Trimesh(vertices=mesh.vertices[used],
                           faces=indices.reshape(-1, 3),
                           vertex_normals=mesh.vertex_normals[used], process=False)


def body_meshes():
    lower = []
    for z in BODY_ZS:
        _, _, sill = body_section(z)
        lower.append([side_point(z, -1, v) for v in SIDE_LEVELS]
                     + [[0, sill, z]]
                     + [side_point(z, 1, v) for v in SIDE_LEVELS[::-1]])
    upper = [upper_row(z, window_layout=True) for z in BODY_ZS]
    lower_mesh, upper_mesh = grid_mesh(lower), grid_mesh(upper)
    groups = {}
    for i in range(len(BODY_ZS)-1):
        z = (BODY_ZS[i]+BODY_ZS[i+1])/2
        for j in range(len(lower[0])-1):
            name = 'BODY_Main'
            if z > 1.72:
                name = 'BODY_Apron_Front'
            elif z < -1.52:
                name = 'BODY_Apron_Rear'
            elif DOOR_REAR < z < DOOR_FRONT:
                if j < len(SIDE_LEVELS)-1:
                    name = 'BODY_Door_L'
                elif j >= len(SIDE_LEVELS)+1:
                    name = 'BODY_Door_R'
            face = 2*(i*(len(lower[0])-1)+j)
            groups.setdefault(name, []).extend([face, face+1])
    parts = {name: split_mesh(lower_mesh, faces) for name, faces in groups.items()}
    groups = {}
    for i in range(len(BODY_ZS)-1):
        z = (BODY_ZS[i]+BODY_ZS[i+1])/2
        for j in range(len(ANGLES)-1):
            a = (ANGLES[j]+ANGLES[j+1])/2
            name = 'BODY_Cabin_Roof'
            if z > .90:
                name = 'BODY_Hood_Front'
            elif z < -1.40:
                name = 'BODY_Engine_Lid_Rear'
            elif .50 < a < np.pi-.50 and .54 < z < .85:
                name = 'GLASS_Windshield'
            elif .50 < a < np.pi-.50 and -1.34 < z < -1.11:
                name = 'GLASS_RearWindow'
            elif .001 < min(a, np.pi-a) < .64:
                side = 'R' if a < np.pi/2 else 'L'
                if DOOR_REAR < z < .67:
                    name = 'GLASS_Door_'+side
                elif -1.11 < z < -.38:
                    name = 'GLASS_Quarter_'+side
            face = 2*(i*(len(ANGLES)-1)+j)
            groups.setdefault(name, []).extend([face, face+1])
    parts.update({name: split_mesh(upper_mesh, faces) for name, faces in groups.items()})
    for index, name in [(0, 'BODY_Apron_Rear'), (-1, 'BODY_Apron_Front')]:
        ring = np.asarray(lower[index]+upper[index][1:-1])
        vertices = np.vstack([ring, ring.mean(axis=0)])
        faces = [[len(ring), i, (i+1) % len(ring)] for i in range(len(ring))]
        cap = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
        if index == 0:
            cap.invert()
        parts[name] = trimesh.util.concatenate([parts[name], cap])

    # Compute normals on the welded shell before splitting into replaceable panels.
    shell = trimesh.util.concatenate(list(parts.values()))
    shell.merge_vertices(digits_vertex=7, merge_norm=True, merge_tex=True)
    normals = {tuple(np.round(v, 7)): n for v, n in zip(shell.vertices, shell.vertex_normals)}
    for mesh in parts.values():
        mesh.vertex_normals = np.array([normals[tuple(np.round(v, 7))] for v in mesh.vertices])
    return parts


def boundary_loop(mesh):
    edges = mesh.edges_unique[np.bincount(mesh.edges_unique_inverse) == 1]
    neighbors = {}
    for a, b in edges:
        neighbors.setdefault(a, []).append(b)
        neighbors.setdefault(b, []).append(a)
    if not neighbors or any(len(vertices) != 2 for vertices in neighbors.values()):
        raise ValueError('Panel outline must be a closed boundary loop')
    start = min(neighbors)
    order, previous, current = [start], None, start
    while True:
        following = next(v for v in neighbors[current] if v != previous)
        order.append(following)
        if following == start:
            break
        previous, current = current, following
        if len(order) > len(neighbors):
            raise ValueError('Panel outline did not close')
    return mesh.vertices[order]+mesh.vertex_normals[order]*.002


def build():
    scene = trimesh.Scene()
    parts = body_meshes()
    for name, mesh in parts.items():
        add(scene, name, mesh, GLASS if name.startswith('GLASS_') else BLUE)
        if name.startswith('GLASS_'):
            tube(scene, 'TRIM_WindowSeal_'+name.removeprefix('GLASS_'),
                 boundary_loop(mesh), .004, TRIM, 6)
    tube(scene, 'TRIM_HoodOutline', boundary_loop(parts['BODY_Hood_Front']), .003, TRIM, 6)
    tube(scene, 'TRIM_EngineLidOutline', boundary_loop(parts['BODY_Engine_Lid_Rear']), .003, TRIM, 6)

    for sign, side in [(-1, 'L'), (1, 'R')]:
        door = [[side_point(z, sign, v) for v in SIDE_LEVELS[::-1]]
                for z in BODY_ZS[(BODY_ZS >= DOOR_REAR) & (BODY_ZS <= DOOR_FRONT)]]
        outline = [row[0] for row in door] + door[-1][1:]
        outline += [row[-1] for row in door[-2::-1]] + door[0][-2::-1]
        outline = [[x+sign*.002, y, z] for x, y, z in outline]
        tube(scene, 'TRIM_DoorOutline_'+side, outline, .003, TRIM, 6)
        handle = side_point(-.12, sign, .24)
        handle[0] += sign*.02
        cub(scene, 'EXTERIOR_DoorHandle_'+side, handle,
            [.025, .026, .13], METAL)
        tube(scene, 'TRIM_SideMolding_'+side,
             [[x+sign*.005, y+.003, z] for x, y, z in
              [side_point(z, sign, 0) for z in BODY_ZS
               if -1.11 <= z <= .90]], .007, METAL, 8)
        tube(scene, 'EXTERIOR_MirrorStem_'+side,
             [(sign*.63, 1.08, .65), (sign*.78, 1.13, .70)], .013, METAL)
        orb(scene, 'EXTERIOR_Mirror_'+side, [sign*.80, 1.15, .70],
            [.085, .055, .045], METAL)

    tube(scene, 'TRIM_HoodCenter',
         [(0, profile(HOOD, z)[1]+.006, z) for z in np.linspace(.90, 2.00, 45)],
         .008, METAL, 8)

    for axle, z in [('F', 1.19), ('R', -1.19)]:
        for sign, side in [(-1, 'L'), (1, 'R')]:
            for suffix, radius, depth, color in [
                ('Tire', .335, .19, RUBBER), ('SteelRim', .196, .198, METAL),
                ('Hub', .06, .207, TRIM),
            ]:
                wheel = cylinder(radius=radius, height=depth, sections=48)
                wheel.apply_transform(rotation_matrix(np.pi/2, [0, 1, 0]))
                wheel.apply_translation([sign*.76, .34, z])
                add(scene, f'WHEEL_{axle}{side}_{suffix}', wheel, color)
            grid = wing_grid(axle, sign)
            color = PRIMER if axle == 'F' and side == 'L' else BLUE
            wing = wing_mesh(axle, sign)
            # Thickness and a rolled edge keep the open wheel well readable from below.
            inner = wing.copy()
            inner.vertices[:, 1] -= .012
            inner.invert()
            pieces = [wing, inner]
            if axle == 'F':
                normal = np.array([0, .30, np.sqrt(1-.30**2)])
                bucket = icosphere(subdivisions=2, radius=1)
                bucket.apply_scale([.143, .150, .095])
                bucket.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], normal))
                bucket.apply_translation(np.array([sign*.73, .77, 1.79])-normal*.10)
                pieces.append(bucket)
            add(scene, f'BODY_Fender_{axle}{side}',
                trimesh.util.concatenate(pieces), color)
            tube(scene, f'TRIM_StockFenderLip_{axle}{side}',
                 [row[-1] for row in grid], .009, color, 6)

    for face, z in [('Front', 2.04), ('Rear', -2.03)]:
        direction = 1 if face == 'Front' else -1
        tube(scene, 'EXTERIOR_Bumper_'+face,
             [(-.76, .39, z), (-.55, .36, z+direction*.08),
              (0, .36, z+direction*.11), (.55, .36, z+direction*.08),
              (.76, .39, z)], .033, METAL)
        for x in [-.44, .44]:
            tube(scene, 'EXTERIOR_Overrider_'+face+('_L' if x < 0 else '_R'),
                 [(x, .30, z), (x, .52, z)], .027, METAL)
    for sign, side in [(-1, 'L'), (1, 'R')]:
        center = np.array([sign*.73, .77, 1.79])
        normal = np.array([0, .30, np.sqrt(1-.30**2)])
        vertical = np.array([0, normal[2], -normal[1]])
        ring = [center+.133*(np.array([1, 0, 0])*np.cos(a)+vertical*np.sin(a))
                for a in np.linspace(0, 2*np.pi, 41)]
        tube(scene, 'EXTERIOR_HeadlightRim_'+side, ring, .011, METAL, 8)
        lens = icosphere(subdivisions=2, radius=1)
        lens.apply_scale([.125, .125, .014])
        lens.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], normal))
        lens.apply_translation(center+normal*.006)
        add(scene, 'EXTERIOR_Headlight_'+side, lens, LIGHT)
        orb(scene, 'EXTERIOR_Taillight_'+side, [sign*.75, .65, -1.75],
            [.070, .11, .045], RED)
        orb(scene, 'EXTERIOR_TurnSignal_'+side, [sign*.75, .96, 1.37],
            [.065, .032, .082], [.78, .41, .06, 1])
        cub(scene, 'TRIM_RunningBoard_'+side, [sign*.745, .33, 0],
            [.23, .045, 1.27], TRIM)
        cub(scene, 'INTERIOR_Seat_'+side, [sign*.33, .72, -.07],
            [.41, .52, .42], SEAT)
    cub(scene, 'BODY_Floorpan', [0, .37, 0], [1.05, .09, 2.75], TRIM)
    return scene


if __name__ == '__main__':
    scene = build()
    path = OUT / 'VEH_001_Bug_Base_v01.glb'
    scene.export(path, include_normals=True)
    print(path, path.stat().st_size, 'bytes', len(scene.geometry), 'meshes')
