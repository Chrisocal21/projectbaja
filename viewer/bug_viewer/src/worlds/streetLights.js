// Street lights (pure JS): poles along the paved roads where there is something to light: gas stations and rest stops, junctions, and towns.
// Open highway stays dark. One pole every SPACING metres, alternating sides, an arm reaching over the road.
// roads: [{ kind, pts: [{ x, z }] | [[x, z]] }]; lit: [{ x, z, r }] (a lit circle); returns [{ x, z, ry }] where local +z (sin ry, cos ry) points at the road.
export const SPACING = 42, SIDE_OFFSET = 8.5, MAX_LIGHTS = 7000;

const xz = p => (Array.isArray(p) ? [p[0], p[1]] : [p.x, p.z]);

export function planStreetLights(roads, lit, { spacing = SPACING, offset = SIDE_OFFSET, max = MAX_LIGHTS } = {}) {
  const out = [];
  if (!lit.length) return out;
  for (const road of roads) {
    if (road.kind === 'dirt' || road.kind === 'ramp' || road.pts.length < 2) continue;
    const off = road.kind === 'major' ? offset + 2 : offset;
    let acc = spacing * 0.5, side = 1;
    for (let i = 1; i < road.pts.length; i++) {
      const [ax, az] = xz(road.pts[i - 1]), [bx, bz] = xz(road.pts[i]), len = Math.hypot(bx - ax, bz - az);
      if (!len) continue;
      const tx = (bx - ax) / len, tz = (bz - az) / len;
      for (let d = spacing - acc; d <= len; d += spacing) {
        const cx = ax + tx * d, cz = az + tz * d;
        if (!lit.some(q => Math.abs(q.x - cx) < q.r && Math.abs(q.z - cz) < q.r && Math.hypot(q.x - cx, q.z - cz) < q.r)) { side = -side; continue; }
        const nx = -tz * side, nz = tx * side;   // the side the pole stands on
        out.push({ x: cx + nx * off, z: cz + nz * off, ry: Math.atan2(-nx, -nz) });
        side = -side;
        if (out.length >= max) return out;
      }
      acc = (acc + len) % spacing;
    }
  }
  return out;
}
