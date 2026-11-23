// Barns, off-road stores and junkyards on the real map (pure JS, testable in node). Three kinds of shop that stand off the road, away from the gas stations,
// each far from the next of its kind, so the only way to find them all is to drive and look: barns on the dirt trails and back roads, junkyards on the
// back roads and highways, off-road stores on the through roads. Same site shape as roadside.js: { type, x, z, ry, n } with local +z toward the road.
// type 'barn' | 'junk' | 'offroad'. Names are made up (never a real company).
const hyp = Math.hypot;
const right = d => [-d[1], d[0]];
const hash = (a, b, k = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

export const SHOP_TYPES = ['barn', 'junk', 'offroad'];
/** what to look for on each kind of road, how far apart, how far from the road */
export const SHOP_SPEC = {
  barn:    { kinds: ['dirt', 'secondary'],          gap: 6500,  apart: 5000,  off: 36 },
  junk:    { kinds: ['dirt', 'secondary', 'major'], gap: 9500,  apart: 8000, off: 44 },
  offroad: { kinds: ['major', 'secondary'],         gap: 13000, apart: 10500, off: 48 },
};
const NAMES = {
  barn: [['Tin Roof', 'Red Gate', 'Dry Creek', 'Windmill', 'Hay Loft', 'Lazy Mule', 'Cottonwood', 'Split Rail', 'Old Tractor', 'Dust Bowl'], ['Barn Sale', 'Barn Swap', 'Barn Finds', 'Barn']],
  junk: [['Dead Mule', 'Rusty Gate', 'Three Dogs', 'Last Stop', 'Los Compadres', 'Cactus Flats', 'Hot Rod', 'Bone Dry', 'Sidewinder', 'Iron Gulch'], ['Salvage', 'Auto Wrecking', 'Yonke', 'Junk & Core', 'Parts Yard']],
  offroad: [['Sand Cat', 'Dune Runner', 'Rock Hopper', 'Mad Dog', 'High Desert', 'Trail Boss', 'Whoop Dreams', 'Gnarly', 'Coyote', 'Dust Devil'], ['Offroad', 'Performance', '4x4 Supply', 'Racing Supply', 'Outfitters']],
};
const pick = (list, h) => list[Math.min(list.length - 1, Math.floor(h * list.length))];
/** the shop's name, stable for its place: "Dead Mule Salvage" */
export function shopName(site) {
  const [a, b] = NAMES[site.type] || NAMES.barn, x = Math.round(site.x), z = Math.round(site.z);
  return `${pick(a, hash(x, z, 21))} ${pick(b, hash(x, z, 22))}`;
}
/** a stable key for saving what has been bought here */
export const shopKey = site => `${site.type}:${Math.round(site.x)},${Math.round(site.z)}`;
export const isShop = site => SHOP_TYPES.includes(site?.type);

function slopeOk(ground, x, z, r, max) {
  if (!ground) return true;
  const h0 = ground(x, z);
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (Math.abs(ground(x + dx, z + dz) - h0) > max) return false;
  return true;
}

/**
 * roads: [{ name, kind, pts: [[x, z], ...] }] (dirt trails included); taken: the sites already placed (gas stations and rest stops).
 * opts: { ground(x, z), bounds }. Returns the new sites only.
 */
export function buildShops(roads, taken = [], { ground, bounds } = {}) {
  const out = [], all = () => [...taken, ...out];
  const inBounds = (x, z) => !bounds || (x > bounds.x0 + 400 && x < bounds.x1 - 400 && z > bounds.z0 + 400 && z < bounds.z1 - 400);
  const counts = {};
  for (const type of SHOP_TYPES) {
    const S = SHOP_SPEC[type];
    for (const road of roads) {
      if (!S.kinds.includes(road.kind) || road.pts.length < 3) continue;
      const pts = road.pts; let acc = 0, next = S.gap * (0.15 + hash(pts[0][0], pts[0][1], type.length) * 0.7), side = hash(pts[0][1], pts[0][0]) < 0.5 ? 1 : -1;
      for (let i = 0; i < pts.length - 2; i++) {
        const a = pts[i], b = pts[i + 1], c = pts[i + 2], l = hyp(b[0] - a[0], b[1] - a[1]); acc += l;
        if (acc < next) continue;
        const dl = hyp(c[0] - a[0], c[1] - a[1]) || 1, d = [(c[0] - a[0]) / dl, (c[1] - a[1]) / dl], d1 = [(b[0] - a[0]) / (l || 1), (b[1] - a[1]) / (l || 1)];
        if (d[0] * d1[0] + d[1] * d1[1] < 0.96) continue;   // wait for a straight stretch
        const r = right(d), x = b[0] + r[0] * S.off * side, z = b[1] + r[1] * S.off * side;
        if (!inBounds(x, z) || !slopeOk(ground, x, z, 14, 2.2)) continue;
        if (all().some(s => (s.type === type ? hyp(s.x - x, s.z - z) < S.apart : hyp(s.x - x, s.z - z) < 900))) continue;
        out.push({ type, x, z, ry: Math.atan2(-r[0] * side, -r[1] * side), n: counts[type] = (counts[type] || 0) + 1 });
        acc = 0; next = S.gap * (0.8 + hash(x, z) * 0.5); side = -side;
      }
    }
  }
  return out;
}
