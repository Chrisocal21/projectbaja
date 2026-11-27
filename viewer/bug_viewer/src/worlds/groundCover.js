// What grows on the ground, and where (pure, deterministic). PROPOSAL look and numbers throughout.
// Real geography, not lore: Walt's Garage sits in the Imperial Valley, which (with the Mexicali Valley south of the border) is
// irrigated farmland laid out on a north-south grid: alfalfa, hay, plowed and fallow fields, weedy ditch banks and windbreak
// tree rows. Round it the desert is bare between clumps of bunchgrass, greener only where water gathers (washes, road ditches,
// the shade of trees). Models: public/models/ENV_Grass.glb (assets/pipeline/export_grass.py, from Chris's grass pack).
import { projectPlace } from '../game/realPlaces.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export function hash(ix, iz, k) { let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(k, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/** smooth value noise 0..1 with features about `scale` metres across */
export function vnoise(x, z, scale, seed) {
  const fx = x / scale, fz = z / scale, ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = hash(ix, iz, seed), b = hash(ix + 1, iz, seed), c = hash(ix, iz + 1, seed), d = hash(ix + 1, iz + 1, seed);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sz);
}

// ---------------- the irrigated valley ----------------
/** Rough outline of the irrigated land of the Imperial and Mexicali valleys, [lat, lon], clockwise from the north-west.
 *  Hand-traced from the towns that sit in it (Westmorland, Niland, Holtville, Calexico, Mexicali) and the Salton Sea, the
 *  sand hills to the east, the Colorado River and the Sierra Cucapah: APPROXIMATE, not survey data. */
export const VALLEY_LATLON = [
  [33.12, -115.76], [33.15, -115.62], [33.22, -115.56], [33.30, -115.50], [33.27, -115.42], [33.10, -115.33], [32.90, -115.27], [32.72, -115.25],
  [32.70, -115.05], [32.55, -114.85], [32.35, -114.88], [32.20, -115.05], [32.25, -115.25], [32.45, -115.40], [32.60, -115.52], [32.68, -115.62],
  [32.80, -115.76], [32.98, -115.78],
];
export const VALLEY_FEATHER = 140;   // metres over which the farmland fades into the desert at the valley's edge
/** valley(x, z) -> 0..1 (1 well inside the farmland), from the border map's meta (projection) */
export function makeValley(meta, outline = VALLEY_LATLON) {
  const P = outline.map(([la, lo]) => projectPlace(la, lo, meta)), n = P.length;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const at = (x, z) => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return 0;
    let inside = false, d2 = Infinity;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = P[i], b = P[j];
      if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
      const ex = b.x - a.x, ez = b.z - a.z, t = clamp01(((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez || 1)), dx = x - a.x - ex * t, dz = z - a.z - ez * t;
      d2 = Math.min(d2, dx * dx + dz * dz);
    }
    return inside ? smooth(0, 1, Math.sqrt(d2) / VALLEY_FEATHER) : 0;
  };
  at.bounds = { x0, x1, z0, z1 };
  return at;
}

// ---------------- fields ----------------
/** fields on a north-south grid (real ones are a quarter mile; these are scaled down to read at game size). margin = the weedy ditch bank */
export const FIELD = { w: 84, d: 64, margin: 3.2 };
/** crop look: green / dry = how much grows (0..1), ground = terrain colour, grass = true if the terrain shows its grass layer */
export const CROPS = {
  alfalfa: { green: 0.9, dry: 0, ground: '#6d8a3c', grass: true },
  hay:     { green: 0.35, dry: 0.5, ground: '#97994f', grass: true },
  plowed:  { green: 0.02, dry: 0.02, ground: '#7c6249', grass: false },
  fallow:  { green: 0.08, dry: 0.3, ground: '#a58f6b', grass: false },
  stubble: { green: 0.02, dry: 0.5, ground: '#b9a36c', grass: false },
};
const MIX = ['alfalfa', 'alfalfa', 'alfalfa', 'alfalfa', 'alfalfa', 'hay', 'hay', 'plowed', 'fallow', 'stubble'];   // mostly green: irrigated valley
/** the field (x, z) is in: its grid cell, crop, and distance to its nearest edge */
export function fieldAt(x, z) {
  const fx = Math.floor(x / FIELD.w), fz = Math.floor(z / FIELD.d), lx = x - fx * FIELD.w, lz = z - fz * FIELD.d;
  return { fx, fz, crop: MIX[Math.floor(hash(fx, fz, 1) * MIX.length)], edge: Math.min(lx, FIELD.w - lx, lz, FIELD.d - lz), rowsAlongX: hash(fx, fz, 2) < 0.5 };
}

