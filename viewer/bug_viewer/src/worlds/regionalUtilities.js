/** Sparse utility line along mapped road corridors, kept beyond the shoulder. */
export function regionalUtilityPoles(network, waterAt, { spacing = 190, limit = 420 } = {}) {
  const out = [];
  for (const road of network.roads) {
    if (!['Mex 1', 'Mex 5', 'I-8'].includes(road.name)) continue;
    let next = spacing, travelled = 0, previous = road.pts[0];
    for (let i = 1; i < road.pts.length && out.length < limit; i++) {
      const q = road.pts[i]; travelled += Math.hypot(q.x - previous.x, q.z - previous.z); previous = q;
      if (travelled < next) continue;
      next += spacing;
      const offset = road.style.half + 12, x = q.x + q.tz * offset, z = q.z - q.tx * offset;
      if (Math.hypot(x, z) < 3500 || waterAt(x, z) != null || network.isNear(x, z, 3)) continue;
      out.push({ x, z, h: Math.atan2(q.tx, q.tz), road: road.name });
    }
  }
  return out;
}

/** Curved wire span with enough clearance over the terrain between poles. */
export function utilityWireSpan(a, b, side, heightAt, segments = 8) {
  const ax = a.x + Math.cos(a.h) * side, az = a.z - Math.sin(a.h) * side;
  const bx = b.x + Math.cos(b.h) * side, bz = b.z - Math.sin(b.h) * side;
  const ay = heightAt(a.x, a.z) + 8.65, by = heightAt(b.x, b.z) + 8.65;
  const out = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    const sag = Math.sin(Math.PI * t) * 0.8;
    out.push([x, Math.max(heightAt(x, z) + 5.5, ay + (by - ay) * t - sag), z]);
  }
  return out;
}

/** Low roadside reflectors follow the paved grade, with gaps at junctions. */
export function roadsideReflectors(network, waterAt, heightAt, { spacing = 220, limit = 1000 } = {}) {
  const out = [];
  for (const road of network.roads) {
    if (!['Mex 1', 'Mex 1D', 'Mex 5', 'Mex 2D', 'I-8'].includes(road.name) || road.kind === 'dirt' || road.kind === 'ramp') continue;
    let next = spacing, travelled = 0, previous = road.pts[0];
    for (let i = 1; i < road.pts.length && out.length < limit; i++) {
      const p = road.pts[i];
      travelled += Math.hypot(p.x - previous.x, p.z - previous.z); previous = p;
      if (travelled < next) continue;
      next += spacing;
      for (const side of [-1, 1]) {
        const off = road.style.half + 5.5;
        const x = p.x + p.tz * off * side, z = p.z - p.tx * off * side;
        if (waterAt(x, z) != null || network.isNear(x, z, 3)) continue;
        const y = heightAt(x, z);
        if (Math.abs(heightAt(x + 2, z) - y) > 1.4 || Math.abs(heightAt(x, z + 2) - y) > 1.4) continue;
        out.push({ x, y, z, h: Math.atan2(p.tx, p.tz) });
      }
    }
  }
  return out;
}
