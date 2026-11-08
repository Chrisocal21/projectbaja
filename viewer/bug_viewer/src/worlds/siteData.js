// Solid obstacles, loot spots and "press E" targets for the story sites and the scenery scattered over Baja County.
import { SITES, toWorld, height, isRoad, baseHeight, surface, biomeMasks, SIZE, TOWN_D } from './county.js';
import { LOT_CIRCLES, LOT_SPOTS } from '../lot/CarLot.jsx';
import { LOOT_COLLIDERS } from '../game/loot.js';
import { TREE_COLLIDERS } from './flora.js';
import { OFFICE } from './office.js';

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
solid.push(...wall(G, [-GAR_W, -GAR_D], [GAR_W, -GAR_D]), ...wall(G, [GAR_W, -GAR_D], [GAR_W, GAR_D]), ...wall(G, [-GAR_W, -GAR_D], [-GAR_W, OFFICE.inner.z0 - 0.6]), ...wall(G, [-GAR_W, OFFICE.inner.z1 + 0.6], [-GAR_W, GAR_D]),
  ...wall(G, [-GAR_W, GAR_D], [-GAR_DOOR, GAR_D]), ...wall(G, [GAR_DOOR, GAR_D], [GAR_W, GAR_D]),
  ...wall(G, [-5.6, -5.1], [-0.4, -5.1], 0.5), ...wall(G, [-6.2, -3.6], [-6.2, 2.4], 0.5), ...wall(G, [6.2, -4.2], [6.2, 2.4], 0.5),
  blob(G, -1.65, -0.5, 0.3), blob(G, 1.65, -0.5, 0.3), blob(G, -4.3, 0.9, 0.55), blob(G, 0.3, -5.4, 0.45), blob(G, -5.2, 4.6, 0.45));   // lift posts, engine stand, compressor, tire stack
// the office: back, far and front walls (the shared wall is the garage's, above); street door in the front face
solid.push(...wall(G, [OFFICE.x0, OFFICE.z0], [OFFICE.x1, OFFICE.z0], 0.2, 0.3), ...wall(G, [OFFICE.x0, OFFICE.z0], [OFFICE.x0, OFFICE.z1], 0.2, 0.3),
  ...wall(G, [OFFICE.x0 + 0.5, OFFICE.z1], [OFFICE.entry.x0 - 0.45, OFFICE.z1], 0.45), ...wall(G, [OFFICE.entry.x1 + 0.45, OFFICE.z1], [OFFICE.x1, OFFICE.z1], 0.45));
