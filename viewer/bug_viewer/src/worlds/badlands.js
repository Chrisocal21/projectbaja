// Local relief around dry driving corridors. Each footprint fades to level ground
// with zero slope. Overlapping banks share a wash floor down the middle.
export function makeBadlands(trails, roads, border, keep) {
  const cells = new Map(), size = 200;
  const key = (x, z) => Math.floor(z / size) * 100003 + Math.floor(x / size);
  const paved = roads.filter(r => r.kind !== 'dirt' && r.kind !== 'ramp');
  function clear(x, z, radius) {
    if (keep.some(p => Math.hypot(x - p.x, z - p.z) < radius + p.r + 70)) return false;
    for (const road of paved) for (let j = 1; j < road.pts.length; j++) {
      const [ax, az] = road.pts[j - 1], [bx, bz] = road.pts[j];
      const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(x - ax - t * dx, z - az - t * dz) < radius + 35) return false;
    }
    for (let dx = -radius; dx <= radius; dx += 32) for (let dz = -radius; dz <= radius; dz += 32) {
      const px = x + dx, pz = z + dz, b = border.bounds;
      if (px < b.x0 || px > b.x1 || pz < b.z0 || pz > b.z1 || border.waterAt(px, pz) != null) return false;
    }
    return true;
  }
  let count = 0;
  for (const trail of trails) {
    if (!trail.pavedEnds) continue;
    for (const i of [7, 10, 13]) {
      const [x, z] = trail.pts[i], a = trail.pts[i - 1], b = trail.pts[i + 1];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const phase = x * 0.071 + z * 0.031, radius = 160 + 24 * Math.cos(phase);
      if (!clear(x, z, radius)) continue;
      const p = { x, z, tx: (b[0] - a[0]) / length, tz: (b[1] - a[1]) / length, radius, phase,
        height: 22.8 + 7.5 * Math.sin(phase) };
      count++;
      for (let iz = Math.floor((z - radius) / size); iz <= Math.floor((z + radius) / size); iz++)
        for (let ix = Math.floor((x - radius) / size); ix <= Math.floor((x + radius) / size); ix++) {
          const k = iz * 100003 + ix;
          if (!cells.has(k)) cells.set(k, []);
          cells.get(k).push(p);
        }
    }
  }
  // Leave a broad saddle where an alternate trail skirts a ridge. A shelf
  // keeps some elevation but never inherits the full grade of the ridge face.
  const shelves = new Map(), width = 75;
  for (const trail of trails.filter(t => t.joins)) {
    for (let i = 1; i < trail.pts.length; i++) {
      const [ax, az] = trail.pts[i - 1], [bx, bz] = trail.pts[i];
      const dx = bx - ax, dz = bz - az, segment = { ax, az, dx, dz, len2: dx * dx + dz * dz || 1 };
      for (let iz = Math.floor((Math.min(az, bz) - width) / size); iz <= Math.floor((Math.max(az, bz) + width) / size); iz++)
        for (let ix = Math.floor((Math.min(ax, bx) - width) / size); ix <= Math.floor((Math.max(ax, bx) + width) / size); ix++) {
          const k = iz * 100003 + ix;
          if (!cells.has(k)) continue;
          if (!shelves.has(k)) shelves.set(k, []);
          shelves.get(k).push(segment);
        }
    }
  }
  function heightAt(x, z) {
    const nearby = cells.get(key(x, z));
    if (!nearby) return 0;
    let bank = 0, floor = 0;
    for (const p of nearby) {
      const dx = x - p.x, dz = z - p.z, r2 = (dx * dx + dz * dz) / (p.radius * p.radius);
      if (r2 >= 1) continue;
      const s = dx * p.tx + dz * p.tz, t = dz * p.tx - dx * p.tz;
      const channel = t - 8 * Math.sin(s / 43 + p.phase), d = Math.abs(channel);
      const side = channel < 0 ? -1 : 1;
      const offset = 55 + 17 * Math.sin(p.phase + side * 1.3);
      const breadth = 44 + 10 * Math.cos(p.phase * 2 + side);
      const bankHeight = 0.82 + 0.18 * Math.sin(p.phase * 0.7 + side * 1.6);
      const envelope = (1 - r2) ** 2;
      const ridge = (d - offset - 11 * Math.sin(s / 34 + side * p.phase)) / breadth;
      const flutes = 0.90 + 0.10 * Math.cos(s / 12 + d / 24 + p.phase);
      const foot = Math.min(1, Math.max(0, (d - 12) / 32));
      const toe = foot * foot * (3 - 2 * foot);
      bank = Math.max(bank, p.height * toe * bankHeight * Math.max(0, 1 - ridge * ridge) ** 2 * envelope * flutes * 1.42);
      floor = Math.max(floor, 2.3 * Math.max(0, 1 - (d / 32) ** 2) ** 2 * envelope);
    }
    if (bank > 0) {
      const segments = shelves.get(key(x, z));
      if (segments) {
        let d2 = width * width;
        for (const p of segments) {
          const u = Math.max(0, Math.min(1, ((x - p.ax) * p.dx + (z - p.az) * p.dz) / p.len2));
          d2 = Math.min(d2, (x - p.ax - u * p.dx) ** 2 + (z - p.az - u * p.dz) ** 2);
        }
        const f = Math.sqrt(d2) / width;
        bank *= 0.18 + 0.82 * f * f * (3 - 2 * f);
      }
    }
    return bank - floor;
  }
  return { heightAt, count };
}
