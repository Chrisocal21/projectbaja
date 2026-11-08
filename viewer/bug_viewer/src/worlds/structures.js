// Modular building pieces for build mode: foundations, floors, roofs, walls, window walls, doors, garage doors, pillars.
// PURE rules, no rendering and no game state: grid snapping, which grid cells/edges/vertices a piece occupies, what supports it,
// and its collision. The 3D lives in StructureModels.jsx (a swappable skin) and the placement hooks in game/home.js.
// Coordinates here are garage-local metres. The grid is aligned to the original buildings, not to the origin: vertical grid lines sit on odd x
// (so the garage's side walls at x = +-7 are grid lines) and horizontal ones on even z (its front and back at z = +-6). New slabs and walls
// therefore meet the garage and the office wing flush. (The wing's outer wall at x = -13.2 is 0.2 m off the line at -13: an overlap of that size is allowed.)
// PROPOSAL: sizes, prices and rules are first-pass placeholders; the art is meant to be replaced (see StructureModels.jsx).
export const CELL = 2;
export const WALL_H = 3;
export const OX = 1, OZ = 0;   // where the grid lines are: x = OX + 2k, z = OZ + 2k
/** the original garage plus its office wing, garage-local */
export const BUILDING = { x0: -13.2, x1: 7, z0: -6, z1: 6 };

/** kind: cell (centred on a 2 m grid cell) | edge (centred on a cell edge, len along it) | vertex (on a grid corner). layer: what it conflicts with. */
export const PIECES = {
  foundation: { id: 'foundation', name: 'Foundation slab (2 x 2 m)', price: 30, kind: 'cell', layer: 'F', note: 'Everything else is built on a foundation' },
  floor: { id: 'floor', name: 'Floor (2 x 2 m)', price: 25, kind: 'cell', layer: 'L', note: 'Needs a foundation under it' },
  roof: { id: 'roof', name: 'Roof panel (2 x 2 m)', price: 30, kind: 'cell', layer: 'R', note: 'Needs a foundation below' },
  wall: { id: 'wall', name: 'Wall (2 m)', price: 35, kind: 'edge', len: 2, layer: 'E', note: 'Goes on a foundation edge' },
  windowWall: { id: 'windowWall', name: 'Window wall (2 m)', price: 55, kind: 'edge', len: 2, layer: 'E', note: 'Goes on a foundation edge' },
  door: { id: 'door', name: 'Door wall (2 m)', price: 70, kind: 'edge', len: 2, layer: 'E', open: 1.8, note: 'A walk-through doorway' },
  garageDoor: { id: 'garageDoor', name: 'Garage door wall (4 m)', price: 220, kind: 'edge', len: 4, layer: 'E', open: 3.4, note: 'Wide enough to drive a car through' },
  pillar: { id: 'pillar', name: 'Pillar', price: 15, kind: 'vertex', layer: 'P', note: 'Goes on a grid corner' },
};
export const PIECE_IDS = Object.keys(PIECES);
export const isPiece = id => id in PIECES;

const cx = v => Math.floor((v - OX) / CELL), cz = v => Math.floor((v - OZ) / CELL);      // cell index along x / z
const midX = i => OX + i * CELL + CELL / 2, midZ = i => OZ + i * CELL + CELL / 2;      // cell centre
const vx = v => Math.round((v - OX) / CELL), vz = v => Math.round((v - OZ) / CELL);    // grid-line index along x / z
const lineX = i => OX + i * CELL, lineZ = i => OZ + i * CELL;

/** snap a free point to a piece's grid → { x, z, ry } in garage-local metres (ry 0 = runs along x, PI/2 = runs along z) */
export function snap(piece, x, z) {
  const p = typeof piece === 'string' ? PIECES[piece] : piece;
  if (p.kind === 'cell') return { x: midX(cx(x)), z: midZ(cz(z)), ry: 0 };
  if (p.kind === 'vertex') return { x: lineX(vx(x)), z: lineZ(vz(z)), ry: 0 };
  const mx = midX(cx(x)), mz = midZ(cz(z)), fx = x - mx, fz = z - mz, long = p.len > CELL;
  if (Math.abs(fz) >= Math.abs(fx)) return { x: long ? lineX(vx(x)) : mx, z: mz + Math.sign(fz || 1) * CELL / 2, ry: 0 };
  return { x: mx + Math.sign(fx || 1) * CELL / 2, z: long ? lineZ(vz(z)) : mz, ry: Math.PI / 2 };
}
const alongX = ry => Math.abs(Math.sin(ry)) < 0.5;

