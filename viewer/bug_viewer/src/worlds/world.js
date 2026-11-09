// The size of the world, in ONE place (leaf module: imports nothing). See docs/REGION_PLAN.md.
// The heightmap file covers 6 km; the world is now 9 km so new regions can be added outside the old square (stage 2). The walls still stand at DRIVE_LIMIT. They are separate so a new region can grow the world without touching the heightmap file.
export const HM_SIZE = 6000;      // metres covered by public/terrain/height.bin (a fixed 1025x1025 file; outside it the edge height is held)
export const WORLD_SIZE = 12000;   // metres the surface grid, terrain tiles, highway table, minimap and scatter cover (a square centred on the garage)
export const DRIVE_LIMIT = 2940;  // how far from the centre you can drive today; the hologram wall stands here (worlds/boundary.js)
// where you can drive/walk, per side (the hologram walls stand on this rectangle). Region 1 opened the SOUTH side: 1.5 km more.
/** ?realmap: the county sits on the REAL border slice (docs/WORLD_MAP.md step 4, PROPOSAL). Off by default: today's game is unchanged. */
export const REAL = typeof location !== 'undefined' && /[?&]realmap/.test(location.search);
// the real map's drivable box (public/terrain/border.json, a little inside it)
const REAL_DRIVE = { x0: -15800, x1: 23600, z0: -7200, z1: 45700 };
export const DRIVE = REAL ? REAL_DRIVE : { x0: -5940, x1: 4440, z0: -DRIVE_LIMIT, z1: 4440 };   // region 2 (PROPOSAL) opened the EAST side too: 1.5 km more
/** distance-like number that the edge mountains/rim are measured with: same as max(|x|,|z|) on the old sides, pushed out on the open south side (and stretched there, see SOUTH_RAMP) */
export const SOUTH_RAMP = { from: 3250, at: 2350, rate: 0.35 };   // the south rim starts at z 3250 and climbs at about a third of the old steepness, so Highway 9 gets a long pass, not a cliff
export const WEST_CREST = 2950;   // the west rim is a coastal range: it climbs to its crest here, then falls away toward the sea (region 3, PROPOSAL)
export const ringMetric = (x, z) => Math.max(x > -WEST_CREST ? -x : WEST_CREST - (-x - WEST_CREST) * 0.5, -z, z > SOUTH_RAMP.from ? SOUTH_RAMP.at + (z - SOUTH_RAMP.from) * SOUTH_RAMP.rate : 0, x > SOUTH_RAMP.from ? SOUTH_RAMP.at + (x - SOUTH_RAMP.from) * SOUTH_RAMP.rate : 0);   // west and north as before; south and east use the same long ramp
// the part of the world that gets terrain meshes today (tiles outside are never built: cheaper). Stage 3 extends it south.
export const TERRAIN = { x0: -6000, x1: 4500, z0: -3000, z1: 4500 };
export const MAP_SIZE = 10500, MAP_CZ = 750, MAP_CX = -750;   // the map screen draws a square this big, centred on x = 0, z = MAP_CZ: covers the old 6 km plus the south strip (z -3000..4500)
// rules the rest of the code relies on (checked in world.test.js)
export const TILE_SIZE = 300, CORR_CELL = 8, HWY_STEP = 10, SURFACE_CELL = 2;
