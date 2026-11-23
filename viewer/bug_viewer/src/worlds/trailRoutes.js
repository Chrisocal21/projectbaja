// Long dirt trails that follow the real ground (pure JS, no three.js; baked offline by tools/build_trails.mjs into public/terrain/trails.json).
// A trail is the cheapest way across the elevation data between two highway points: it likes washes (ground lower than its surroundings),
// avoids ridgelines and steep faces, never crosses water, and rides a paved road wherever that is the easy way. Only the stretches
// OFF the pavement become dirt roads, so a trail pops onto a highway for a while and leaves it again on the far side.

const CELL = 60, MAXG = 0.17, SQ2 = Math.SQRT2;
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];

class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, out = v[0], lk = k.pop(), lv = v.pop(), n = k.length;
    if (n) {
      let i = 0;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; }
      k[i] = lk; v[i] = lv;
    }
    return out;
  }
}

/** The cost surface: heights, water/keep-out, highway cells and wash/ridge measures on a 60 m grid. */
export function makeTrailGrid(border, roads, keep = []) {
  const { x0, x1, z0, z1 } = border.bounds, nx = Math.floor((x1 - x0) / CELL), nz = Math.floor((z1 - z0) / CELL), n = nx * nz;
  const H = new Float32Array(n), ok = new Uint8Array(n), road = new Uint8Array(n);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + (i + 0.5) * CELL, z = z0 + (j + 0.5) * CELL, k = j * nx + i, h = border.heightAt(x, z);
    H[k] = h;
    ok[k] = h > 4 && border.waterAt(x, z) == null && !keep.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 120) ? 1 : 0;
  }
  for (const r of roads) {   // paved lines onto the grid (a cell either side, so a trail cannot slip through)
    if (r.kind === 'dirt' || r.kind === 'ramp') continue;
    for (let s = 1; s < r.pts.length; s++) {
      const [ax, az] = r.pts[s - 1], [bx, bz] = r.pts[s], len = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(len / (CELL / 3)));
      for (let t = 0; t <= steps; t++) {
        const i = Math.floor((ax + (bx - ax) * t / steps - x0) / CELL), j = Math.floor((az + (bz - az) * t / steps - z0) / CELL);
        if (i >= 0 && j >= 0 && i < nx && j < nz) road[j * nx + i] = 1;
      }
    }
  }
  // wash / ridge: ground height against its ~700 m neighbourhood (box mean via two running sums)
  const R = 6, sum = new Float64Array((nx + 1) * (nz + 1));
  for (let j = 0; j < nz; j++) { let row = 0; for (let i = 0; i < nx; i++) { row += H[j * nx + i]; sum[(j + 1) * (nx + 1) + i + 1] = sum[j * (nx + 1) + i + 1] + row; } }
  const rel = new Float32Array(n);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = Math.max(0, i - R), b = Math.min(nx, i + R + 1), c = Math.max(0, j - R), d = Math.min(nz, j + R + 1);
    const m = (sum[d * (nx + 1) + b] - sum[c * (nx + 1) + b] - sum[d * (nx + 1) + a] + sum[c * (nx + 1) + a]) / ((b - a) * (d - c));
    rel[j * nx + i] = H[j * nx + i] - m;   // negative: in a valley or wash; positive: on a rise
  }
  return { nx, nz, x0, z0, H, ok, road, rel, cell: CELL, cellOf: (x, z) => { const i = Math.floor((x - x0) / CELL), j = Math.floor((z - z0) / CELL); return i >= 0 && j >= 0 && i < nx && j < nz ? j * nx + i : -1; } };
}

