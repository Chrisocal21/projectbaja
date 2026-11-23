// Race courses (PROPOSAL, Chris: "dirt side roads that are part of each race track: all SCORE races, all MDR races, all races in this area").
// Pure JS (no three.js, no game state): testable in node. Two families:
//   SCORE  (Baja 1000, Baja 500, Baja 400, San Felipe 250): routes that MIX dirt legs with the paved highways. Only the dirt legs become new roads;
//          the paved legs run on the highways that are already there.
//   MDR    (Mojave Desert Racing: Ocotillo, Plaster City, the Flats, around the Imperial Valley): big all-dirt LOOPS, not point to point.
// The waypoints are APPROXIMATE real places (lat, lon), drawn from memory over the real corridors, NOT the official courses (SCORE changes its
// course every year and publishes GPS files). Refine them by editing the lists below; nothing else needs to change.
// The game map is the real peninsula squeezed about 25 to 1 (border.json hScale 0.04), so a real 25 km loop would be 1 km long in the game: `spread` multiplies
// a course's size around its start so the MDR loops are proper big tracks (the SCORE routes already span real distances at game scale).
// Each waypoint is [lat, lon, how you get there from the previous one]: 'D' dirt, 'P' paved (existing highway).
import { projectPlace } from '../game/realPlaces.js';

export const RACE_COURSES = [
  { id: 'mdr-ocotillo', from: 'Ocotillo', series: 'MDR', spread: 3, name: 'MDR Ocotillo Loop', kind: 'loop', note: 'All dirt, a big loop south of I-8 at Ocotillo and Coyote Wells.',
    pts: [[32.745, -116.02], [32.73, -115.93, 'D'], [32.69, -115.91, 'D'], [32.65, -115.95, 'D'], [32.66, -116.03, 'D'], [32.71, -116.06, 'D']] },
  { id: 'mdr-plaster-city', from: 'Plaster City', series: 'MDR', spread: 3, name: 'MDR Plaster City Loop', kind: 'loop', note: 'All dirt, a loop either side of I-8 round Plaster City.',
    pts: [[32.83, -115.93], [32.84, -115.82, 'D'], [32.79, -115.76, 'D'], [32.73, -115.78, 'D'], [32.72, -115.86, 'D'], [32.76, -115.92, 'D']] },
  { id: 'mdr-flats', series: 'MDR', spread: 3, name: 'MDR The Flats Loop', kind: 'loop', note: 'All dirt, a flat fast loop across the Yuha flats.',
    pts: [[32.755, -115.80], [32.76, -115.72, 'D'], [32.715, -115.69, 'D'], [32.69, -115.75, 'D'], [32.71, -115.81, 'D']] },
  { id: 'score-sf250', from: 'San Felipe', series: 'SCORE', name: 'San Felipe 250', kind: 'loop', note: 'Starts and finishes in San Felipe: dirt out through Valle Chico and the Laguna Salada edge, paved on Mex 5.',
    pts: [[31.025, -114.84], [31.25, -114.82, 'P'], [31.5, -114.95, 'P'], [31.55, -115.2, 'D'], [31.45, -115.45, 'D'], [31.25, -115.5, 'D'], [31.1, -115.25, 'D'], [31.05, -115.05, 'D'], [31.025, -114.84, 'D']] },
  { id: 'score-b400', from: 'Ensenada', series: 'SCORE', name: 'Baja 400', kind: 'loop', note: 'A northern loop out of Ensenada: Valle de Guadalupe, Tecate side, Ojos Negros.',
    pts: [[31.86, -116.61], [32.08, -116.6, 'P'], [32.3, -116.5, 'D'], [32.45, -116.45, 'D'], [32.2, -116.3, 'D'], [31.92, -116.3, 'D'], [31.86, -116.61, 'P']] },
  { id: 'score-b500', from: 'Ensenada', series: 'SCORE', name: 'Baja 500', kind: 'loop', note: 'Ensenada loop: Ojos Negros, the Trinidad valley, Santo Tomas, home on Mex 1.',
    pts: [[31.86, -116.61], [31.92, -116.3, 'D'], [31.85, -116.05, 'D'], [31.35, -115.68, 'D'], [31.5, -116.0, 'D'], [31.6, -116.35, 'D'], [31.8, -116.6, 'P'], [31.86, -116.61, 'P']] },
  { id: 'score-b1000', from: 'Ensenada', to: 'La Paz', series: 'SCORE', name: 'Baja 1000', kind: 'point', note: 'Ensenada to La Paz down the peninsula: Mex 1 with dirt legs through the valleys and desert.',
    pts: [[31.86, -116.61], [31.55, -116.4, 'D'], [31.33, -116.25, 'P'], [30.98, -116.2, 'D'], [30.48, -115.98, 'P'], [30.06, -115.73, 'P'], [29.9, -115.3, 'D'], [29.72, -114.72, 'P'], [29.35, -114.33, 'D'], [28.8, -114.1, 'P'], [27.96, -114.06, 'P'], [27.6, -113.5, 'D'], [27.29, -112.9, 'P'], [26.89, -111.98, 'P'], [26.4, -111.7, 'D'], [26.01, -111.35, 'P'], [25.5, -111.5, 'D'], [25.03, -111.66, 'P'], [24.6, -111.0, 'D'], [24.13, -110.3, 'P']] },
];

