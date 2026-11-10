// Junctions on the real highways (docs/WORLD_MAP.md step 5b, PROPOSAL). Pure JS, no three.js: testable in node.
// Reads the road lines (highways.json) and works out, for every place where roads meet:
//   freeway x freeway  -> a cloverleaf: four 270-degree loop ramps (left turns) + slip ramps for the right turns
//   freeway x road     -> a diamond: an off-ramp and an on-ramp for each direction and each side road
//   road x road        -> an at-grade junction with STOP signs on the minor road(s)
//   a road that just stops -> a dead-end sign
// Ramps are returned as extra road lines (kind 'ramp') that makeHighways grades like any other; furniture is a list of
// { type: 'stop' | 'light' | 'deadend', x, z, ry } (ry = which way the sign face points).
// No overpasses yet (the ground is a height map): ramps meet the crossing road at the same height.

export const isFreeway = r => r.kind === 'major' && (/^I-/.test(r.name) || /D$/.test(r.name));
const R_LOOP = 75, LEG = 72, LONG = 280, ARM_MAX = 70, CLUSTER = 90;
const hyp = Math.hypot;
const norm = ([x, z]) => { const l = hyp(x, z) || 1; return [x / l, z / l]; };
const right = d => [-d[1], d[0]];   // heading d (x east, z south): the right-hand side
const add = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];

/** closest point of a polyline to (x, z): { d, i, t, p } */
function closest(pts, x, z) {
  let best = { d: Infinity };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
    const px = a[0] + dx * t, pz = a[1] + dz * t, d = hyp(px - x, pz - z);
    if (d < best.d) best = { d, i, t, p: [px, pz] };
  }
  return best;
}
/** direction of the line `along` metres from index i going forward (+1) or back (-1) */
function dirFrom(pts, i, t, sign, along = 90) {
  const p = [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
  let j = sign > 0 ? i + 1 : i, acc = hyp(p[0] - pts[j][0], p[1] - pts[j][1]), q = pts[j];
  while (acc < along && j + sign >= 0 && j + sign < pts.length) { j += sign; acc += hyp(pts[j][0] - q[0], pts[j][1] - q[1]); q = pts[j]; }
  return norm([q[0] - p[0], q[1] - p[1]]);
}
/** the directions a road leaves the point J in (both ways if it passes through, one if it ends there), or [] */
function arms(road, J) {
  const pts = road.pts, c = closest(pts, J[0], J[1]); if (c.d > ARM_MAX) return [];
  const atStart = c.i === 0 && c.t < 0.001 || hyp(pts[0][0] - c.p[0], pts[0][1] - c.p[1]) < 40;
  const n = pts.length - 1, atEnd = c.i === n - 1 && c.t > 0.999 || hyp(pts[n][0] - c.p[0], pts[n][1] - c.p[1]) < 40;
  const out = [];
  if (!atEnd) out.push(dirFrom(pts, c.i, c.t, +1));
  if (!atStart) out.push(dirFrom(pts, c.i, c.t, -1));
  return out;
}

/** a ramp road line from control points, as the road format makeHighways takes */
let rampId = 0;
const ramp = (pts, tag) => ({ id: ++rampId, name: '', kind: 'ramp', tag, pts: pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]) });

/** diamond ramps between freeway direction f (unit) through J and a side road leaving J along u */
function diamond(J, f, u, out) {
  for (const d of [f, [-f[0], -f[1]]]) {
    const nr = right(d); if (nr[0] * u[0] + nr[1] * u[1] < 0.3) continue;   // only the side road on this direction's right
    const end = add(J, u, LEG), nearJ = add(add(J, u, LEG * 0.75), d, -42);
    const offR = ramp([add(J, d, -LONG), add(add(J, d, -LONG * 0.62), nr, 15), nearJ, end], 'off'); out.ramps.push(offR);          // exit before the crossing
    const onR = ramp([end, add(add(J, u, LEG * 0.75), d, 42), add(add(J, d, LONG * 0.62), nr, 15), add(J, d, LONG)], 'on'); out.ramps.push(onR);   // join after it
    out.furniture.push({ type: 'stop', x: end[0] - u[0] * 4 + nr[0] * 5, z: end[1] - u[1] * 4 + nr[1] * 5, ry: Math.atan2(-u[0], -u[1]), needs: [offR.id, onR.id] });   // signs only stand if BOTH ramps survive grading
    out.furniture.push({ type: 'light', x: end[0] + nr[0] * 8, z: end[1] + nr[1] * 8, ry: 0, needs: [offR.id, onR.id] });
  }
}
/** a 270-degree loop that leaves freeway A heading d just after the crossing and joins freeway B (running left of d) before it */
function loop(J, d, out) {
  const nr = right(d), S = add(J, d, R_LOOP), C = add(S, nr, R_LOOP), pts = [add(J, d, R_LOOP - 130), add(J, d, R_LOOP - 80)];   // lead-in runs ALONG d (the circle's first tangent is +d)
  pts.push(add(add(J, d, R_LOOP - 35), nr, 2));
  for (let k = 0; k <= 8; k++) {   // clockwise 270 degrees (a right turn through three quarters of a circle)
    const th = (k / 8) * 1.5 * Math.PI, rx = -nr[0] * R_LOOP, rz = -nr[1] * R_LOOP;   // start vector: centre -> S
    // clockwise in (x east, z south) is positive rotation in standard form, because z points down
    pts.push([C[0] + rx * Math.cos(th) - rz * Math.sin(th), C[1] + rx * Math.sin(th) + rz * Math.cos(th)]);
  }
  const e = pts[pts.length - 1], lf = [-nr[0], -nr[1]];   // ends heading left of d: carry on along the other freeway
  pts.push(add(e, lf, 80)); out.ramps.push(ramp(pts, 'loop'));
}

