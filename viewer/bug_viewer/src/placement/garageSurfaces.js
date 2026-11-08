// Garage tire surfaces (Stage 4c): the shop floor, each tire shelf board and each tire stack are placement surfaces that take REAL tire items.
// PURE (no React / three / game state): callers pass the props, the build catalog, the garage site G and a ground-height function.
// FRAME = garage-local metres (x, z as home.js homeLocal gives them; y up from G.y). One group at [G.x, G.y, G.z] turned by G.rot draws everything.
// A surface's `at` is the CENTRE of its top face in that frame, rotY turns it (toCar / fromCar in vehicleSurfaces.js do the maths, same as vehicles).
// A tire on a rack is stored RELATIVE to the rack board (item.surf = 'rack:<propUid>:<level>'), so moving the rack moves its tires for free.
// Everything marked PROPOSAL is a design guess for Chris to confirm.
import { surface, placement } from './types.js';
import { GAME_PLACEABLES, placeableIdFor } from './gameItems.js';
import { toCar, fromCar } from './vehicleSurfaces.js';
import { why, restY, clipTo } from './rules.js';

export const FLOOR_ID = 'floor';
export const rackSurfId = (uid, level) => `rack:${uid}:${level}`;
export const propOfSurf = id => { const m = /^rack:(\d+):/.exec(id || ''); return m ? +m[1] : null; };
/** PROPOSAL: the floor is the garage box (+-7 x +-6, home.js insideGarage) less 0.4 m of wall on each side */
export const FLOOR = { size: [13.2, 11.2] };
/** boards of Walt's tire shelving (worlds/Home.jsx 'shelfTires': boards 2.4 x 0.8 at y 0.55 / 1.45 / 2.35, 0.06 thick, posts at x +-1.15). The usable top is
 *  2.2 x 0.7 between the posts. Headroom = gap to the next board (0.9 - 0.06 = 0.84) less 0.04 slack -> 0.8, so 2 flat tires stack, 3 do not. PROPOSAL: the top board 0.85 */
export const SHELF = { boards: [0.58, 1.48, 2.38], size: [2.2, 0.7], clearance: [0.8, 0.8, 0.85] };
/** the loose tire stack prop (4 torus tires to 1.13 m): real tires sit on top of it. PROPOSAL: a 0.7 m pad, 2 tires high */
export const STACK = { top: 1.13, size: [0.7, 0.7], clearance: 0.6 };
export const RACK_PROPS = ['shelfTires', 'tireStack'];

const garage = (extra) => ({ gridSteps: [0.1, 0.05], accepts: ['tire'], stackable: true, ...extra });
const mk = (name, s, at) => ({ ...surface(s), name, at: { rotY: 0, ...at } });

/** garage-local position of a world point (= home.js homeLocal) and back (= county.js toWorld) */
export function toLocalG(G, x, z) { const dx = x - G.x, dz = z - G.z, c = Math.cos(G.rot), s = Math.sin(G.rot); return { lx: dx * c - dz * s, lz: dx * s + dz * c }; }
export function toWorldG(G, lx, lz) { const c = Math.cos(G.rot), n = Math.sin(G.rot); return [G.x + lx * c + lz * n, G.z - lx * n + lz * c]; }

/** the floor's blocks: every placed prop with a collision radius covers its footprint (rotated AABB in floor-local coords). PROPOSAL: uses the build catalog's
 *  r / len, not the exact model; Walt's bench and other things not in game.props are not blocked. */
export function floorBlocks(props, defs, G, skipUid = 0) {
  const out = [], [fw, fd] = FLOOR.size;
  for (const p of props) {
    const d = defs[p.id]; if (!d || !d.r || d.struct || d.cut || p.uid === skipUid) continue;
    const hx = d.len ? d.len / 2 : d.r, hz = d.len ? Math.max(d.r, 0.4) : d.r, ry = (p.ry || 0) - G.rot, c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const m = toLocalG(G, p.x, p.z), ex = hx * c + hz * s, ez = hx * s + hz * c;
    const x0 = Math.max(0, m.lx + fw / 2 - ex), x1 = Math.min(fw, m.lx + fw / 2 + ex), z0 = Math.max(0, m.lz + fd / 2 - ez), z1 = Math.min(fd, m.lz + fd / 2 + ez);
    if (x1 > x0 && z1 > z0) out.push({ x0, z0, x1, z1, top: 99 });
  }
  return out;
}

