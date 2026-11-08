// Baja County - the official open-world map (pure JS, no three.js). 3 x 3 km.
// Grandpa's garage sits in the middle of nowhere at the origin; roads run out from it to every other biome:
//   Home (scrub flats)  ->  Old Mill Rd (gravel, east-west)  ->  Highway 9 (asphalt, north-south)  ->  Dry Wells (town: Al's lot, Dusty's, parts shop)
//   Old Mill Rd west    ->  Sidewinder Dunes             Lakebed Rd south  ->  Bitter Lake (dry lakebed, flat-out speed)
//   Canyon Rd north     ->  Hollis farm (barn) + Red Rock Canyon (mesas, rock trail)
//   Highway 9 south     ->  the Proving Grounds (the old test center: circuit, off-road track, washboard strip) + the salvage warehouse
import { SURFACES, SID, smooth, makePath, createRaster, toWorld, offsetPts } from './kit.js';
export { SURFACES, toWorld };

export const SIZE = 3000, CELL = 2, HALF = SIZE / 2, HALF_DRIVE = 1440;
const R = createRaster(SIZE, CELL);

// ---------------- biomes ----------------
export const BIOMES = {
  home:    { name: "Grandpa's place", x: 0, z: 0, r: 240 },
  town:    { name: 'Dry Wells', x: 680, z: 300, r: 260 },
  proving: { name: 'Proving Grounds', x: 950, z: -880, r: 520 },
  dunes:   { name: 'Sidewinder Dunes', x: -990, z: 250, r: 420 },
  lake:    { name: 'Bitter Lake', x: -460, z: -860, rx: 390, rz: 250 },
  canyon:  { name: 'Red Rock Canyon', x: -180, z: 1080, r: 520 },
  farm:    { name: 'Hollis farm', x: -480, z: 470, r: 170 },
};
const B = BIOMES, dist = (b, x, z) => Math.hypot(x - b.x, z - b.z);
const lakeE = (x, z) => Math.hypot((x - B.lake.x) / B.lake.rx, (z - B.lake.z) / B.lake.rz);
// flat-topped, banded mesas (canyon country + a few landmarks elsewhere): [x, z, radius, height]
export const MESAS = [[-420, 1000, 90, 32], [-60, 1260, 115, 42], [70, 950, 66, 24], [-310, 1310, 80, 36], [-260, 815, 58, 20], [160, 1210, 62, 28],
  [-900, -330, 70, 22], [300, -1170, 90, 30], [1210, 620, 100, 34], [-1250, -1100, 110, 40], [900, 1210, 90, 30], [-1180, 900, 80, 26]];
const PG_Y = 1, LAKE_Y = -3;

