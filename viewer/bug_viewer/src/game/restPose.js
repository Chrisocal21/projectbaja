// How a loose car part lies on the ground and sits in your hands. PURE data and maths, no three.js and no game state.
// Parts are cut out of the car's own model, so they start in the car's frame: +x is the driver's (left) side, +y up, +z forward.
// Each pose is a rotation [rx, rz] in radians (about x, then z) that tips the part over the way it would be left on a garage floor:
// panels flat with the outside up, glass on its back, a door laid flat. Parts that sit upright on a car (seats, bumpers, dash) stay as they are.
// Idea from Salvage Road's carParts.ts LIE table; adapted to Baja's body pieces. PROPOSAL: tweak by eye in the game.
const Q = Math.PI / 2;

export const REST = {
  // doors and fenders: outside faces +x (left) or -x (right); a quarter turn about z lays them outside-up
  doorL: [0, Q], doorR: [0, -Q],
  fenderFL: [0, Q], fenderFR: [0, -Q], fenderRL: [0, Q], fenderRR: [0, -Q],
  // front-facing panels and glass: face +z, lie on their backs
  windshield: [-Q, 0], nosePanel: [-Q, 0], frontBumperP: [-Q, 0],
  // rear-facing: face -z
  rearWindow: [Q, 0], tailPanel: [Q, 0], rearBumperP: [Q, 0],
  steering: [-Q, 0],   // a wheel laid flat, like on a bench
  // hood, engine lid, mats and side windows are already flat or small: no turn
};
export const restOf = pieceId => REST[pieceId] || [0, 0];
/** the same for the El Cajon's parts (the group names in cajon/model.js): doors on their sides, glass and grille on their backs, the tailgate face up */
export const REST_CAJON = { driver_door: [0, Q], passenger_door: [0, -Q], windshield: [-Q, 0], grille: [-Q, 0], headlights: [-Q, 0], tailgate: [Q, 0] };
export const restOfCajon = group => REST_CAJON[group] || [0, 0];

/** the biggest a part may be when you carry it (metres): a hood in your arms, not a billboard */
export const CARRY_MAX = 0.6;
/** scale that fits a part of this biggest dimension into the carry box (never enlarges) */
export const carryScale = maxDim => (maxDim > 0 ? Math.min(1, CARRY_MAX / maxDim) : 1);

/** where the held part sits relative to the camera: low and to the right, tipped toward you (idea from Salvage Road's `held` group) */
export const HOLD = { forward: 0.8, right: 0.3, down: 0.55, tilt: 0.3, turn: -0.55 };

/** on unless the page is opened with ?feel=0 (debug switch, like ?placement=0) */
export const FEEL = typeof location === 'undefined' || new URLSearchParams(location.search).get('feel') !== '0';
