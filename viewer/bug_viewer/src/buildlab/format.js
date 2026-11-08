// The .baja-build.json format: one blueprint (a design made of the game's building pieces), and a library file holding many.
// PURE: no React, no three, no game state. Only imports the game's pure grid rules (worlds/structures.js).
//
// Blueprint (format "baja-build", version 1):
//   { format, version, name, description, category, author, created, thumbnail?,
//     grid: { cell: 2, ox: 1, oz: 0 },            grid lines sit at x = ox + 2k, z = oz + 2k (the game's garage-local grid)
//     origin: { x, z },                           min corner of the build, snapped DOWN to grid lines (where it was designed)
//     bounds: { minX, minZ, maxX, maxZ, w, d, h }, footprint incl. wall thickness, RELATIVE to origin (h = tallest piece)
//     count, price,                               informational (ignored on import)
//     pieces: [ { id, mat, x, z, ry } ] }         x, z RELATIVE to origin (metres); ry radians (0 = runs along x, PI/2 = along z)
//   Special piece: { id: "garage", x, z, ry } = Walt's whole garage + office wing (no mat); x, z = its garage-local origin (see garage.js).
// Because origin is on grid lines, a blueprint can be dropped at ANY grid-line corner and every piece lands on the grid.
// Library (format "baja-build-library", version 1): { format, version, name, author, exported, count, blueprints: [blueprint, ...] }
import { CELL, OX, OZ, WALL_H, PIECES, PIECE_IDS, isPiece, MATERIALS, slots, supported, piecePrice } from '../worlds/structures.js';
import { GARAGE_ID, GARAGE_TOP, isGarage, garageAligned, garageRect, garageWhy, inAnyGarage } from './garage.js';

export const FORMAT = 'baja-build', LIB_FORMAT = 'baja-build-library', VERSION = 1;
export const STORAGE_KEY = 'baja-buildlab-v1', LIBRARY_KEY = 'baja-buildlab-library-v1';
export const CATEGORIES = ['house', 'shop', 'shed', 'garage', 'barn', 'ruin', 'other'];
export const MAX_THUMB = 200000;   // characters of a thumbnail data URL we keep
const MAT_IDS = MATERIALS.map(m => m.id);
const Q = Math.PI / 2, EPS = 1e-6;

/** an angle snapped to the nearest quarter turn, canonical: exactly 0, PI/2, PI or 3*PI/2 */
export const normRy = ry => { const k = (((Math.round((ry || 0) / Q)) % 4) + 4) % 4; return k * Q; };
export const isQuarter = ry => typeof ry === 'number' && Number.isFinite(ry) && Math.abs(ry / Q - Math.round(ry / Q)) < 1e-6;
export const alongX = ry => Math.abs(Math.sin(ry)) < 0.5;
/** a stable identity for a placed piece (two pieces can never share all of these: they would conflict) */
export const pieceKey = p => `${p.id}|${p.mat}|${p.x}|${p.z}|${normRy(p.ry)}`;
const clean = p => (isGarage(p) ? { id: GARAGE_ID, x: p.x, z: p.z, ry: normRy(p.ry) } : { id: p.id, mat: p.mat, x: p.x, z: p.z, ry: normRy(p.ry) });
/** cell | edge | vertex | garage */
export const kindOf = id => (id === GARAGE_ID ? 'garage' : PIECES[id]?.kind);
const floorTo = (v, off) => off + Math.floor((v - off) / CELL + 1e-9) * CELL;

// heights of the models in StructureModels.jsx (top of each piece above the ground), and footprints across an edge / of a post
const TOP = { garage: GARAGE_TOP, foundation: 0.12, floor: 0.16, roof: 3.25, wall: 0.12 + WALL_H, windowWall: 0.12 + WALL_H, door: 0.12 + WALL_H, garageDoor: 0.12 + WALL_H, pillar: 0.12 + WALL_H };
const WALL_T = 0.24, POST = 0.42, ROOF = 2.1;   // wall incl. trim; post base plate; roof panel overhang

