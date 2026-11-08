// Baja County - the official open-world map (pure JS, no three.js). 6 x 6 km.
// The land itself is a real eroded desert heightmap (ridges, washes, alluvial fans: public/terrain/height.bin, baked by
// assets/pipeline/build_world_assets.py). Low hills fill the open desert, a range of real mountains walls the county in, and the
// story places sit in the flats with graded roads between them. Grandpa's garage is at the origin, in the big central basin:
//   Home  ->  Old Mill Rd (gravel, east-west)  ->  Highway 9 (asphalt, north-south)  ->  Dry Wells (town: Al's lot, Dusty's, parts shop)
//   Old Mill Rd west    ->  Sidewinder Dunes             Lakebed Rd south  ->  Bitter Lake (dry lakebed, flat-out speed)
//   Canyon Rd north     ->  Hollis farm (barn) + Red Rock Canyon (mesas, rock trail)
//   Highway 9 south     ->  the Proving Grounds (the old test center: circuit, off-road track, washboard strip) + the salvage warehouse
// Places are clusters: a town, the Proving Grounds, the farm keep their own layout and only move as a whole (`at`).
import { SURFACES, SID, smooth, clamp, makePath, createRaster, toWorld, offsetPts, boxBlur } from './kit.js';
export { SURFACES, toWorld };

export const SIZE = 6000, CELL = 2, HALF = SIZE / 2, HALF_DRIVE = 2940;
const R = createRaster(SIZE, CELL);

// ---------------- the heightmap: 1025 x 1025, row = z, column = x, 0..1 ----------------
const HN = 1025;
const HM = await (async () => {
  const buf = await (await fetch('/terrain/height.bin')).arrayBuffer(), u = new Uint16Array(buf), f = new Float32Array(u.length);
  for (let i = 0; i < u.length; i++) f[i] = u[i] / 65535;
  return f;
})();
const HMB = boxBlur(HM, HN, 9);   // ~55 m average: washes sit below it, ridges above
function hmAt(arr, x, z) {
  const fx = clamp((x + HALF) / SIZE * (HN - 1), 0, HN - 1.0001), fz = clamp((z + HALF) / SIZE * (HN - 1), 0, HN - 1.0001);
  const c = fx | 0, r = fz | 0, tx = fx - c, tz = fz - r, i = r * HN + c;
  return (arr[i] * (1 - tx) + arr[i + 1] * tx) * (1 - tz) + (arr[i + HN] * (1 - tx) + arr[i + HN + 1] * tx) * tz;
}

// ---------------- biomes ----------------
// cluster anchors moved out from the old 3 km layout; each place keeps its own internal layout
const TOWN_D = [680, 300], PG_D = [950, -880], FARM_D = [-480, 470], CANYON_D = [-180, 1080];
const at = (d, x, z) => [x + d[0], z + d[1]];
export const BIOMES = {
  home:    { name: "Grandpa's place", x: 0, z: 0, r: 300 },
  town:    { name: 'Dry Wells', x: 1360, z: 600, r: 300 },
  proving: { name: 'Proving Grounds', x: 1900, z: -1760, r: 520 },
  dunes:   { name: 'Sidewinder Dunes', x: -1980, z: 500, r: 620 },
  lake:    { name: 'Bitter Lake', x: -920, z: -1720, rx: 600, rz: 380 },
  canyon:  { name: 'Red Rock Canyon', x: -360, z: 2160, r: 700 },
  farm:    { name: 'Hollis farm', x: -960, z: 940, r: 220 },
};
/** organic noise from the heightmap itself, resampled at another scale and offset (mirror-tiled, so it never runs off the edge) */
const mirror = v => { const p = 2 * SIZE, t = (((v + HALF) % p) + p) % p; return (t > SIZE ? p - t : t) - HALF; };
const warp = (x, z, s = 0.55, ox = 1300, oz = -900) => hmAt(HMB, mirror(x * s + ox), mirror(z * s + oz)) - 0.4;
const B = BIOMES, dist = (b, x, z) => Math.hypot(x - b.x, z - b.z) * (1 + 0.3 * warp(x, z) + 0.35 * warp(x, z, 2.2, 400, 1700));   // ragged edges, not circles
const lakeE = (x, z) => Math.hypot((x - B.lake.x) / B.lake.rx, (z - B.lake.z) / B.lake.rz) * (1 + 0.25 * warp(x, z, 0.8, -700, 400) + 0.3 * warp(x, z, 2.6, 2500, -300));
// flat-topped, banded mesas (canyon country + a few landmarks elsewhere): [x, z, radius, height]
export const MESAS = [[-420, 1000, 90, 32], [-60, 1260, 115, 42], [70, 950, 66, 24], [-310, 1310, 80, 36], [-260, 815, 58, 20], [160, 1210, 62, 28],
  [-900, -330, 70, 22], [300, -1170, 90, 30], [1210, 620, 100, 34], [-1250, -1100, 110, 40], [900, 1210, 90, 30], [-1180, 900, 80, 26]]
  .map(([x, z, r, h]) => [x * 2, z * 2, r * 1.5, h * 1.3]);
