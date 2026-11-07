// Test Center world data (pure JS, no three.js): an 800 x 800 m map with
//   - a paved circuit (asphalt, curbs, concrete run-off) + pit lane,
//   - a long flat dirt road with a washboard section,
//   - a closed off-road track (whoops, table-top jumps, banked turns, rock garden, mud pit),
//   - open rolling desert everywhere else, and a concrete plaza in the middle.
// Roads are painted into a 1 m raster (height blend weight + surface id); height()/surface() are cheap lookups.
export const SIZE = 800, CELL = 1, N = SIZE / CELL, HALF = SIZE / 2, HALF_DRIVE = 372;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const SURFACES = {
  asphalt:   { id: 'asphalt', name: 'Asphalt', mu: 1.0, rr: 0.8, color: '#3b3e42', gk: 'rock' },
  concrete:  { id: 'concrete', name: 'Concrete', mu: 0.95, rr: 0.8, color: '#8b8c88', gk: 'rock' },
  curb:      { id: 'curb', name: 'Curb', mu: 0.8, rr: 1.2, color: '#b23a32', gk: 'rock' },
  grass:     { id: 'grass', name: 'Grass', mu: 0.5, rr: 1.8, color: '#62803d', gk: 'dirt' },
  gravel:    { id: 'gravel', name: 'Gravel', mu: 0.58, rr: 1.6, color: '#9b917f', gk: 'sand' },
  dirt:      { id: 'dirt', name: 'Packed dirt', mu: 0.72, rr: 1.0, color: '#a98c5a' },
  looseDirt: { id: 'looseDirt', name: 'Loose dirt', mu: 0.62, rr: 1.5, color: '#8b6a44', gk: 'dirt' },
  rock:      { id: 'rock', name: 'Rock', mu: 0.85, rr: 0.8, color: '#7d7568' },
  mud:       { id: 'mud', name: 'Mud', mu: 0.30, rr: 3.0, color: '#5a4630' },
  sand:      { id: 'sand', name: 'Loose sand', mu: 0.45, rr: 2.2, color: '#d6bd86' },
};
for (const [k, v] of Object.entries(SURFACES)) v.key = k;
const ID = ['', 'asphalt', 'concrete', 'curb', 'grass', 'gravel', 'dirt', 'looseDirt', 'rock', 'mud'];
const SID = Object.fromEntries(ID.map((n, i) => [n, i]));

// ---------------- open desert (analytic) ----------------
function desert(x, z) {
  let h = Math.sin(x * 0.012 + 1) * Math.cos(z * 0.011) * 5 + Math.sin(x * 0.031 + 1.3) * Math.sin(z * 0.027) * 1.8
        + Math.sin(x * 0.09) * Math.cos(z * 0.08 + 2) * 0.4 + Math.sin(x * 0.9 + z * 0.4) * Math.sin(z * 0.8 - x * 0.3) * 0.05;
  h *= smooth(25, 70, Math.hypot(x, z));
  h += smooth(335, 398, Math.max(Math.abs(x), Math.abs(z))) * 16;        // distant ridge all round
  return h;
}
function desertSurface(x, z) {
  const h = desert(x, z), slope = Math.abs(desert(x + 1, z) - h) + Math.abs(desert(x, z + 1) - h);
  const n = Math.sin(x * 0.013 + 1) * Math.cos(z * 0.011) + 0.5 * Math.sin(z * 0.021 - x * 0.009);
  if (slope > 0.55) return SURFACES.rock;
  if (h < -2.6 && n > -0.2) return SURFACES.mud;
  if (n > 0.4) return SURFACES.dirt;
  return SURFACES.sand;
}