// Service-wing fixtures have real tops, so upstairs walking is not blocked by downstairs furniture.
const lowWall = (a, b, top, radius = 0.15) => wall(G, a, b, radius, 0.25).map(c => [c[0], c[1], c[2], G.y + top]);
solid.push(...lowWall([-12.5, 1.7], [-11.1, 1.7], 1.22, 0.45),
  ...lowWall([-13.1, -2], [-12, -2], 2.7), ...lowWall([-10.7, -2], [-10.4, -2], 2.7),
  ...lowWall([-10.4, -5.8], [-10.4, -2], 2.7),
  ...lowWall([-12.35, -5.3], [-12.35, -4.8], 1.2, 0.3),
  ...lowWall([-12.7, -3], [-12.7, -3], 1.1, 0.3),
  ...lowWall([-8.7, -5.2], [-7.5, -5.2], 2.5, 0.25));
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
for (const k of ['shack1', 'shack2', 'shack3']) { const s = SITES[k]; solid.push(...wall(s, [-2.6, -2.2], [2.6, -2.2], 0.45, 0.8), ...wall(s, [-2.6, -2.2], [-2.6, 2.2], 0.45, 0.8), ...wall(s, [2.6, -2.2], [2.6, 2.2], 0.45, 0.8), ...wall(s, [-2.6, 2.2], [-1.15, 2.2], 0.45, 0.8), ...wall(s, [1.15, 2.2], [2.6, 2.2], 0.45, 0.8)); }
solid.push(...LOOT_COLLIDERS);
// proving grounds HQ (12 x 8 m block) and the parts shop (9 x 6)
const PG = SITES.proving; solid.push(...wall(PG, [-6, -14], [6, -14]), ...wall(PG, [-6, -6], [-2.2, -6]), ...wall(PG, [2.2, -6], [6, -6]), ...wall(PG, [-6, -14], [-6, -6]), ...wall(PG, [6, -14], [6, -6]));
const SH = SITES.shop; solid.push(...wall(SH, [-4.5, -3], [4.5, -3]), ...wall(SH, [-4.5, 3], [4.5, 3]), ...wall(SH, [-4.5, -3], [-4.5, 3]), ...wall(SH, [4.5, -3], [4.5, 3]));
// grandpa's race car (back-right of the garage)
solid.push(blob(G, 4.3, -4.1, 0.95), blob(G, 4.3, -2.7, 0.95), blob(G, 4.3, -1.3, 0.95));
// grandpa's trailer + water tank
solid.push(...wall(G, [21, -4], [21, 6], 0.7), ...wall(G, [24, -4], [24, 6], 0.7), ...wall(G, [21, -4.5], [24, -4.5], 0.7), ...wall(G, [21, 6.5], [24, 6.5], 0.7), blob(G, 16, -6, 1.6));
// the car lot's fence, office and props, moved into the world
const lot = SITES.lot;
for (const [x, z, r] of LOT_CIRCLES) { const [wx, wz] = toWorld(lot, x, z); solid.push([wx, wz, r, TALL]); }

// ---- scenery: boulders + cacti scattered over the open desert, never on a road or at a site ----
const r = rnd(777), keepOut = (x, z, pad) => Object.values(SITES).some(s => Math.hypot(x - s.x, z - s.z) < s.r + 14 + pad) || isRoad(x, z) || Math.hypot(x, z) < 60;
// boulders gather on the hill slopes and in the canyon (they roll down off the ridges); `m` picks the rock model
export const BOULDERS = [], CACTI = [];
const EXT = SIZE - 240;
const slopeAt = (x, z) => { const h = baseHeight(x, z); return Math.abs(baseHeight(x + 2, z) - h) / 2 + Math.abs(baseHeight(x, z + 2) - h) / 2; };
for (let tries = 0; BOULDERS.length < 2600 && tries < 90000; tries++) {
  const x = (r() - 0.5) * EXT, z = (r() - 0.5) * EXT, m = biomeMasks(x, z), coin = r(), coin2 = r();
  if (m.lake > 0.3 || m.pg > 0.5 || m.town > 0.4 || (m.dunes > 0.5 && coin < 0.85) || keepOut(x, z, 3)) continue;
  const sl = slopeAt(x, z); if (sl > 0.9 || baseHeight(x, z) > 70 || (m.canyon < 0.2 && sl < 0.12 && coin2 < 0.55)) continue;
  const big = r() < 0.1 + m.canyon * 0.2 + sl * 0.3, sc = big ? 2.2 + r() * 1.6 : 0.5 + r() * 1.2;
  BOULDERS.push({ x, z, s: sc, ry: r() * 6, k: r(), m: Math.floor(r() * 12) });
}
for (let tries = 0; CACTI.length < 1700 && tries < 90000; tries++) {
  const x = (r() - 0.5) * EXT, z = (r() - 0.5) * EXT, sc = 0.7 + r() * 1.2, m = biomeMasks(x, z);
  if (m.lake > 0.2 || m.dunes > 0.3 || m.pg > 0.6 || m.town > 0.5 || m.farm > 0.4 || keepOut(x, z, 1) || baseHeight(x, z) > 45 || slopeAt(x, z) > 0.4) continue;
  CACTI.push({ x, z, s: sc, ry: r() * 6, arms: r() < 0.6 });
}
const scenery = [...BOULDERS.map(b => [b.x, b.z, b.s * 1.05, height(b.x, b.z) + b.s * 0.9]), ...CACTI.map(c => [c.x, c.z, 0.45 * c.s, height(c.x, c.z) + c.s * 2])];