/**
 * roads: [{ name, kind, pts: [[x, z], ...] }]; bounds: { x0, x1, z0, z1 } (dead ends at the map edge are not dead ends).
 * Returns { ramps: [road lines], furniture: [...], junctions: n, deadEnds: n }.
 */
export function buildJunctions(roads, bounds, { atGrade = false } = {}) {
  const out = { ramps: [], furniture: [], nodes: [], junctions: 0, deadEnds: 0 };
  const ends = [];
  roads.forEach((r, i) => { ends.push([i, r.pts[0], r.pts[1]], [i, r.pts[r.pts.length - 1], r.pts[r.pts.length - 2]]); });
  const grid = new Map(), cl = [];
  for (const e of ends) {   // cluster road ends that are within CLUSTER m of each other
    const gx = Math.round(e[1][0] / CLUSTER), gz = Math.round(e[1][1] / CLUSTER);
    let hit = null;
    for (let dx = -1; dx <= 1 && !hit; dx++) for (let dz = -1; dz <= 1 && !hit; dz++) { const c = grid.get((gx + dx) + ',' + (gz + dz)); if (c && hyp(c.x - e[1][0], c.z - e[1][1]) < CLUSTER) hit = c; }
    if (!hit) { hit = { x: e[1][0], z: e[1][1], ends: [] }; grid.set(gx + ',' + gz, hit); cl.push(hit); }
    hit.ends.push(e);
  }
  const edge = p => p[0] < bounds.x0 + 150 || p[0] > bounds.x1 - 150 || p[1] < bounds.z0 + 150 || p[1] > bounds.z1 - 150;
  for (const c of cl) {
    const J = [c.x, c.z];
    const inv = [];
    roads.forEach((r, i) => {   // lines of one named road that meet here are one road passing through
      const a = arms(r, J); if (!a.length) return;
      const same = r.name && inv.find(q => q.r.name === r.name && q.r.kind === r.kind);
      if (same) { same.a.push(...a); same.ends = same.ends && c.ends.some(e => e[0] === i); } else inv.push({ r, i, a, ends: c.ends.some(e => e[0] === i) });
    });
    if (inv.length === 1) {   // a road that simply stops
      const e = c.ends[0]; if (c.ends.length === 1 && !edge(J) && roads[e[0]].pts.length > 1) {
        const back = norm([e[2][0] - e[1][0], e[2][1] - e[1][1]]);
        out.furniture.push({ type: 'deadend', x: J[0] + back[0] * 12 + right(back)[0] * 4, z: J[1] + back[1] * 12 + right(back)[1] * 4, ry: Math.atan2(-back[0], -back[1]) + Math.PI });
        out.deadEnds++;
      }
      continue;
    }
    if (inv.length < 2) continue;
    out.junctions++;
    out.nodes.push({ x: J[0], z: J[1], roads: inv.map(q => q.r.name) });
    const fw = inv.filter(q => isFreeway(q.r));
    if (!atGrade && fw.length >= 2) {   // freeway x freeway: cloverleaf, only where both pass through
      const A = fw[0], B = fw[1];
      if (A.a.length === 2 && B.a.length === 2) for (const d of [A.a[0], A.a[1]]) loop(J, d, out);
      if (A.a.length === 2 && B.a.length === 2) for (const d of [B.a[0], B.a[1]]) loop(J, d, out);
      continue;
    }
    if (!atGrade && fw.length === 1) {   // freeway x road: diamond with each side arm
      const F = fw[0], f = F.a.length === 2 ? norm([F.a[0][0] - F.a[1][0], F.a[0][1] - F.a[1][1]]) : F.a[0];
      for (const q of inv) if (q !== F) for (const u of q.a) diamond(J, f, u, out);
      continue;
    }
    // road x road: stop the lower-class road(s); an equal pair stops the one that ends here (the stem of a T)
    const rank = q => (q.r.kind === 'major' ? 2 : 1);
    const top = Math.max(...inv.map(rank)), mainIsEnd = inv.filter(q => rank(q) === top);
    for (const q of inv) {
      const stops = rank(q) < top || (mainIsEnd.length > 1 && q.ends && q.a.length === 1 && inv.some(o => o !== q && o.a.length === 2));
      for (const u of q.a) {
        if (stops) out.furniture.push({ type: 'stop', x: J[0] + u[0] * 20 - right(u)[0] * 5.5, z: J[1] + u[1] * 20 - right(u)[1] * 5.5, ry: Math.atan2(-u[0], -u[1]) });   // on the right of traffic coming in (heading -u)
        out.furniture.push({ type: 'light', x: J[0] + u[0] * 10 - right(u)[0] * 9, z: J[1] + u[1] * 10 - right(u)[1] * 9, ry: 0 });
      }
    }
  }
  return out;
}
