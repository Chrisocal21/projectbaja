// Walt's garage as ONE placeable sandbox item: { id: 'garage', x, z, ry }. PURE (no React / three / game state).
// (x, z) is where the garage's own origin (its garage-local 0, 0) goes; ry is a quarter turn. In the game the building-piece grid IS
// the garage's grid (structures.js: lines at garage-local x = 1 + 2k, z = 2k; BUILDING = the garage + office wing footprint).
// So a garage is only allowed where its local grid lands exactly on the sandbox grid. Then anything built against it here has the same
// garage-local coordinates it would have against the real garage, and the game's inBuilding() rule (no building inside it, no wall
// along an original wall's span, corner posts allowed, slabs may overlap its outer walls by 0.25 m) applies unchanged.
import { CELL, OX, OZ, BUILDING, inBuilding } from '../worlds/structures.js';

export const GARAGE_ID = 'garage';
export const GARAGE_NAME = "Walt's garage + office wing";
export const isGarage = p => p && p.id === GARAGE_ID;
export const GARAGE_TOP = 6.95;   // ridge of the main roof (4.6 m walls + 2.3 m pitch) and the sign, metres
const Q = Math.PI / 2;
const turnsOf = ry => ((Math.round((ry || 0) / Q) % 4) + 4) % 4;
const CS = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // exact [cos, sin] per quarter turn

/** garage-local → sandbox (three's rotation.y, the same transform as county.js toWorld / home.js homeLocal) */
export function toWorldG(g, lx, lz) { const [c, s] = CS[turnsOf(g.ry)]; return [g.x + lx * c + lz * s + 0, g.z - lx * s + lz * c + 0]; }
/** sandbox → garage-local */
export function toLocalG(g, x, z) { const [c, s] = CS[turnsOf(g.ry)], dx = x - g.x, dz = z - g.z; return { lx: dx * c - dz * s + 0, lz: dx * s + dz * c + 0 }; }

/** where a garage's origin may go: its grid lines must fall on the sandbox's (x = OX + 2k, z = OZ + 2k) */
function parity(turns) {
  // local line x = OX + 2k maps to sandbox x (turns 0, 2) or z (turns 1, 3); solve the origin's offset modulo CELL
  const [c, s] = CS[turns];
  const fx = OX * c + OZ * s, fz = -OX * s + OZ * c;   // where the local grid's (0, 0) line crossing lands, relative to the origin
  const m = v => ((v % CELL) + CELL) % CELL;
  return { px: m(OX - fx), pz: m(OZ - fz) };
}
export const garageAligned = g => { const { px, pz } = parity(turnsOf(g.ry)), on = (v, p) => Math.abs(((v - p) / CELL) - Math.round((v - p) / CELL)) < 1e-9; return on(g.x, px) && on(g.z, pz); };

/** snap a free point (the middle of the building) to the nearest allowed garage spot, for a quarter-turn count */
export function snapGarage(x, z, turns = 0) {
  const k = ((turns % 4) + 4) % 4, ry = k * Q, cx = (BUILDING.x0 + BUILDING.x1) / 2, cz = (BUILDING.z0 + BUILDING.z1) / 2;
  const [ox, oz] = toWorldG({ x: 0, z: 0, ry }, cx, cz);   // the building's middle relative to its origin, turned
  const { px, pz } = parity(k), sn = (v, p) => p + Math.round((v - p) / CELL) * CELL + 0;
  return { id: GARAGE_ID, x: sn(x - ox, px), z: sn(z - oz, pz), ry };
}

/** the sandbox-space footprint rectangle [x0, z0, x1, z1] of a garage (garage + office wing) */
export function garageRect(g) {
  const B = BUILDING, pts = [[B.x0, B.z0], [B.x1, B.z0], [B.x0, B.z1], [B.x1, B.z1]].map(([a, b]) => toWorldG(g, a, b));
  return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
}
/** does any garage in `existing` refuse a building piece here? (the game's inBuilding, in that garage's own frame) */
export const inAnyGarage = (id, x, z, existing) => existing.some(e => isGarage(e) && (() => { const l = toLocalG(e, x, z); return inBuilding(id, l.lx, l.lz); })());
const overlap = (a, b) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 0.01 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 0.01;

export const GWHY = { aligned: "The garage must sit on the game's grid.", garage: 'Another garage is already there.', pieces: 'Built pieces are in the way.' };
/** '' = a garage can go here, else why not */
export function garageWhy(g, existing) {
  if (!garageAligned(g)) return GWHY.aligned;
  const r = garageRect(g);
  if (existing.some(e => isGarage(e) && overlap(r, garageRect(e)))) return GWHY.garage;
  if (existing.some(e => !isGarage(e) && (() => { const l = toLocalG(g, e.x, e.z); return inBuilding(e.id, l.lx, l.lz); })())) return GWHY.pieces;
  return '';
}