const PG_Y = 1, LAKE_Y = -3;

const masks = (x, z) => ({
  home: 1 - smooth(110, B.home.r, dist(B.home, x, z)),
  town: 1 - smooth(170, B.town.r, dist(B.town, x, z)),
  pg: 1 - smooth(B.proving.r * 0.75, B.proving.r, dist(B.proving, x, z)),
  dunes: 1 - smooth(B.dunes.r * 0.5, B.dunes.r, dist(B.dunes, x, z)),
  lake: 1 - smooth(0.85, 1.25, lakeE(x, z)),
  canyon: 1 - smooth(B.canyon.r * 0.45, B.canyon.r, dist(B.canyon, x, z)),
  farm: 1 - smooth(B.farm.r * 0.6, B.farm.r, dist(B.farm, x, z)),
});

// ---------------- roads (paths first: the terrain is softened along them) ----------------
const road = (ctrl, kind, closed = false) => ({ path: makePath(ctrl, closed), kind });
const highway = road([[860, -2960], [820, -2200], [880, -1400], [840, -700], [800, 0], [840, 600], [910, 1400], [860, 2200], [820, 2960]], 'highway');   // Highway 9
/** Highway 9's centre x at a given z (a 10 m lookup table) */
const HWX = new Float32Array(SIZE / 10 + 1).fill(NaN);
for (const p of highway.path.pts) { const i = Math.round((p.z + HALF) / 10); if (i >= 0 && i < HWX.length) HWX[i] = p.x; }
for (let i = 0, last = HWX.find(v => !isNaN(v)); i < HWX.length; i++) { if (isNaN(HWX[i])) HWX[i] = last; else last = HWX[i]; }
const hwX = z => { const f = clamp((z + HALF) / 10, 0, HWX.length - 1.001), i = f | 0, t = f - i; return HWX[i] * (1 - t) + HWX[i + 1] * t; };
const J = { mill: [hwX(160), 160], main: [hwX(600), 600], pg: [hwX(-1580), -1580], wh: [hwX(-640), -640] };   // junctions on the highway
const canyonEnd = [-250, 1905];
export const ROADS = [
  highway,
  road([J.main, [1000, 600], [1240, 600], [1380, 600], [1560, 610]], 'street'),                                                       // Dry Wells main street
  road([J.mill, [500, 140], [200, 170], [0, 125], [-300, 180], [-700, 120], [-1100, 200], [-1500, 260]], 'gravel'),                    // Old Mill Rd
  road([[0, 16], [0, 30], [2, 60], [1, 95], [0, 125]], 'dirt'),                                                                                // grandpa's driveway
  road([[-300, 180], [-400, -100], [-520, -500], [-660, -840], [-780, -1180], [-830, -1300]], 'gravel'),                               // Lakebed Rd
  road([[200, 170], [180, 500], [80, 840], [0, 1015], [-80, 1200], [-140, 1650], [-200, 1800], canyonEnd], 'gravel'),                 // Canyon Rd
  road([[0, 1015], [-300, 1000], [-600, 985], [-860, 960], [-935, 952]], 'dirt'),                                                     // Hollis farm lane
  road([J.pg, [1100, -1580], [1400, -1580], [1622, -1580]], 'street'),                                                                // Proving Grounds access
  road([J.wh, [J.wh[0] + 40, -640]], 'dirt'),                                                                                          // warehouse spur
  road([[-1500, 260], [-1560, 360], [-1630, 450], [-1668, 495]], 'dirt'),                                                              // Old Mill end -> dune loop
  road([at(PG_D, 722, -722), at(PG_D, 800, -800), at(PG_D, 880, -930), at(PG_D, 945, -1070)], 'gravel'),                              // PG HQ -> off-road track
  road([at(PG_D, 722, -722), at(PG_D, 745, -770), at(PG_D, 765, -800)], 'dirt'),                                                      // PG HQ -> pit lane
];
/** named roads (flora, poles, signs) */
export const ROAD_BY = { highway: ROADS[0], main: ROADS[1], mill: ROADS[2], drive: ROADS[3], lakebed: ROADS[4], canyon: ROADS[5], farmLane: ROADS[6], pgAccess: ROADS[7] };