function roll(x, z) {
  return Math.sin(x * 0.012 + 1) * Math.cos(z * 0.011) * 5 + Math.sin(x * 0.031 + 1.3) * Math.sin(z * 0.027) * 1.8
    + Math.sin(x * 0.09) * Math.cos(z * 0.08 + 2) * 0.4 + Math.sin(x * 0.9 + z * 0.4) * Math.sin(z * 0.8 - x * 0.3) * 0.05
    + Math.sin(x * 0.0041 + 0.7) * Math.cos(z * 0.0037 - 0.4) * 8;
}
const masks = (x, z) => ({
  home: 1 - smooth(90, B.home.r, dist(B.home, x, z)),
  town: 1 - smooth(150, B.town.r, dist(B.town, x, z)),
  pg: 1 - smooth(B.proving.r * 0.75, B.proving.r, dist(B.proving, x, z)),
  dunes: 1 - smooth(B.dunes.r * 0.5, B.dunes.r, dist(B.dunes, x, z)),
  lake: 1 - smooth(0.85, 1.25, lakeE(x, z)),
  canyon: 1 - smooth(B.canyon.r * 0.45, B.canyon.r, dist(B.canyon, x, z)),
  farm: 1 - smooth(B.farm.r * 0.6, B.farm.r, dist(B.farm, x, z)),
});
const TOWN_Y = roll(B.town.x, B.town.z);
function mesaAt(x, z) {
  let best = 0;
  for (const [mx, mz, r, h] of MESAS) {
    const dx = x - mx, dz = z - mz; if (Math.abs(dx) > r * 1.3 || Math.abs(dz) > r * 1.3) continue;
    const a = Math.atan2(dz, dx), d = Math.hypot(dx, dz) * (1 + 0.1 * Math.sin(a * 3 + mx) + 0.06 * Math.sin(a * 7 + mz));
    const m = 1 - smooth(r * 0.78, r, d); if (m <= 0) continue;
    const top = h * Math.min(1, m * 1.6), terrace = Math.round(top / 4) * 4, t = top + (terrace - top) * 0.45;   // banded cliff steps
    best = Math.max(best, t);
  }
  return best;
}
/** base terrain before roads and pads */
function base(x, z) {
  const m = masks(x, z);
  let h = roll(x, z) * (0.35 + 0.65 * (1 - m.home));
  const u = x * 0.8 + z * 0.6, v = -x * 0.6 + z * 0.8;
  h += m.dunes * ((1 - Math.abs(Math.sin(u * 0.012 + Math.sin(v * 0.008) * 1.5))) ** 2 * 7 + (1 - Math.abs(Math.sin(u * 0.04 + v * 0.02))) ** 2 * 1.2);
  h += m.canyon * (8 + 4 * Math.sin(x * 0.02) * Math.cos(z * 0.017));
  h += mesaAt(x, z);
  h += (TOWN_Y - h) * m.town;
  h += (PG_Y - h) * m.pg;
  h += (LAKE_Y - h) * m.lake;
  const pass = 1 - 0.9 * (1 - smooth(40, 170, Math.abs(x - 420)));   // Highway 9 runs out through passes north and south
  h += smooth(1250, 1480, Math.max(Math.abs(x), Math.abs(z))) * (55 + 20 * Math.sin(x * 0.006 + z * 0.004)) * (Math.abs(z) > Math.abs(x) ? pass : 1);   // mountains all round
  return h;
}
function baseSurface(x, z) {
  const m = masks(x, z), h = base(x, z), slope = Math.abs(base(x + 1, z) - h) + Math.abs(base(x, z + 1) - h);
  const n = Math.sin(x * 0.013 + 1) * Math.cos(z * 0.011) + 0.5 * Math.sin(z * 0.021 - x * 0.009);
  if (m.lake > 0.55) return SURFACES.playa;
  if (slope > 0.6) return SURFACES.rock;
  if (m.dunes > 0.3) return SURFACES.sand;
  if (m.canyon > 0.3) return slope > 0.32 ? SURFACES.rock : SURFACES.redDirt;
  if (m.farm > 0.4 && Math.sin(x * 0.045) * Math.sin(z * 0.05) > -0.2) return SURFACES.grass;
  if (h < -6 && n > -0.2 && m.town < 0.05) return SURFACES.mud;
  if (n > 0.55) return SURFACES.dirt;
  if (n < -0.6) return SURFACES.sand;
  return SURFACES.scrub;
}
export { masks as biomeMasks };

