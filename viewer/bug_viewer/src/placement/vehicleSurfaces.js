// Vehicle cargo surfaces as DATA: every vehicle (and body, and accessory) declares where things can be set down on it. PURE, no three.js.
// Frame = the vehicle's own model frame (car-local): the GLB's axes as the game draws it, y up from the ground under the wheels, +z the model's
// +z, x across. `at` = the CENTRE of the surface's top face in that frame (rotY turns it, 0 here: surface-local x runs along car x, z along car z).
// Every number below was measured from the GLBs (node ray casts over public/models/*.glb, 2026-11-08), then rounded inwards; heights of things
// we can't see (headroom under a closed hood / the rear window) are PROPOSALS. Grid sizes are data (gridSteps), never constants in the rules.
import { surface } from './types.js';
import { CRATE_DIM } from './gameItems.js';

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

// ---- the '84 4x4 pickup (VEH_010). The model is turned 180 deg in Truck.jsx so the nose is +z and the bed is at -z (cab back wall z -1.27, tailgate inside z -2.79; the numbers below are the GLB's raw ones, negated); the bed surface has rotY PI so its local coordinates (what saves store) are unchanged, floor y 1.00,
// sides x +-0.80 above the wheel wells; the wells rise 0.28 over the floor from the cab wall to z 2.12 and come in to x +-0.42. ----
const BED = { w: 1.6, d: 1.52, well: { inner: 0.38, len: 0.85, top: 0.28 } };
// TIRE MOUNTS 5-8 (Chris, locked: 4 real-size upright tires side by side against the cab; mounts 1-4 are the car's own wheel slots). The wells are
// only 0.84 m apart (3 tires fit between), so the two outer mounts sit ON TOP of the wells (y = the well top) and the inner two on the floor.
// Centres 0.8 +- 0.20 / 0.61 (0.4 apart, tire 0.27 wide) and dia/2 out from the cab wall. PROPOSAL: the x spacing.
const TIRE_R = 0.345;   // = gameItems TIRE_SIZE.dia / 2
const bedMounts = [[5, 0.19, BED.well.top], [6, 0.60, 0], [7, 1.00, 0], [8, 1.41, BED.well.top]].map(([n, x, y]) => ({ id: `m${n}`, label: `Tire mount ${n}`, x, z: TIRE_R, y, pose: 'upright', accepts: ['tire'] }));
const pickupBed = cargo({
  id: 'bed', name: 'Bed', size: [BED.w, BED.d], at: { x: 0, y: 1.0, z: -2.03, rotY: Math.PI }, clearance: 1.2,   // PROPOSAL headroom: open top, keep loads sane
  gridSteps: [0.25, 0.1, 0.05],
  blocks: [{ x0: 0, z0: 0, x1: BED.well.inner, z1: BED.well.len, top: BED.well.top }, { x0: BED.w - BED.well.inner, z0: 0, x1: BED.w, z1: BED.well.len, top: BED.well.top }],
  mounts: bedMounts,
});

// ---- TRAILERS (no trailer exists in the game yet: data only, ready for when one is towed. All numbers are PROPOSALS, typical small utility trailers).
// Frame = the trailer's own model frame like a vehicle's: +z toward the hitch (the tow vehicle), y up from the ground under the wheels, x across.
// flat bed: 1.6 x 3.0 m deck 0.6 m up, open top, low rail all round (nothing is refused for height), items pull flush to the rails.
// enclosed: 1.7 x 3.2 m floor 0.5 m up, 1.7 m inside height (clearance), rear door end = z1. Both are always usable (the enclosed one's door is a later `needs`).
const trailerFlat = cargo({ id: 'deck', name: 'Trailer deck', size: [1.6, 3.0], at: { x: 0, y: 0.6, z: -0.2 }, gridSteps: [0.5, 0.25, 0.05], clearance: 2.0 });
const trailerEnclosed = cargo({ id: 'floor', name: 'Trailer floor', size: [1.7, 3.2], at: { x: 0, y: 0.5, z: -0.2 }, gridSteps: [0.5, 0.25, 0.05], clearance: 1.7 });

/** per vehicle: a list, or per body id for vehicles whose body changes the shape (the Baja body sits 0.14 m higher in its GLB) */
export const VEHICLE_SURFACES = {
  bug: { classic: bugSurfaces(0), 'classic-stage2': bugSurfaces(0.14) },
  pickup84: [pickupBed],
  trailerFlat: [trailerFlat],
  trailerEnclosed: [trailerEnclosed],
};

/**
 * the cargo surfaces of a vehicle right now. PURE.
 * ctx: { body, parts: build.parts, coverFitted: id -> bool, coverOpen: id -> bool, lift: metres the body is raised, all: true = ignore `needs`
 * (to draw what is already in a closed trunk) }. Returns surfaces with `at.y` raised by the lift and `usable` set.
 */
