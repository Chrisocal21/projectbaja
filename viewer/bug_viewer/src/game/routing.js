// Road routing for the map's waypoint line (PURE, loads under node). The roads are polylines; this joins them into a graph (points along each
// road, plus joins where two roads pass close together) and finds the shortest way along it. No road close to the start or the end = no route.
const hyp = Math.hypot;
/** roads: [[{x,z},...], ...]. -> graph { nodes: [{x,z}], adj: [[[neighbour, metres], ...]] } */
export function buildGraph(roads, { maxNodes = 40000, join = 45 } = {}) {
  const total = roads.reduce((n, r) => n + r.length, 0), stride = Math.max(1, Math.ceil(total / maxNodes));
  const nodes = [], adj = [], cell = new Map(), key = (x, z) => Math.floor(x / join) + ',' + Math.floor(z / join);
  const link = (a, b) => { const d = hyp(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z); adj[a].push([b, d]); adj[b].push([a, d]); };
  roads.forEach((pts, ri) => {
    let prev = -1;
    for (let i = 0; i < pts.length; i += stride) {
      const p = i + stride >= pts.length ? pts[pts.length - 1] : pts[i], id = nodes.length;
      nodes.push({ x: p.x, z: p.z, ri }); adj.push([]);
      if (prev >= 0) link(prev, id);
      prev = id;
      const k = key(p.x, p.z), cx = Math.floor(p.x / join), cz = Math.floor(p.z / join);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const o of cell.get((cx + dx) + ',' + (cz + dz)) || []) if (nodes[o].ri !== ri && hyp(nodes[o].x - p.x, nodes[o].z - p.z) <= join) link(o, id);
      (cell.get(k) || cell.set(k, []).get(k)).push(id);
      if (i + stride >= pts.length) break;
    }
  });
  return { nodes, adj };
}
export function nearestNode(g, x, z, maxD = 600) {
  let best = -1, bd = maxD; for (let i = 0; i < g.nodes.length; i++) { const n = g.nodes[i]; if (Math.abs(n.x - x) > bd || Math.abs(n.z - z) > bd) continue; const d = hyp(n.x - x, n.z - z); if (d < bd) { bd = d; best = i; } }
  return best;
}
/** the way along the roads from (x0,z0) to (x1,z1): [{x,z}, ...] starting and ending on the roads, or null when no road is close or they are not connected */
export function findRoute(g, x0, z0, x1, z1, maxD = 600) {
  const a = nearestNode(g, x0, z0, maxD), b = nearestNode(g, x1, z1, maxD); if (a < 0 || b < 0) return null;
  const dist = new Map([[a, 0]]), from = new Map(), open = heap(), done = new Set(); open.push(hyp(g.nodes[a].x - g.nodes[b].x, g.nodes[a].z - g.nodes[b].z), a);
  while (open.size()) {
    const u = open.pop(); if (done.has(u)) continue; done.add(u);
    if (u === b) { const out = []; for (let c = b; c !== undefined; c = from.get(c)) out.push({ x: g.nodes[c].x, z: g.nodes[c].z }); return out.reverse(); }
    for (const [v, w] of g.adj[u]) { const nd = dist.get(u) + w; if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); from.set(v, u); open.push(nd + hyp(g.nodes[v].x - g.nodes[b].x, g.nodes[v].z - g.nodes[b].z), v); } }
  }
  return null;
}
/** a small binary min-heap of [priority, value] */
function heap() {
  const a = [];
  return { size: () => a.length,
    push(p, v) { a.push([p, v]); let i = a.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (a[q][0] <= a[i][0]) break; [a[q], a[i]] = [a[i], a[q]]; i = q; } },
    pop() { const top = a[0][1], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } };
}
export const routeLength = pts => pts.reduce((n, p, i) => (i ? n + hyp(p.x - pts[i - 1].x, p.z - pts[i - 1].z) : 0), 0);
/** how far (metres) the point is from the nearest part of the route */
export function offRoute(pts, x, z) { let best = Infinity; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2)) : 0; best = Math.min(best, hyp(x - a.x - t * dx, z - a.z - t * dz)); } return best; }
/** metres still to go along the route from where you are: the rest of the line after your nearest point on it */
export function remaining(pts, x, z) {
  let bi = 0, bd = Infinity, bt = 0;
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2)) : 0, d = hyp(x - a.x - t * dx, z - a.z - t * dz); if (d < bd) { bd = d; bi = i; bt = t; } }
  const a = pts[bi], b = pts[bi + 1] || a; let len = (1 - bt) * hyp(b.x - a.x, b.z - a.z); for (let i = bi + 1; i < pts.length - 1; i++) len += hyp(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
  return len + bd;
}