// ---------------- sites: flattened pads; `rot` turns local +z (the front) towards the road that serves the site ----------------
export const SITES = {
  garage:    { id: 'garage', x: 0, z: 0, rot: 0, r: 30, pad: 'dirt' },
  lot:       { id: 'lot', x: 700, z: 348, rot: Math.PI, r: 38, pad: 'dirt' },
  gas:       { id: 'gas', x: 600, z: 270, rot: 0, r: 21, pad: 'asphalt' },
  shop:      { id: 'shop', x: 790, z: 272, rot: 0, r: 14, pad: 'concrete' },
  barn:      { id: 'barn', x: -480, z: 480, rot: Math.PI / 2, r: 22, pad: 'dirt' },
  warehouse: { id: 'warehouse', x: 482, z: -320, rot: -Math.PI / 2, r: 22, pad: 'concrete' },
  proving:   { id: 'proving', x: 700, z: -700, rot: -Math.PI / 2, r: 30, pad: 'concrete' },
  shack1:    { id: 'shack1', x: -330, z: 1180, rot: 0.4, r: 9, pad: 'dirt' },
  shack2:    { id: 'shack2', x: -880, z: 165, rot: Math.PI / 2, r: 9, pad: 'dirt' },
  shack3:    { id: 'shack3', x: -790, z: -770, rot: 0.8, r: 9, pad: 'dirt' },
};
/** the player's land around grandpa's garage: the build-mode grid lives inside it */
export const PROPERTY = { x: 0, z: 0, w: 60, d: 50 };
for (const s of Object.values(SITES)) { s.y = base(s.x, s.z); R.paintDisc(s.x, s.z, s.r, 14, s.y, s.pad); }
R.paintDisc(PROPERTY.x, PROPERTY.z, 26, 34, SITES.garage.y, 'dirt');   // the whole yard is levelled

// ---------------- roads ----------------
const follow = p => base(p.x, p.z);
const road = (ctrl, kind, closed = false) => ({ path: makePath(ctrl, closed), kind });
export const ROADS = [
  road([[430, -1460], [410, -1100], [440, -700], [420, -350], [400, 0], [420, 300], [455, 700], [430, 1100], [410, 1460]], 'highway'),   // Highway 9
  road([[420, 300], [560, 300], [700, 300], [880, 310]], 'street'),                                                                     // Dry Wells main street
  road([[420, 80], [250, 70], [100, 85], [0, 80], [-150, 90], [-350, 60], [-550, 100], [-750, 130], [-860, 140]], 'gravel'),            // Old Mill Rd
  road([[0, 30], [2, 55], [0, 80]], 'dirt'),                                                                                          // grandpa's driveway
  road([[-150, 90], [-200, -50], [-260, -250], [-330, -420], [-400, -600]], 'gravel'),                                                // Lakebed Rd
  road([[100, 85], [90, 250], [40, 420], [-40, 600], [-70, 825]], 'gravel'),                                                         // Canyon Rd
  road([[0, 505], [-200, 500], [-380, 490], [-455, 482]], 'dirt'),                                                                    // Hollis farm lane
  road([[425, -700], [540, -700], [672, -700]], 'street'),                                                                            // Proving Grounds access
  road([[425, -322], [462, -320]], 'dirt'),                                                                                           // warehouse spur
  road([[-860, 140], [-830, 190], [-805, 240]], 'dirt'),                                                                              // dune staging -> dune loop
  road([[722, -722], [800, -800], [880, -930], [945, -1070]], 'gravel'),                                                             // PG HQ -> off-road track
  road([[722, -722], [745, -770], [765, -800]], 'dirt'),                                                                              // PG HQ -> pit lane
];
const ROAD_STYLE = {
  highway: { core: 4.4, shoulder: 9, classify: ad => (ad <= 3.6 ? SID.asphalt : SID.gravel) },
  street: { core: 4.6, shoulder: 8, classify: ad => (ad <= 4 ? SID.asphalt : SID.concrete) },
  gravel: { core: 3.6, shoulder: 7, classify: ad => (ad <= 2.6 ? SID.gravel : SID.dirt) },
  dirt: { core: 3.2, shoulder: 6, classify: ad => (ad <= 2.2 ? SID.dirt : SID.looseDirt) },
};
export const ROAD_HALF = { highway: 4.4, street: 4.6, gravel: 3.6, dirt: 3.2 };
for (const r of ROADS) R.paint(r.path, { ...ROAD_STYLE[r.kind], centerH: follow });