// ---------------- path helpers ----------------
function crPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}
/** Smooth path through control points, resampled every `ds` metres with tangent + curvature (+ = turning left). */
function makePath(ctrl, closed, ds = 0.5) {
  const n = ctrl.length, dense = [];
  const at = i => ctrl[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  for (let i = 0; i < (closed ? n : n - 1); i++) for (let k = 0; k < 24; k++) dense.push(crPoint(at(i - 1), at(i), at(i + 1), at(i + 2), k / 24));
  dense.push(closed ? dense[0] : ctrl[n - 1]);
  const cum = [0]; for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = cum[cum.length - 1], m = Math.floor(total / ds), pts = [];
  let j = 0;
  for (let k = 0; k < m; k++) {
    const s = k * ds; while (cum[j + 1] < s) j++;
    const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    pts.push({ x: dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t, z: dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t, s });
  }
  const cnt = pts.length, idx = i => (closed ? (i + cnt) % cnt : clamp(i, 0, cnt - 1));
  pts.forEach((p, i) => { const a = pts[idx(i - 2)], b = pts[idx(i + 2)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; p.tx = dx / l; p.tz = dz / l; p.h = Math.atan2(p.tx, p.tz); });
  const raw = pts.map((p, i) => { let d = pts[idx(i + 4)].h - pts[idx(i - 4)].h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d / (8 * ds); });
  pts.forEach((p, i) => { let a = 0; for (let k = -10; k <= 10; k++) a += raw[idx(i + k)]; p.k = a / 21; });
  return { pts, total: m * ds, closed };
}

// ---------------- painted raster ----------------
const wT = new Float32Array(N * N), hwT = new Float32Array(N * N), sid = new Uint8Array(N * N), dist2 = new Float32Array(N * N).fill(1e12);
function paint(path, { core, shoulder, centerH = () => 0, tilt = () => 0, extra = () => 0, classify }) {
  const R = core + shoulder;
  for (const p of path.pts) {
    const nx = p.tz, nz = -p.tx, h0 = centerH(p), tl = tilt(p);                // left normal
    const c0 = Math.max(0, Math.floor((p.x - R + HALF) / CELL)), c1 = Math.min(N - 1, Math.floor((p.x + R + HALF) / CELL));
    const r0 = Math.max(0, Math.floor((p.z - R + HALF) / CELL)), r1 = Math.min(N - 1, Math.floor((p.z + R + HALF) / CELL));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const x = (c + 0.5) * CELL - HALF, z = (r + 0.5) * CELL - HALF, dx = x - p.x, dz = z - p.z, dd = dx * dx + dz * dz;
      const i = r * N + c; if (dd > R * R || dd >= dist2[i]) continue;
      dist2[i] = dd;
      const d = dx * nx + dz * nz, ad = Math.abs(d), w = ad <= core ? 1 : 1 - smooth(core, R, ad);
      wT[i] = w; hwT[i] = (h0 + tl * d + extra(p, d)) * w; sid[i] = ad <= core ? classify(ad, p, d) : 0;
    }
  }
}
function paintDisc(cx, cz, r, shoulder, h, id) {
  const R = r + shoulder;
  for (let row = Math.floor((cz - R + HALF) / CELL); row <= Math.floor((cz + R + HALF) / CELL); row++) for (let col = Math.floor((cx - R + HALF) / CELL); col <= Math.floor((cx + R + HALF) / CELL); col++) {
    if (row < 0 || col < 0 || row >= N || col >= N) continue;
    const d = Math.hypot((col + 0.5) * CELL - HALF - cx, (row + 0.5) * CELL - HALF - cz); if (d > R) continue;
    const i = row * N + col, w = d <= r ? 1 : 1 - smooth(r, R, d);
    wT[i] = w; hwT[i] = h * w; sid[i] = d <= r ? SID[id] : 0; dist2[i] = -1;
  }
}
function bil(arr, x, z) {
  const fx = (x + HALF) / CELL - 0.5, fz = (z + HALF) / CELL - 0.5;
  const c = Math.floor(fx), r = Math.floor(fz), tx = fx - c, tz = fz - r;
  const g = (cc, rr) => (cc < 0 || rr < 0 || cc >= N || rr >= N ? 0 : arr[rr * N + cc]);
  return (g(c, r) * (1 - tx) + g(c + 1, r) * tx) * (1 - tz) + (g(c, r + 1) * (1 - tx) + g(c + 1, r + 1) * tx) * tz;
}

// ---------------- the tracks ----------------
const circuitCtrl = [[-200, -285], [-100, -285], [-30, -270], [10, -215], [-10, -150], [-70, -112], [-130, -127], [-190, -97], [-250, -112], [-315, -132], [-337, -192], [-315, -252], [-270, -283]];
export const circuit = makePath(circuitCtrl, true);
export const pitLane = makePath([[-285, -304], [-115, -304]], false, 1);
const dirtX = z => 170 + 12 * Math.sin(z * 0.012) + 6 * Math.sin(z * 0.031 + 1);
export const dirtRoad = makePath(Array.from({ length: 91 }, (_, i) => [dirtX(-360 + i * 8), -360 + i * 8]), false);
const orCtrl = Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2, r = 100 * (1 + 0.25 * Math.sin(2 * a) + 0.1 * Math.sin(3 * a + 1)); return [-170 + Math.cos(a) * r * 1.2, 190 + Math.sin(a) * r * 0.8]; });
export const offroad = makePath(orCtrl, true);