// trails: the canyon rock trail and the dune loop (a wider loop now the dune field is bigger)
export const TRAILS = [
  { kind: 'rock', path: makePath(offsetPts([[-90, 870], [-160, 960], [-240, 1080], [-200, 1180], [-120, 1120], [-40, 1060], [-10, 900], [-60, 830]], ...CANYON_D), true) },
  { kind: 'sand', path: makePath(Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [B.dunes.x + 15 + Math.cos(a) * (300 + 45 * Math.sin(a * 3)), B.dunes.z + Math.sin(a) * (270 + 38 * Math.cos(a * 2))]; }), true) },
];

// the Proving Grounds: the old test center's tracks
const PG_OFF = at(PG_D, 1050, -500);
const circuitCtrl = [[-200, -285], [-100, -285], [-30, -270], [10, -215], [-10, -150], [-70, -112], [-130, -127], [-190, -97], [-250, -112], [-315, -132], [-337, -192], [-315, -252], [-270, -283]];
export const circuit = makePath(offsetPts(circuitCtrl, ...PG_OFF), true);
export const pitLane = makePath(offsetPts([[-285, -304], [-115, -304]], ...PG_OFF), false, 1);
const dirtX = z => PG_D[0] + 640 + 12 * Math.sin(z * 0.012) + 6 * Math.sin(z * 0.031 + 1);
export const dirtStrip = makePath(Array.from({ length: 81 }, (_, i) => { const z = -1290 + i * 8.5 + PG_D[1]; return [dirtX(z), z]; }), false);
const orCtrl = Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2, r = 100 * (1 + 0.25 * Math.sin(2 * a) + 0.1 * Math.sin(3 * a + 1)); return at(PG_D, 1090 + Math.cos(a) * r * 1.2, -1100 + Math.sin(a) * r * 0.8); });
export const offroad = makePath(orCtrl, true);

