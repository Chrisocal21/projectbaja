// Wall surface (PROPOSAL, first version): the garage's inside walls. Used by hanging keepsakes (wallSpot) and by wall-mounted
// furniture such as the pegboard (wallSnap). Pure math, no game state.
// Garage local frame: x across (door side = +z), walls at x = +-HALF_X, z = +-HALF_Z.
// ry follows the movable-prop convention: a wall's ry is the direction its face looks into the room.
import { toLocalG, toWorldG } from '../placement/garageSurfaces.js';

export const HALF_X = 7, HALF_Z = 6, DOOR_HALF = 3.5, HANG_Y = 1.5, REACH = 1.6, MARGIN = 0.4, OFFSET = 0.03;
const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));
// each wall: distance from a local point, where a thing at offset o with half-length m lands, and its facing
const WALLS = [
  { id: 'back', ry: 0, d: p => HALF_Z + p.lz, at: (p, m, o) => ({ lx: clamp(p.lx, HALF_X - m), lz: -HALF_Z + o }), span: HALF_X * 2, door: false },
  { id: 'front', ry: Math.PI, d: p => HALF_Z - p.lz, at: (p, m, o) => ({ lx: clamp(p.lx, HALF_X - m), lz: HALF_Z - o }), span: HALF_X - DOOR_HALF, door: true },   // the roller door takes the middle
  { id: 'left', ry: Math.PI / 2, d: p => HALF_X + p.lx, at: (p, m, o) => ({ lx: -HALF_X + o, lz: clamp(p.lz, HALF_Z - m) }), span: HALF_Z * 2, door: false },
  { id: 'right', ry: -Math.PI / 2, d: p => HALF_X - p.lx, at: (p, m, o) => ({ lx: HALF_X - o, lz: clamp(p.lz, HALF_Z - m) }), span: HALF_Z * 2, door: false },
];

/** nearest wall to a world point: { wall, x, z, ry } where a thing of half-length `along`, standing `offset` out from the wall, goes; null if outside or out of reach */
export function wallSnap(G, x, z, { offset = OFFSET, along = 0, reach = REACH } = {}) {
  const p = toLocalG(G, x, z);
  if (Math.abs(p.lx) > HALF_X || Math.abs(p.lz) > HALF_Z) return null;
  let best = null;
  for (const w of WALLS) {
    const d = w.d(p);
    if (d > reach || 2 * along > w.span || (w.door && Math.abs(p.lx) <= DOOR_HALF + 0.3)) continue;   // too short a wall for it, or across the roller door
    if (!best || d < best.d) best = { w, d };
  }
  if (!best) return null;
  const l = best.w.at(p, along + MARGIN * (along ? 0 : 1), offset), [wx, wz] = toWorldG(G, l.lx, l.lz);
  return { wall: best.w.id, x: wx, z: wz, ry: G.rot + best.w.ry };
}

/** where a carried keepsake hangs if the player at world (x, z) hangs it now (head height), or null */
export function wallSpot(G, x, z) {
  const s = wallSnap(G, x, z); return s ? { ...s, y: HANG_Y } : null;
}
