// Follow distance along a mapped road, including around bends between its vertices.
export function roadStations(pts) {
  const distance = [0];
  for (let i = 1; i < pts.length; i++) distance.push(distance[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const length = distance.at(-1);
  function at(s) {
    s = Math.min(length, Math.max(0, s));
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (distance[mid] <= s) lo = mid;
      else hi = mid;
    }
    const span = distance[hi] - distance[lo] || 1;
    const tx = (pts[hi][0] - pts[lo][0]) / span, tz = (pts[hi][1] - pts[lo][1]) / span;
    return { x: pts[lo][0] + tx * (s - distance[lo]), z: pts[lo][1] + tz * (s - distance[lo]), tx, tz };
  }
  return { at, distance, length };
}

// Long turnouts leave the highway at a shallow angle, traverse a wash, then
// rejoin downstream. Each valley has a lower route and an alternate shelf trail.
export function regionalDirtRoads(roads, border, avoid = []) {
  const out = [], bounds = border.bounds;
  const clear = (x, z, pad = 0) => x > bounds.x0 + pad && x < bounds.x1 - pad && z > bounds.z0 + pad && z < bounds.z1 - pad
    && border.waterAt(x, z) == null && !avoid.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 90 + pad);
  function passable(pts) {
    let prev = null;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], dx = pts[i][0] - ax, dz = pts[i][1] - az;
      const len = Math.hypot(dx, dz), steps = Math.max(1, Math.ceil(len / 30));
      for (let j = i === 1 ? 0 : 1; j <= steps; j++) {
        const x = ax + dx * j / steps, z = az + dz * j / steps, h = border.heightAt(x, z);
        if (!clear(x, z) || (prev !== null && Math.abs(h - prev) > len / steps * 0.15)) return false;
        prev = h;
      }
    }
    return true;
  }
  roads.forEach((road, ri) => {
    if (!['major', 'secondary'].includes(road.kind) || road.pts.length < 2) return;
    const line = roadStations(road.pts);
    for (let s = Math.min(200, line.length * 0.12), n = 0; line.length - s >= 600; s += 2400, n++) {
      const span = Math.min(1350 + (ri * 89 + n * 53) % 550, line.length - s);
      const a = line.at(s), b = line.at(s + span), chord = Math.hypot(b.x - a.x, b.z - a.z);
      if (chord < span * 0.9) continue;
      const tx = (b.x - a.x) / chord, tz = (b.z - a.z) / chord;
      for (const sign of [1, -1]) {
        const side = sign * ((ri + n) % 2 ? -1 : 1), nx = -tz * side, nz = tx * side;
        const reach = Math.min(410 + (ri * 71 + n * 37) % 190, chord * 0.35);
        const pts = [], shelf = [];
        for (let j = 0; j <= 20; j++) {
          const f = j / 20, fan = Math.sin(Math.PI * f) ** 2;
          const d = reach * fan * (1 + 0.13 * Math.sin(4 * Math.PI * f + ri));
          const x = a.x + tx * chord * f + nx * d, z = a.z + tz * chord * f + nz * d;
          pts.push([x, z]);
          if (j >= 5 && j <= 15) {
            const lift = reach * 0.45 * Math.sin(Math.PI * (j - 5) / 10) ** 2;
            shelf.push([x + nx * lift, z + nz * lift]);
          }
        }
        if (!passable(pts)) continue;
        const wash = { name: 'Desert wash trail', kind: 'dirt', pts, pavedEnds: [0, 1], parentRoad: ri };
        out.push(wash);
        if (passable(shelf)) out.push({ name: 'Badlands shelf trail', kind: 'dirt', pts: shelf, joins: wash });
        break;
      }
    }
  });
  return out;
}
