// Vehicle cargo surfaces as DATA: every vehicle (and body, and accessory) declares where things can be set down on it. PURE, no three.js.
// Frame = the vehicle's own model frame (car-local): the GLB's axes as the game draws it, y up from the ground under the wheels, +z the model's
// +z, x across. `at` = the CENTRE of the surface's top face in that frame (rotY turns it, 0 here: surface-local x runs along car x, z along car z).
// Every number below was measured from the GLBs (node ray casts over public/models/*.glb, 2026-11-08), then rounded inwards; heights of things
// we can't see (headroom under a closed hood / the rear window) are PROPOSALS. Grid sizes are data (gridSteps), never constants in the rules.
import { surface } from './types.js';

const ALL_WALLS = ['x0', 'x1', 'z0', 'z1'];

/** one cargo surface: the rules' surface() + its name, where it sits on the vehicle, and what it needs to be usable
 *  needs: { cover: 'hoodPanel' } = only while that cover is open (or not fitted at all); { part: 'roofRack' } = only with that slot fitted. */
function cargo({ name, at, needs = null, ...rest }) {
  return { ...surface({ gridSteps: [0.1, 0.05], accepts: ['*'], walls: ALL_WALLS, ...rest }), name, at: { rotY: 0, ...at }, needs };
}

// ---- the '71 Bug ('classic'). Engine in the back, so its trunk is under the front hood. ----
// front trunk: the open well under the hood (VEH_001: hood x +-0.57, z 0.54..1.70; well floor y 0.27, clear for x +-0.45 from z 0.80 to 1.40,
// the wheel arches close it in past that). Headroom to the closed hood ~0.6-0.75 -> PROPOSAL 0.55.
// luggage shelf: behind the back seat (seat back ends z -0.84, shelf floor y ~0.85 from z -0.95 to -1.37, x +-0.5); the rear window slopes
// down over it (y 1.34 at z -1.12 to 1.08 at z -1.46) -> PROPOSAL 0.4 headroom over z -0.95..-1.30.
// roof rack (ACC_RoofRack: slats at y 1.73 over x +-0.50, z -0.84..0.10; the part is fitted 0.14 lower on 'classic' (parts.json offset)).
const bugSurfaces = dy => [
  cargo({ id: 'frontTrunk', name: 'Front trunk', size: [0.9, 0.6], at: { x: 0, y: 0.27 + dy, z: 1.10 }, clearance: 0.55, needs: { cover: 'hoodPanel' } }),
  cargo({ id: 'luggageShelf', name: 'Luggage shelf', size: [1.0, 0.35], at: { x: 0, y: 0.85 + dy, z: -1.125 }, clearance: 0.4 }),
  cargo({ id: 'roofRack', name: 'Roof rack', size: [0.96, 0.9], at: { x: 0, y: 1.59 + dy, z: -0.38 }, clearance: 0.8, needs: { part: 'roofRack' } }),
];

// ---- the '84 4x4 pickup (VEH_010). NOTE the model's bed is at its +z end (cab back wall z 1.27, tailgate inside z 2.79), floor y 1.00,
// sides x +-0.80 above the wheel wells; the wells rise 0.28 over the floor from the cab wall to z 2.12 and come in to x +-0.42. ----
const BED = { w: 1.6, d: 1.52, well: { inner: 0.38, len: 0.85, top: 0.28 } };
const pickupBed = cargo({
  id: 'bed', name: 'Bed', size: [BED.w, BED.d], at: { x: 0, y: 1.0, z: 2.03 }, clearance: 1.2,   // PROPOSAL headroom: open top, keep loads sane
  gridSteps: [0.25, 0.1, 0.05],
  blocks: [{ x0: 0, z0: 0, x1: BED.well.inner, z1: BED.well.len, top: BED.well.top }, { x0: BED.w - BED.well.inner, z0: 0, x1: BED.w, z1: BED.well.len, top: BED.well.top }],
});

/** per vehicle: a list, or per body id for vehicles whose body changes the shape (the Baja body sits 0.14 m higher in its GLB) */
export const VEHICLE_SURFACES = {
  bug: { classic: bugSurfaces(0), 'classic-stage2': bugSurfaces(0.14) },
  pickup84: [pickupBed],
};

/**
 * the cargo surfaces of a vehicle right now. PURE.
 * ctx: { body, parts: build.parts, coverFitted: id -> bool, coverOpen: id -> bool, lift: metres the body is raised, all: true = ignore `needs`
 * (to draw what is already in a closed trunk) }. Returns surfaces with `at.y` raised by the lift and `usable` set.
 */
export function surfacesFor(vehId, ctx = {}) {
  const def = VEHICLE_SURFACES[vehId];
  const list = !def ? [] : Array.isArray(def) ? def : def[ctx.body] || def[Object.keys(def)[0]];
  const lift = ctx.lift || 0;
  return list.map(s => ({ ...s, at: { ...s.at, y: s.at.y + lift }, usable: usable(s, ctx) })).filter(s => ctx.all || s.usable);
}
function usable(s, ctx) {
  const n = s.needs; if (!n) return true;
  if (n.part && !ctx.parts?.[n.part]) return false;
  if (n.cover && ctx.coverFitted?.(n.cover) && !ctx.coverOpen?.(n.cover)) return false;
  return true;
}

// ---- surface-local <-> car-local (same convention as the lab's toWorld: three.js rotation.y) ----
export function toCar(s, lx, lz, ly = 0) {
  const cx = lx - s.size[0] / 2, cz = lz - s.size[1] / 2, c = Math.cos(s.at.rotY), sn = Math.sin(s.at.rotY);
  return { x: s.at.x + cx * c + cz * sn, y: s.at.y + ly, z: s.at.z - cx * sn + cz * c };
}
export function fromCar(s, x, z) {
  const dx = x - s.at.x, dz = z - s.at.z, c = Math.cos(s.at.rotY), sn = Math.sin(s.at.rotY);
  return { x: dx * c - dz * sn + s.size[0] / 2, z: dx * sn + dz * c + s.size[1] / 2 };
}