/** grid extent of a piece (thickness ignored): what the origin snaps to */
function gridExtent(p) {
  if (isGarage(p)) return garageRect(p);
  const d = PIECES[p.id];
  if (d.kind === 'cell') return [p.x - CELL / 2, p.z - CELL / 2, p.x + CELL / 2, p.z + CELL / 2];
  if (d.kind === 'vertex') return [p.x, p.z, p.x, p.z];
  const l = d.len / 2; return alongX(p.ry) ? [p.x - l, p.z, p.x + l, p.z] : [p.x, p.z - l, p.x, p.z + l];
}
/** the footprint of a piece's model, metres */
export function footprintOf(p) {
  if (isGarage(p)) return garageRect(p);
  const d = PIECES[p.id];
  if (d.kind === 'cell') { const h = (p.id === 'roof' ? ROOF : CELL) / 2; return [p.x - h, p.z - h, p.x + h, p.z + h]; }
  if (d.kind === 'vertex') return [p.x - POST / 2, p.z - POST / 2, p.x + POST / 2, p.z + POST / 2];
  const l = d.len / 2, t = WALL_T / 2; return alongX(p.ry) ? [p.x - l, p.z - t, p.x + l, p.z + t] : [p.x - t, p.z - l, p.x + t, p.z + l];
}
/** min corner of the build, snapped down to grid lines (ox/oz = where the grid lines are in this frame: absolute OX/OZ, or 0/0 when relative) */
export function gridOrigin(pieces, ox = OX, oz = OZ) {
  if (!pieces.length) return { x: ox, z: oz };
  let x0 = Infinity, z0 = Infinity;
  for (const p of pieces) { const e = gridExtent(p); x0 = Math.min(x0, e[0]); z0 = Math.min(z0, e[1]); }
  return { x: floorTo(x0, ox), z: floorTo(z0, oz) };
}
/** footprint bounds of the whole build, in the pieces' own frame */
export function boundsOf(pieces) {
  if (!pieces.length) return { minX: 0, minZ: 0, maxX: 0, maxZ: 0, w: 0, d: 0, h: 0 };
  let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity, h = 0;
  for (const p of pieces) { const f = footprintOf(p); a = Math.min(a, f[0]); b = Math.min(b, f[1]); c = Math.max(c, f[2]); e = Math.max(e, f[3]); h = Math.max(h, TOP[p.id] || 0); }
  const r = v => Math.round(v * 1000) / 1000;
  return { minX: r(a), minZ: r(b), maxX: r(c), maxZ: r(e), w: r(c - a), d: r(e - b), h: r(h) };
}
export const priceOf = pieces => pieces.reduce((s, p) => s + (isGarage(p) ? 0 : piecePrice(p.id, p.mat)), 0);   // the garage is free (it is Walt's)
export const countsOf = pieces => pieces.reduce((m, p) => ({ ...m, [p.id]: (m[p.id] || 0) + 1 }), {});

/** absolute pieces → relative to their grid origin */
export function toRel(pieces) {
  const o = gridOrigin(pieces);
  return { origin: o, rel: pieces.map(p => ({ ...clean(p), x: p.x - o.x, z: p.z - o.z })) };
}
/** relative pieces dropped at a grid-line corner → absolute */
export const placeRel = (rel, origin) => rel.map(p => ({ ...clean(p), x: p.x + origin.x, z: p.z + origin.z }));

/** a blueprint document from absolute pieces */
export function toDoc(pieces, meta = {}) {
  const { origin, rel } = toRel(pieces);
  const doc = {
    format: FORMAT, version: VERSION,
    name: meta.name || 'Untitled build', description: meta.description || '', category: CATEGORIES.includes(meta.category) ? meta.category : 'other',
    author: meta.author || '', created: meta.created || new Date().toISOString(),
    grid: { cell: CELL, ox: OX, oz: OZ }, origin, bounds: boundsOf(rel), count: rel.length, price: priceOf(rel), pieces: rel,
  };
  if (typeof meta.thumbnail === 'string' && meta.thumbnail) doc.thumbnail = meta.thumbnail;
  return doc;
}
/** pretty JSON with one piece per line (human-readable and diff-friendly) */
export function docText(doc) {
  const body = JSON.stringify({ ...doc, pieces: '\u0000P' }, null, 2);
  return body.replace('"\\u0000P"', doc.pieces.length ? `[\n    ${doc.pieces.map(p => JSON.stringify(p)).join(',\n    ')}\n  ]` : '[]');
}
export const fileName = (name, ext = 'baja-build') => `${String(name || 'build').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'build'}.${ext}.json`;