/** all garage tire surfaces now. props = game.props, defs = build catalog by id, G = the garage site, groundY(x, z) = world floor height, skipUid = a prop being
 *  moved (its boards are hidden while it is in your hands; its tires reappear when it is set down). */
export function garageSurfaces(props, defs, G, groundY, skipUid = 0) {
  const gy = G.y || 0, out = [];
  out.push(mk('Garage floor', garage({ id: FLOOR_ID, size: FLOOR.size, blocks: floorBlocks(props, defs, G, skipUid) }), { x: 0, y: groundY(G.x, G.z) - gy, z: 0 }));
  for (const p of props) {
    if (!RACK_PROPS.includes(p.id) || p.uid === skipUid) continue;
    const m = toLocalG(G, p.x, p.z), base = groundY(p.x, p.z) - gy, rotY = (p.ry || 0) - G.rot;
    if (p.id === 'shelfTires') SHELF.boards.forEach((y, i) => out.push(mk(`Tire shelf ${i + 1}`, garage({ id: rackSurfId(p.uid, i), size: SHELF.size, clearance: SHELF.clearance[i] }), { x: m.lx, y: base + y, z: m.lz, rotY })));
    else out.push(mk('Tire stack', garage({ id: rackSurfId(p.uid, 0), size: STACK.size, clearance: STACK.clearance }), { x: m.lx, y: base + STACK.top, z: m.lz, rotY }));
  }
  return out;
}

/** a stored garage tire as the rules see it */
export const garagePl = it => placement({ id: 'u' + it.uid, item: placeableIdFor(it, 1) || 'tire', surface: it.surf, x: it.x, z: it.z, rot: it.ry || 0, y: it.y || 0, pose: it.pose || null });
export const gridOnly = items => items.filter(i => i.loc === 'garage' && i.spot === 'grid');

/** Items on racks that are going away (sold / stored) fall to the floor. Returns [{ uid, patch }]: patch = floor fields, or (when no floor spot is free within
 *  3 m) loose-in-the-world fields at the same place. PROPOSAL: the fall keeps the x / z the tire had; tires land bottom first so a stack stays a stack. */
export function dropRackItems(items, propUid, surfaces, G, groundY = () => 0) {
  const byId = Object.fromEntries(surfaces.map(s => [s.id, s])), floor = byId[FLOOR_ID], T = GAME_PLACEABLES.tire;
  const falling = gridOnly(items).filter(i => propOfSurf(i.surf) === propUid && byId[i.surf]).sort((a, b) => (a.y || 0) - (b.y || 0));
  if (!falling.length) return [];
  const settled = gridOnly(items).filter(i => i.surf === FLOOR_ID).map(garagePl), out = [];
  for (const it of falling) {
    const s = byId[it.surf], c = toCar(s, it.x, it.z, it.y || 0), f = fromCar(floor, c.x, c.z), rot = (s.at.rotY - floor.at.rotY) + (it.ry || 0);
    let spot = null;
    for (let r = 0; r <= 3 && !spot; r += 0.15) {
      const n = r === 0 ? 1 : Math.ceil(r * 12);
      for (let k = 0; k < n && !spot; k++) {
        const a = k / n * Math.PI * 2, x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r;
        let cand = placement({ id: 'u' + it.uid, item: 'tire', surface: FLOOR_ID, x, z, rot, free: true });
        cand.y = restY(cand, T, settled, GAME_PLACEABLES); cand = clipTo(floor, T, cand, settled, GAME_PLACEABLES);
        if (!why(floor, T, cand, settled, GAME_PLACEABLES)) spot = cand;
      }
    }
    if (spot) { settled.push(spot); out.push({ uid: it.uid, patch: { surf: FLOOR_ID, x: spot.x, z: spot.z, y: spot.y || 0, ry: spot.rot || 0 } }); }
    else { const [wx, wz] = toWorldG(G, c.x, c.z); out.push({ uid: it.uid, patch: { loc: 'world', x: wx, z: wz, y: Math.max(0, groundY(wx, wz)), ry: (G.rot || 0) + rot } }); }
  }
  return out;
}
