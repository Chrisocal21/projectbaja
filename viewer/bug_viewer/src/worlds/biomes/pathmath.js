// Pure path / river / trail maths for biomes (no three.js, no county.js).
import { smooth, clamp } from '../kit.js';

/** spatial grid over a path's points: query(x, z, maxD) -> { d, i } of the nearest point (d = Infinity if none within maxD) */
export function nearestGrid(pts, cell = 40) {
  const g = new Map(), key = (a, b) => a * 73856093 ^ b * 19349663;
  pts.forEach((p, i) => { const k = key(Math.floor(p.x / cell), Math.floor(p.z / cell)); (g.get(k) || g.set(k, []).get(k)).push(i); });
  return (x, z, maxD = cell * 2) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell), R = Math.ceil(maxD / cell);
    let best = Infinity, bi = -1;
    for (let a = cx - R; a <= cx + R; a++) for (let b = cz - R; b <= cz + R; b++) {
      const l = g.get(key(a, b)); if (!l) continue;
      for (const i of l) { const d = Math.hypot(pts[i].x - x, pts[i].z - z); if (d < best) { best = d; bi = i; } }
    }
    return best <= maxD ? { d: best, i: bi } : { d: Infinity, i: -1 };
  };
}

/** box-blur a height profile twice (a smooth vertical curve), k = half window in samples */
export function gradeProfile(raw, k) {
  const n = raw.length; let h = raw;
  for (let pass = 0; pass < 2; pass++) {
    const cs = new Float64Array(n + 1); for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + h[i];
    h = h.map((_, i) => { const a = Math.max(0, i - k), b = Math.min(n - 1, i + k); return (cs[b + 1] - cs[a]) / (b - a + 1); });
  }
  return Array.from(h);
}

/** water only runs downhill: a running minimum along the flow direction */
export function runningMin(a) { const out = a.slice(); for (let i = 1; i < out.length; i++) out[i] = Math.min(out[i], out[i - 1]); return out; }

/** 0..1 window that is 1 within halfLen of sF and eases to 0 over `edge` metres (s = distance along the path) */
export const fordWindow = (s, sF, halfLen = 14, edge = 8) => 1 - smooth(halfLen, halfLen + edge, Math.abs(s - sF));

/**
 * Give a river path its water level (wl, running-min of the graded ground, so it never flows uphill) and bed height.
 * The bed is `depth` below the water, except in fords where it comes up to `fordDepth` below it.
 * Mutates path points: p.wl, p.bed, p.ford (0..1).
 */
export function shapeRiver(path, groundAt, { depth = 1.6, fordDepth = 0.45, fordPts = [], gradeM = 24 } = {}) {
  const pts = path.pts, step = pts.length > 1 ? pts[1].s - pts[0].s : 1;
  const wl = runningMin(gradeProfile(pts.map(p => groundAt(p.x, p.z)), Math.max(1, Math.round(gradeM / step))));
  const sF = fordPts.map(([x, z]) => { let bi = 0, bd = Infinity; pts.forEach((p, i) => { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; bi = i; } }); return pts[bi].s; });
  pts.forEach((p, i) => {
    p.wl = wl[i]; p.ford = sF.reduce((m, s) => Math.max(m, fordWindow(p.s, s)), 0);
    p.bed = p.wl - depth + (depth - fordDepth) * p.ford;
  });
  return path;
}

/** trail heights: the ground graded smooth, blended onto the river bed within `reach` metres of a river (so the trail dips through the ford) */
export function trailProfile(path, groundAt, { gradeM = 20, riverNear = null, near = 8, reach = 70, startTie = null, tieLen = 80 } = {}) {
  const pts = path.pts, step = pts.length > 1 ? pts[1].s - pts[0].s : 1, n = pts.length;
  const h = gradeProfile(pts.map(p => groundAt(p.x, p.z)), Math.max(1, Math.round(gradeM / step)));
  if (startTie != null) { const off = startTie - h[0]; for (let i = 0, s = 0; i < n && s < tieLen; i++, s += step) h[i] += off * (1 - smooth(0, tieLen, s)); }
  pts.forEach((p, i) => {
    p.hs = h[i];
    if (riverNear) { const r = riverNear(p.x, p.z); if (r) p.hs += (r.bed - h[i]) * (1 - smooth(near, reach, r.d)); }
  });
  return path;
}

/** a triangle strip along path points, `half` wide, at y = yAt(p): { pos:[x,y,z...], uv, idx } (flat across, for water) */
export function ribbonStrip(pts, half, yAt, every = 2, across = 2) {
  const use = pts.filter((_, i) => i % every === 0), pos = [], uv = [], idx = [], n = across + 1;
  use.forEach((p, k) => {
    const nx = p.tz, nz = -p.tx, y = yAt(p);
    for (let j = 0; j <= across; j++) {
      const d = (j / across * 2 - 1) * half; pos.push(p.x + nx * d, y, p.z + nz * d); uv.push(j / across, p.s / 10);
      if (k && j) { const a = (k - 1) * n + j - 1, b = a + 1, c = k * n + j - 1, e = c + 1; idx.push(a, c, b, b, c, e); }
    }
  });
  return { pos, uv, idx };
}
export { clamp };