const parse = input => { if (typeof input !== 'string') return { obj: input }; try { return { obj: JSON.parse(input) }; } catch (e) { return { err: `Not valid JSON: ${e.message}` }; } };
const num = v => typeof v === 'number' && Number.isFinite(v);
const onLine = (v, off) => Math.abs((v - off) / CELL - Math.round((v - off) / CELL)) < 1e-9;
const onMid = (v, off) => onLine(v - CELL / 2, off);
/** is a building piece exactly where the game's snap() would put one? (cell: cell centre; vertex: grid corner; edge: on a line,
 *  centred on a cell (2 m) or on a corner (4 m garage door), running along x or z) */
export function onGrid(p) {
  const d = PIECES[p.id]; if (!d) return false;
  if (d.kind === 'cell') return onMid(p.x, OX) && onMid(p.z, OZ);
  if (d.kind === 'vertex') return onLine(p.x, OX) && onLine(p.z, OZ);
  const odd = Math.round(d.len / CELL) % 2 === 1;
  return alongX(p.ry) ? onLine(p.z, OZ) && (odd ? onMid(p.x, OX) : onLine(p.x, OX)) : onLine(p.x, OX) && (odd ? onMid(p.z, OZ) : onLine(p.z, OZ));
}

/** validate a blueprint (object or JSON text) → { fatal, problems, meta, origin, rel, pieces (absolute), total }.
 *  Only valid pieces are returned; each skipped one has a line in `problems`. `fatal` = nothing can be imported. */
