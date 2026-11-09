// Regions (docs/WORLD_MAP.md, PROPOSAL): the game is a set of region maps joined by highway exits.
// Pure data and maths, no game state. A region is one world the drive scene knows how to show (DriveWorld.jsx picks it by `world`).
// An exit is a circle on the road: drive into it and the next region loads while you keep going (the car keeps its speed).
// `arrive` is where you appear in the next region (x, z, heading h as in the vehicle state). `dev` exits exist only in dev sessions (they let us test the travel with no real second region yet).
export const REGIONS = {
  county: {
    id: 'county', name: 'Baja County', world: 'county',
    exits: [
      { id: 'dev-test', to: 'test', dev: true, x: 60, z: 70, r: 10, arrive: { x: 0, z: 0, h: Math.PI / 2 } },
    ],
  },
  test: {
    id: 'test', name: 'Test center', world: 'test', dev: true,
    exits: [
      { id: 'dev-home', to: 'county', dev: true, x: 0, z: -60, r: 10, arrive: { x: 60, z: 100, h: 0 } },
    ],
  },
};

export const regionById = id => REGIONS[id] || null;
export const regionOfWorld = world => Object.values(REGIONS).find(r => r.world === world) || null;

/** the exit a vehicle at (x, z) is inside, or null. dev: is this a dev session (dev-only exits count only then) */
export function exitHit(regionId, x, z, dev = false) {
  const r = REGIONS[regionId]; if (!r) return null;
  for (const e of r.exits) {
    if (e.dev && !dev) continue;
    if (!REGIONS[e.to]) continue;
    if (Math.hypot(x - e.x, z - e.z) <= e.r) return e;
  }
  return null;
}