// ---- geometry helpers ----
const hyp = Math.hypot;
/** the nearest point on any of the given polylines (roads: [{ pts: [[x, z] | { x, z }] }]) within maxD metres of p, or null */
export function nearestOnRoads(p, roads, maxD = 5000) {
  let best = null, bd = maxD;
  for (const r of roads) {
    const pts = r.pts, n = pts.length; if (n < 2) continue;
    for (let i = 0; i < n - 1; i++) {
      const ax = pts[i][0] ?? pts[i].x, az = pts[i][1] ?? pts[i].z, bx = pts[i + 1][0] ?? pts[i + 1].x, bz = pts[i + 1][1] ?? pts[i + 1].z;
      if (Math.abs(ax - p.x) > bd + hyp(bx - ax, bz - az) && Math.abs(bx - p.x) > bd + hyp(bx - ax, bz - az)) continue;   // cheap reject
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / l2)) : 0;
      const qx = ax + dx * t, qz = az + dz * t, d = hyp(p.x - qx, p.z - qz);
      if (d < bd) { bd = d; best = { x: qx, z: qz, d, road: r.name }; }
    }
  }
  return best;
}

/** Follow one mapped paved road between two course waypoints, including its bends. */
export function pavedLeg(a, b, roads, maxD = 4000) {
  const project = (p, pts) => {
    let best = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / (dx * dx + dz * dz || 1)));
      const x = ax + dx * t, z = az + dz * t, d = hyp(x - p.x, z - p.z);
      if (!best || d < best.d) best = { x, z, d, i };
    }
    return best;
  };
  let chosen = null;
  for (const road of roads) {
    if (road.pts.length < 2) continue;
    const start = project(a, road.pts), end = project(b, road.pts);
    if (start.d > maxD || end.d > maxD) continue;
    const score = start.d + end.d;
    if (!chosen || score < chosen.score) chosen = { road, start, end, score };
  }
  if (!chosen) return null;
  const { road, start, end } = chosen, path = [[start.x, start.z]];
  if (start.i < end.i) for (let i = start.i + 1; i <= end.i; i++) path.push(road.pts[i]);
  else if (start.i > end.i) for (let i = start.i; i > end.i; i--) path.push(road.pts[i]);
  path.push([end.x, end.z]);
  return path;
}