// ---------------- cover ----------------
const BASE = {   // [dry, green] per surface: what grows on open ground with no extra water
  scrub: [0.32, 0.02], dirt: [0.18, 0.01], hardpack: [0.08, 0], looseDirt: [0.12, 0], redDirt: [0.12, 0], clay: [0.1, 0], gravel: [0.04, 0],
  grass: [0.15, 0.6], meadow: [0.2, 0.55], dryGrass: [0.6, 0.1], forestFloor: [0.1, 0.25], mud: [0.05, 0.2], sand: [0.05, 0], silt: [0.02, 0], softSand: [0.02, 0],
};
export const EMPTY = Object.freeze({ dry: 0, green: 0, crop: null, edge: false, valley: 0 });
/** how much dry and green growth a spot gets. env: { surface, slope, valley 0..1, wash 0..1, shoulder 0..1 (beside a road), tree 0..1 (in a tree's shade), yard 0..1 (round a building), excluded } */
export function coverFrom(x, z, e) {
  const base = BASE[e.surface];
  if (e.excluded || !base) return EMPTY;
  let [dry, green] = base;
  const water = Math.max(e.wash || 0, (e.shoulder || 0) * 0.6, e.tree || 0);   // where rain and runoff collect
  green += water * 0.45; dry += (e.wash || 0) * 0.2 + (e.shoulder || 0) * 0.45 + (e.yard || 0) * 0.4; green += (e.yard || 0) * 0.08;
  let crop = null, edge = false;
  const v = e.valley || 0;
  if (v > 0) {
    const f = fieldAt(x, z);
    if (f.edge < FIELD.margin) { edge = true; dry = lerp(dry, 0.55, v); green = lerp(green, 0.45, v); }   // ditch banks: weeds and tall grass
    else { crop = v > 0.5 ? f.crop : null; const c = CROPS[f.crop]; dry = lerp(dry, c.dry, v); green = lerp(green, c.green, v); }
  }
  const flat = 1 - smooth(0.18, 0.45, e.slope || 0);   // little holds on a steep slope
  return { dry: clamp01(dry * flat), green: clamp01(green * flat), crop, edge, valley: v };
}

