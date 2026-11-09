// Biome system (pure; county.js wires it in). createBiomes(defs) -> { shape, surface, any, paint, trails, rivers, ... }
import { BIOME_DEFS } from './registry.js';
import { fbm } from './noise.js';
import { makePath, smooth, clamp } from '../kit.js';
import { nearestGrid, shapeRiver, trailProfile } from './pathmath.js';

/** 0..1 influence of one biome at (x, z): 1 inside, ragged fade to 0 at the rim */
export function regionWeight(def, x, z) {
  const { cx, cz, r, inner, wobble, seed } = def.region, dx = x - cx, dz = z - cz;
  if (Math.abs(dx) > r * 1.4 || Math.abs(dz) > r * 1.4) return 0;
  const d = Math.hypot(dx, dz) * (1 + wobble * (fbm(x / 600, z / 600, seed, 3) - 0.5) * 2);
  return 1 - smooth(inner * r, r, d);
}
/** edge of the map rises into mountains so nothing drives off the world */
const BANK = 0.12, CARVE_W = 300, CARVE_CELL = 6;
export const edgeRise = (x, z) => 130 * smooth(2550, 2950, Math.max(Math.abs(x), Math.abs(z)));

export function createBiomes(defs = BIOME_DEFS) {
  let cx = NaN, cz = NaN, cw = null;   // one-entry cache: any() / shape() / surface() ask for the same point in a row
  const weights = (x, z) => { if (x !== cx || z !== cz || !cw) { cx = x; cz = z; cw = list.map(b => regionWeight(b.def, x, z)); } return cw; };
  const list = defs.map(def => {
    const rivers = (def.rivers || []).map(rv => { const path = makePath(rv.ctrl, false, 2); return { ...rv, path, near: nearestGrid(path.pts, 30), biome: def.id }; });
    const trails = (def.trails || []).map(t => { const path = makePath(t.ctrl, false, 0.5); return { ...t, path, near: nearestGrid(path.pts, 30), biome: def.id }; });
    return { def, rivers, trails };
  });
  const byDef = new Map(list.map(b => [b.def, b]));
  const rivers = list.flatMap(b => b.rivers), trails = list.flatMap(b => b.trails);
  /** distance to the nearest river centre line (Infinity if beyond maxD) */
  const riverDist = (x, z, maxD = 120) => { let d = Infinity; for (const r of rivers) d = Math.min(d, r.near(x, z, maxD).d); return d; };
  const trailDist = (x, z, maxD = 60) => { let d = Infinity; for (const t of trails) d = Math.min(d, t.near(x, z, maxD).d); return d; };

  /** per river: a coarse grid of the valley level (water level + banks rising BANK m per m), built once so terrain lookups stay cheap */
  function buildCarve(rv) {
    const xs = rv.path.pts.map(p => p.x), zs = rv.path.pts.map(p => p.z), x0 = Math.min(...xs) - CARVE_W, z0 = Math.min(...zs) - CARVE_W;
    const nx = Math.ceil((Math.max(...xs) + CARVE_W - x0) / CARVE_CELL) + 1, nz = Math.ceil((Math.max(...zs) + CARVE_W - z0) / CARVE_CELL) + 1, data = new Float32Array(nx * nz).fill(1e5);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const q = rv.near(x0 + i * CARVE_CELL, z0 + j * CARVE_CELL, CARVE_W); if (q.i >= 0) data[j * nx + i] = rv.path.pts[q.i].wl + BANK * Math.max(0, q.d - rv.width / 2); }
    rv.carve = { x0, z0, nx, nz, data };
  }
  function carveAt(rv, x, z) {
    const c = rv.carve, fx = (x - c.x0) / CARVE_CELL, fz = (z - c.z0) / CARVE_CELL;
    if (fx < 0 || fz < 0 || fx >= c.nx - 1 || fz >= c.nz - 1) return 1e5;
    const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * c.nx + i, d = c.data;
    return (d[k] * (1 - tx) + d[k + 1] * tx) * (1 - tz) + (d[k + c.nx] * (1 - tx) + d[k + c.nx + 1] * tx) * tz;
  }
  /** soft minimum (k metres of rounding) */
  const smin = (a, b, k = 1.5) => { const m = Math.min(a, b); return m - k * Math.log(Math.exp((m - a) / k) + Math.exp((m - b) / k)); };
  /** the biome's own ground height; rivers cut a valley (banks rise BANK m per m from the water) unless carve = false */
  function heightOf(def, x, z, carve = true) {
    const h = def.height;
    let y;
    if (h.kind === 'rolling') y = h.base + h.amp * (fbm(x / h.scale, z / h.scale, h.seed, 3) * 2 - 1) + 1.2 * (fbm(x / 40, z / 40, h.seed + 5, 2) - 0.5);
    else {
      const t = Math.min(1, Math.hypot(x - def.region.cx, z - def.region.cz) / h.radius), body = Math.pow(1 - Math.pow(t, 1.7), h.power);
      y = h.peak * body + h.ridge * (fbm(x / h.ridgeScale, z / h.ridgeScale, h.seed, 4) * 2 - 1) * (0.25 + 0.75 * Math.sqrt(body)) + 1.5 * (fbm(x / 30, z / 30, h.seed + 9, 2) - 0.5);
    }
    if (carve) for (const rv of byDef.get(def).rivers) y = smin(y, carveAt(rv, x, z));
    return y;
  }
  /** blend the biome ground heights over `h` (the county's own terrain). keep = 0..1 to hold a biome back (e.g. over the lakebed) */
  function shape(x, z, h, keep = 1) {
    let total = 0, acc = 0;
    const W = weights(x, z); for (let i = 0; i < list.length; i++) { const b = list[i], w = W[i] * keep; if (w > 0) { acc += (heightOf(b.def, x, z) + edgeRise(x, z) - h) * w; total += w; } }
    return total > 0 ? h + acc / Math.max(1, total) : h;
  }
  const dominant = (x, z, keep = 1) => { let best = null, bw = 0; const W = weights(x, z); for (let i = 0; i < list.length; i++) { const b = list[i], w = W[i] * keep; if (w > bw) { bw = w; best = b.def; } } return best ? { def: best, w: bw } : null; };
  /** the surface key the biome gives this spot, or null (outside every biome) */
  function surface(x, z, slope, keep = 1) {
    const d = dominant(x, z, keep); if (!d || d.w < 0.3) return null;
    const g = d.def.ground;
    if (slope > g.steep.slope) return g.steep.key;
    for (let i = g.patches.length - 1; i >= 0; i--) { const p = g.patches[i]; if (fbm(x / p.scale, z / p.scale, p.seed, 3) > p.above) return p.key; }
    return g.base;
  }
  const any = (x, z) => { let m = 0; for (const w of weights(x, z)) m = Math.max(m, w); return m; };

  for (const b of list) for (const rv of b.rivers) shapeRiver(rv.path, (x, z) => heightOf(b.def, x, z, false) + edgeRise(x, z), { depth: rv.depth, fordPts: rv.fords || [] });
  for (const rv of rivers) buildCarve(rv);

  /** paint rivers then trails into the county raster R. deps = { SID, ground(x,z) (county base height), height(x,z) (painted height) } */
  function paint(R, { SID, ground, height }) {
    for (const rv of rivers) {
      R.paint(rv.path, { core: rv.width / 2, shoulder: 14, centerH: p => p.bed, classify: () => SID.gravel });
    }
    for (const t of trails) {
      const rn = (x, z) => { let best = null; for (const rv of rivers) { const q = rv.near(x, z, 60); if (q.i >= 0 && (!best || q.d < best.d)) best = { d: q.d, bed: rv.path.pts[q.i].bed }; } return best; };
      const p0 = t.path.pts[0];
      trailProfile(t.path, ground, { riverNear: rn, startTie: t.tieStart ? height(p0.x, p0.z) : null });
      R.paint(t.path, { core: t.width / 2, shoulder: 5, centerH: p => p.hs, classify: ad => (ad <= t.width / 2 - 0.4 ? SID.looseDirt : SID.dirt) });
    }
  }
  return { list, defs, rivers, trails, shape, surface, any, dominant, paint, riverDist, trailDist, weight: regionWeight, heightOf, clamp };
}
export { BIOME_DEFS };
