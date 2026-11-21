// Small spatial index for the hand-built paved roads. Used by local dirt meshes
// and terrain classification so an unpaved track never covers local asphalt.
export function makePavedCover(roads, cell = 80) {
  const bins = new Map(), key = (x, z) => `${x},${z}`;
  for (const road of roads) {
    if (road.kind !== 'highway' && road.kind !== 'street') continue;
    const half = road.kind === 'highway' ? 4.4 : 4.6, pts = road.path.pts;
    for (let i = 0; i < pts.length - 1; i += 8) {
      const a = pts[i], b = pts[Math.min(i + 8, pts.length - 1)], reach = half + 12;
      const c0 = Math.floor((Math.min(a.x, b.x) - reach) / cell), c1 = Math.floor((Math.max(a.x, b.x) + reach) / cell);
      const r0 = Math.floor((Math.min(a.z, b.z) - reach) / cell), r1 = Math.floor((Math.max(a.z, b.z) + reach) / cell);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const k = key(c, r); if (!bins.has(k)) bins.set(k, []); bins.get(k).push({ a, b, half });
      }
    }
  }
  return (x, z, pad = 0) => {
    for (const { a, b, half } of bins.get(key(Math.floor(x / cell), Math.floor(z / cell))) || []) {
      const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) <= half + pad) return true;
    }
    return false;
  };
}
