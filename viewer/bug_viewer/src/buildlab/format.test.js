// node --test src/buildlab/format.test.js   (pure: no React / three)
import test from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, snap, conflicts, supported, OX, OZ } from '../worlds/structures.js';
import { FORMAT, LIB_FORMAT, VERSION, normRy, toDoc, docText, fromDoc, fileName, gridOrigin, boundsOf, rotateRel, placeRel, extractRegion, stampOrigin, toLibrary, libraryText, parseAny, uniqueName, toRel, pieceKey } from './format.js';
import { placeWhy, removeWhy, snapPiece, stampWhy, WHY } from './rules.js';
import { snapGarage, garageAligned, garageWhy, toLocalG, toWorldG, GWHY } from './garage.js';
import { inBuilding } from '../worlds/structures.js';

// a small hut: 2 x 2 cells of foundation, 4 walls round the outside incl. a door and a window, a roof, a pillar
function hut(dx = 0, dz = 0) {
  const P = [];
  const add = (id, x, z, mat = 'sheet', flip = false) => { const s = snapPiece(id, x + dx, z + dz, flip); P.push({ id, mat, ...s }); };
  for (const [x, z] of [[2, 1], [4, 1], [2, 3], [4, 3]]) add('foundation', x, z, 'block');
  add('wall', 2, 0.1); add('door', 4, 0.1, 'siding', true);           // front (z = 0 line)
  add('wall', 2, 3.9); add('windowWall', 4, 3.9);                      // back (z = 4 line)
  add('wall', 1.1, 1); add('wall', 1.1, 3); add('wall', 4.9, 1); add('wall', 4.9, 3);   // sides
  add('roof', 2, 1); add('pillar', 5, 4.2);
  return P;
}

test('every hut piece is valid by the game rules, placed in order', () => {
  const placed = [];
  for (const p of hut()) { assert.equal(placeWhy(p.id, p.x, p.z, p.ry, placed), '', p.id); placed.push(p); }
  assert.equal(placed.length, 14);
});

test('rules: conflicts, support, garage footprint, dependents (same wording as the game)', () => {
  const P = hut();
  assert.equal(placeWhy('wall', P[4].x, P[4].z, P[4].ry, P), WHY.taken);
  const far = snap('wall', 20, 20.1); assert.equal(placeWhy('wall', far.x, far.z, far.ry, P), WHY.support);
  const g = snap('foundation', 0, 0); assert.equal(placeWhy('foundation', g.x, g.z, 0, [{ id: 'garage', x: 0, z: 0, ry: 0 }]), WHY.garage);
  assert.equal(placeWhy('foundation', g.x, g.z, 0, []), '');
  assert.equal(removeWhy(P[0], P), WHY.dependents);
  assert.equal(removeWhy(P[4], P), '');
  // flip keeps the slot, turns the piece
  const a = snapPiece('door', 4, 0.1), b = snapPiece('door', 4, 0.1, true);
  assert.deepEqual([a.x, a.z], [b.x, b.z]); assert.equal(b.ry, normRy(a.ry + Math.PI));
  assert.ok(conflicts('wall', a.x, a.z, b.ry, [{ id: 'door', ...a }]));
});

test('normRy is canonical', () => {
  assert.equal(normRy(0), 0); assert.equal(normRy(-Math.PI / 2), 3 * (Math.PI / 2)); assert.equal(normRy(Math.PI / 2 + 4 * Math.PI), Math.PI / 2);
  assert.equal(normRy((3 * Math.PI / 2 + Math.PI) % (2 * Math.PI)), Math.PI / 2);
});

