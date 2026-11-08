import test from 'node:test';
import assert from 'node:assert/strict';
import { placement } from './types.js';
import { why, restY } from './rules.js';
import { toCar, fromCar } from './vehicleSurfaces.js';
import { GAME_PLACEABLES, TIRE_SIZE } from './gameItems.js';
import { garageSurfaces, floorBlocks, dropRackItems, garagePl, toLocalG, toWorldG, rackSurfId, propOfSurf, FLOOR_ID } from './garageSurfaces.js';

const items = GAME_PLACEABLES, T = items.tire;
const defs = { shelfTires: { id: 'shelfTires', r: 0.45, len: 2.4 }, tireStack: { id: 'tireStack', r: 0.5 }, compressor: { id: 'compressor', r: 0.4 }, wall: { id: 'wall', r: 0, struct: true }, neon: { id: 'neon', r: 0 } };
const G = { x: 0, z: 0, rot: 0, y: 0 }, flat = () => 0.12;
const props = [{ uid: 1, id: 'shelfTires', x: -6.5, z: 0, ry: Math.PI / 2 }, { uid: 2, id: 'tireStack', x: -5.2, z: 4.6, ry: 0 }, { uid: 3, id: 'compressor', x: 0.3, z: -5.4, ry: 0 }, { uid: 4, id: 'wall', x: 3, z: 3, ry: 0 }, { uid: 5, id: 'neon', x: 2, z: 2, ry: 0 }];
const S = (p = props, g = G) => garageSurfaces(p, defs, g, flat);
const byId = l => Object.fromEntries(l.map(s => [s.id, s]));
let n = 0;
const at = (s, x, z, extra = {}) => placement({ id: extra.id || 't' + ++n, item: 'tire', surface: s.id, x, z, ...extra });
const tire = (uid, surf, x, z, y = 0, ry = 0) => ({ uid, kind: 'wheel', id: 'x', loc: 'garage', spot: 'grid', surf, x, z, y, ry });
const close = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m || ''} expected ${b}, got ${a}`);

test('surfaces: a floor, three boards per tire shelf, one pad per tire stack; ids carry the prop uid; other props add nothing', () => {
  assert.deepEqual(S().map(s => s.id), [FLOOR_ID, 'rack:1:0', 'rack:1:1', 'rack:1:2', 'rack:2:0']);
  assert.equal(propOfSurf('rack:1:2'), 1); assert.equal(propOfSurf(FLOOR_ID), null); assert.equal(rackSurfId(7, 1), 'rack:7:1');
  assert.ok(S().every(s => s.accepts.length === 1 && s.accepts[0] === 'tire'));
});

test('frame: a rack board sits where the rack is, turned with it, at the right height (same maths as homeLocal / toWorld)', () => {
  const s = byId(S())['rack:1:1'];
  close(s.at.x, -6.5); close(s.at.z, 0); close(s.at.y, 0.12 + 1.48); close(s.at.rotY, Math.PI / 2);
  const end = toCar(s, 0, s.size[1] / 2, 0);   // one end of the board; turned a quarter it is at garage z = +1.1
  close(end.x, -6.5); close(end.z, 1.1);
  const back = fromCar(s, end.x, end.z); close(back.x, 0); close(back.z, s.size[1] / 2);
});
test('frame: a turned garage (G.rot) keeps boards in garage-local space; world <-> local round-trips', () => {
  const g = { x: 10, z: -4, rot: 0.6, y: 0 }, [wx, wz] = toWorldG(g, 3, -2), l = toLocalG(g, wx, wz);
  close(l.lx, 3); close(l.lz, -2);
  const s = byId(S([{ uid: 1, id: 'shelfTires', x: wx, z: wz, ry: 0.9 }], g))['rack:1:0'];
  close(s.at.x, 3); close(s.at.z, -2); close(s.at.rotY, 0.3);
});

test('rack rules: a tire goes on a board, a second stacks on it, a third is too tall (headroom), one beside it fits', () => {
  const s = byId(S())['rack:1:0'], mid = s.size[0] / 2, z = s.size[1] / 2;
  const a = at(s, mid, z, { id: 'a' }); assert.equal(why(s, T, a, [], items), null);
  const b = at(s, mid, z, { id: 'b' }); b.y = restY(b, T, [a], items); close(b.y, TIRE_SIZE.width); assert.equal(why(s, T, b, [a], items), null);
  const c = at(s, mid, z, { id: 'c' }); c.y = restY(c, T, [a, b], items); assert.equal(why(s, T, c, [a, b], items), 'too tall for here');
  assert.equal(why(s, T, at(s, mid + 0.7, z, { id: 'd' }), [a, b], items), null);
});
test('rack rules: three tires fit side by side on a board, a fourth is off the surface', () => {
  const s = byId(S())['rack:1:2'], z = s.size[1] / 2, w = T.footprint[0];
  const row = [0, 1, 2].map(i => at(s, w / 2 + i * w, z, { id: 'r' + i }));
  row.forEach((p, i) => assert.equal(why(s, T, p, row.filter((_, j) => j !== i), items), null, 'tire ' + i));
  assert.equal(why(s, T, at(s, w / 2 + 3 * w, z, { id: 'r3' }), row, items), 'off the surface');
});
test('rack rules: red reasons (overlap, off the end, not a tire) and the tire stack pad holds two', () => {
  const s = byId(S())['rack:1:0'], z = s.size[1] / 2, a = at(s, 1, z, { id: 'a' });
  assert.equal(why(s, T, at(s, 1.3, z, { id: 'n' }), [a], items), "something's in the way");
  assert.equal(why(s, T, at(s, -0.1, z, { id: 'o' }), [], items), 'off the surface');
  assert.equal(why(s, items.crate1, placement({ item: 'crate1', surface: s.id, x: 1, z }), [], items), "this surface doesn't take that");
  const p = byId(S())['rack:2:0'], q = p.size[0] / 2, t1 = at(p, q, q, { id: 't1' }), t2 = at(p, q, q, { id: 't2' }); t2.y = TIRE_SIZE.width;
  assert.equal(why(p, T, t1, [], items), null); assert.equal(why(p, T, t2, [t1], items), null);
  const t3 = at(p, q, q, { id: 't3' }); t3.y = TIRE_SIZE.width * 2; assert.equal(why(p, T, t3, [t1, t2], items), 'too tall for here');
});
test('floor rules: open floor takes tires and stacks them; a prop blocks its footprint; the wall margin is the edge', () => {
  const f = byId(S())['floor'], [fw, fd] = f.size;
  assert.equal(floorBlocks(props, defs, G).length, 3);   // shelf, stack, compressor: not the wall piece nor the neon
  assert.equal(why(f, T, at(f, 2 + fw / 2, 2 + fd / 2, { id: 'o' }), [], items), null);
  assert.equal(why(f, T, at(f, -6.1 + fw / 2, fd / 2, { id: "blk" }), [], items), "something's in the way");
  assert.equal(why(f, T, at(f, 0.2, 3, { id: 'edge' }), [], items), 'off the surface');
  const st = [0, 1, 2].map(i => { const p = at(f, fw / 2, fd / 2, { id: 's' + i }); p.y = i * TIRE_SIZE.width; return p; });
  assert.equal(why(f, T, st[2], st.slice(0, 2), items), null);
});
test('floorBlocks: a quarter-turned rack covers its length along z; skipUid leaves the moving prop out (boards and block)', () => {
  const b = floorBlocks([{ ...props[0], x: -3 }], defs, G)[0], fd = S([])[0].size[1];
  close(b.z1 - b.z0, 2.4); close(b.x1 - b.x0, 0.9); close(b.z0, fd / 2 - 1.2);
  assert.equal(floorBlocks(props, defs, G, 1).length, 2);
  assert.equal(S().filter(s => s.id.startsWith('rack:1')).length, 3);
  assert.equal(garageSurfaces(props, defs, G, flat, 1).filter(s => s.id.startsWith('rack:1')).length, 0);
});

test('selling a rack: its tires fall to the floor, stacked, legal there; other tires are left alone; a missing rack drops nothing', () => {
  const surf = S(), x = byId(surf)['rack:1:0'].size[0] / 2;
  const list = [tire(10, 'rack:1:0', x, 0.35, 0), tire(11, 'rack:1:0', x, 0.35, TIRE_SIZE.width), tire(12, 'rack:2:0', 0.35, 0.35, 0), tire(13, FLOOR_ID, 3, 3, 0)];
  const moves = dropRackItems(list, 1, surf, G, flat), by = Object.fromEntries(moves.map(m => [m.uid, m.patch]));
  assert.deepEqual(moves.map(m => m.uid), [10, 11]);
  assert.equal(by[10].surf, FLOOR_ID); assert.equal(by[11].surf, FLOOR_ID);
  const f = byId(surf)[FLOOR_ID], pl = [garagePl(list[3]), ...[10, 11].map(u => garagePl({ ...list[u - 10], ...by[u] }))];
  const withoutRack = floorBlocks(props, defs, G, 1), f2 = { ...f, blocks: withoutRack };   // the rack is going away, so its footprint is free
  pl.forEach((p, i) => assert.equal(why(f2, T, p, pl.filter((_, j) => j !== i), items), null, 'tire ' + i));
  assert.deepEqual(dropRackItems(list, 99, surf, G, flat), []);
});
test('selling a rack: a tire stacked on another lands stacked, not beside it', () => {
  const surf = S(), q = byId(surf)['rack:2:0'].size[0] / 2;
  const by = Object.fromEntries(dropRackItems([tire(20, 'rack:2:0', q, q, 0), tire(21, 'rack:2:0', q, q, TIRE_SIZE.width)], 2, surf, G, flat).map(m => [m.uid, m.patch]));
  assert.equal(by[20].surf, FLOOR_ID); close(by[21].y, TIRE_SIZE.width); close(by[21].x, by[20].x); close(by[21].z, by[20].z);
});
test('selling a rack on a full floor: no spot within 3 m puts the tire loose in the world', () => {
  const surf = S([{ uid: 1, id: 'shelfTires', x: 0, z: 0, ry: 0 }]), floor = surf[0], jam = [];
  for (let x = 0.35; x < floor.size[0]; x += 0.7) for (let z = 0.35; z < floor.size[1]; z += 0.7) for (let k = 0; k < 3; k++) jam.push(tire(100 + jam.length, FLOOR_ID, x, z, k * TIRE_SIZE.width));
  const r = dropRackItems([tire(50, 'rack:1:0', 1.1, 0.35, 0), ...jam], 1, surf, G, flat)[0];
  assert.equal(r.uid, 50); assert.equal(r.patch.loc, 'world'); assert.ok(Number.isFinite(r.patch.x) && Number.isFinite(r.patch.z));
});
test('old-save items (no grid fields, or on a car) are ignored', () => {
  const old = [{ uid: 1, kind: 'wheel', id: 'x', loc: 'garage' }, { uid: 2, kind: 'wheel', id: 'x', loc: 'car', spot: 'grid', surf: 'rack:1:0', x: 1, z: 1 }];
  assert.deepEqual(dropRackItems(old, 1, S(), G, flat), []);
});