export function fromDoc(input) {
  const out = { fatal: '', problems: [], meta: {}, origin: { x: OX, z: OZ }, rel: [], pieces: [], total: 0 };
  const { obj, err } = parse(input);
  if (err) return { ...out, fatal: err };
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ...out, fatal: 'Expected a JSON object.' };
  if (obj.format !== FORMAT) return { ...out, fatal: obj.format === LIB_FORMAT ? 'This is a library file (many blueprints), not a single blueprint.' : `Not a baja-build file (format is ${JSON.stringify(obj.format)}, expected "${FORMAT}").` };
  if (obj.version !== VERSION) return { ...out, fatal: `Unsupported version ${JSON.stringify(obj.version)}: this sandbox reads version ${VERSION}.` };
  if (obj.grid && obj.grid.cell !== undefined && obj.grid.cell !== CELL) return { ...out, fatal: `Grid cell is ${obj.grid.cell} m; the game's grid is ${CELL} m.` };
  if (!Array.isArray(obj.pieces)) return { ...out, fatal: '"pieces" must be a list.' };
  const o = obj.origin;
  if (!o || !num(o.x) || !num(o.z)) return { ...out, fatal: '"origin" must be { x, z } numbers.' };
  if (!onLine(o.x, OX) || !onLine(o.z, OZ)) return { ...out, fatal: `"origin" (${o.x}, ${o.z}) is not on the grid lines (x = ${OX} + 2k, z = ${OZ} + 2k).` };
  out.origin = { x: o.x, z: o.z };
  const str = (v, d = '') => (typeof v === 'string' ? v : d);
  out.meta = { name: str(obj.name, 'Untitled build'), description: str(obj.description), category: CATEGORIES.includes(obj.category) ? obj.category : 'other', author: str(obj.author), created: str(obj.created) };
  if (obj.category !== undefined && !CATEGORIES.includes(obj.category)) out.problems.push(`Unknown category ${JSON.stringify(obj.category)}: using "other".`);
  if (typeof obj.thumbnail === 'string') {
    if (obj.thumbnail.startsWith('data:image/') && obj.thumbnail.length <= MAX_THUMB) out.meta.thumbnail = obj.thumbnail;
    else out.problems.push('Thumbnail dropped (must be a data:image/ URL under 200 KB).');
  }
  out.total = obj.pieces.length;
  const ok = [], probs = [];   // [index, piece] / [index, text]. Two passes: garages first, so every piece is checked against them.
  const each = (p, i, garagePass) => {
    if (garagePass !== (!!p && typeof p === 'object' && p.id === GARAGE_ID)) return;
    const tag = `Piece #${i + 1}${p && typeof p.id === 'string' ? ` (${p.id})` : ''}`;
    if (!p || typeof p !== 'object') return probs.push([i, `${tag}: not an object.`]);
    if (p.id === GARAGE_ID) {   // the garage: aligned to the grid, not overlapping another garage
      if (!num(p.x) || !num(p.z)) return probs.push([i, `${tag}: x and z must be numbers.`]);
      const ry = p.ry === undefined ? 0 : p.ry;
      if (!isQuarter(ry)) return probs.push([i, `${tag}: ry ${JSON.stringify(p.ry)} is not a multiple of 90 degrees (PI/2 radians).`]);
      const a = { id: GARAGE_ID, x: p.x + o.x, z: p.z + o.z, ry: normRy(ry) };
      if (!garageAligned(a)) return probs.push([i, `${tag}: (${p.x}, ${p.z}) does not put the garage's walls on the grid lines.`]);
      const w = garageWhy(a, ok.map(([, q]) => q).filter(isGarage)); if (w) return probs.push([i, `${tag}: ${w}`]);
      ok.push([i, a]); return;
    }
    if (!isPiece(p.id)) return probs.push([i, `${tag}: unknown piece id ${JSON.stringify(p.id)} (known: ${PIECE_IDS.join(', ')}).`]);
    if (!MAT_IDS.includes(p.mat)) return probs.push([i, `${tag}: unknown material ${JSON.stringify(p.mat)} (known: ${MAT_IDS.join(', ')}).`]);
    if (!num(p.x) || !num(p.z)) return probs.push([i, `${tag}: x and z must be numbers.`]);
    const ry = p.ry === undefined ? 0 : p.ry;
    if (!isQuarter(ry)) return probs.push([i, `${tag}: ry ${JSON.stringify(p.ry)} is not a multiple of 90 degrees (PI/2 radians).`]);
    const a = { id: p.id, mat: p.mat, x: p.x + o.x, z: p.z + o.z, ry: normRy(ry) };
    const kind = PIECES[p.id].kind;
    if (!onGrid(a)) return probs.push([i, `${tag}: (${p.x}, ${p.z}) is off the grid for a ${kind} piece.`]);
    if (kind !== 'edge' && a.ry !== 0) a.ry = 0;   // cells and posts are always ry 0 in the game
    const mine = new Set(slots(a.id, a.x, a.z, a.ry)), hit = ok.find(([, q]) => !isGarage(q) && slots(q.id, q.x, q.z, q.ry).some(k => mine.has(k)));
    if (hit) return probs.push([i, `${tag}: overlaps piece #${hit[0] + 1} (${hit[1].id}).`]);
    if (inAnyGarage(a.id, a.x, a.z, ok.map(([, q]) => q))) return probs.push([i, `${tag}: inside / along the garage (the game refuses it there).`]);
    ok.push([i, a]);
  };
  obj.pieces.forEach((p, i) => each(p, i, true)); obj.pieces.forEach((p, i) => each(p, i, false));
  ok.sort((x, y) => x[0] - y[0]); probs.sort((x, y) => x[0] - y[0]); out.problems.push(...probs.map(q => q[1]));
  // support: drop anything with no foundation under it (repeat: dropping one thing can't orphan another, but stay safe)
  let keep = ok;
  for (;;) {
    const all = keep.map(([, q]) => q), next = keep.filter(([i, q]) => { if (isGarage(q)) return true; const s = supported(q.id, q.x, q.z, q.ry, all); if (!s) out.problems.push(`Piece #${i + 1} (${q.id}): nothing holds it up (needs a foundation slab next to / under it).`); return s; });
    if (next.length === keep.length) break; keep = next;
  }
  out.pieces = keep.map(([, q]) => q);
  out.rel = out.pieces.map(q => ({ ...q, x: q.x - o.x, z: q.z - o.z }));
  if (!out.total) out.problems.push('The blueprint has no pieces.');
  return out;
}

