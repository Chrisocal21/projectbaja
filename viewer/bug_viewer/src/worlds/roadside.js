// Roadside places on the real highways (docs/WORLD_MAP.md step 5c, PROPOSAL). Pure JS: testable in node.
//   rest areas: on freeways and major roads, every few km on a straight, level stretch away from junctions
//   gas stations: beside the side road at freeway interchanges (and some road junctions)
// Generic names only (no invented towns or people). Returns sites: { type: 'rest' | 'gas', x, z, ry } where
// the place faces the road: local +z (sin ry, cos ry) points at the road.
import { isFreeway } from './junctions.js';

const hyp = Math.hypot;
const right = d => [-d[1], d[0]];
const REST_GAP = 8500, REST_OFF = 42, REST_NO_JUNCTION = 500, GAS_OFF = 32, SPACING = 400, GAS_APART = 4500, GAS_ROAD_GAP = 11000, TOWN_REACH = 1800, TOWN_GAS_APART = 1500, TOWN_REST_ALONG = 700;

/** a small stable hash (0..1) so placement does not change between loads */
const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

function slopeOk(ground, x, z, r, max) {
  if (!ground) return true;
  const h0 = ground(x, z);
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (Math.abs(ground(x + dx, z + dz) - h0) > max) return false;
  return true;
}

/**
 * roads: [{ name, kind, pts: [[x, z], ...] }]; junction: { furniture, ramps } from buildJunctions
 * opts: { ground(x, z) -> height or undefined, bounds: { x0, x1, z0, z1 } }
 */