/** the grid slots a placed piece takes, as `layer:key` strings: two pieces conflict when they share one */
export function slots(piece, x, z, ry = 0) {
  const p = typeof piece === 'string' ? PIECES[piece] : piece, out = [];
  if (p.kind === 'cell') return [`${p.layer}:${cx(x)},${cz(z)}`];
  if (p.kind === 'vertex') return [`${p.layer}:${vx(x)},${vz(z)}`];
  const n = Math.round(p.len / CELL);
  for (let k = 0; k < n; k++) {
    const o = (k - (n - 1) / 2) * CELL;   // centre of each 2 m segment along the piece
    out.push(alongX(ry) ? `${p.layer}:h${cx(x + o)},${vz(z)}` : `${p.layer}:v${vx(x)},${cz(z + o)}`);
  }
  return out;
}
/** the grid cells a piece stands next to or in: a foundation under any of them supports it */
export function supportCells(piece, x, z, ry = 0) {
  const p = typeof piece === 'string' ? PIECES[piece] : piece;
  if (p.kind === 'cell') return [[cx(x), cz(z)]];
  if (p.kind === 'vertex') { const i = vx(x), j = vz(z); return [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]; }
  const n = Math.round(p.len / CELL), out = [];
  for (let k = 0; k < n; k++) {
    const o = (k - (n - 1) / 2) * CELL;
    if (alongX(ry)) { const i = cx(x + o), j = vz(z); out.push([i, j - 1], [i, j]); } else { const i = vx(x), j = cz(z + o); out.push([i - 1, j], [i, j]); }
  }
  return out;
}
const foundationCells = existing => new Set(existing.filter(e => e.id === 'foundation').map(e => `${cx(e.x)},${cz(e.z)}`));
export const supported = (piece, x, z, ry, existing) => { const p = typeof piece === 'string' ? PIECES[piece] : piece; if (p.id === 'foundation') return true; const f = foundationCells(existing); return supportCells(p, x, z, ry).some(([i, j]) => f.has(`${i},${j}`)); };
export const conflicts = (piece, x, z, ry, existing) => { const mine = new Set(slots(piece, x, z, ry)); return existing.some(e => isPiece(e.id) && slots(e.id, e.x, e.z, e.ry || 0).some(s => mine.has(s))); };
/** what would be left unsupported if this piece were taken down (only foundations support things) → the pieces that would be orphaned */
export function dependents(target, existing) {
  if (target.id !== 'foundation') return [];
  const rest = existing.filter(e => e !== target), f = foundationCells(rest);
  return rest.filter(e => isPiece(e.id) && e.id !== 'foundation' && supportCells(e.id, e.x, e.z, e.ry || 0).some(c => `${c[0]},${c[1]}` === `${cx(target.x)},${cz(target.z)}`)
    && !supportCells(e.id, e.x, e.z, e.ry || 0).some(([i, j]) => f.has(`${i},${j}`)));
}
/** points that must all be on buildable ground: where the piece is, its ends and its corners */
export function probePoints(piece, x, z, ry = 0) {
  const p = typeof piece === 'string' ? PIECES[piece] : piece, h = CELL / 2;
  if (p.kind === 'cell') return [[x, z], [x - h, z - h], [x + h, z - h], [x - h, z + h], [x + h, z + h]];
  if (p.kind === 'vertex') return [[x, z]];
  const l = p.len / 2; return alongX(ry) ? [[x, z], [x - l, z], [x + l, z]] : [[x, z], [x, z - l], [x, z + l]];
}

/** collision circles [x, z, r] in the same local frame. Doorways stay open (a 1.0 m clear walk-through; garage doors 3 m+). */
export function circles(piece, x, z, ry = 0) {
  const p = typeof piece === 'string' ? PIECES[piece] : piece;
  if (p.kind === 'cell') return [];
  if (p.kind === 'vertex') return [[x, z, 0.22]];
  const dx = alongX(ry) ? 1 : 0, dz = alongX(ry) ? 0 : 1, half = p.len / 2, r = 0.15, out = [];
  const gap = p.open ? p.open / 2 : 0;   // the clear half-width of a doorway, centred
  for (let t = -half; t <= half + 1e-9; t += 0.5) { if (gap && Math.abs(t) < gap - 1e-9) continue; out.push([x + dx * t, z + dz * t, r]); }
  return out;
}
/** floors you can walk on: axis-aligned rects with a top height above the ground */
export function floorRect(piece, x, z) {
  const p = typeof piece === 'string' ? PIECES[piece] : piece;
  if (p.id === 'foundation') return { x0: x - 1, x1: x + 1, z0: z - 1, z1: z + 1, top: 0.12 };
  if (p.id === 'floor') return { x0: x - 1, x1: x + 1, z0: z - 1, z1: z + 1, top: 0.16 };
  return null;
}
/** is a piece on top of the original garage / wing? Cells may overlap its outer walls by up to `tol` m; edges may not sit on or inside it; a pillar may stand on its outer wall line. */
export function inBuilding(piece, x, z, tol = 0.25) {
  const p = typeof piece === 'string' ? PIECES[piece] : piece, B = BUILDING;
  if (p.kind === 'cell') return Math.min(x + 1, B.x1) - Math.max(x - 1, B.x0) > tol && Math.min(z + 1, B.z1) - Math.max(z - 1, B.z0) > tol;
  const e = p.kind === 'vertex' ? -0.01 : 0.01;   // a corner post may stand on the garage's outer wall line (a T-junction); a wall may not
  return x > B.x0 - e && x < B.x1 + e && z > B.z0 - e && z < B.z1 + e;
}

// ---- materials: what a piece is made of. PROPOSAL: ids, names and price multipliers are placeholders. The look of each lives in StructureModels.jsx. ----
export const MATERIALS = [
  { id: 'sheet', name: 'Painted steel sheet', mult: 1.0 },
  { id: 'siding', name: 'Wood siding', mult: 1.25 },
  { id: 'block', name: 'Concrete block', mult: 1.4 },
  { id: 'stucco', name: 'Stucco', mult: 1.3 },
  { id: 'rusty', name: "Weathered steel (like Walt's)", mult: 0.8 },
];
export const DEFAULT_MAT = 'sheet';   // what new pieces are made of unless you pick another: the newer, cleaner look
export const LEGACY_MAT = 'rusty';    // pieces built before materials existed keep the old weathered look
export const matOf = piece => piece?.mat || LEGACY_MAT;
export const nextMat = (id, d = 1) => { const i = MATERIALS.findIndex(m => m.id === id), n = MATERIALS.length; return MATERIALS[((i < 0 ? 0 : i) + d + n) % n].id; };
export const matName = id => (MATERIALS.find(m => m.id === id) || MATERIALS[0]).name;
/** what a piece costs in a material (whole dollars) */
export const piecePrice = (pieceId, mat = DEFAULT_MAT) => Math.round(PIECES[pieceId].price * (MATERIALS.find(m => m.id === mat)?.mult ?? 1));