paintDisc(0, 0, 34, 10, 0, 'concrete');
paint(circuit, { core: 10, shoulder: 7, tilt: p => clamp(-p.k * 14, -0.12, 0.12),
  classify: ad => (ad <= 6.5 ? SID.asphalt : ad <= 7.5 ? SID.curb : ad <= 9.4 ? SID.concrete : SID.grass) });
paint(pitLane, { core: 4.6, shoulder: 3, classify: () => SID.concrete });
const wash = s => smooth(90, 98, s) * (1 - smooth(165, 173, s));
paint(dirtRoad, { core: 4.6, shoulder: 7,
  centerH: p => 1.2 * Math.sin(p.s * 0.02) + 0.8 * Math.sin(p.s * 0.047 + 1),
  extra: p => 0.08 * Math.sin(((p.s - 0) * Math.PI * 2) / 2.4) * wash(p.s),
  classify: ad => (ad <= 2.9 ? SID.dirt : SID.gravel) });

const T = offroad.total, jumpAt = [0.40 * T, 0.62 * T];
const jump = s => jumpAt.reduce((m, c) => { const d = s - c; return Math.max(m, d < -14 ? 0 : d < 0 ? 2.1 * smooth(-14, 0, d) : d < 8 ? 2.1 : d < 22 ? 2.1 * (1 - smooth(8, 22, d)) : 0); }, 0);
const win = (f, a, b, e = 0.015) => smooth(a, a + e, f) * (1 - smooth(b - e, b, f));
paint(offroad, { core: 5, shoulder: 8,
  centerH: p => { const f = p.s / T; return 1.6 * Math.sin(f * Math.PI * 4 + 0.5) + jump(p.s) + 0.38 * Math.sin(p.s * Math.PI * 2 / 6) * win(f, 0.10, 0.22) - 0.45 * win(f, 0.88, 0.96, 0.02); },
  tilt: p => clamp(-p.k * 20, -0.3, 0.3),
  extra: (p, d) => 0.2 * Math.sin(p.s * 1.7) * Math.sin(d * 1.3 + 1) * win(p.s / T, 0.72, 0.82),
  classify: (ad, p) => { const f = p.s / T; return win(f, 0.72, 0.82, 0.004) > 0.5 ? SID.rock : win(f, 0.88, 0.96, 0.004) > 0.5 ? SID.mud : SID.looseDirt; } });

// ---------------- story sites: Honest Al's lot, the player's garage, a barn, a gas station ----------------
// each site is a flattened pad; `rot` turns its local +z (the "front") towards the road that serves it
export const SITES = {
  lot:    { id: 'lot',    x: 80,   z: -150, rot: 0,                         r: 38 },
  garage: { id: 'garage', x: -100, z: 20,   rot: Math.atan2(100, -20),      r: 17 },
  barn:   { id: 'barn',   x: 80,   z: 150,  rot: Math.atan2(-80, -150),     r: 22 },
  gas:    { id: 'gas',    x: 110,  z: -20,  rot: Math.atan2(-110, 20),      r: 21 },
  warehouse: { id: 'warehouse', x: 240, z: 60, rot: -Math.PI / 2,           r: 22 },
  shack1: { id: 'shack1', x: 50,   z: 300,  rot: 2.2,                       r: 9 },
  shack2: { id: 'shack2', x: -322, z: 92,   rot: -0.6,                      r: 9 },
};
/** local site coordinates -> world x, z */
export const toWorld = (s, lx, lz) => { const c = Math.cos(s.rot), n = Math.sin(s.rot); return [s.x + lx * c + lz * n, s.z - lx * n + lz * c]; };
for (const [k, s] of Object.entries(SITES)) { s.y = desert(s.x, s.z); paintDisc(s.x, s.z, s.r, 12, s.y, k === 'garage' || k === 'warehouse' ? 'concrete' : k === 'gas' ? 'asphalt' : 'dirt'); }
const follow = { centerH: p => desert(p.x, p.z) };
export const townRoads = [
  makePath([[80, -112], [72, -98], [60, -80], [46, -62], [32, -46]], false),                               // lot -> plaza
  makePath([[-46, 9], [-58, 12], [-70, 14], [-80, 15]], false),                                           // plaza -> garage
  makePath([[22, 41], [34, 62], [46, 86], [58, 108], [66, 124]], false),                                  // plaza -> barn
  makePath([[46, -8], [60, -10], [74, -13], [86, -15]], false),                                           // plaza -> gas station
  makePath([[184, 52], [196, 56], [207, 59]], false),                                                       // dirt road -> warehouse
];
for (const p of townRoads) paint(p, { core: 3.6, shoulder: 6, ...follow, classify: ad => (ad <= 2.4 ? SID.dirt : SID.gravel) });
export const trails = [
  makePath([[92, 172], [100, 205], [95, 250], [75, 290], [100, 335], [140, 330], [150, 280], [130, 230], [125, 190]], true),                                   // barn loop
  makePath([[-120, 24], [-150, -10], [-200, -40], [-260, -30], [-310, 10], [-330, 60], [-300, 70], [-230, 50], [-180, 50], [-140, 70], [-112, 52]], true),  // west rock trail
];
trails.forEach((t, i) => paint(t, { core: 2.4, shoulder: 5,
  centerH: p => desert(p.x, p.z) + (i ? 0.3 * Math.sin(p.s * 0.5) * Math.sin(p.s * 0.045) : 0.18 * Math.sin(p.s * 0.8)),
  classify: ad => (ad <= 1.7 ? (i ? SID.rock : SID.looseDirt) : SID.looseDirt) }));

