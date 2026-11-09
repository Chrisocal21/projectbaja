// Wall surface (PROPOSAL, first version): things you carry can hang on the garage's inside walls.
// Pure math, no game state. Garage local frame: x across (door side = +z), walls at x = +-HALF_X, z = +-HALF_Z.
// ry follows the same convention as the movable props: a wall's ry is the direction its face looks into the room.
import { toLocalG, toWorldG } from '../placement/garageSurfaces.js';

export const HALF_X = 7, HALF_Z = 6, DOOR_HALF = 3.5, HANG_Y = 1.5, REACH = 1.6, MARGIN = 0.4, OFFSET = 0.03;
// local wall planes: n = wall's inward facing, face = ry of a hung thing
const WALLS = [
  { id: 'back', ry: 0, d: p => HALF_Z + p.lz, at: (p, m) => ({ lx: clamp(p.lx, HALF_X - m), lz: -HALF_Z + OFFSET }), ok: () => true },
  { id: 'front', ry: Math.PI, d: p => HALF_Z - p.lz, at: (p, m) => ({ lx: clamp(p.lx, HALF_X - m), lz: HALF_Z - OFFSET }), ok: p => Math.abs(p.lx) > DOOR_HALF + 0.3 },   // not across the roller door
  { id: 'left', ry: Math.PI / 2, d: p => HALF_X + p.lx, at: (p, m) => ({ lx: -HALF_X + OFFSET, lz: clamp(p.lz, HALF_Z - m) }), ok: () => true },
  { id: 'right', ry: -Math.PI / 2, d: p => HALF_X - p.lx, at: (p, m) => ({ lx: HALF_X - OFFSET, lz: clamp(p.lz, HALF_Z - m) }), ok: () => true },
];
function clamp(v, lim) { return Math.max(-lim, Math.min(lim, v)); }

/** Where would a thing hang if the player at world (x, z) hangs it now? null when no wall is within reach (or the player is outside). */
export function wallSpot(G, x, z) {
  const p = toLocalG(G, x, z);
  if (Math.abs(p.lx) > HALF_X || Math.abs(p.lz) > HALF_Z) return null;
  let best = null;
  for (const w of WALLS) { const d = w.d(p); if (d <= REACH && w.ok(p) && (!best || d < best.d)) best = { w, d }; }
  if (!best) return null;
  const l = best.w.at(p, MARGIN), [wx, wz] = toWorldG(G, l.lx, l.lz);
  return { wall: best.w.id, x: wx, z: wz, y: HANG_Y, ry: G.rot + best.w.ry };
}