export function surfacesFor(vehId, ctx = {}) {
  const def = VEHICLE_SURFACES[vehId];
  const list = !def ? [] : Array.isArray(def) ? def : def[ctx.body] || def[Object.keys(def)[0]];
  const lift = ctx.lift || 0, boxes = obstacleBoxes(vehId, ctx);
  return list.map(s => {
    const at = { ...s.at, y: s.at.y + lift };
    return { ...s, at, blocks: [...s.blocks, ...boxes.flatMap(b => blockOn({ ...s, at }, b))], usable: usable(s, ctx) };
  }).filter(s => ctx.all || s.usable);
}

// ---- things already standing on a vehicle that a surface must treat as solid: they are in the car frame, drawn by other code, so each becomes a
// `block` on whichever surface they overlap (nothing can be set down through them). Box = { x0, x1, z0, z1, y0, y1 } in the car frame. ----
/** the car-frame boxes of what is fixed or loaded on this vehicle. ctx.parts = build.parts; ctx.loose = the old unit-storage crates, in the order the game draws
 *  them: [{ spot: 'cab' | 'roof' | 'bed', size: 1-4 }] (grid items are NOT in it). */
export function obstacleBoxes(vehId, ctx = {}) {
  const out = [];
  if (vehId === 'bug') {
    // ROOF_JerryCans (ProcParts.jsx): two cans at x +-0.2, 0.17 wide, z -0.67..-0.33, y 1.84..2.24 (no offset: they don't drop with the rack)
    if (ctx.parts?.roofGear === 'ROOF_JerryCans') for (const x of [-0.2, 0.2]) out.push({ x0: x - 0.085, x1: x + 0.085, z0: -0.67, z1: -0.33, y0: 1.84, y1: 2.24 });
    // Items.jsx Cargo, Bug: cab crates at CAB[i % 4] (scale 0.8), roof-rack crates in a row from z -0.5 at y 1.66 (scale 0.85)
    const cab = ctx.loose?.filter(l => l.spot === 'cab') || [], roof = ctx.loose?.filter(l => l.spot === 'roof') || [];
    cab.forEach((l, i) => { const [x, y, z] = BUG_CAB[i % 4], [w, h, d] = CRATE_DIM[l.size].map(v => v * 0.8); out.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y, y1: y + h }); });
    let z = -0.5;
    for (const l of roof) { const [w, h, d0] = CRATE_DIM[l.size], d = d0 * 0.85; out.push({ x0: -w * 0.425, x1: w * 0.425, z0: z, z1: z + d, y0: 1.66, y1: 1.66 + h * 0.85 }); z += d + 0.05; }
  } else if (vehId === 'pickup84') {
    // Items.jsx Cargo, truck: bed crates in two rows from just behind the cab wall (z 1.27) toward the tailgate
    const row = [0, 0];
    for (const l of ctx.loose || []) if (l.spot !== 'cab') {
      const [w, h, d] = CRATE_DIM[l.size], side = row[0] <= row[1] ? 0 : 1, z1 = TRUCK_BED_Z - row[side], x = side ? 0.42 : -0.42; row[side] += d + 0.06;
      out.push({ x0: x - w / 2, x1: x + w / 2, z0: z1 - d, z1, y0: 0.98, y1: 0.98 + h });
    }
  }
  return out;
}
/** where the truck's bed crates start (just behind the cab wall; Items.jsx uses the same number) and the Bug's cab crate spots (= Items.jsx CAB) */
export const TRUCK_BED_Z = -1.35;   // the bed is behind the cab: -z (the model was turned 180 deg; crates run from here toward -z)
const BUG_CAB = [[-0.3, 0.62, -0.6], [0.3, 0.62, -0.6], [0, 0.95, -0.6], [0, 0.62, -1.15]];
/** a car-frame box as a block on surface s (surface-local), or [] when it doesn't overlap the surface in plan or isn't at its height */
function blockOn(s, b) {
  if (b.y1 <= s.at.y + 1e-6 || b.y0 >= s.at.y + s.clearance) return [];
  const a = fromCar(s, b.x0, b.z0), c = fromCar(s, b.x1, b.z1);   // (rotY is 0 for every surface here: x and z stay axis-aligned)
  const x0 = Math.max(0, Math.min(a.x, c.x)), x1 = Math.min(s.size[0], Math.max(a.x, c.x)), z0 = Math.max(0, Math.min(a.z, c.z)), z1 = Math.min(s.size[1], Math.max(a.z, c.z));
  if (x1 - x0 < 1e-3 || z1 - z0 < 1e-3) return [];
  return [{ x0, x1, z0, z1, top: Math.max(b.y1 - s.at.y, 0.05) }];
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