/** Cheapest route between two cells: [cell indices] or null. */
export function findTrail(g, from, to, maxExpand = 900000) {
  const { nx, nz, H, ok, road, rel } = g, n = nx * nz;
  if (from < 0 || to < 0 || !ok[from] || !ok[to]) return null;
  const best = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
  const ti = to % nx, tj = (to / nx) | 0, heap = new Heap();
  const hx = k => Math.hypot((k % nx) - ti, ((k / nx) | 0) - tj) * CELL * 0.55;
  best[from] = 0; heap.push(hx(from), from);
  let expanded = 0;
  while (heap.size) {
    const k = heap.pop();
    if (done[k]) continue;
    done[k] = 1;
    if (k === to) { const out = []; for (let c = to; c >= 0; c = prev[c]) out.push(c); return out.reverse(); }
    if (++expanded > maxExpand) return null;
    const i = k % nx, j = (k / nx) | 0;
    for (const [di, dj, m] of NB) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const q = b * nx + a;
      if (done[q] || !ok[q]) continue;
      const d = CELL * m, grade = Math.abs(H[q] - H[k]) / d, onRoad = road[q] && road[k];
      if (grade > MAXG && !onRoad) continue;
      const wash = Math.min(1, Math.max(0, -rel[q] / 12)), ridge = Math.min(1, Math.max(0, rel[q] / 12));
      const mult = onRoad ? 0.62 : Math.max(0.4, 1 + 0.9 * (grade / 0.07) ** 2 + 0.9 * ridge - 0.55 * wash + (road[q] ? 0.6 : 0));   // crossing a road's edge sideways is not riding it
      const c = best[k] + d * mult;
      if (c < best[q]) { best[q] = c; prev[q] = k; heap.push(c + hx(q), q); }
    }
  }
  return null;
}

/** Splits a route into its off-road runs (each starts and ends on a paved cell) and turns them into smooth dirt roads. */
export function dirtRuns(g, cells, minLen = 1600) {
  const { nx, x0, z0, road } = g, pt = k => [x0 + ((k % nx) + 0.5) * CELL, z0 + (((k / nx) | 0) + 0.5) * CELL];
  const runs = []; let run = null;
  for (let s = 0; s < cells.length; s++) {
    if (road[cells[s]]) { if (run && run.length > 1) { run.push(cells[s]); runs.push(run); } run = [cells[s]]; }
    else if (run) run.push(cells[s]);
  }
  return runs.map(r => smooth(simplify(r.map(pt), 45))).filter(p => length(p) >= minLen);
}

export const length = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };

function simplify(pts, tol) {   // Douglas-Peucker
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let far = -1, fd = tol;
    const [ax, az] = pts[a], dx = pts[b][0] - ax, dz = pts[b][1] - az, l2 = dx * dx + dz * dz || 1;
    for (let i = a + 1; i < b; i++) {
      const t = Math.max(0, Math.min(1, ((pts[i][0] - ax) * dx + (pts[i][1] - az) * dz) / l2)), d = Math.hypot(pts[i][0] - ax - t * dx, pts[i][1] - az - t * dz);
      if (d > fd) { fd = d; far = i; }
    }
    if (far >= 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Chaikin corner cutting (ends pinned), then even ~40 m spacing: a trail that curves like a wash, not a grid staircase. */
function smooth(pts) {
  let p = pts;
  for (let pass = 0; pass < 3; pass++) {
    const q = [p[0]];
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1], [bx, bz] = p[i];
      q.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    q.push(p[p.length - 1]); p = q;
  }
  const total = length(p), steps = Math.max(2, Math.round(total / 40)), out = [p[0]];
  let seg = 1, acc = 0, segLen = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]);
  for (let s = 1; s < steps; s++) {
    const want = total * s / steps;
    while (seg < p.length - 1 && acc + segLen < want) { acc += segLen; seg++; segLen = Math.hypot(p[seg][0] - p[seg - 1][0], p[seg][1] - p[seg - 1][1]); }
    const t = segLen ? (want - acc) / segLen : 0;
    out.push([p[seg - 1][0] + (p[seg][0] - p[seg - 1][0]) * t, p[seg - 1][1] + (p[seg][1] - p[seg - 1][1]) * t]);
  }
  out.push(p[p.length - 1]);
  return out.map(([x, z]) => [Math.round(x), Math.round(z)]);
}