export function buildRoadside(roads, junction, { ground, bounds, places = [] } = {}) {
  const sites = [];
  const busy = [];   // anywhere a junction is: no rest area there
  for (const f of junction.furniture) busy.push([f.x, f.z]);
  for (const r of junction.ramps) for (const p of r.pts) busy.push(p);
  const nearBusy = (x, z, d) => busy.some(p => Math.abs(p[0] - x) < d && Math.abs(p[1] - z) < d && hyp(p[0] - x, p[1] - z) < d);
  const inBounds = (x, z) => !bounds || (x > bounds.x0 + 400 && x < bounds.x1 - 400 && z > bounds.z0 + 400 && z < bounds.z1 - 400);
  const clearOf = (x, z) => !sites.some(s => hyp(s.x - x, s.z - z) < SPACING);
  const gasClear = (x, z) => !sites.some(s => s.type === 'gas' && hyp(s.x - x, s.z - z) < GAS_APART);

  // ---- towns: a gas station on the nearest main road beside each town that has one, and for the lonely places a rest stop a little way along it.
  // These go in first, so the open-road stations (spaced GAS_APART from every gas station) thin out near a town instead of doubling up.
  for (const p of places) {
    if (!p.gas && !p.rest) continue;
    let best = null;
    for (const road of roads) {
      if (!(isFreeway(road) || road.kind === 'major' || road.kind === 'secondary')) continue;
      for (let i = 0; i < road.pts.length - 1; i++) {
        const a = road.pts[i], b = road.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / l2)), q = [a[0] + dx * t, a[1] + dz * t], d = hyp(q[0] - p.x, q[1] - p.z);
        if (d < TOWN_REACH && (!best || d < best.d)) { const l = Math.sqrt(l2); best = { d, q, u: [dx / l, dz / l] }; }
      }
    }
    if (!best) continue;
    const r = right(best.u), side = ((p.x - best.q[0]) * r[0] + (p.z - best.q[1]) * r[1]) >= 0 ? 1 : -1;   // the side the town is on
    const tryAt = (along, off, type, slope) => {
      for (const s of [side, -side]) {
        const x = best.q[0] + best.u[0] * along + r[0] * off * s, z = best.q[1] + best.u[1] * along + r[1] * off * s;
        if (!inBounds(x, z) || !clearOf(x, z) || (type === 'gas' && sites.some(q => q.type === 'gas' && hyp(q.x - x, q.z - z) < TOWN_GAS_APART)) || !slopeOk(ground, x, z, slope[0], slope[1])) continue;
        sites.push({ type, x, z, ry: Math.atan2(-r[0] * s, -r[1] * s) }); return true;
      }
      return false;
    };
    if (p.gas) for (const along of [0, -120, 120, -260, 260]) if (tryAt(along, GAS_OFF + 4, 'gas', [16, 2.5])) break;
    if (p.rest) for (const along of [TOWN_REST_ALONG, -TOWN_REST_ALONG, TOWN_REST_ALONG * 1.6, -TOWN_REST_ALONG * 1.6]) if (tryAt(along, REST_OFF, 'rest', [18, 2.2])) break;
  }

  // ---- gas stations at interchanges: next to the side road, past the stop sign
  const stops = junction.furniture.filter(f => f.type === 'stop');   // any junction where a side road meets a through road
  for (const f of stops) {
    const u = [-Math.sin(f.ry), -Math.cos(f.ry)], r = right(u);   // u: from the junction out along the side road
    for (const side of [1, -1]) {
      const x = f.x + u[0] * 50 + r[0] * GAS_OFF * side, z = f.z + u[1] * 50 + r[1] * GAS_OFF * side;
      if (hash(Math.round(f.x), Math.round(f.z)) > 0.6) continue;   // not every junction has one
      if (!inBounds(x, z) || !clearOf(x, z) || !gasClear(x, z) || !slopeOk(ground, x, z, 16, 2.5)) continue;
      sites.push({ type: 'gas', x, z, ry: Math.atan2(-r[0] * side, -r[1] * side) });   // faces the side road
      break;
    }
  }

  // ---- gas stations along the open road: one every ~11 km on a straight stretch of any highway, so a long drive always has fuel ahead
  for (const road of roads) {
    if (!(isFreeway(road) || road.kind === 'major' || road.kind === 'secondary')) continue;
    const pts = road.pts; let acc = 0, next = GAS_ROAD_GAP * (0.2 + hash(pts[0][1], pts[0][0]) * 0.6), side = hash(pts[0][0], pts[0][1]) < 0.5 ? 1 : -1;
    for (let i = 0; i < pts.length - 2; i++) {
      const a = pts[i], b = pts[i + 1], c = pts[i + 2], l = hyp(b[0] - a[0], b[1] - a[1]); acc += l;
      if (acc < next) continue;
      const dl = hyp(c[0] - a[0], c[1] - a[1]) || 1, d = [(c[0] - a[0]) / dl, (c[1] - a[1]) / dl], d1 = [(b[0] - a[0]) / (l || 1), (b[1] - a[1]) / (l || 1)];
      if (d[0] * d1[0] + d[1] * d1[1] < 0.97) continue;
      const r = right(d), x = b[0] + r[0] * (GAS_OFF + 4) * side, z = b[1] + r[1] * (GAS_OFF + 4) * side;
      if (!inBounds(x, z) || nearBusy(x, z, 160) || !clearOf(x, z) || !gasClear(x, z) || !slopeOk(ground, x, z, 16, 2.5)) continue;
      sites.push({ type: 'gas', x, z, ry: Math.atan2(-r[0] * side, -r[1] * side) });
      acc = 0; next = GAS_ROAD_GAP * (0.8 + hash(x, z) * 0.5); side = -side;
    }
  }

  // ---- rest areas along freeways and major roads
  for (const road of roads) {
    if (!(isFreeway(road) || road.kind === 'major' || road.kind === 'secondary')) continue;
    const pts = road.pts; let acc = 0, next = REST_GAP * (0.3 + hash(pts[0][0], pts[0][1]) * 0.7);
    for (let i = 0; i < pts.length - 2; i++) {
      const a = pts[i], b = pts[i + 1], c = pts[i + 2], l = hyp(b[0] - a[0], b[1] - a[1]); acc += l;
      if (acc < next) continue;
      const d = [(c[0] - a[0]) / (hyp(c[0] - a[0], c[1] - a[1]) || 1), (c[1] - a[1]) / (hyp(c[0] - a[0], c[1] - a[1]) || 1)];
      const d1 = [(b[0] - a[0]) / (l || 1), (b[1] - a[1]) / (l || 1)];
      if (d[0] * d1[0] + d[1] * d1[1] < 0.97) continue;   // wait for a straight stretch
      const r = right(d), x = b[0] + r[0] * REST_OFF, z = b[1] + r[1] * REST_OFF;
      if (!inBounds(x, z) || nearBusy(x, z, REST_NO_JUNCTION) || !clearOf(x, z) || !slopeOk(ground, x, z, 18, 2.2)) continue;
      sites.push({ type: 'rest', x, z, ry: Math.atan2(-r[0], -r[1]) });
      acc = 0; next = REST_GAP * (0.8 + hash(x, z) * 0.5);
    }
  }
  return { sites, rest: sites.filter(s => s.type === 'rest').length, gas: sites.filter(s => s.type === 'gas').length };
}
