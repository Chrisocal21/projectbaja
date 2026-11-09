// Real highways on the big map (docs/WORLD_MAP.md step 5, PROPOSAL). Pure JS, no three.js: testable in node.
// The lines come from public/terrain/highways.json (assets/pipeline/west_roads.py, Natural Earth roads). Here each line is
// smoothed, pushed round the hand-built places, sampled every few metres and graded (a long moving average of the ground,
// never under water), then put in a grid so "which highway is under (x, z)" is a quick lookup.
import { makePath, smooth } from './kit.js';

/** half = paved half-width, lanes = asphalt half-width (gravel outside it), shoulder = how far the ground eases back, grade = smoothing length (m) */
export const HW_STYLE = {
  major:     { half: 6.0, lanes: 5.2, shoulder: 16, grade: 320 },
  secondary: { half: 4.4, lanes: 3.6, shoulder: 12, grade: 220 },
};
const STEP = 4, CELL = 100, CUT = 1.5, REACH = 60, DEEP = 14;   // DEEP: the deepest cut / tallest fill (the source lines can run a little off the real pass)   // cuts and fills ease back at about 1.5 : 1, up to REACH m from the centre

/** straight-line densify (<= max m apart), then a few [1 2 1] passes so corners become bends */
function soften(pts, max = 40, passes = 4) {
  let out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / max));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
  }
  for (let p = 0; p < passes; p++) out = out.map((q, i) => (i === 0 || i === out.length - 1 ? q : [(out[i - 1][0] + 2 * q[0] + out[i + 1][0]) / 4, (out[i - 1][1] + 2 * q[1] + out[i + 1][1]) / 4]));
  return out;
}
/** move points out of the keep-clear discs [{x, z, r}] (a bypass round a built place) */
function pushOut(pts, avoid) {
  let out = pts;
  for (const a of avoid) {
    const R = a.r * 1.01, ang = p => Math.atan2(p[1] - a.z, p[0] - a.x), on = t => [a.x + Math.cos(t) * R, a.z + Math.sin(t) * R];
    const inside = (x, z) => (x - a.x) ** 2 + (z - a.z) ** 2 < a.r * a.r;
    if (!out.some(p => inside(p[0], p[1])) && !out.some((p, i) => i && inside((p[0] + out[i - 1][0]) / 2, (p[1] + out[i - 1][1]) / 2))) continue;
    // every point inside goes straight out to the edge; where the line then still cuts across the place, it follows the edge round instead
    const pushed = out.map(p => (inside(p[0], p[1]) ? on(Math.hypot(p[0] - a.x, p[1] - a.z) < 1e-6 ? Math.PI / 2 : ang(p)) : p));
    const res = [pushed[0]];
    for (let i = 1; i < pushed.length; i++) {
      const A = res[res.length - 1], B = pushed[i];
      if (Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) < 0.01) continue;
      if (inside((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)) {
        const t0 = ang(A); let dt = ang(B) - t0; while (dt > Math.PI) dt -= 2 * Math.PI; while (dt < -Math.PI) dt += 2 * Math.PI;
        if (Math.abs(Math.abs(dt) - Math.PI) < 1e-3) dt = Math.PI;   // straight through the middle: either way round will do
        const k = Math.ceil(Math.abs(dt) * R / 15);
        for (let s = 1; s < k; s++) res.push(on(t0 + dt * s / k));
      }
      res.push(B);
    }
    out = res;
  }
  return out;
}

/**
 * roads: [{ name, kind, pts: [[x, z], ...] }]; ground(x, z): the land without highways; water(x, z): water surface or null.
 * avoid: keep-clear discs. Returns { roads, near, blend, surfaceKey, isNear }.
 */