test('origin is the min corner snapped to grid lines; positions are relative; bounds include wall thickness', () => {
  const P = hut(), d = toDoc(P, { name: 'Hut' });
  assert.equal(d.format, FORMAT); assert.equal(d.version, VERSION);
  assert.deepEqual(d.origin, { x: 1, z: 0 });
  assert.deepEqual(d.grid, { cell: 2, ox: OX, oz: OZ });
  assert.ok(d.pieces.every(p => Number.isInteger(p.x) && Number.isInteger(p.z)));
  assert.deepEqual(d.pieces[0], { id: 'foundation', mat: 'block', x: 1, z: 1, ry: 0 });
  assert.equal(d.bounds.minX, -0.12); assert.equal(d.bounds.minZ, -0.12); assert.equal(d.bounds.w, 4.33); assert.equal(d.bounds.h, 3.25);
  assert.equal(d.count, 14);
  // the same build moved by a whole number of cells gives the same relative pieces
  assert.deepEqual(toDoc(hut(6, -10)).pieces, d.pieces);
  assert.deepEqual(gridOrigin([]), { x: OX, z: OZ });
  assert.equal(boundsOf([]).w, 0);
});

test('round-trip is exact (object and text)', () => {
  const P = hut(-8, 12), meta = { name: 'Hut', author: 'dev', description: 'test', category: 'shed', created: '2026-11-08T00:00:00.000Z', thumbnail: 'data:image/jpeg;base64,AAAA' };
  const d = toDoc(P, meta), t = docText(d);
  assert.deepEqual(JSON.parse(t), d);
  const r = fromDoc(t);
  assert.equal(r.fatal, ''); assert.deepEqual(r.problems, []);
  assert.deepEqual(r.pieces, P.map(p => ({ id: p.id, mat: p.mat, x: p.x, z: p.z, ry: p.ry })));
  assert.deepEqual(toDoc(r.pieces, r.meta), d);
  assert.equal(docText(toDoc(r.pieces, r.meta)), t);
  assert.equal(fileName('Walt\'s new Shed!'), 'walt-s-new-shed.baja-build.json');
});