// ---------------- road corridors: a coarse grid of "how close to a road" so hills ease off where roads run, like a graded valley ----------------
const CG = 8, CN = SIZE / CG, CORR = new Float32Array(CN * CN);
for (const r of ROADS) {
  const big = r.kind === 'highway' ? 1 : r.kind === 'street' ? 0.9 : r.kind === 'gravel' ? 0.8 : 0.6, R0 = 18 + 30 * big, R1 = 70 + 110 * big;
  for (let k = 0; k < r.path.pts.length; k += 6) {
    const p = r.path.pts[k], c0 = Math.max(0, Math.floor((p.x - R1 + HALF) / CG)), c1 = Math.min(CN - 1, Math.floor((p.x + R1 + HALF) / CG));
    const r0 = Math.max(0, Math.floor((p.z - R1 + HALF) / CG)), r1 = Math.min(CN - 1, Math.floor((p.z + R1 + HALF) / CG));
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      const d = Math.hypot((cc + 0.5) * CG - HALF - p.x, (rr + 0.5) * CG - HALF - p.z), v = big * (1 - smooth(R0, R1, d)), i = rr * CN + cc;
      if (v > CORR[i]) CORR[i] = v;
    }
  }
}
const corrAt = (x, z) => {
  const fx = clamp((x + HALF) / CG - 0.5, 0, CN - 1.001), fz = clamp((z + HALF) / CG - 0.5, 0, CN - 1.001), c = fx | 0, r = fz | 0, tx = fx - c, tz = fz - r, i = r * CN + c;
  return (CORR[i] * (1 - tx) + CORR[i + 1] * tx) * (1 - tz) + (CORR[i + CN] * (1 - tx) + CORR[i + CN + 1] * tx) * tz;
};

// ---------------- the land ----------------
const RING0 = 2350, RING1 = 2900;
/** how much of the heightmap's relief shows here (metres per unit), before the flats are levelled */
const ringAt = (x, z) => smooth(RING0, RING1, Math.max(Math.abs(x), Math.abs(z)) * (1 + 0.08 * warp(x, z, 0.3)));
function reliefAmp(x, z, m = masks(x, z)) {
  const ring = ringAt(x, z);
  let a = 95;                                                   // low desert hills: the heightmap's ridges stand 20-40 m over the flats
  a *= 1 - 0.8 * corrAt(x, z);                                  // roads run through softened ground
  a *= 1 - 0.8 * m.home - 0.6 * m.dunes - 0.4 * m.farm;
  return a + m.canyon * 50 + ring * 320 * (1 - 0.75 * corrAt(x, z));   // real mountains round the edge, with passes where the highway leaves
}
const fine = (x, z) => Math.sin(x * 0.09) * Math.cos(z * 0.08 + 2) * 0.35 + Math.sin(x * 0.9 + z * 0.4) * Math.sin(z * 0.8 - x * 0.3) * 0.05;
/** the heightmap's relief, centred on the basin floors (~0.25) so the flats stay near 0 and ridges rise out of them */
const relief = (x, z, m) => { const hv = hmAt(HM, x, z); return (hv - 0.25) * reliefAmp(x, z, m) + fine(x, z); };
const TOWN_Y = relief(B.town.x, B.town.z, masks(B.town.x, B.town.z)) * 0.3;
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
  let h = relief(x, z, m);
  const u = x * 0.8 + z * 0.6, v = -x * 0.6 + z * 0.8;
  h += m.dunes * ((1 - Math.abs(Math.sin(u * 0.012 + Math.sin(v * 0.008) * 1.5))) ** 2 * 8 + (1 - Math.abs(Math.sin(u * 0.04 + v * 0.02))) ** 2 * 1.3);
  h += m.canyon * (8 + 4 * Math.sin(x * 0.02) * Math.cos(z * 0.017));
  h += mesaAt(x, z);
  h += (TOWN_Y - h) * m.town;
  h += (PG_Y - h) * m.pg;
  h += (LAKE_Y - h) * m.lake;
  h += ringAt(x, z) * 35 * (1 - 0.7 * corrAt(x, z));   // the range stands up off the desert floor
  return h;
}
/** 0..1: how far below the local average the ground is (a wash: sand collects there) */
export const washAt = (x, z) => clamp((hmAt(HMB, x, z) - hmAt(HM, x, z)) * 28, 0, 1);
/** 0..1: how much real relief shows here (drives the far ground's erosion shading) */
export const reliefAt = (x, z) => { const m = masks(x, z); return clamp(reliefAmp(x, z, m) / 70, 0, 1) * (1 - Math.max(m.town, m.pg, m.lake, m.home * 0.7)); };
function baseSurface(x, z) {
  const m = masks(x, z), h = base(x, z), slope = Math.abs(base(x + 1, z) - h) + Math.abs(base(x, z + 1) - h);
  const n = warp(x, z, 1.7, -2100, 3100) * 3.2 + warp(x, z, 4.1, 900, 700) * 1.2;   // organic dirt / sand patches
  if (m.lake > 0.55) return SURFACES.playa;
  if (slope > 0.6) return SURFACES.rock;
  if (m.dunes > 0.3) return SURFACES.sand;
  if (m.canyon > 0.3) return slope > 0.32 ? SURFACES.rock : SURFACES.redDirt;
  if (m.farm > 0.4 && ((Math.floor((x - B.farm.x) / 70) + 2 * Math.floor((z - B.farm.z) / 48)) % 3 + 3) % 3 !== 0) return SURFACES.grass;   // a patchwork of fields
  if (m.town < 0.3 && m.home < 0.5 && washAt(x, z) > 0.45) return SURFACES.sand;   // dry washes
  if (slope > 0.42 && m.town < 0.2) return SURFACES.rock;
  if (n > 0.55) return SURFACES.dirt;
  if (n < -0.6) return SURFACES.sand;
  return SURFACES.scrub;
}
export { masks as biomeMasks };