export function makeHighways(roads, ground, { avoid = [], water = () => null } = {}) {
  const list = [];
  const order = roads.map((r, i) => [r, i]).sort((a, b) => (a[0].kind === b[0].kind ? 0 : a[0].kind === 'major' ? -1 : 1));
  for (const [r] of order) {
    const st = HW_STYLE[r.kind] || HW_STYLE.secondary;
    let ctrl = r.pts;
    for (let pass = 0; pass < 2; pass++) ctrl = pushOut(soften(ctrl, 40, pass ? 2 : 4), avoid);
    if (ctrl.length < 2) continue;
    const path = makePath(ctrl, false, STEP), p = path.pts, n = p.length; if (n < 3) continue;
    const floor = p.map(q => { const w = water(q.x, q.z); return w == null ? -Infinity : w + 1.2; });   // causeways stay above the water
    const g0 = p.map((q, i) => Math.max(ground(q.x, q.z), floor[i]));
    const box = (h, k) => { const cs = new Float64Array(n + 1); for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + h[i]; return h.map((_, i) => { const a = Math.max(0, i - k), b = Math.min(n - 1, i + k); return (cs[b + 1] - cs[a]) / (b - a + 1); }); };
    const k = Math.max(1, Math.round(st.grade / STEP / 2));
    let h = box(box(g0, k), k);
    h = h.map((v, i) => Math.min(g0[i] + DEEP, Math.max(g0[i] - DEEP, v)));   // over a ridge rather than a canyon-deep cut
    h = box(box(h, k >> 2 || 1), k >> 2 || 1);
    h = h.map((v, i) => Math.max(v, floor[i]));
    // tie each end into a highway graded before it (junctions meet at one height)
    for (const [end, dir] of [[0, 1], [n - 1, -1]]) {
      const e = p[end]; let target = null, bd = 30;
      for (const o of list) for (let i = 0; i < o.pts.length; i += 2) { const q = o.pts[i], d = Math.abs(q.x - e.x) + Math.abs(q.z - e.z); if (d < bd) { bd = d; target = q.hs; } }
      if (target == null) continue;
      const off = target - h[end];
      for (let i = 0, s = 0; i < n && s < 160; i++, s += STEP) h[end + dir * i] += off * (1 - smooth(0, 160, s));
    }
    p.forEach((q, i) => (q.hs = h[i]));
    list.push({ name: r.name, kind: r.kind, style: st, pts: p, total: path.total });
  }

  // grid of segments (CSR): every segment is listed in each cell its reach touches
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const r of list) for (const q of r.pts) { x0 = Math.min(x0, q.x); z0 = Math.min(z0, q.z); x1 = Math.max(x1, q.x); z1 = Math.max(z1, q.z); }
  x0 -= REACH + CELL; z0 -= REACH + CELL;
  const NX = Math.max(1, Math.ceil((x1 - x0 + REACH + CELL) / CELL)), NZ = Math.max(1, Math.ceil((z1 - z0 + REACH + CELL) / CELL));
  const segR = [], segI = [];
  list.forEach((r, ri) => { for (let i = 0; i < r.pts.length - 1; i++) { segR.push(ri); segI.push(i); } });
  const cellsOf = (s, f) => {
    const a = list[segR[s]].pts[segI[s]], b = list[segR[s]].pts[segI[s] + 1], R = REACH;
    const c0 = Math.floor((Math.min(a.x, b.x) - R - x0) / CELL), c1 = Math.floor((Math.max(a.x, b.x) + R - x0) / CELL);
    const r0 = Math.floor((Math.min(a.z, b.z) - R - z0) / CELL), r1 = Math.floor((Math.max(a.z, b.z) + R - z0) / CELL);
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) f(rr * NX + cc);
  };
  const start = new Int32Array(NX * NZ + 1);
  for (let s = 0; s < segR.length; s++) cellsOf(s, c => start[c + 1]++);
  for (let c = 0; c < NX * NZ; c++) start[c + 1] += start[c];
  const fill = start.slice(0, NX * NZ), items = new Int32Array(start[NX * NZ]);
  for (let s = 0; s < segR.length; s++) cellsOf(s, c => (items[fill[c]++] = s));

  const hit = { d: 0, h: 0, road: null, i: 0, t: 0 };
  /** the closest highway centre line within REACH m of (x, z): { d (m from the centre line), h (graded height there), road }, or null. The object is reused. */
  function near(x, z) {
    const c = Math.floor((x - x0) / CELL), rr = Math.floor((z - z0) / CELL);
    if (c < 0 || rr < 0 || c >= NX || rr >= NZ) return null;
    let best = Infinity;
    for (let k = start[rr * NX + c], e = start[rr * NX + c + 1]; k < e; k++) {
      const s = items[k], r = list[segR[s]], i = segI[s], a = r.pts[i], b = r.pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
      let t = ((x - a.x) * dx + (z - a.z) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(a.x + dx * t - x, a.z + dz * t - z);
      if (d < best && d <= REACH) { best = d; hit.d = d; hit.h = a.hs + (b.hs - a.hs) * t; hit.road = r; hit.i = i; hit.t = t; }
    }
    return best < Infinity ? hit : null;
  }
  // every highway within REACH, each at its own closest point (roads that run side by side must blend, not jump where "closest" switches)
  const MAXN = 8, nR = new Int32Array(MAXN), nD = new Float64Array(MAXN), nH = new Float64Array(MAXN);
  function nearAll(x, z) {
    const c = Math.floor((x - x0) / CELL), rr = Math.floor((z - z0) / CELL);
    if (c < 0 || rr < 0 || c >= NX || rr >= NZ) return 0;
    let n = 0;
    for (let k = start[rr * NX + c], e = start[rr * NX + c + 1]; k < e; k++) {
      const s = items[k], ri = segR[s], r = list[ri], i = segI[s], a = r.pts[i], b = r.pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
      let t = ((x - a.x) * dx + (z - a.z) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(a.x + dx * t - x, a.z + dz * t - z); if (d > REACH) continue;
      let j = 0; while (j < n && nR[j] !== ri) j++;
      if (j === n) { if (n === MAXN) continue; n++; nR[j] = ri; nD[j] = Infinity; }
      if (d < nD[j]) { nD[j] = d; nH[j] = a.hs + (b.hs - a.hs) * t; }
    }
    return n;
  }
  /** the ground height h at (x, z) eased onto the highways' grade */
  function blend(x, z, h) {
    const n = nearAll(x, z); if (!n) return h;
    let wmax = 0, sw = 0, sh = 0;
    for (let j = 0; j < n; j++) {
      const st = list[nR[j]].style, ease = Math.min(REACH - st.half, Math.max(st.shoulder, Math.abs(nH[j] - h) * CUT));   // deep cuts and tall fills get gentler banks
      const w = nD[j] <= st.half ? 1 : 1 - smooth(st.half, st.half + ease, nD[j]); if (w <= 0) continue;
      const w4 = w ** 4; wmax = Math.max(wmax, w); sw += w4; sh += w4 * nH[j];
    }
    return sw ? h + (sh / sw - h) * wmax : h;
  }
  /** 'asphalt' on the lanes, 'gravel' on the paved edge, else null */
  function surfaceKey(x, z) {
    const q = near(x, z); if (!q) return null;
    return q.d <= q.road.style.lanes ? 'asphalt' : q.d <= q.road.style.half ? 'gravel' : null;
  }
  /** on (or within pad m of) a highway's paved width */
  const isNear = (x, z, pad = 0) => { const q = near(x, z); return !!q && q.d <= q.road.style.half + pad; };
  return { roads: list, near, blend, surfaceKey, isNear };
}