// ---------------- public lookups ----------------
export function height(x, z) {
  const base = desert(x, z);
  if (x < -HALF || x > HALF || z < -HALF || z > HALF) return base;
  const w = bil(wT, x, z);
  return w <= 0 ? base : base * (1 - w) + bil(hwT, x, z);
}
export function surface(x, z) {
  const c = Math.floor((x + HALF) / CELL), r = Math.floor((z + HALF) / CELL);
  if (c >= 0 && r >= 0 && c < N && r < N) { const id = sid[r * N + c]; if (id) return SURFACES[ID[id]]; }
  return desertSurface(x, z);
}
export const isRoad = (x, z) => { const c = Math.floor((x + HALF) / CELL), r = Math.floor((z + HALF) / CELL); return c < 0 || r < 0 || c >= N || r >= N || wT[r * N + c] > 0.01; };
export const baseHeight = desert;

const startP = circuit.pts[Math.round(100 / 0.5)];
export const startLine = { x: -200, z: -285, h: Math.PI / 2 };
function siteFront(id, d) { const s = SITES[id], [x, z] = toWorld(s, 0, d); return { x, z, h: s.rot + Math.PI }; }
function garageDrive() { return siteFront('garage', 12); }
export const spawns = [
  { key: '0', name: 'Plaza', x: 0, z: 0, h: Math.PI / 2 },
  { key: '1', name: 'Circuit', x: -200, z: -285, h: Math.PI / 2 },
  { key: '2', name: 'Dirt road', x: dirtX(-340), z: -340, h: 0 },
  { key: '3', name: 'Off-road track', x: offroad.pts[0].x, z: offroad.pts[0].z, h: offroad.pts[0].h },
  { key: '4', name: 'Open desert', x: 30, z: 300, h: 0.4 },
  { key: '5', name: "Honest Al's", x: SITES.lot.x, z: SITES.lot.z + 14, h: Math.PI },
  { key: '6', name: 'Your garage', ...garageDrive() },
  { key: '7', name: 'Barn', ...siteFront('barn', 12) },
  { key: '8', name: 'Gas station', ...siteFront('gas', 10) },
  { key: '9', name: 'Old warehouse', ...siteFront('warehouse', 14) },
];
export function areaAt(x, z) {
  if (Math.hypot(x, z) < 45) return 'Plaza';
  if (z < -85 && x < 25) return 'Circuit zone';
  if (Math.abs(x - 170) < 40) return 'Dirt road zone';
  const near = (k, r) => Math.hypot(x - SITES[k].x, z - SITES[k].z) < r;
  if (near('lot', 48)) return "Honest Al's"; if (near('garage', 30)) return 'Your garage'; if (near('barn', 34)) return 'The barn'; if (near('gas', 32)) return 'Gas station'; if (near('warehouse', 34)) return 'Old warehouse'; if (near('shack1', 18) || near('shack2', 18)) return 'Old shack';
  if (z > 70 && x < -20) return 'Off-road zone';
  return 'Open desert';
}
void startP;