// trails: the canyon rock trail and the dune loop
export const TRAILS = [
  { kind: 'rock', path: makePath([[-90, 870], [-160, 960], [-240, 1080], [-200, 1180], [-120, 1120], [-40, 1060], [-10, 900], [-60, 830]], true) },
  { kind: 'sand', path: makePath(Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [B.dunes.x + 10 + Math.cos(a) * (200 + 30 * Math.sin(a * 3)), B.dunes.z + Math.sin(a) * (180 + 25 * Math.cos(a * 2))]; }), true) },
];
TRAILS.forEach(t => R.paint(t.path, { core: 2.6, shoulder: 6,
  centerH: p => base(p.x, p.z) + (t.kind === 'rock' ? 0.3 * Math.sin(p.s * 0.5) * Math.sin(p.s * 0.045) : 0),
  classify: ad => (t.kind === 'rock' ? (ad <= 1.8 ? SID.rock : SID.looseDirt) : SID.looseDirt) }));

// ---------------- the Proving Grounds: the old test center's tracks, moved here ----------------
const PG_OFF = [1050, -500];
const circuitCtrl = [[-200, -285], [-100, -285], [-30, -270], [10, -215], [-10, -150], [-70, -112], [-130, -127], [-190, -97], [-250, -112], [-315, -132], [-337, -192], [-315, -252], [-270, -283]];
export const circuit = makePath(offsetPts(circuitCtrl, ...PG_OFF), true);
export const pitLane = makePath(offsetPts([[-285, -304], [-115, -304]], ...PG_OFF), false, 1);
const dirtX = z => 640 + 12 * Math.sin(z * 0.012) + 6 * Math.sin(z * 0.031 + 1);
export const dirtStrip = makePath(Array.from({ length: 81 }, (_, i) => [dirtX(-1290 + i * 8.5), -1290 + i * 8.5]), false);
const orCtrl = Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2, r = 100 * (1 + 0.25 * Math.sin(2 * a) + 0.1 * Math.sin(3 * a + 1)); return [1090 + Math.cos(a) * r * 1.2, -1100 + Math.sin(a) * r * 0.8]; });
export const offroad = makePath(orCtrl, true);
const clampK = (v, a) => Math.max(-a, Math.min(a, v));
R.paint(circuit, { core: 10, shoulder: 7, centerH: () => PG_Y, tilt: p => clampK(-p.k * 14, 0.12),
  classify: ad => (ad <= 6.5 ? SID.asphalt : ad <= 7.5 ? SID.curb : ad <= 9.4 ? SID.concrete : SID.grass) });
R.paint(pitLane, { core: 4.6, shoulder: 3, centerH: () => PG_Y, classify: () => SID.concrete });
const wash = s => smooth(90, 98, s) * (1 - smooth(165, 173, s));
R.paint(dirtStrip, { core: 4.6, shoulder: 7, centerH: p => base(p.x, p.z) + 1.2 * Math.sin(p.s * 0.02),
  extra: p => 0.08 * Math.sin((p.s * Math.PI * 2) / 2.4) * wash(p.s), classify: ad => (ad <= 2.9 ? SID.dirt : SID.gravel) });
const T = offroad.total, jumpAt = [0.40 * T, 0.62 * T];
const jump = s => jumpAt.reduce((m, c) => { const d = s - c; return Math.max(m, d < -14 ? 0 : d < 0 ? 2.1 * smooth(-14, 0, d) : d < 8 ? 2.1 : d < 22 ? 2.1 * (1 - smooth(8, 22, d)) : 0); }, 0);
const win = (f, a, b, e = 0.015) => smooth(a, a + e, f) * (1 - smooth(b - e, b, f));
R.paint(offroad, { core: 5, shoulder: 8,
  centerH: p => { const f = p.s / T; return PG_Y + 1.6 * Math.sin(f * Math.PI * 4 + 0.5) + jump(p.s) + 0.38 * Math.sin(p.s * Math.PI * 2 / 6) * win(f, 0.10, 0.22) - 0.45 * win(f, 0.88, 0.96, 0.02); },
  tilt: p => clampK(-p.k * 20, 0.3),
  extra: (p, d) => 0.2 * Math.sin(p.s * 1.7) * Math.sin(d * 1.3 + 1) * win(p.s / T, 0.72, 0.82),
  classify: (ad, p) => { const f = p.s / T; return win(f, 0.72, 0.82, 0.004) > 0.5 ? SID.rock : win(f, 0.88, 0.96, 0.004) > 0.5 ? SID.mud : SID.looseDirt; } });
