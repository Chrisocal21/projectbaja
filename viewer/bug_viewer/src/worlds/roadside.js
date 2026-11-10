// Roadside places on the real highways (docs/WORLD_MAP.md step 5c, PROPOSAL). Pure JS: testable in node.
//   rest areas: on freeways and major roads, every few km on a straight, level stretch away from junctions
//   gas stations: beside the side road at freeway interchanges (and some road junctions)
// Generic names only (no invented towns or people). Returns sites: { type: 'rest' | 'gas', x, z, ry } where
// the place faces the road: local +z (sin ry, cos ry) points at the road.
import { isFreeway } from './junctions.js';

const hyp = Math.hypot;
const right = d => [-d[1], d[0]];
const REST_GAP = 6000, REST_OFF = 42, REST_NO_JUNCTION = 700, GAS_OFF = 32, SPACING = 400;

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
export function buildRoadside(roads, junction, { ground, bounds } = {}) {
  const sites = [];
  const busy = [];   // anywhere a junction is: no rest area there
  for (const f of junction.furniture) busy.push([f.x, f.z]);
  for (const r of junction.ramps) for (const p of r.pts) busy.push(p);
  const nearBusy = (x, z, d) => busy.some(p => Math.abs(p[0] - x) < d && Math.abs(p[1] - z) < d && hyp(p[0] - x, p[1] - z) < d);
  const inBounds = (x, z) => !bounds || (x > bounds.x0 + 400 && x < bounds.x1 - 400 && z > bounds.z0 + 400 && z < bounds.z1 - 400);
  const clearOf = (x, z) => !sites.some(s => hyp(s.x - x, s.z - z) < SPACING);

  // ---- gas stations at interchanges: next to the side road, past the stop sign
  const stops = junction.furniture.filter(f => f.type === 'stop' && f.needs);
  for (const f of stops) {
    const u = [-Math.sin(f.ry), -Math.cos(f.ry)], r = right(u);   // u: from the junction out along the side road
    for (const side of [1, -1]) {
      const x = f.x + u[0] * 50 + r[0] * GAS_OFF * side, z = f.z + u[1] * 50 + r[1] * GAS_OFF * side;
      if (hash(Math.round(f.x), Math.round(f.z)) > 0.55) continue;   // not every interchange has one
      if (!inBounds(x, z) || !clearOf(x, z) || !slopeOk(ground, x, z, 16, 2.5)) continue;
      sites.push({ type: 'gas', x, z, ry: Math.atan2(-r[0] * side, -r[1] * side) });   // faces the side road
      break;
    }
  }

  // ---- rest areas along freeways and major roads
  for (const road of roads) {
    if (!(isFreeway(road) || road.kind === 'major')) continue;
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
