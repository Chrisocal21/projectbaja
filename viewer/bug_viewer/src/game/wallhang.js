// Wall surface: the garage's inside walls. Used by hanging keepsakes (wallSpot) and by wall-mounted furniture such as the pegboard (wallSnap).
// Pure math, no game state. The walls come from worlds/garageLevels.js wallFaces(level): at level 0 Walt's four walls, from level 1 the old back
// wall is open and the extension's back, west and east walls (minus the roll-up doors) take wall items instead.
// ry follows the movable-prop convention: a wall's ry is the direction its face looks into the room.
import { toLocalG, toWorldG } from '../placement/garageSurfaces.js';
import { wallFaces, inExtension } from '../worlds/garageLevels.js';

export const HALF_X = 7, HALF_Z = 6, DOOR_HALF = 3.5, HANG_Y = 1.5, REACH = 1.6, MARGIN = 0.4, OFFSET = 0.03;

/** nearest wall to a world point: { wall, x, z, ry } where a thing of half-length `along`, standing `offset` out from the wall, goes; null if outside or out of reach */
export function wallSnap(G, x, z, { offset = OFFSET, along = 0, reach = REACH, level = 0 } = {}) {
  const p = toLocalG(G, x, z);
  if (!(Math.abs(p.lx) <= HALF_X && Math.abs(p.lz) <= HALF_Z) && !inExtension(level, p.lx, p.lz)) return null;
  const m = along + MARGIN * (along ? 0 : 1);
  let best = null;
  for (const w of wallFaces(level)) {
    const [u, v] = w.axis === 'z' ? [p.lx, p.lz] : [p.lz, p.lx];   // u runs along the wall, v across it
    const d = Math.abs(v - w.at);
    if (d > reach || w.gaps.some(([a, b]) => u > a && u < b)) continue;   // out of reach, or across a door
    const piece = w.pieces.find(([a, b]) => u >= a - 0.3 && u <= b + 0.3 && b - a >= 2 * along); if (!piece) continue;   // not this wall, or too short a stretch for it
    if (!best || d < best.d) best = { w, d, u: Math.max(piece[0] + m, Math.min(piece[1] - m, u)) };
  }
  if (!best) return null;
  const { w } = best, v = w.at + w.sign * offset, [lx, lz] = w.axis === 'z' ? [best.u, v] : [v, best.u], [wx, wz] = toWorldG(G, lx, lz);
  return { wall: w.id, x: wx, z: wz, ry: G.rot + w.ry };
}

/** where a carried keepsake hangs if the player at world (x, z) hangs it now (head height), or null */
export function wallSpot(G, x, z, level = 0) {
  const s = wallSnap(G, x, z, { level }); return s ? { ...s, y: HANG_Y } : null;
}