export const startLine = { x: -200 + PG_OFF[0], z: -285 + PG_OFF[1], h: Math.PI / 2 };

// ---------------- public lookups ----------------
export const height = R.heightAt(base);
export const surface = R.surfaceAt(baseSurface);
export const isRoad = R.isRoad;
export const onCore = R.isCore;
export const baseHeight = base;

/** where you are, for the HUD */
export function areaAt(x, z) {
  const near = (k, r) => Math.hypot(x - SITES[k].x, z - SITES[k].z) < r;
  if (near('garage', 70)) return "Grandpa's garage";
  if (near('lot', 50)) return "Honest Al's"; if (near('gas', 32)) return "Dusty's Fuel"; if (near('shop', 26)) return 'Baja Parts';
  if (near('barn', 40)) return 'Hollis farm'; if (near('warehouse', 36)) return 'Salvage & Surplus';
  if (near('shack1', 20) || near('shack2', 20) || near('shack3', 20)) return 'Old shack';
  const m = masks(x, z);
  if (m.town > 0.2) return 'Dry Wells'; if (m.pg > 0.3) return 'Proving Grounds'; if (m.lake > 0.3) return 'Bitter Lake';
  if (m.dunes > 0.3) return 'Sidewinder Dunes'; if (m.canyon > 0.3) return 'Red Rock Canyon'; if (m.farm > 0.3) return 'Hollis farm';
  if (Math.abs(x - 420) < 30) return 'Highway 9';
  return 'Open desert';
}
const front = (id, d, back = false) => { const s = SITES[id], [x, z] = toWorld(s, 0, d); return { x, z, h: s.rot + (back ? 0 : Math.PI) }; };
/** dev teleports (number keys) */
export const spawns = [
  { key: '0', name: "Grandpa's garage", x: 0, z: 40, h: Math.PI },
  { key: '1', name: 'Dry Wells', x: 560, z: 300, h: Math.PI / 2 },
  { key: '2', name: "Honest Al's", ...front('lot', 46) },
  { key: '3', name: 'Proving Grounds circuit', x: startLine.x, z: startLine.z, h: startLine.h },
  { key: '4', name: 'Off-road track', x: offroad.pts[0].x, z: offroad.pts[0].z, h: offroad.pts[0].h },
  { key: '5', name: 'Sidewinder Dunes', x: -805, z: 240, h: -Math.PI / 2 },
  { key: '6', name: 'Bitter Lake', x: -400, z: -640, h: Math.PI },
  { key: '7', name: 'Red Rock Canyon', x: -70, z: 830, h: 0 },
  { key: '8', name: 'Hollis farm', x: -430, z: 482, h: -Math.PI / 2 },
  { key: '9', name: 'Salvage warehouse', ...front('warehouse', 18) },
];
/** road signs at the junctions: [x, z, facing, lines] */
export const SIGNS = [
  [20, 92, Math.PI, ['OLD MILL RD', '← DUNES 0.6 mi', 'HWY 9 →  0.3 mi']],
  [-138, 104, Math.PI, ['LAKEBED RD', '↓ BITTER LAKE 0.5 mi']],
  [112, 100, Math.PI, ['CANYON RD', '↑ HOLLIS FARM · RED ROCK']],
  [438, 92, -Math.PI / 2, ['HWY 9', '↑ DRY WELLS 1 · ↓ PROVING GROUNDS']],
  [440, 318, -Math.PI / 2, ['DRY WELLS', 'pop. 212']],
  [442, -684, -Math.PI / 2, ['PROVING GROUNDS', 'closed 1989 · keep out']],
  [-845, 128, Math.PI / 2, ['SIDEWINDER DUNES', 'soft sand · air down']],
  [-58, 812, 0, ['RED ROCK TRAIL', 'high clearance only']],
];