/** Picks the trails: many candidate highway-to-highway routes, keeping the long, wash-following, spread-out ones. */
export function planTrails(border, roads, keep = [], { want = 18, tries = 260, seed = 7, minSpread = 5000 } = {}) {
  const g = makeTrailGrid(border, roads, keep);
  let s = seed; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const anchors = [];   // paved points, every ~1.5 km
  for (const r of roads) {
    if (r.kind === 'dirt' || r.kind === 'ramp') continue;
    let acc = 1500;
    for (let i = 1; i < r.pts.length; i++) {
      const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i], l = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d < l; d += 250) { acc += 250; if (acc >= 1500) { acc = 0; const k = g.cellOf(ax + (bx - ax) * d / l, az + (bz - az) * d / l); if (k >= 0 && g.ok[k]) anchors.push([ax + (bx - ax) * d / l, az + (bz - az) * d / l, k]); } }
    }
  }
  const cands = [];
  for (let t = 0; t < tries && anchors.length > 2; t++) {
    const a = anchors[(rnd() * anchors.length) | 0];
    const far = anchors.filter(b => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); return d > 6000 && d < 15000; });
    if (!far.length) continue;
    const b = far[(rnd() * far.length) | 0], cells = findTrail(g, a[2], b[2]); 
    if (!cells) continue;
    const runs = dirtRuns(g, cells), dirt = runs.reduce((q, r) => q + length(r), 0);
    if (!runs.length || dirt < 4500) continue;
    const straight = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let washy = 0, steep = 0;
    for (const k of cells) { if (!g.road[k]) { washy += g.rel[k] < -3 ? 1 : 0; } }
    const frac = washy / cells.length;
    const total = cells.length * CELL;
    if (total > straight * 1.7) continue;
    cands.push({ runs, dirt, score: dirt * (0.6 + frac) / (1 + Math.max(0, total / straight - 1.2)), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] });
  }
  cands.sort((p, q) => q.score - p.score);
  const picked = [];
  for (const c of cands) {
    if (picked.length >= want) break;
    if (picked.some(p => p.runs.some(r1 => c.runs.some(r2 => r1.some((u, i) => i % 4 === 0 && r2.some((v, j) => j % 4 === 0 && Math.hypot(u[0] - v[0], u[1] - v[1]) < minSpread * 0.2))))) ) continue;
    picked.push(c);
  }
  const main = picked.flatMap(c => c.runs).map(pts => ({ name: 'Dirt road', kind: 'dirt', pts }));

  // The real western Imperial route map has a finer mesh around Plaster City,
  // Yuha Basin and the adjoining washes than the sparse long-distance network.
  // These are original, terrain-routed connectors, not traced BLM route lines.
  // Both ends return to pavement, so a player can leave and rejoin the main road.
  const localAnchors = anchors.filter(([x, z]) => x > -5000 && x < 1500 && z > -3200 && z < 3200);
  const local = [], localTry = Math.min(260, tries);
  for (let t = 0; t < localTry && localAnchors.length > 2; t++) {
    const a = localAnchors[(rnd() * localAnchors.length) | 0];
    const near = localAnchors.filter(b => {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return d > 1800 && d < 6000;
    });
    if (!near.length) continue;
    const b = near[(rnd() * near.length) | 0];
    const cells = findTrail(g, a[2], b[2], 110000);
    if (!cells) continue;
    const runs = dirtRuns(g, cells, 350);
    const dirt = runs.reduce((sum, r) => sum + length(r), 0);
    const straight = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (dirt < 900 || dirt > 6500 || cells.length * CELL > straight * 2.05) continue;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    // Keep separate connectors rather than stacking many near-identical tracks.
    if (local.some(c => Math.hypot(c.mid[0] - mid[0], c.mid[1] - mid[1]) < 850)) continue;
    const overlaps = r => r.pts.some((p, i) => i % 8 === 0 && runs.some(run => run.some((q, j) => j % 8 === 0 && Math.hypot(p[0] - q[0], p[1] - q[1]) < 180)));
    if (main.some(overlaps) || local.some(c => c.runs.some(pts => overlaps({ pts })))) continue;
    local.push({ mid, runs });
    if (local.length >= 12) break;
  }
  // highways.js joins baked routes named "Dirt road" to the final paved mesh.
  return [...main, ...local.flatMap(c => c.runs).map(pts => ({ name: 'Dirt road', kind: 'dirt', pts }))];
}
