// Stage 4b: furniture placement controls, pure bits (no game state). Free placement by default, Shift snaps to 0.5 m,
// wheel turns 5 deg (Shift 90), Q / E turn 15 deg (Shift 90), R = next 90, left click picks up the aimed prop and sets it down.
const DEG = Math.PI / 180, TAU = Math.PI * 2;
export const normRy = r => ((r % TAU) + TAU) % TAU;
/** shared live input the Ghost reads each frame (set by main.jsx key handlers and the Ghost itself) */
export const furn = { shift: false, cx: 0, cz: 0 };
/** next rotation. kind: 'wheel' (dir = +-1, 5 deg), 'q' / 'e' (15 deg), 'r' (+90). Shift makes wheel / Q / E a 90 deg step. */
export function turnRy(ry, kind, shift = false, dir = 1) {
  if (kind === 'r') return normRy(ry + 90 * DEG);
  const step = shift ? 90 : kind === 'wheel' ? 5 : 15, d = kind === 'q' ? -1 : kind === 'e' ? 1 : dir;
  return normRy(ry + d * step * DEG);
}
/** where the ghost goes: dist metres ahead along face; snapped to 0.5 m only when snap is true */
export function ghostSpot(cx, cz, face, dist, snap) {
  const x = cx + face.x * dist, z = cz + face.z * dist;
  return snap ? { x: Math.round(x * 2) / 2, z: Math.round(z * 2) / 2 } : { x, z };
}
/** the movable prop the player is looking at: closest to the camera among those within (r + 0.3) m of the horizontal view ray, 0.3..7 m ahead.
 *  props: [{uid,x,z,r}] (building pieces already excluded by the caller). PROPOSAL: horizontal ray only, no height test. */
export function aimedProp(props, cx, cz, face, maxD = 7) {
  let best = null;
  for (const p of props) {
    const dx = p.x - cx, dz = p.z - cz, along = dx * face.x + dz * face.z, side = Math.abs(dx * face.z - dz * face.x);
    if (along < 0.3 || along > maxD || side > Math.max(0.5, p.r || 0) + 0.3) continue;
    if (!best || along < best.along) best = { p, along };
  }
  return best?.p || null;
}
