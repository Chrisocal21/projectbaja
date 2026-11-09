// Edge-of-the-map hologram wall DATA. Regions can move or remove a wall by editing this list (PROPOSAL: the text and the cyan colour are not decided).
// Each wall is one straight side: from (x0,z0) to (x1,z1). The drive limit (county.js HALF_DRIVE) is where the walls stand today.
import { DRIVE_LIMIT, DRIVE } from './world.js';
export const WALL_EDGE = DRIVE_LIMIT, WALL_HEIGHT = 40, WALL_SHOW_DIST = 160;
export const WALL_COLOR = '#4fd8ff', WALL_TEXT = 'Area closed for now';   // PROPOSAL
export const BOUNDARY_WALLS = [
  { id: 'north', x0: DRIVE.x0, z0: DRIVE.z0, x1: DRIVE.x1, z1: DRIVE.z0 },
  { id: 'south', x0: DRIVE.x0, z0: DRIVE.z1, x1: DRIVE.x1, z1: DRIVE.z1 },
  { id: 'west', x0: DRIVE.x0, z0: DRIVE.z0, x1: DRIVE.x0, z1: DRIVE.z1 },
  { id: 'east', x0: DRIVE.x1, z0: DRIVE.z0, x1: DRIVE.x1, z1: DRIVE.z1 },
];