// ---------------- sites: flattened pads; `rot` turns local +z (the front) towards the road that serves the site ----------------
const site = (id, [x, z], rot, r, pad) => ({ id, x, z, rot, r, pad });
export const SITES = {
  garage:    site('garage', [0, 0], 0, 30, 'dirt'),
  lot:       site('lot', at(TOWN_D, 700, 348), Math.PI, 38, 'dirt'),
  gas:       site('gas', at(TOWN_D, 600, 270), 0, 21, 'asphalt'),
  shop:      site('shop', at(TOWN_D, 790, 272), 0, 14, 'concrete'),
  barn:      site('barn', at(FARM_D, -480, 480), Math.PI / 2, 22, 'dirt'),
  warehouse: site('warehouse', [J.wh[0] + 60, -640], -Math.PI / 2, 22, 'concrete'),
  proving:   site('proving', at(PG_D, 700, -700), -Math.PI / 2, 30, 'concrete'),
  shack1:    site('shack1', at(CANYON_D, -330, 1180), 0.4, 9, 'dirt'),
  shack2:    site('shack2', [-1815, 372], Math.PI / 2, 9, 'dirt'),
  shack3:    site('shack3', [-1430, -1580], 0.8, 9, 'dirt'),
};
/** the player's land around grandpa's garage: the build-mode grid lives inside it */
export const PROPERTY = { x: 0, z: 0, w: 60, d: 50 };
for (const s of Object.values(SITES)) { s.y = base(s.x, s.z); R.paintDisc(s.x, s.z, s.r, 14, s.y, s.pad); }
R.paintDisc(PROPERTY.x, PROPERTY.z, 26, 34, SITES.garage.y, 'dirt');   // the whole yard is levelled
// the customer lot: a wide packed-dirt apron in front of the garage that funnels down into grandpa's driveway (the road paints over its own width)
for (let z = 12; z <= 48; z += 4) { const t = (z - 12) / 36; R.paintDisc(0, z, 17 * (1 - t * t) + 4 * t * t, 6, SITES.garage.y, 'dirt'); }

