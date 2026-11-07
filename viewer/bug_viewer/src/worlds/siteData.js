// Solid obstacles, loot spots and "press E" targets for the story sites and the scenery scattered over the Test Center map.
import { SITES, toWorld, height, isRoad, baseHeight } from './testcenter.js';
import { LOT_CIRCLES, LOT_SPOTS } from '../lot/CarLot.jsx';
import { LOOT_COLLIDERS } from '../game/loot.js';

const rnd = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const TALL = 99;

/** a row of wall circles along a straight run (site-local coordinates) */
function wall(s, a, b, r = 0.6, step = 1.0) {
  const out = [], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  for (let i = 0; i <= n; i++) { const t = i / n, [x, z] = toWorld(s, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); out.push([x, z, r, TALL]); }
  return out;
}
const blob = (s, lx, lz, r) => { const [x, z] = toWorld(s, lx, lz); return [x, z, r, TALL]; };

// ---- garage: 14 x 12 m, roller door in the +z face ----
const G = SITES.garage, GAR_W = 7, GAR_D = 6, GAR_DOOR = 3.5;
export const GARAGE = { w: GAR_W, d: GAR_D, door: GAR_DOOR };
// ---- barn: 16 x 22 m, big sliding doors in the +z face ----
const B = SITES.barn, BARN_W = 8, BARN_D = 11, BARN_DOOR = 3.7;
export const BARN = { w: BARN_W, d: BARN_D, door: BARN_DOOR };
// ---- gas station: store at the back, canopy + two pump islands in front ----
const S = SITES.gas;

const solid = [];
// garage walls + furniture
solid.push(...wall(G, [-GAR_W, -GAR_D], [GAR_W, -GAR_D]), ...wall(G, [-GAR_W, -GAR_D], [-GAR_W, GAR_D]), ...wall(G, [GAR_W, -GAR_D], [GAR_W, GAR_D]),
  ...wall(G, [-GAR_W, GAR_D], [-GAR_DOOR, GAR_D]), ...wall(G, [GAR_DOOR, GAR_D], [GAR_W, GAR_D]),
  ...wall(G, [-5.6, -5.1], [-0.4, -5.1], 0.5), ...wall(G, [-6.2, -3.6], [-6.2, 3.6], 0.5), ...wall(G, [6.2, -4.2], [6.2, 2.4], 0.5));
// barn walls + hay + stalls
solid.push(...wall(B, [-BARN_W, -BARN_D], [BARN_W, -BARN_D]), ...wall(B, [-BARN_W, -BARN_D], [-BARN_W, BARN_D]), ...wall(B, [BARN_W, -BARN_D], [BARN_W, BARN_D]),
  ...wall(B, [-BARN_W, BARN_D], [-BARN_DOOR, BARN_D]), ...wall(B, [BARN_DOOR, BARN_D], [BARN_W, BARN_D]),
  ...wall(B, [-6.6, -9], [-6.6, -2], 0.9), ...wall(B, [6.6, -9.5], [6.6, -3], 0.9), blob(B, 5.9, 4.5, 1.1), blob(B, -6, 6.5, 0.8));
// gas station
solid.push(...wall(S, [-8, -15.5], [8, -15.5]), ...wall(S, [-8, -15.5], [-8, -8.5]), ...wall(S, [8, -15.5], [8, -8.5]), ...wall(S, [-8, -8.5], [8, -8.5]),
  blob(S, -7, 0.5, 0.45), blob(S, 7, 0.5, 0.45), blob(S, -7, 8.5, 0.45), blob(S, 7, 8.5, 0.45),
  blob(S, -3.6, 4.5, 0.85), blob(S, 3.6, 4.5, 0.85), blob(S, 12, -4, 1), blob(S, 13, -2.6, 0.7), blob(S, -13, -10, 1.2));
