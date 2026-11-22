const CORRIDORS = new Set(['Mex 1', 'Mex 1D', 'Mex 5']);

/** Find sustained bends on the built road, then put warnings before the turn. */
export function curveWarnings(network, waterAt, heightAt, { lead = 90, spacing = 450, limit = 90 } = {}) {
  const signs = [];
  for (const road of network.roads) {
    if (!CORRIDORS.has(road.name) || road.kind === 'dirt' || road.pts.length < 35) continue;
    const pts = road.pts;
    let last = -spacing;
    for (let i = 14; i < pts.length - 14 && signs.length < limit; i += 5) {
      const a = pts[i - 12], b = pts[i], c = pts[i + 12];
      const v1x = b.x - a.x, v1z = b.z - a.z, v2x = c.x - b.x, v2z = c.z - b.z;
      const turn = Math.atan2(v1x * v2z - v1z * v2x, v1x * v2x + v1z * v2z);
      if (Math.abs(turn) < 0.38 || b.s - last < spacing) continue;
      const approach = pts.findLastIndex((p, index) => index < i && p.s <= b.s - lead);
      if (approach < 0) continue;
      const p = pts[approach], side = turn < 0 ? 1 : -1, offset = road.style.half + 10;
      const x = p.x + p.tz * offset * side, z = p.z - p.tx * offset * side;
      if (waterAt(x, z) != null || network.isNear(x, z, 5)) continue;
      const y = heightAt(x, z);
      if (Math.abs(heightAt(x + 2, z) - y) > 1.5 || Math.abs(heightAt(x, z + 2) - y) > 1.5) continue;
      signs.push({ x, y, z, h: Math.atan2(p.tx, p.tz) + Math.PI, turn: turn < 0 ? 'right' : 'left', road: road.name });
      last = b.s;
    }
  }
  return signs;
}