// ---- Dry Wells: storefronts along main street (z = 300). front faces the street ----
export const TOWN = [
  { x: 495, z: 328, w: 9, d: 6, h: 4.6, color: '#c9b48a', trim: '#7a2f26', name: 'DRY WELLS DINER', sub: 'pie · coffee · gossip' },
  { x: 528, z: 330, w: 7, d: 5, h: 4, color: '#a9b6b0', trim: '#2f4a63', name: 'POST OFFICE', sub: 'US MAIL' },
  { x: 800, z: 332, w: 12, d: 7, h: 5, color: '#d8cfb4', trim: '#3f6b3a', name: 'FEED & SUPPLY', sub: 'hay · tack · ammo' },
  { x: 850, z: 334, w: 10, d: 6, h: 4.2, color: '#b79b7a', trim: '#5b3a22', name: 'MOTEL', sub: 'vacancy · color TV' },
  { x: 495, z: 272, w: 10, d: 6, h: 4.4, color: '#8f8a7a', trim: '#4a4f52', name: 'COUNTY SHERIFF', sub: 'sub-station' },
  { x: 700, z: 270, w: 11, d: 6, h: 4.8, color: '#9c6040', trim: '#2c3234', name: 'THE RUSTY PISTON', sub: 'cold beer · pool' },
  { x: 860, z: 272, w: 9, d: 6, h: 4, color: '#bfb7a2', trim: '#6e3a24', name: 'LAUNDROMAT', sub: 'closed' },
].map(b => ({ ...b, rot: b.z > 300 ? Math.PI : 0, x: b.x + TOWN_D[0], z: b.z + TOWN_D[1] }));   // laid out round the old town centre
for (const t of TOWN) { const s = { x: t.x, z: t.z, rot: t.rot }, w = t.w / 2, d = t.d / 2; solid.push(...wall(s, [-w, -d], [w, -d]), ...wall(s, [-w, d], [w, d]), ...wall(s, [-w, -d], [-w, d]), ...wall(s, [w, -d], [w, d])); }

/** [x, z, radius, top] circles the car and the walker collide with */
export const OBSTACLES = [...solid, ...scenery, ...TREE_COLLIDERS];

// ---- things you can walk / drive up to and press E on. car: usable from the driver's seat; face: must be looking at it ----
const T = (id, s, lx, lz, rad, opt = {}) => { const [x, z] = toWorld(s, lx, lz); return { id, x, z, r: rad, face: true, car: false, ...opt }; };
export const TARGETS = [
  T('tarp', lot, LOT_SPOTS.tarp.x, LOT_SPOTS.tarp.z, 5.5),
  T('al', lot, LOT_SPOTS.al.x, LOT_SPOTS.al.z, 4),
  T('bench', G, -3, -4, 3.4),
  T('letter', G, -2.6, -5.25, 2.6, { bonus: 0.35 }),
  T('breaker', G, 6.75, -1.2, 2.2),
  T('pump', S, -3.6, 6.2, 5, { car: true, face: false }),
  T('pump', S, 3.6, 6.2, 5, { car: true, face: false }),
  T('store', S, 0, -6.6, 4.2),
];
export const BUG_SPOT = (() => { const [x, z] = toWorld(lot, LOT_SPOTS.bug.x, LOT_SPOTS.bug.z); return { x, z, h: LOT_SPOTS.bug.r }; })();
/** a new game starts on foot in grandpa's yard, looking at the garage door */
export const WALK_START = (() => { const [x, z] = toWorld(G, 1.5, 21); return { x, z, yaw: G.rot }; })();
export const GARAGE_DRIVE = (() => { const [x, z] = toWorld(G, 0, -0.5); return { x, z, h: G.rot }; })();