// ---------------- graded road profiles: heights averaged along the road, ends tied to whatever they join ----------------
const GRADE = { highway: 90, street: 50, gravel: 55, dirt: 30 };
const done = [];
function grade(r) {
  const p = r.path.pts, n = p.length, raw = p.map(q => base(q.x, q.z)), k = Math.max(1, Math.round(GRADE[r.kind] / 0.5 / 2));
  let h = raw;
  for (let pass = 0; pass < 2; pass++) {   // two box passes ~ a smooth vertical curve
    const cs = new Float64Array(n + 1); for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + h[i];
    h = h.map((_, i) => { const a = Math.max(0, i - k), b = Math.min(n - 1, i + k); return (cs[b + 1] - cs[a]) / (b - a + 1); });
  }
  for (const [end, dir] of [[0, 1], [n - 1, -1]]) {   // tie each end to the road it joins (or to the ground, for pads and dead ends)
    const e = p[end]; let target = raw[end], bd = 14;
    for (const o of done) for (let i = 0; i < o.path.pts.length; i += 2) { const q = o.path.pts[i], d = Math.hypot(q.x - e.x, q.z - e.z); if (d < bd) { bd = d; target = q.hs; } }
    const off = target - h[end];
    for (let i = 0, s = 0; i < n && s < 80; i++, s += 0.5) h[end + dir * i] += off * (1 - smooth(0, 80, s));
  }
  p.forEach((q, i) => (q.hs = h[i]));
  done.push(r);
}
const ROAD_STYLE = {
  highway: { core: 4.4, shoulder: 10, classify: ad => (ad <= 3.6 ? SID.asphalt : SID.gravel) },
  street: { core: 4.6, shoulder: 9, classify: ad => (ad <= 4 ? SID.asphalt : SID.concrete) },
  gravel: { core: 3.6, shoulder: 8, classify: ad => (ad <= 2.6 ? SID.gravel : SID.dirt) },
  dirt: { core: 3.2, shoulder: 7, classify: ad => (ad <= 2.2 ? SID.dirt : SID.looseDirt) },
};
export const ROAD_HALF = { highway: 4.4, street: 4.6, gravel: 3.6, dirt: 3.2 };
for (const r of ROADS) { grade(r); R.paint(r.path, { ...ROAD_STYLE[r.kind], centerH: p => p.hs }); }