/** turn relative pieces by `turns` quarter turns (counter-clockwise seen from above, same as three's rotation.y) about the origin,
 *  then shift so the min corner is back on (0, 0). Every piece stays on the grid because the origin is a grid-line corner. */
export function rotateRel(rel, turns = 0) {
  const k = ((turns % 4) + 4) % 4; if (!k || !rel.length) return rel.map(clean);
  const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k];   // exact cos / sin
  const turned = rel.map(p => ({ ...clean(p), x: p.x * c + p.z * s + 0, z: -p.x * s + p.z * c + 0, ry: normRy(p.ry + k * Q) }))
    .map(p => (kindOf(p.id) === 'edge' || kindOf(p.id) === 'garage' ? p : { ...p, ry: 0 }));
  const o = gridOrigin(turned, 0, 0);
  return turned.map(p => ({ ...p, x: p.x - o.x + 0, z: p.z - o.z + 0 }));   // + 0 turns -0 into 0
}
/** the size (grid extent) of a relative blueprint, for centring it on the mouse */
export function gridSize(rel) {
  let x1 = 0, z1 = 0; for (const p of rel) { const e = gridExtent(p); x1 = Math.max(x1, e[2]); z1 = Math.max(z1, e[3]); } return { w: x1, d: z1 };
}
/** where a blueprint goes when its centre is at a free point: its origin, snapped to the nearest grid-line corner */
export function stampOrigin(rel, x, z) {
  const { w, d } = gridSize(rel);
  return { x: OX + Math.round((x - w / 2 - OX) / CELL) * CELL, z: OZ + Math.round((z - d / 2 - OZ) / CELL) * CELL };
}

/** the pieces whose centre lies inside a rectangle (absolute metres; corners in any order) */
export function extractRegion(pieces, r) {
  const x0 = Math.min(r.x0, r.x1), x1 = Math.max(r.x0, r.x1), z0 = Math.min(r.z0, r.z1), z1 = Math.max(r.z0, r.z1);
  return pieces.filter(p => p.x >= x0 - EPS && p.x <= x1 + EPS && p.z >= z0 - EPS && p.z <= z1 + EPS);
}

/** a library file from blueprint docs */
export const toLibrary = (docs, meta = {}) => ({ format: LIB_FORMAT, version: VERSION, name: meta.name || 'Blueprint library', author: meta.author || '', exported: meta.exported || new Date().toISOString(), count: docs.length, blueprints: docs });
export const libraryText = lib => `{\n${Object.entries({ ...lib, blueprints: undefined }).filter(([, v]) => v !== undefined).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')},\n  "blueprints": [\n${lib.blueprints.map(d => docText(d).replace(/^/gm, '    ')).join(',\n')}\n  ]\n}`;

/** read any file the sandbox accepts: one blueprint or a library → { fatal, kind, items: [fromDoc result + { name }] } */
export function parseAny(input) {
  const { obj, err } = parse(input);
  if (err) return { fatal: err, kind: '', items: [] };
  if (obj && obj.format === LIB_FORMAT) {
    if (obj.version !== VERSION) return { fatal: `Unsupported library version ${JSON.stringify(obj.version)}: this sandbox reads version ${VERSION}.`, kind: 'library', items: [] };
    if (!Array.isArray(obj.blueprints)) return { fatal: '"blueprints" must be a list.', kind: 'library', items: [] };
    return { fatal: '', kind: 'library', items: obj.blueprints.map((b, i) => { const r = fromDoc(b); return { ...r, name: r.meta.name || (b && typeof b.name === 'string' ? b.name : `Blueprint #${i + 1}`) }; }) };
  }
  const r = fromDoc(obj);
  return { fatal: r.fatal, kind: 'blueprint', items: r.fatal ? [] : [{ ...r, name: r.meta.name }] };
}

/** "Name", "Name (2)", "Name (3)"... — the first not in `taken` */
export function uniqueName(name, taken) {
  const set = new Set(taken); if (!set.has(name)) return name;
  const base = name.replace(/ \(\d+\)$/, ''); for (let n = 2; ; n++) if (!set.has(`${base} (${n})`)) return `${base} (${n})`;
}