/** a tiny binary min-heap on item.f */
class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}
function simplify(pts, tol) {   // Douglas-Peucker
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop(); let md = 0, mi = -1;
    const [ax, az] = pts[s], [bx, bz] = pts[e], dx = bx - ax, dz = bz - az, l = hyp(dx, dz) || 1;
    for (let i = s + 1; i < e; i++) { const d = Math.abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / l; if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; stack.push([s, mi], [mi, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/**
 * Lay a dirt track from a to b over real ground: A* on a coarse grid that avoids water and steep slopes and prefers easy ones, then simplified.
 * ground: { heightAt(x, z), waterAt(x, z) -> null | level, bounds: { x0, x1, z0, z1 } }. Returns [[x, z], ...] (a first, b last) or null when there is no way through.
 */
export function routeLeg(ground, a, b, { cell = 200, maxSlope = 0.16, maxRough = 9, margin = 0.4 } = {}) {   // maxRough: how steep the ground may be SIDEWAYS of the track (a wash floor is flat along it but walled in)
  const { heightAt, waterAt, bounds } = ground;
  const len = hyp(b.x - a.x, b.z - a.z), m = Math.max(2500, len * margin);
  const x0 = Math.max(bounds.x0 + 100, Math.min(a.x, b.x) - m), x1 = Math.min(bounds.x1 - 100, Math.max(a.x, b.x) + m);
  const z0 = Math.max(bounds.z0 + 100, Math.min(a.z, b.z) - m), z1 = Math.min(bounds.z1 - 100, Math.max(a.z, b.z) + m);
  const nx = Math.max(2, Math.ceil((x1 - x0) / cell)), nz = Math.max(2, Math.ceil((z1 - z0) / cell));
  const px = i => x0 + i * cell, pz = j => z0 + j * cell, id = (i, j) => j * nx + i;
  const hCache = new Float32Array(nx * nz).fill(NaN), wet = new Int8Array(nx * nz).fill(-1);
  const H = (i, j) => { const k = id(i, j); let h = hCache[k]; if (h !== h) hCache[k] = h = heightAt(px(i), pz(j)); return h; };
  const rough = (i, j) => { const h = H(i, j); let m = 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = Math.max(0, Math.min(nx - 1, i + di)), nj = Math.max(0, Math.min(nz - 1, j + dj)); m = Math.max(m, Math.abs(H(ni, nj) - h) / cell); } return m; };
  const blocked = (i, j) => { const k = id(i, j); if (wet[k] < 0) wet[k] = (waterAt(px(i), pz(j)) != null || rough(i, j) > maxRough) ? 1 : 0; return wet[k] === 1; };
  const cellOf = p => [Math.max(0, Math.min(nx - 1, Math.round((p.x - x0) / cell))), Math.max(0, Math.min(nz - 1, Math.round((p.z - z0) / cell)))];
  const nearestOpen = ([ci, cj]) => { if (!blocked(ci, cj)) return [ci, cj]; for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < nx && j < nz && !blocked(i, j)) return [i, j]; } return null; };
  const s = nearestOpen(cellOf(a)), t = nearestOpen(cellOf(b)); if (!s || !t) return null;
  const g = new Float32Array(nx * nz).fill(Infinity), from = new Int32Array(nx * nz).fill(-1), closed = new Uint8Array(nx * nz), open = new Heap();
  const goalK = id(t[0], t[1]), hh = (i, j) => hyp(i - t[0], j - t[1]) * cell;
  g[id(s[0], s[1])] = 0; open.push({ i: s[0], j: s[1], f: hh(s[0], s[1]) });
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let steps = 0;
  while (open.size && steps++ < 400000) {
    const { i, j } = open.pop(), k = id(i, j); if (closed[k]) continue; closed[k] = 1; if (k === goalK) break;
    for (const [di, dj] of N8) {
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
      const nk = id(ni, nj); if (closed[nk] || blocked(ni, nj)) continue;
      const d = hyp(di, dj) * cell, slope = Math.abs(H(ni, nj) - H(i, j)) / d; if (slope > maxSlope) continue;
      const c = g[k] + d * (1 + 6 * slope * slope / (maxSlope * maxSlope) * 0.5);   // gentle ground is cheap, steep ground costs up to ~4x
      if (c < g[nk]) { g[nk] = c; from[nk] = k; open.push({ i: ni, j: nj, f: c + hh(ni, nj) }); }
    }
  }
  if (from[goalK] < 0 && goalK !== id(s[0], s[1])) return null;
  const path = []; for (let k = goalK; k >= 0; k = from[k]) path.push([px(k % nx), pz((k / nx) | 0)]);
  if (path.length === 1) return [[a.x, a.z], [b.x, b.z]];   // both ends in one grid cell
  path.reverse(); path[0] = [a.x, a.z]; path[path.length - 1] = [b.x, b.z];
  return simplify(path, cell * 0.45);
}

/** gentle ground first: the flattest route that is not absurdly long, then steeper ones, so a track follows valleys and flats and only climbs when it has to */
export function routeEasy(ground, a, b, opts = {}) {
  const straight = hyp(b.x - a.x, b.z - a.z) || 1; let fallback = null;
  for (const [maxSlope, maxRough] of [[0.06, 0.1], [0.09, 0.16], [0.13, 0.26], [0.18, 9]]) {
    const r = routeLeg(ground, a, b, { ...opts, maxSlope, maxRough }); if (!r) continue;
    const len = r.reduce((s, p, i) => (i ? s + hyp(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0), 0);
    if (len <= straight * 1.7) return r;
    fallback ||= r;
  }
  return fallback;
}
/**
 * Project every course onto the game map and route its dirt legs.
 * env: { meta (border.json), ground: { heightAt, waterAt, bounds }, roads: [{ name, kind, pts }] the real highways (dirt ends snap onto them) }
 * Returns { courses: [{ ...course, pts: [{ x, z, mode }], line: [[x, z]] (the whole route), start: { x, z, h }, finish: { x, z }, dirtLength, pavedLength }], dirtRoads: [{ name, kind: 'dirt', pts }] }
 */
export function buildRaceCourses(env, courses = RACE_COURSES) {
  const { meta, ground, roads = [] } = env, paved = roads.filter(r => r.kind === 'major' || r.kind === 'secondary');
  const out = [], dirtRoads = [];
  for (const c of courses) {
    const list = c.kind === 'loop' && c.series === 'MDR' ? [...c.pts, [c.pts[0][0], c.pts[0][1], 'D']] : c.pts;   // an MDR loop closes itself
    const raw = list.map(([lat, lon, mode]) => ({ ...projectPlace(lat, lon, meta), mode: mode || null })), sp = c.spread || 1, o0 = raw[0];
    const wp = raw.map(q => ({ ...q, x: o0.x + (q.x - o0.x) * sp, z: o0.z + (q.z - o0.z) * sp }));
    const line = [[wp[0].x, wp[0].z]], firstDirt = dirtRoads.length; let dirt = 0, pavedLen = 0, complete = true;
    for (let k = 0; k < wp.length - 1; k++) {
      const a = wp[k], q = wp[k + 1], leg = q.mode;
      if (leg === 'D') {
        const sa = (list[k][2] === 'P' || (k === 0 && c.series === 'SCORE')) ? nearestOnRoads(a, paved, 4000) : null, sb = nearestOnRoads(q, paved, 4000);   // a dirt leg that starts or ends at a paved stretch joins the real road
        const from = sa ? { x: sa.x, z: sa.z } : a, to = (c.series === 'SCORE' && (list[k + 2]?.[2] === 'P' || k + 1 === list.length - 1)) && sb ? { x: sb.x, z: sb.z } : q;
        const route = routeEasy(ground, from, to);
        if (!route || route.length < 2) { complete = false; break; }
        dirtRoads.push({ name: `${c.name} (dirt)`, kind: 'dirt', course: c.id, pts: route });
        if (k === 0) line[0] = route[0];
        else if (hyp(line.at(-1)[0] - route[0][0], line.at(-1)[1] - route[0][1]) > 1) line.push(route[0]);
        line.push(...route.slice(1));
        dirt += route.reduce((s, p, i) => (i ? s + hyp(p[0] - route[i - 1][0], p[1] - route[i - 1][1]) : 0), 0);
        continue;
      }
      const route = paved.length ? pavedLeg(a, q, paved) : [[a.x, a.z], [q.x, q.z]];
      if (!route) { complete = false; break; }
      if (k === 0) line[0] = route[0];
      else if (hyp(line.at(-1)[0] - route[0][0], line.at(-1)[1] - route[0][1]) > 1) line.push(route[0]);
      line.push(...route.slice(1));
      pavedLen += route.reduce((s, p, i) => (i ? s + hyp(p[0] - route[i - 1][0], p[1] - route[i - 1][1]) : 0), 0);
    }
    if (!complete) { dirtRoads.length = firstDirt; continue; }
    const [s0, s1] = [line[0], line[Math.min(3, line.length - 1)]];
    out.push({ ...c, pts: wp, line, start: { x: s0[0], z: s0[1], h: Math.atan2(s1[0] - s0[0], s1[1] - s0[1]) }, finish: { x: line.at(-1)[0], z: line.at(-1)[1] }, dirtLength: dirt, pavedLength: pavedLen });
  }
  return { courses: out, dirtRoads };
}

/** points every `spacing` metres along a polyline [[x, z], ...] with the direction of travel there: [{ x, z, h }] (h: heading, forward = (sin h, cos h)). Never includes the very start. */
export function pointsAlong(line, spacing) {
  const out = []; let since = 0;   // since: distance travelled since the last point
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], l = hyp(bx - ax, bz - az); if (!l) continue;
    const h = Math.atan2(bx - ax, bz - az); let pos = 0;
    while (since + (l - pos) >= spacing - 1e-9) { pos += spacing - since; since = 0; const t = pos / l; out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, h }); }
    since += l - pos;
  }
  return out;
}

/** a race mile in game metres, and the markers along a route: one at every mile with its number and how many miles are left, facing the driver coming along it.
 * line: [[x, z], ...] the whole route; returns [{ x, z, h, mile, left }] (h: the direction of travel, forward = (sin h, cos h)). The route's very start and end have their own signs. */
export const RACE_MILE = 1609;
export function mileMarkers(line, mile = RACE_MILE) {
  let total = 0; for (let i = 1; i < line.length; i++) total += hyp(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  const pts = pointsAlong(line, mile), n = Math.round(total / mile * 10) / 10;
  return pts.filter(p => (pts.indexOf(p) + 1) * mile < total - mile * 0.25).map((p, i) => ({ ...p, mile: i + 1, left: Math.max(1, Math.round(total / mile - (i + 1))) }));
}