TRAILS.forEach(t => R.paint(t.path, { core: 2.6, shoulder: 6,
  centerH: p => base(p.x, p.z) + (t.kind === 'rock' ? 0.3 * Math.sin(p.s * 0.5) * Math.sin(p.s * 0.045) : 0),
  classify: ad => (t.kind === 'rock' ? (ad <= 1.8 ? SID.rock : SID.looseDirt) : SID.looseDirt) }));

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
// ---------------- floors: slabs and paving that stand above the levelled pad (what wheels and feet actually stand on) ----------------
// [site, x0, x1, z0, z1, top above the pad] in site-local metres, or [site, 'disc', cx, cz, r, top]
const FLOORS = [
  ['garage', -7.6, 7.6, -6.6, 6.6, 0.12], ['garage', -4.5, 4.5, 6.0, 11.1, 0.12], ['garage', -13.6, -6.8, -6.3, 6.3, 0.12],   // left service wing
  ['warehouse', -12, 12, -8, 8, 0.12],
  ['shack1', -2.6, 2.6, -2.2, 2.2, 0.1], ['shack2', -2.6, 2.6, -2.2, 2.2, 0.1], ['shack3', -2.6, 2.6, -2.2, 2.2, 0.1],
  ['lot', -30, 30, -20, 22, 0.05], ['gas', 'disc', 0, 3, 19.5, 0.045],
];
const floorList = FLOORS.map(([id, ...f]) => ({ s: SITES[id], f, R: f[0] === 'disc' ? f[3] + Math.hypot(f[1], f[2]) : Math.hypot(Math.max(-f[0], f[1]), Math.max(-f[2], f[3])) }));
/** walkable floors built by the player (foundations, floors): { x0, x1, z0, z1, top } in world metres, top absolute. Filled by game/home.js. */
export const dynFloors = [];
/** the top of whatever floor is under (x, z), or -Infinity */
export function floorAt(x, z) {
  let top = -Infinity;
  for (const f of dynFloors) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && f.top > top) top = f.top;
  for (const { s, f, R: r } of floorList) {
    const dx = x - s.x, dz = z - s.z; if (Math.abs(dx) > r || Math.abs(dz) > r) continue;
    const c = Math.cos(s.rot), n = Math.sin(s.rot), lx = dx * c - dz * n, lz = dx * n + dz * c;
    const inside = f[0] === 'disc' ? Math.hypot(lx - f[1], lz - f[2]) <= f[3] : lx >= f[0] && lx <= f[1] && lz >= f[2] && lz <= f[3];
    if (inside) top = Math.max(top, s.y + (f[0] === 'disc' ? f[4] : f[4]));
  }
  return top;
}
export const onCore = R.isCore;
export const baseHeight = base;
/** what you stand / drive on: the terrain, or a slab or paving on top of it */
export const groundHeight = (x, z) => Math.max(height(x, z), floorAt(x, z));

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
  if (Math.abs(x - hwX(z)) < 30) return 'Highway 9';
  if (Math.max(Math.abs(x), Math.abs(z)) > RING0) return 'The Sierra';
  return 'Open desert';
}
const front = (id, d, back = false) => { const s = SITES[id], [x, z] = toWorld(s, 0, d); return { x, z, h: s.rot + (back ? 0 : Math.PI) }; };
/** dev teleports (number keys) */
export const spawns = [
  { key: '0', name: "Grandpa's garage", x: 0, z: 40, h: Math.PI },
  { key: '1', name: 'Dry Wells', x: 1240, z: 600, h: Math.PI / 2 },
  { key: '2', name: "Honest Al's", ...front('lot', 46) },
  { key: '3', name: 'Proving Grounds circuit', x: startLine.x, z: startLine.z, h: startLine.h },
  { key: '4', name: 'Off-road track', x: offroad.pts[0].x, z: offroad.pts[0].z, h: offroad.pts[0].h },
  { key: '5', name: 'Sidewinder Dunes', x: -1668, z: 495, h: -Math.PI / 2 },
  { key: '6', name: 'Bitter Lake', x: -830, z: -1300, h: Math.PI },
  { key: '7', name: 'Red Rock Canyon', x: canyonEnd[0], z: canyonEnd[1], h: 0 },
  { key: '8', name: 'Hollis farm', x: -910, z: 952, h: -Math.PI / 2 },
  { key: '9', name: 'Salvage warehouse', ...front('warehouse', 18) },
];
/** road signs at the junctions: [x, z, facing, lines] */
export const SIGNS = [
  [20, 137, Math.PI, ['OLD MILL RD', '← DUNES 1.2 mi', 'HWY 9 →  0.5 mi']],
  [-288, 194, Math.PI, ['LAKEBED RD', '↓ BITTER LAKE 1 mi']],
  [212, 185, Math.PI, ['CANYON RD', '↑ HOLLIS FARM · RED ROCK']],
  [J.mill[0] + 35, 172, -Math.PI / 2, ['HWY 9', '↑ DRY WELLS 2 · ↓ PROVING GROUNDS']],
  [J.main[0] + 20, 618, -Math.PI / 2, ['DRY WELLS', 'pop. 212']],
  [J.pg[0] + 17, -1564, -Math.PI / 2, ['PROVING GROUNDS', 'closed 1989 · keep out']],
  [-1490, 276, Math.PI / 2, ['SIDEWINDER DUNES', 'soft sand · air down']],
  [canyonEnd[0] + 12, canyonEnd[1] - 13, 0, ['RED ROCK TRAIL', 'high clearance only']],
];
/** Dry Wells' layout offset (storefronts and street trees were laid out round the old town centre) */
export { TOWN_D };
