// Placement Lab data (reached only with ?lab=placement): the surfaces, the things to put on them, and what's already down.
// Everything here is a PROPOSAL to try in the lab: sizes, tags and grid steps are guesses, not canon. Grid sizes are DATA (gridSteps), never constants.
// Each surface also carries a world transform `at` = where its CENTRE (top face) sits in the world + its turn about y. The rules only ever see
// surface-local coords (origin at a corner, x across w, z across d, see types.js); toLocal / toWorld below convert, PURE (no three.js).
import { surface, placeable, placement, byId } from './types.js';

export const SURFACES = [
  { ...surface({ id: 'floor', size: [4, 3], gridSteps: [0.5, 0.25, 0.05], accepts: ['*'] }), name: 'Floor', at: { x: 0, y: 0, z: 0, rotY: 0 } },
  { ...surface({ id: 'shelf', size: [1.2, 0.4], gridSteps: [0.25, 0.15, 0.05], accepts: ['small'] }), name: 'Shelf', at: { x: -0.6, y: 1.0, z: -1.95, rotY: 0 } },
  { ...surface({ id: 'trunk', size: [1.2, 0.9], gridSteps: [0.25, 0.05], accepts: ['small', 'medium'] }), name: 'Trunk bed', at: { x: 3.1, y: 0.3, z: 0.3, rotY: -0.35 } },
];
export const surfaceById = byId(SURFACES);

/** look: how the lab draws each item with primitives. shape 'box' | 'cyl' | 'tire' | 'bottle' | 'can'. */
export const ITEMS = [
  { ...placeable({ id: 'bottle', footprint: [0.1, 0.1], height: 0.26, tags: ['small'] }), name: 'Water bottle', look: { shape: 'bottle', color: '#5fb4e6' } },
  { ...placeable({ id: 'toolbox', footprint: [0.5, 0.25], height: 0.25, tags: ['small', 'medium'] }), name: 'Toolbox', look: { shape: 'box', color: '#c23a2b', handle: true } },
  { ...placeable({ id: 'jerrycan', footprint: [0.35, 0.18], height: 0.45, tags: ['medium'] }), name: 'Jerry can', look: { shape: 'can', color: '#3f6b35' } },
  { ...placeable({ id: 'tire', footprint: [0.64, 0.64], height: 0.22, tags: ['large'], stackable: true }), name: 'Tire', look: { shape: 'tire', color: '#1c1c1c' } },
  { ...placeable({ id: 'crate', footprint: [0.6, 0.4], height: 0.4, tags: ['medium', 'large'], stackOn: ['large'] }), name: 'Crate', look: { shape: 'box', color: '#9a7446' } },
];
export const itemById = byId(ITEMS);

/** one tire already down on the floor so stacking can be tried straight away */
export const START = () => [placement({ id: 'start-tire', item: 'tire', surface: 'floor', x: 3.32, z: 1.82 })];   // on the 0.5 grid: low edges at 3.0 / 1.5

// ---- surface-local <-> world. three.js convention for rotation.y = t: local (x, z) -> world (x cos t + z sin t, -x sin t + z cos t). ----
/** surface-local (lx, lz, ly above the top) -> world {x, y, z} */
export function toWorld(s, lx, lz, ly = 0) {
  const cx = lx - s.size[0] / 2, cz = lz - s.size[1] / 2, c = Math.cos(s.at.rotY), sn = Math.sin(s.at.rotY);
  return { x: s.at.x + cx * c + cz * sn, y: s.at.y + ly, z: s.at.z - cx * sn + cz * c };
}
/** world (x, z) -> surface-local {x, z} (height ignored: callers intersect the surface's plane first) */
export function toLocal(s, wx, wz) {
  const dx = wx - s.at.x, dz = wz - s.at.z, c = Math.cos(s.at.rotY), sn = Math.sin(s.at.rotY);
  return { x: dx * c - dz * sn + s.size[0] / 2, z: dx * sn + dz * c + s.size[1] / 2 };
}
/** the world turn of an item placed at local rot on surface s */
export const worldRot = (s, rot) => s.at.rotY + rot;
