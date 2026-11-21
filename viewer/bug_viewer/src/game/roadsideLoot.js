// Roadside finds: every rest area and gas station along the real highways (worlds/roadside.js) has something to search.
// Pure data (no world, no three.js) so it can be tested. loot.js adds the result to the game's containers and spots.
// Layouts are in the place's own frame (x across, z toward the road; the building is at the back, see County.jsx PLACE_PARTS).
// Which place gets a tool chest instead of a crate is fixed by its position, so the same stops always hold the same kinds of things.
export const ROADSIDE_LAYOUT = {
  gas: { containers: [['box', 8.5, -6.2, 0.3], ['crate', -9, -4.5, -0.2]], spots: [[-10.5, -0.5, 0, 3]] },
  rest: { containers: [['crate', 6.5, -10, 0.2], ['box', -6.5, -10.2, -0.3]], spots: [[5, -2, 0.95, 2]] },   // the spot is on a picnic table
};
/** distance from the garage (m) that earns a stop the full far bonus of 2: cash x3 and a one-in-one extra find. Stops next to home pay like the barn. */
export const FAR_KM = 8000;
const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const toWorld = (s, lx, lz) => { const c = Math.cos(s.rot), n = Math.sin(s.rot); return [s.x + lx * c + lz * n, s.z - lx * n + lz * c]; };   // same as worlds/kit.js

/** sites: [{ type: 'gas' | 'rest', x, z, ry }]; groundAt(x, z) = ground height. Ids are stable for a given list of sites. */
export function roadsideLoot(sites, groundAt = () => 0) {
  const containers = [], spots = [];
  sites.forEach((q, i) => {
    const L = ROADSIDE_LAYOUT[q.type]; if (!L) return;
    const site = 'rs' + i, frame = { x: q.x, z: q.z, rot: q.ry };
    L.containers.forEach(([type, lx, lz, ry], k) => {
      const [x, z] = toWorld(frame, lx, lz), t = type === 'crate' && hash(q.x, q.z) > 0.6 ? 'drawer' : type;
      containers.push({ id: `${site}-${k}`, site, type: t, lx, lz, ly: 0, ry, x, z, y: groundAt(x, z), wry: q.ry + ry, far: Math.min(2, Math.hypot(x, z) / FAR_KM) });
    });
    L.spots.forEach(([lx, lz, ly, max]) => { const [x, z] = toWorld(frame, lx, lz); if (hash(q.z, q.x) < 0.75) spots.push({ site, lx, lz, ly, max, x, z, y: ly, wry: q.ry }); });
  });
  return { containers, spots };
}

/** where the wrecks stand: at the rest areas, spread out (every other one), in the place's own frame, beside the building */
export const WRECK_SPOT = { lx: -10.5, lz: -3, ry: 0.35 };
export function wreckSites(sites, max = 4) {
  const rests = sites.map((q, i) => ({ ...q, i })).filter(q => q.type === 'rest').filter((_, k) => k % 2 === 0).slice(0, max);
  return rests.map(q => { const [x, z] = toWorld({ x: q.x, z: q.z, rot: q.ry }, WRECK_SPOT.lx, WRECK_SPOT.lz); return { x, z, h: q.ry + WRECK_SPOT.ry, site: 'rs' + q.i }; });
}

// ---- scenery wrecks (not strippable: dressing, but solid) ----
// Two prototype models carried over from Salvage Road's vehicle pack (original blockouts): an unfinished pickup and a step van. Placed at the stops
// that have no Bug wreck: every rest area the project wrecks skip, and about half the gas stops. Model frame: length along x, Z up in the file (turned upright when drawn).
export const SCENERY_WRECKS = { pickup: { file: '/models/WRECK_UnfinishedPickup.glb', length: 5.8, width: 2.5 }, van: { file: '/models/WRECK_StepVan.glb', length: 7.0, width: 2.9 } };
export const WRECK_LOCAL = { gas: { lx: 11.5, lz: 7 }, rest: { lx: 11.5, lz: 9 } };   // beside the apron, clear of the pumps, tables and containers
export function sceneryWrecks(sites) {
  const taken = new Set(wreckSites(sites).map(w => w.site)), out = [];
  sites.forEach((q, i) => {
    const L = WRECK_LOCAL[q.type]; if (!L || taken.has('rs' + i)) return;
    if (q.type === 'gas' && hash(q.x + 7, q.z) > 0.5) return;   // about half the gas stops
    const kind = hash(q.z, q.x + 3) > 0.5 ? 'van' : 'pickup', yaw = q.ry + (hash(q.x, q.z + 5) - 0.5) * 0.5, [x, z] = toWorld({ x: q.x, z: q.z, rot: q.ry }, L.lx, L.lz);
    out.push({ site: 'rs' + i, kind, x, z, yaw });
  });
  return out;
}
/** circles the walker and the car bump into: three along the wreck's length. [x, z, r, height] like the other solids */
export function wreckColliders(wrecks) {
  const out = [];
  for (const w of wrecks) { const d = SCENERY_WRECKS[w.kind], u = [Math.cos(w.yaw), -Math.sin(w.yaw)], r = d.width / 2 - 0.1; for (const k of [-1, 0, 1]) out.push([w.x + u[0] * k * (d.length / 2 - r), w.z + u[1] * k * (d.length / 2 - r), r, 3]); }
  return out;
}
