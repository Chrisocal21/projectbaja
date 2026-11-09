// Edge-of-the-map hologram wall DATA. Regions can move or remove a wall by editing this list (PROPOSAL: the text and the cyan colour are not decided).
// Each wall is one straight side: from (x0,z0) to (x1,z1). The drive limit (county.js HALF_DRIVE) is where the walls stand today.
export const WALL_EDGE = 2940, WALL_HEIGHT = 40, WALL_SHOW_DIST = 160;
export const WALL_COLOR = '#4fd8ff', WALL_TEXT = 'Area closed for now';   // PROPOSAL
export const BOUNDARY_WALLS = [
  { id: 'north', x0: -WALL_EDGE, z0: -WALL_EDGE, x1: WALL_EDGE, z1: -WALL_EDGE },
  { id: 'south', x0: -WALL_EDGE, z0: WALL_EDGE, x1: WALL_EDGE, z1: WALL_EDGE },
  { id: 'west', x0: -WALL_EDGE, z0: -WALL_EDGE, x1: -WALL_EDGE, z1: WALL_EDGE },
  { id: 'east', x0: WALL_EDGE, z0: -WALL_EDGE, x1: WALL_EDGE, z1: WALL_EDGE },
];
