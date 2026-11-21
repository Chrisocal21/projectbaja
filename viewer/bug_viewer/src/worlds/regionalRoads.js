// Deterministic unpaved access roads attached to the mapped highway network.
// Shared by the physical road builder and the map: no decorative-only lines.
export function regionalDirtRoads(roads, border, avoid = []) {
  const out = [];
  const clear = (x, z) => x > border.bounds.x0 + 200 && x < border.bounds.x1 - 200 && z > border.bounds.z0 + 200 && z < border.bounds.z1 - 200 && border.waterAt(x, z) == null && !avoid.some(q => Math.hypot(x - q.x, z - q.z) < q.r + 90);
  const candidates = roads.filter(r => r.kind === 'secondary' && r.pts.length >= 5);
  for (let ri = 0; ri < candidates.length && out.length < 80; ri++) {
    const r = candidates[ri];
    for (const fraction of [0.3, 0.68]) {
      if (out.length >= 80) break;
      const i = Math.max(1, Math.min(r.pts.length - 2, Math.floor((r.pts.length - 1) * fraction)));
      const [x, z] = r.pts[i], [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i + 1];
      const length = Math.hypot(bx - ax, bz - az) || 1, side = (ri + (fraction > 0.5 ? 1 : 0)) % 2 ? 1 : -1;
      const nx = -(bz - az) / length * side, nz = (bx - ax) / length * side;
      const reach = 450 + (ri * 137 % 550), bend = (ri * 73 % 220) - 110;
      const pts = [[x, z], [x + nx * reach * 0.32, z + nz * reach * 0.32], [x + nx * reach * 0.68 + nz * bend, z + nz * reach * 0.68 - nx * bend], [x + nx * reach + nz * bend * 1.5, z + nz * reach - nx * bend * 1.5]];
      const safe = pts.every(([px, pz], k) => {
        if (!clear(px, pz)) return false;
        if (!k) return true;
        const [sx, sz] = pts[k - 1], distance = Math.hypot(px - sx, pz - sz), steps = Math.ceil(distance / 60);
        for (let t = 1; t <= steps; t++) {
          const qx = sx + (px - sx) * t / steps, qz = sz + (pz - sz) * t / steps;
          if (!clear(qx, qz) || Math.abs(border.heightAt(qx, qz) - border.heightAt(sx, sz)) > 95) return false;
        }
        return true;
      });
      if (safe) out.push({ name: 'Dirt road', kind: 'dirt', pts });
    }
  }
  return out;
}