// ---------------- clumps (the grass layer drawn round you) ----------------
export const CLUMP_CELL = 1.6;
const DESERT_DRY = ['G_DRY_TALL', 'G_DRY_LOW', 'G_DRY_LOW', 'G_DRY_MAT'], WET_GREEN = ['G_GREEN_1', 'G_GREEN_2', 'G_WEED'];
const CROP_CLUMPS = {
  alfalfa: [0.5, ['G_GREEN_3', 'G_GREEN_3', 'G_GREEN_2'], ['#d2e0a0', '#c4d692', '#dfe8b0']],
  hay: [0.4, ['G_DRY_LOW', 'G_GREEN_2', 'G_DRY_MAT'], ['#e8dc9c', '#d8d08c']],
  plowed: [0.02, ['G_WEED'], ['#ffffff']],
  fallow: [0.22, ['G_DRY_MAT', 'G_WEED', 'G_DRY_LOW'], ['#ffffff', '#efe4c4']],
  stubble: [0.4, ['G_DRY_MAT', 'G_DRY_LOW'], ['#f4e8c0', '#ffffff']],
};
/** the clump growing in one cell, or null. cover(x, z) -> coverFrom result. Deterministic: the same clump always grows in the same place. */
export function clumpAt(ix, iz, cover) {
  const x = (ix + 0.1 + 0.8 * hash(ix, iz, 11)) * CLUMP_CELL, z = (iz + 0.1 + 0.8 * hash(ix, iz, 12)) * CLUMP_CELL;
  const cv = cover(x, z); if (!cv || (!cv.dry && !cv.green)) return null;
  const r = hash(ix, iz, 13), pick = (a, k) => a[Math.floor(hash(ix, iz, k) * a.length)], ry = hash(ix, iz, 16) * Math.PI * 2;
  if (cv.crop) {   // crops grow in rows: keep the clumps near the row lines
    const [dens, models, tints] = CROP_CLUMPS[cv.crop], f = fieldAt(x, z), across = f.rowsAlongX ? z : x, row = Math.round(across / 1.6) * 1.6;
    if (r > dens) return null;
    const rx = f.rowsAlongX ? x : row, rz = f.rowsAlongX ? row : z;
    return { model: pick(models, 14), x: rx, z: rz, s: 0.9 + hash(ix, iz, 15) * 0.5, ry, tint: pick(tints, 17) };
  }
  const patch = 0.35 + 0.95 * vnoise(x, z, 14, 7);   // clumps gather in patches, with bare ground between
  const g = cv.green * patch, d = cv.dry * patch;
  if (r < g) return { model: pick(WET_GREEN, 14), x, z, s: 0.8 + hash(ix, iz, 15) * 0.7, ry, tint: pick(['#ffffff', '#e6ecc4', '#d8e2a8'], 17) };
  if (r < g + d) {
    const tall = cv.edge ? r < g + d * 0.6 : r < g + d * 0.15;   // ditch banks and the odd big bunch grow tall
    return { model: tall ? 'G_DRY_TALL' : pick(DESERT_DRY, 14), x, z, s: (tall ? 0.9 : 0.75) + hash(ix, iz, 15) * (tall ? 0.8 : 0.6), ry, tint: pick(['#ffffff', '#f2e6c8', '#e4d6b0'], 17) };
  }
  return null;
}

// ---------------- windbreaks ----------------
export const WINDBREAK_GAP = 6.5;
/** rows of trees along some field edges (north edges, and a few west edges). valley(x, z) 0..1; clear(x, z) false where nothing may stand
 *  (roads, built places). -> [[x, z, scale, ry, type], ...]; each row is mostly one kind (2 bushy, 3 tall: WildScenery.jsx), uneven, with gaps */
export function windbreaks(valley, clear) {
  const out = [], b = valley.bounds; if (!b) return out;
  for (let fx = Math.floor(b.x0 / FIELD.w); fx <= Math.ceil(b.x1 / FIELD.w); fx++) for (let fz = Math.floor(b.z0 / FIELD.d); fz <= Math.ceil(b.z1 / FIELD.d); fz++) {
    const north = hash(fx, fz, 21) < 0.11, west = hash(fx, fz, 22) < 0.05;
    if (!north && !west) continue;
    const x0 = fx * FIELD.w, z0 = fz * FIELD.d;
    const kind = hash(fx, fz, 27) < 0.65 ? 2 : 3;
    const line = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / WINDBREAK_GAP);
      for (let k = 1; k < n; k++) {
        const t = k / n, x = ax + (bx - ax) * t + (hash(fx * 7 + k, fz, 23) - 0.5) * 1.2, z = az + (bz - az) * t + (hash(fx, fz * 7 + k, 24) - 0.5) * 1.2;
        if (hash(fx * 13 + k, fz, 28) < 0.18 || valley(x, z) < 0.6 || !clear(x, z)) continue;   // gaps: a tree that died or never took
        out.push([x, z, 0.65 + hash(fx + k, fz - k, 25) * 0.75, hash(fx - k, fz + k, 26) * Math.PI * 2, hash(fx + k * 3, fz, 29) < 0.12 ? 5 - kind : kind]);
      }
    };
    if (north) line(x0, z0 + 1.6, x0 + FIELD.w, z0 + 1.6);
    if (west) line(x0 + 1.6, z0, x0 + 1.6, z0 + FIELD.d);
  }
  return out;
}
