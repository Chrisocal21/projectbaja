/** Find the actual built road surface nearest a race waypoint. */
export function nearestRaceRoad(p, roads, reach = 400) {
  let best = null;
  for (const road of roads) for (let i = 0; i < road.pts.length - 1; i++) {
    const a = road.pts[i], b = road.pts[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const x = a.x + dx * t, z = a.z + dz * t, d = Math.hypot(x - p.x, z - p.z);
    if (d < reach && (!best || d < best.d)) best = { x, z, h: Math.atan2(dx, dz), half: road.style.half, road: road.name, route: road, s: a.s + (b.s - a.s) * t, d };
  }
  return best;
}

/** Place posts beyond every road surface, trying the opposite shoulder if needed. */
export function raceShoulder(p, network, waterAt, heightAt, side = 1, clearance = 2) {
  for (const s of [side, -side]) for (const offset of [p.half + 5, p.half + 9, p.half + 14]) {
    const x = p.x + Math.cos(p.h) * offset * s, z = p.z - Math.sin(p.h) * offset * s;
    if (!network.isNear(x, z, clearance) && waterAt(x, z) == null) return { x, z, h: p.h, y: heightAt(x, z) };
  }
  return null;
}

/** A measured point before a town along the same built road. */
export function approachRoadPoint(roadHit, distance = 240) {
  const pts = roadHit.route?.pts;
  if (!pts || !Number.isFinite(roadHit.s) || roadHit.s < distance) return null;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (pts[mid].s <= roadHit.s - distance) lo = mid;
    else hi = mid - 1;
  }
  const p = pts[lo];
  return { x: p.x, z: p.z, h: Math.atan2(p.tx, p.tz), half: roadHit.half };
}
