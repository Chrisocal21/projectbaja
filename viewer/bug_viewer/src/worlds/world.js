// The size of the world, in ONE place (leaf module: imports nothing). See docs/REGION_PLAN.md.
// Today all three numbers describe the same 6 km square. They are separate so a new region can grow the world without touching the heightmap file.
export const HM_SIZE = 6000;      // metres covered by public/terrain/height.bin (a fixed 1025x1025 file; outside it the edge height is held)
export const WORLD_SIZE = 6000;   // metres the surface grid, terrain tiles, highway table, minimap and scatter cover (a square centred on the garage)
export const DRIVE_LIMIT = 2940;  // how far from the centre you can drive today; the hologram wall stands here (worlds/boundary.js)
// rules the rest of the code relies on (checked in world.test.js)
export const TILE_SIZE = 300, CORR_CELL = 8, HWY_STEP = 10, SURFACE_CELL = 2;