// old warehouse (24 x 16, roll door in +z) and two shacks (5.2 x 4.4, doorway in +z)
const WH = SITES.warehouse;
solid.push(...wall(WH, [-12, -8], [12, -8]), ...wall(WH, [-12, -8], [-12, 8]), ...wall(WH, [12, -8], [12, 8]), ...wall(WH, [-12, 8], [-4.2, 8]), ...wall(WH, [4.2, 8], [12, 8]), blob(WH, -3, 5.5, 0.9), blob(WH, 10.5, 6.5, 0.8));
for (const k of ['shack1', 'shack2']) { const s = SITES[k]; solid.push(...wall(s, [-2.6, -2.2], [2.6, -2.2], 0.45, 0.8), ...wall(s, [-2.6, -2.2], [-2.6, 2.2], 0.45, 0.8), ...wall(s, [2.6, -2.2], [2.6, 2.2], 0.45, 0.8), ...wall(s, [-2.6, 2.2], [-1.15, 2.2], 0.45, 0.8), ...wall(s, [1.15, 2.2], [2.6, 2.2], 0.45, 0.8)); }
solid.push(...LOOT_COLLIDERS);
// the car lot's fence, office and props, moved into the world
const lot = SITES.lot;
for (const [x, z, r] of LOT_CIRCLES) { const [wx, wz] = toWorld(lot, x, z); solid.push([wx, wz, r, TALL]); }

// ---- scenery: boulders + cacti scattered over the open desert, never on a road or at a site ----
const r = rnd(777), keepOut = (x, z, pad) => Object.values(SITES).some(s => Math.hypot(x - s.x, z - s.z) < s.r + 14 + pad) || isRoad(x, z) || Math.hypot(x, z) < 70;
export const BOULDERS = [], CACTI = [];
for (let tries = 0; BOULDERS.length < 190 && tries < 9000; tries++) {
  const x = (r() - 0.5) * 740, z = (r() - 0.5) * 740, big = r() < 0.12, sc = big ? 2.2 + r() * 1.4 : 0.6 + r() * 1.3;
  if (keepOut(x, z, 3) || baseHeight(x, z) > 9) continue;
  BOULDERS.push({ x, z, s: sc, ry: r() * 6, k: r() });
}
for (let tries = 0; CACTI.length < 150 && tries < 9000; tries++) {
  const x = (r() - 0.5) * 740, z = (r() - 0.5) * 740, sc = 0.7 + r() * 1.2;
  if (keepOut(x, z, 1) || baseHeight(x, z) > 7) continue;
  CACTI.push({ x, z, s: sc, ry: r() * 6, arms: r() < 0.6 });
}
const scenery = [...BOULDERS.map(b => [b.x, b.z, b.s * 1.05, height(b.x, b.z) + b.s * 0.9]), ...CACTI.map(c => [c.x, c.z, 0.45 * c.s, height(c.x, c.z) + c.s * 2])];

/** [x, z, radius, top] circles the car and the walker collide with */
export const OBSTACLES = [...solid, ...scenery];

// ---- things you can walk / drive up to and press E on. car: usable from the driver's seat; face: must be looking at it ----
const T = (id, s, lx, lz, rad, opt = {}) => { const [x, z] = toWorld(s, lx, lz); return { id, x, z, r: rad, face: true, car: false, ...opt }; };
export const TARGETS = [
  T('tarp', lot, LOT_SPOTS.tarp.x, LOT_SPOTS.tarp.z, 5.5),
  T('al', lot, LOT_SPOTS.al.x, LOT_SPOTS.al.z, 4),
  T('bench', G, -3, -4, 3.4),
  T('pump', S, -3.6, 6.2, 5, { car: true, face: false }),
  T('pump', S, 3.6, 6.2, 5, { car: true, face: false }),
  T('store', S, 0, -6.6, 4.2),
];
export const BUG_SPOT = (() => { const [x, z] = toWorld(lot, LOT_SPOTS.bug.x, LOT_SPOTS.bug.z); return { x, z, h: LOT_SPOTS.bug.r }; })();
export const WALK_START = (() => { const [x, z] = toWorld(lot, 0, 31); return { x, z, yaw: 0 }; })();
export const GARAGE_DRIVE = (() => { const [x, z] = toWorld(G, 0, -0.5); return { x, z, h: G.rot }; })();