test('import validation: bad version / format are fatal, bad pieces are listed and skipped', () => {
  const d = toDoc(hut(), { name: 'Hut' });
  assert.match(fromDoc({ ...d, version: 2 }).fatal, /version 2/);
  assert.match(fromDoc({ ...d, format: 'nope' }).fatal, /Not a baja-build/);
  assert.match(fromDoc('{oops').fatal, /Not valid JSON/);
  assert.match(fromDoc({ ...d, origin: { x: 0, z: 0 } }).fatal, /not on the grid lines/);
  const bad = { ...d, pieces: [...d.pieces, { id: 'chimney', mat: 'sheet', x: 1, z: 1, ry: 0 }, { id: 'wall', mat: 'gold', x: 1, z: 6, ry: 0 }, { id: 'wall', mat: 'sheet', x: 1.3, z: 0, ry: 0 }, { id: 'wall', mat: 'sheet', x: 1, z: 0, ry: 0.3 }, d.pieces[4], { id: 'wall', mat: 'sheet', x: 13, z: 20, ry: 0 }] };
  const r = fromDoc(bad);
  assert.equal(r.fatal, '');
  assert.equal(r.pieces.length, 14); assert.equal(r.total, 20);
  assert.equal(r.problems.length, 6);
  assert.match(r.problems[0], /unknown piece id "chimney"/);
  assert.match(r.problems[1], /unknown material "gold"/);
  assert.match(r.problems[2], /off the grid/);
  assert.match(r.problems[3], /not a multiple of 90/);
  assert.match(r.problems[4], /overlaps piece #5/);
  assert.match(r.problems[5], /nothing holds it up/);
});

test('rotating a blueprint by quarter turns keeps every piece on the grid, valid, and four turns is identity', () => {
  const { rel } = toRel(hut());
  for (let k = 0; k < 4; k++) {
    const r = rotateRel(rel, k);
    assert.deepEqual(gridOrigin(r, 0, 0), { x: 0, z: 0 }, `turn ${k}: min corner back on 0,0`);
    const abs = placeRel(r, { x: OX + 6, z: OZ - 8 });
    for (const p of abs) { const s = snap(p.id, p.x, p.z); assert.deepEqual([s.x, s.z], [p.x, p.z], `turn ${k} ${p.id} on grid`); if (PIECES[p.id].kind === 'edge') assert.equal(Math.abs(Math.sin(s.ry)) < 0.5, Math.abs(Math.sin(p.ry)) < 0.5); }
    assert.deepEqual(stampWhy(abs, []).bad, [], `turn ${k}: all valid`);
    assert.equal(fromDoc(toDoc(abs)).problems.length, 0);
  }
  assert.deepEqual(rotateRel(rotateRel(rotateRel(rotateRel(rel, 1), 1), 1), 1), rel);
  assert.deepEqual(rotateRel(rel, 4), rel);
  // one quarter turn: the 4 x 4 m hut stays 4 x 4; the door (front, z = 0 line) ends up on the x = 0 side... facing turned by 90
  const r1 = rotateRel(rel, 1), door0 = rel.find(p => p.id === 'door'), door1 = r1.find(p => p.id === 'door');
  assert.equal(door1.ry, normRy(door0.ry + Math.PI / 2)); assert.deepEqual([door0.x, door0.z], [3, 0]); assert.deepEqual([door1.x, door1.z], [0, 1]);
  assert.ok(r1.every(p => p.x >= 0 && p.z >= 0 && p.x <= 4 && p.z <= 4));
});

test('stamp: origin snaps to grid-line corners, conflicts make the whole stamp red', () => {
  const { rel } = toRel(hut());
  const o = stampOrigin(rel, 10.3, 7.7); assert.equal((o.x - OX) % 2, 0); assert.equal((o.z - OZ) % 2, 0);
  const world = hut(), here = placeRel(rel, { x: 1, z: 0 });
  const s = stampWhy(here, world); assert.match(s.why, /already built/); assert.equal(s.bad.length, 14);
  const half = placeRel(rel, { x: 3, z: 0 }), h = stampWhy(half, world);
  assert.ok(h.bad.length > 0 && h.bad.length < 14);
  assert.deepEqual(stampWhy(placeRel(rel, { x: 11, z: 0 }), world).bad, []);
});

test('region extraction picks pieces by their centre; two designs side by side separate cleanly', () => {
  const A = hut(), B = hut(10, 0), all = [...A, ...B];
  const ra = extractRegion(all, { x0: 0, z0: -1, x1: 6, z1: 5 });
  assert.deepEqual(ra.map(pieceKey).sort(), A.map(pieceKey).sort());
  const rb = extractRegion(all, { x1: 10, z1: -1, x0: 16, z0: 5 });   // corners in any order
  assert.deepEqual(toDoc(rb).pieces, toDoc(A).pieces);   // same design, so the same relative blueprint
  assert.equal(extractRegion(all, { x0: 100, z0: 100, x1: 102, z1: 102 }).length, 0);
});

test('library: many blueprints in one file, round-trip, validation per blueprint', () => {
  const a = toDoc(hut(), { name: 'Hut', category: 'shed', created: '2026-11-08T00:00:00.000Z' }), b = toDoc(rotateRel(toRel(hut()).rel, 1).map(p => ({ ...p, x: p.x + 1, z: p.z })), { name: 'Hut turned', category: 'house', created: '2026-11-08T00:00:00.000Z' });
  const lib = toLibrary([a, b], { author: 'dev', exported: '2026-11-08T01:00:00.000Z' }), t = libraryText(lib);
  assert.deepEqual(JSON.parse(t), lib);
  assert.equal(lib.format, LIB_FORMAT);
  const r = parseAny(t);
  assert.equal(r.fatal, ''); assert.equal(r.kind, 'library'); assert.equal(r.items.length, 2);
  assert.deepEqual(r.items.map(i => i.name), ['Hut', 'Hut turned']);
  r.items.forEach((it, i) => { assert.deepEqual(it.problems, []); assert.deepEqual(toDoc(it.pieces, it.meta), [a, b][i]); });
  const one = parseAny(docText(a)); assert.equal(one.kind, 'blueprint'); assert.equal(one.items.length, 1);
  const broken = parseAny(JSON.stringify(toLibrary([a, { ...b, version: 9 }])));
  assert.equal(broken.items[0].fatal, ''); assert.match(broken.items[1].fatal, /version 9/);
  assert.match(parseAny(JSON.stringify({ ...lib, version: 3 })).fatal, /library version 3/);
  assert.match(fromDoc(lib).fatal, /library file/);
});

test('uniqueName renames on a clash', () => {
  assert.equal(uniqueName('Hut', []), 'Hut');
  assert.equal(uniqueName('Hut', ['Hut']), 'Hut (2)');
  assert.equal(uniqueName('Hut', ['Hut', 'Hut (2)']), 'Hut (3)');
  assert.equal(uniqueName('Hut (2)', ['Hut', 'Hut (2)']), 'Hut (3)');
});

test('supported() from the game agrees with the sandbox for a stamped blueprint', () => {
  const abs = placeRel(rotateRel(toRel(hut()).rel, 3), { x: -9, z: 14 });
  for (const p of abs) assert.ok(supported(p.id, p.x, p.z, p.ry, abs), p.id);
});

test('a 4 m garage door running along z is on the grid and survives import (regression: snap() is ambiguous at a grid corner)', () => {
  const P = hut().filter(p => !(p.id === 'wall' && p.x === 5)); P.splice(P.findIndex(p => p.id === 'pillar'), 1);
  P.push({ id: 'garageDoor', mat: 'sheet', ...snapPiece('garageDoor', 5, 2.9) });
  assert.equal(P[P.length - 1].ry, Math.PI / 2); assert.deepEqual([P[P.length - 1].x, P[P.length - 1].z], [5, 2]);
  const r = fromDoc(docText(toDoc(P))); assert.deepEqual(r.problems, []); assert.equal(r.pieces.length, P.length);
  for (let k = 0; k < 4; k++) assert.deepEqual(fromDoc(toDoc(placeRel(rotateRel(toRel(P).rel, k), { x: 1, z: 0 }))).problems, [], `turn ${k}`);
});

// ---- the garage as a placeable item ----
test('garage snapping keeps its walls on the grid lines at every quarter turn', () => {
  const onL = (v, off) => Math.abs(((v - off) / 2) - Math.round((v - off) / 2)) < 1e-9;
  for (let k = 0; k < 4; k++) for (const [x, z] of [[0, 0], [3.3, -7.9], [-12.2, 15.1]]) {
    const g = snapGarage(x, z, k); assert.ok(garageAligned(g), `turn ${k} at ${x},${z}`); assert.equal(g.ry, k * Math.PI / 2);
    // the garage's side walls (local x = +-7) and front/back (local z = +-6) land on sandbox grid lines
    for (const lx of [7, -7]) { const [wx, wz] = toWorldG(g, lx, 0); assert.ok(k % 2 ? onL(wz, OZ) : onL(wx, OX), `turn ${k} side wall`); }
    for (const lz of [6, -6]) { const [wx, wz] = toWorldG(g, 0, lz); assert.ok(k % 2 ? onL(wx, OX) : onL(wz, OZ), `turn ${k} front/back`); }
    const back = toLocalG(g, ...toWorldG(g, 3, -5)); assert.deepEqual([back.lx, back.lz], [3, -5]);
  }
  assert.ok(!garageAligned({ id: 'garage', x: 1, z: 0, ry: 0 })); assert.ok(!garageAligned({ id: 'garage', x: 0, z: 0, ry: Math.PI / 2 }));
  assert.ok(garageAligned({ id: 'garage', x: 0, z: 0, ry: 0 }));   // where the game has it
});

test('building against a placed garage follows the game: no walls along an original wall, slabs outside, corner posts ok', () => {
  for (let k = 0; k < 4; k++) {
    const g = snapGarage(5, 5, k), W = [g], at = (lx, lz) => toWorldG(g, lx, lz);
    const out = { id: 'foundation', mat: 'sheet', ...snapPiece('foundation', ...at(8, 1)) };
    assert.equal(placeWhy('foundation', out.x, out.z, 0, W), '', `turn ${k} outside`);
    const inn = snapPiece('foundation', ...at(2, 1)); assert.equal(placeWhy('foundation', inn.x, inn.z, 0, W), WHY.garage, `turn ${k} inside`);
    const w = snapPiece('wall', ...at(7, 1)); assert.equal(placeWhy('wall', w.x, w.z, w.ry, [...W, out]), WHY.garage, `turn ${k} wall along the right wall`);
    const w2 = snapPiece('wall', ...at(9, 1)); assert.equal(placeWhy('wall', w2.x, w2.z, w2.ry, [...W, out]), '', `turn ${k} outer wall of the extension`);
    const corner = { id: 'foundation', mat: 'sheet', ...snapPiece('foundation', ...at(8, 7)) }, p = snapPiece('pillar', ...at(7, 6));
    assert.equal(inBuilding('pillar', 7, 6), false); assert.equal(placeWhy('pillar', p.x, p.z, 0, [...W, corner]), '', `turn ${k} corner post`);
  }
});

test('garages: overlap refused, pieces in the way refused, removable, round-trip and rotation keep them aligned', () => {
  const g = snapGarage(0, 0, 0); g.x = 0; g.z = 0;
  assert.equal(garageWhy(snapGarage(4, 2, 1), [g]), GWHY.garage);
  assert.equal(garageWhy(snapGarage(40, 0, 0), [g]), '');
  assert.equal(garageWhy(g, [{ id: 'foundation', mat: 'sheet', ...snapPiece('foundation', -2, 1) }]), GWHY.pieces);
  assert.equal(removeWhy(g, [g]), '');
  // the garage with a bay built onto its right wall, as one blueprint
  const ext = [g], add = (id, lx, lz, flip) => ext.push({ id, mat: 'siding', ...snapPiece(id, ...toWorldG(g, lx, lz), flip) });
  add('foundation', 8, 1); add('foundation', 8, 3); add('wall', 9, 1); add('wall', 9, 3); add('door', 8, 0); add('roof', 8, 1);
  ext.forEach((p, i) => assert.equal(placeWhy(p.id, p.x, p.z, p.ry, ext.slice(0, i)), '', `${i} ${p.id}`));
  const d = toDoc(ext, { name: 'Garage + bay' });
  assert.deepEqual(d.pieces[0], { id: 'garage', x: -d.origin.x, z: -d.origin.z, ry: 0 }); assert.ok(!('mat' in d.pieces[0]));
  assert.equal(d.bounds.h, 6.95);
  const r = fromDoc(docText(d)); assert.deepEqual(r.problems, []); assert.deepEqual(toDoc(r.pieces, r.meta), d);
  // garage listed AFTER the pieces still validates (two passes) and keeps its place in the list
  const r2 = fromDoc({ ...d, pieces: [...d.pieces.slice(1), d.pieces[0]] }); assert.deepEqual(r2.problems, []); assert.equal(r2.pieces[r2.pieces.length - 1].id, 'garage');
  // a piece inside the garage in a file is reported and skipped
  const r3 = fromDoc({ ...d, pieces: [...d.pieces, { id: 'foundation', mat: 'sheet', x: 2 - d.origin.x, z: 1 - d.origin.z, ry: 0 }] });
  assert.equal(r3.pieces.length, d.pieces.length); assert.match(r3.problems.join('\n'), /inside \/ along the garage/);
  assert.match(fromDoc({ ...d, pieces: [{ ...d.pieces[0], x: d.pieces[0].x + 1 }] }).problems[0], /walls on the grid/);
  // rotating the whole blueprint keeps the garage aligned and the bay valid against it, at the same garage-local spot
  for (let k = 0; k < 4; k++) {
    const abs = placeRel(rotateRel(d.pieces, k), { x: OX + 20, z: OZ - 30 }), ga = abs.find(p => p.id === 'garage');
    assert.ok(garageAligned(ga), `turn ${k}`); assert.equal(ga.ry, normRy(k * Math.PI / 2));
    assert.deepEqual(stampWhy(abs, []).bad, [], `turn ${k}`);
    assert.deepEqual(fromDoc(toDoc(abs)).problems, [], `turn ${k} file`);
    const f = abs.filter(p => p.id === 'foundation').map(p => toLocalG(ga, p.x, p.z)).map(l => `${l.lx},${l.lz}`).sort();
    assert.deepEqual(f, ['8,1', '8,3'], `turn ${k} local`);
  }
  assert.match(stampWhy(placeRel(d.pieces, d.origin), [g]).why, /Garage: Another garage/);
});
