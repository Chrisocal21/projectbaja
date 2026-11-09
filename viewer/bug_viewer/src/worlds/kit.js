// Shared world-building kit (pure JS, no three.js): surfaces, smooth paths and a painted height/surface raster.
// A world = an analytic base terrain + roads, tracks and pads painted into a raster (blend weight, height, surface id).
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

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
  playa:     { id: 'playa', name: 'Dry lakebed', mu: 0.8, rr: 0.85, color: '#d9ccb0', gk: 'dirt' },
  redDirt:   { id: 'redDirt', name: 'Red dirt', mu: 0.68, rr: 1.2, color: '#a3613d', gk: 'dirt' },
  scrub:     { id: 'scrub', name: 'Scrub', mu: 0.6, rr: 1.5, color: '#a39470', gk: 'dirt' },
  meadow:    { id: 'meadow', name: 'Meadow grass', mu: 0.5, rr: 1.8, color: '#6f9a3f', gk: 'dirt' },
  dryGrass:  { id: 'dryGrass', name: 'Dry grass', mu: 0.5, rr: 1.8, color: '#b3a352', gk: 'dirt' },
  forestFloor: { id: 'forestFloor', name: 'Forest floor', mu: 0.55, rr: 1.6, color: '#566230', gk: 'dirt' },
  water:     { id: 'water', name: 'Sea water', mu: 0.2, rr: 6.0, color: '#2f6f8f', gk: 'sand' },   // PROPOSAL: the coast; heavy drag so a car cannot cruise the sea (boats later)
};
for (const [k, v] of Object.entries(SURFACES)) v.key = k;
export const SURFACE_IDS = ['', ...Object.keys(SURFACES)];
export const SID = Object.fromEntries(SURFACE_IDS.map((n, i) => [n, i]));

function crPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}
/** Smooth path through control points, resampled every `ds` metres with tangent + curvature (+ = turning left). */
export function makePath(ctrl, closed, ds = 0.5) {
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

/**
 * A square raster of `size` metres at `cell` metres per cell, centred on the origin. Paint roads (`paint`) and flat pads (`paintDisc`),
 * then read the blended height / surface with `heightAt(base)` / `surfaceAt(baseSurface)`.
 * Storage is sparse: 64 x 64-cell chunks are only allocated where something is painted (a 6 km county at 2 m would be ~120 MB dense).
 */
export function createRaster(size, cell) {
  const N = Math.round(size / cell), HALF = size / 2, CH = 64, NC = Math.ceil(N / CH), chunks = new Array(NC * NC).fill(null);
  const chunk = (c, r, make) => {
    const k = ((r / CH) | 0) * NC + ((c / CH) | 0); let ch = chunks[k];
    if (!ch && make) ch = chunks[k] = { w: new Float32Array(CH * CH), hw: new Float32Array(CH * CH), sid: new Uint8Array(CH * CH), d2: new Float32Array(CH * CH).fill(1e12) };
    return ch;
  };
  const li = (c, r) => (r % CH) * CH + (c % CH);
  const cellOf = v => Math.floor((v + HALF) / cell);
  function paint(path, { core, shoulder, centerH = () => 0, tilt = () => 0, extra = () => 0, classify }) {
    const R = core + shoulder;
    for (const p of path.pts) {
      const nx = p.tz, nz = -p.tx, h0 = centerH(p), tl = tilt(p);
      const c0 = Math.max(0, cellOf(p.x - R)), c1 = Math.min(N - 1, cellOf(p.x + R)), r0 = Math.max(0, cellOf(p.z - R)), r1 = Math.min(N - 1, cellOf(p.z + R));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const x = (c + 0.5) * cell - HALF, z = (r + 0.5) * cell - HALF, dx = x - p.x, dz = z - p.z, dd = dx * dx + dz * dz;
        if (dd > R * R) continue;
        const ch = chunk(c, r, true), i = li(c, r); if (dd >= ch.d2[i]) continue;
        ch.d2[i] = dd;
        const d = dx * nx + dz * nz, ad = Math.abs(d), w = ad <= core ? 1 : 1 - smooth(core, R, ad);
        ch.w[i] = w; ch.hw[i] = (h0 + tl * d + extra(p, d)) * w; ch.sid[i] = ad <= core ? classify(ad, p, d) : 0;
      }
    }
  }
  function paintDisc(cx, cz, r, shoulder, h, id) {
    const R = r + shoulder;
    for (let row = cellOf(cz - R); row <= cellOf(cz + R); row++) for (let col = cellOf(cx - R); col <= cellOf(cx + R); col++) {
      if (row < 0 || col < 0 || row >= N || col >= N) continue;
      const d = Math.hypot((col + 0.5) * cell - HALF - cx, (row + 0.5) * cell - HALF - cz); if (d > R) continue;
      const ch = chunk(col, row, true), i = li(col, row), w = d <= r ? 1 : 1 - smooth(r, R, d);
      if (d > r && ch.w[i] >= w) continue;   // a pad's soft edge never erases a road painted before it
      ch.w[i] = w; ch.hw[i] = h * w; ch.sid[i] = d <= r ? SID[id] : ch.sid[i]; ch.d2[i] = -1;
    }
  }
  const val = (key, c, r) => { if (c < 0 || r < 0 || c >= N || r >= N) return 0; const ch = chunk(c, r, false); return ch ? ch[key][li(c, r)] : 0; };
  function bil(key, x, z) {
    const fx = (x + HALF) / cell - 0.5, fz = (z + HALF) / cell - 0.5;
    const c = Math.floor(fx), r = Math.floor(fz), tx = fx - c, tz = fz - r;
    return (val(key, c, r) * (1 - tx) + val(key, c + 1, r) * tx) * (1 - tz) + (val(key, c, r + 1) * (1 - tx) + val(key, c + 1, r + 1) * tx) * tz;
  }
  const inside = (x, z) => x >= -HALF && x <= HALF && z >= -HALF && z <= HALF;
  const heightAt = base => (x, z) => { const b = base(x, z); if (!inside(x, z)) return b; const w = bil('w', x, z); return w <= 0 ? b : b * (1 - w) + bil('hw', x, z); };
  const surfaceAt = baseSurface => (x, z) => { const id = val('sid', cellOf(x), cellOf(z)); return id ? SURFACES[SURFACE_IDS[id]] : baseSurface(x, z); };
  const isRoad = (x, z) => { const c = cellOf(x), r = cellOf(z); return c < 0 || r < 0 || c >= N || r >= N || val('w', c, r) > 0.01; };
  /** on a road / track / pad surface itself (not its soft shoulder) */
  const isCore = (x, z) => val('sid', cellOf(x), cellOf(z)) !== 0;
  return { N, HALF, cell, paint, paintDisc, heightAt, surfaceAt, isRoad, isCore };
}

/** Separable box blur of an n x n Float32Array (radius r cells, `passes` times ~ a gaussian). */
export function boxBlur(src, n, r, passes = 2) {
  let a = Float32Array.from(src), b = new Float32Array(n * n);
  for (let p = 0; p < passes; p++) for (const horiz of [true, false]) {
    for (let line = 0; line < n; line++) {
      let s = 0; const at = k => a[horiz ? line * n + Math.min(n - 1, Math.max(0, k)) : Math.min(n - 1, Math.max(0, k)) * n + line];
      for (let k = -r; k <= r; k++) s += at(k);
      for (let k = 0; k < n; k++) { b[horiz ? line * n + k : k * n + line] = s / (2 * r + 1); s += at(k + r + 1) - at(k - r); }
    }
    [a, b] = [b, a];
  }
  return a;
}

/** local site coordinates -> world x, z (`rot` turns the site's local +z, its "front") */
export const toWorld = (s, lx, lz) => { const c = Math.cos(s.rot), n = Math.sin(s.rot); return [s.x + lx * c + lz * n, s.z - lx * n + lz * c]; };
export const offsetPts = (pts, dx, dz) => pts.map(([x, z]) => [x + dx, z + dz]);
