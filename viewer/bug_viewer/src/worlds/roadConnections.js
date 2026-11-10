// Shared at-grade pavement for road crossings and joined endpoints.
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const cross = (a, b) => a.x * b.z - a.z * b.x;
function intersection(a, b, c, d) {
  const u = { x: b.x - a.x, z: b.z - a.z }, v = { x: d.x - c.x, z: d.z - c.z }, den = cross(u, v);
  if (Math.abs(den) < 1e-5) return null;
  const w = { x: c.x - a.x, z: c.z - a.z }, t = cross(w, v) / den, s = cross(w, u) / den;
  return t >= 0 && t <= 1 && s >= 0 && s <= 1 ? { x: a.x + t * u.x, z: a.z + t * u.z } : null;
}
function crossings(roads) {
  const cells = new Map(), seen = new Set(), out = [], size = 80;
  roads.forEach((r, ri) => {
    if (r.kind === 'ramp') return;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      for (let x = Math.floor(Math.min(a.x, b.x) / size); x <= Math.floor(Math.max(a.x, b.x) / size); x++)
        for (let z = Math.floor(Math.min(a.z, b.z) / size); z <= Math.floor(Math.max(a.z, b.z) / size); z++) {
          const key = `${x}:${z}`, bucket = cells.get(key) || [];
          for (const q of bucket) {
            if (q.ri === ri) continue;
            const pair = `${q.ri}:${q.i}:${ri}:${i}`;
            if (seen.has(pair)) continue;
            seen.add(pair);
            const p = intersection(q.r.pts[q.i], q.r.pts[q.i + 1], a, b);
            if (p) out.push(p);
          }
          bucket.push({ r, ri, i }); cells.set(key, bucket);
        }
    }
  });
  return out;
}
function nearest(road, p) {
  let d = Infinity, index = 0;
  for (let i = 0; i < road.pts.length; i++) { const n = distance(road.pts[i], p); if (n < d) { d = n; index = i; } }
  return { road, d, index };
}
function pavementOutline(center, legs) {
  const radius = Math.max(...legs.map(l => l.half)) + 0.35;
  const angles = Array.from({ length: 128 }, (_, i) => i * Math.PI * 2 / 128);
  const arms = legs.map(leg => {
    const n = leg.normal, w = leg.half, p = leg.p;
    const capL = { x: p.x - n.x * w, z: p.z - n.z * w }, capR = { x: p.x + n.x * w, z: p.z + n.z * w };
    for (const q of [capL, capR]) angles.push((Math.atan2(q.z - center.z, q.x - center.x) + Math.PI * 2) % (Math.PI * 2));
    return [
      { x: center.x - n.x * w, z: center.z - n.z * w }, capL, capR,
      { x: center.x + n.x * w, z: center.z + n.z * w },
    ];
  });
  angles.sort((a, b) => a - b);
  return angles.filter((a, i) => i === 0 || a - angles[i - 1] > 1e-5).map(angle => {
    const dir = { x: Math.cos(angle), z: Math.sin(angle) };
    let reach = radius;
    for (const arm of arms) for (let i = 0; i < 4; i++) {
      const a = arm[i], b = arm[(i + 1) % 4], edge = { x: b.x - a.x, z: b.z - a.z }, v = { x: a.x - center.x, z: a.z - center.z };
      const den = cross(dir, edge);
      if (Math.abs(den) < 1e-8) continue;
      const r = cross(v, edge) / den, t = cross(v, dir) / den;
      if (r > reach && t >= -1e-6 && t <= 1 + 1e-6) reach = r;
    }
    return { x: center.x + dir.x * reach, z: center.z + dir.z * reach };
  });
}
export function buildRoadConnections(roads, hints = [], setback = 1.5) {
  const hidden = new Map(), junctions = [], centers = [];
  // Graded paths are the geometry the player sees. Their exact crossings take
  // priority over junction hints derived from the unsmoothed source lines.
  for (const hint of [...crossings(roads), ...hints]) {
    if (centers.some(p => distance(p, hint) < 24)) continue;
    const incident = roads.filter(r => r.kind !== 'ramp' && r.pts.length >= 4).map(r => nearest(r, hint)).filter(v => v.d < 14);
    if (incident.length < 2) continue;
    const legs = [];
    for (const { road, index } of incident) for (const dir of [-1, 1]) {
      if (index + dir < 0 || index + dir >= road.pts.length) continue;
      let k = index;
      while (k + dir >= 0 && k + dir < road.pts.length && distance(road.pts[k], hint) < setback + road.style.half) k += dir;
      const p = road.pts[k], q = road.pts[Math.max(0, Math.min(road.pts.length - 1, k + dir * 2))];
      let dx = q.x - p.x, dz = q.z - p.z;
      if (Math.hypot(dx, dz) < 0.01) { dx = p.x - hint.x; dz = p.z - hint.z; }
      const len = Math.hypot(dx, dz) || 1;
      const outward = { x: dx / len, z: dz / len }, normal = { x: -outward.z, z: outward.x }, half = road.style.half + 0.8;
      legs.push({ road, index: k, dir, p, outward, normal, half, angle: Math.atan2(outward.z, outward.x) });
    }
    if (legs.length < 3) continue;
    legs.sort((a, b) => a.angle - b.angle);
    let main = null, branch = null;
    if (legs.length === 3) {
      let best = -0.85;
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
        const a = legs[i], b = legs[j], alignment = a.outward.x * b.outward.x + a.outward.z * b.outward.z;
        if (alignment < best && Math.abs(a.half - b.half) < 2) { best = alignment; main = [a, b]; branch = legs[3 - i - j]; }
      }
    }
    const tee = !!main && Math.abs(branch.outward.x * main[0].outward.x + branch.outward.z * main[0].outward.z) < 0.7;
    const mainRoads = tee ? main.map(l => l.road) : [];
    for (const { road } of incident) {
      if (tee && mainRoads.includes(road)) continue;
      const left = legs.find(p => p.road === road && p.dir === -1)?.index, right = legs.find(p => p.road === road && p.dir === 1)?.index;
      const lo = left == null ? 0 : left + 1, hi = right == null ? road.pts.length - 1 : right - 1;
      if (lo <= hi) { const ranges = hidden.get(road) || []; ranges.push([lo, hi]); hidden.set(road, ranges); }
    }
    centers.push(hint); junctions.push({ center: hint, kind: tee ? 'tee' : 'crossing', polygon: tee ? null : pavementOutline(hint, legs), legs, mainRoads });
  }
  return { hidden, junctions };
}
