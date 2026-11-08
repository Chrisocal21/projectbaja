import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_FIXTURES_V3, PEG_SLOTS, LIFT_POSTS, benchSpot, benchDrops, onBench, localCircles, nearestProp, pegState, freeSlotFor, pegDrops, pegKey } from './fixtures.js';
import { seededV, refundOf } from './stash.js';

const bench = { uid: 5, id: 'workbench', x: 10, z: 20, ry: 0 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test('V3 seed has the three fixtures, never the upgrade lift', () => {
  assert.deepEqual(STARTER_FIXTURES_V3.map(f => f[0]), ['workbench', 'carLift', 'pegboard']);
});
test('fixturesV gating: v2 saves get only V3 and sold fixtures are not re-seeded at v3', () => {
  assert.equal(seededV({ fixturesV: 2 }) < 3, true);
  assert.equal(seededV({ fixturesV: 3 }) < 3, false);
  assert.equal(seededV({ fixtures: true }) < 3, true);
});
test('refund: 100%, creative free props 0', () => {
  assert.equal(refundOf({ free: false }, 400), 400); assert.equal(refundOf({ free: true }, 400), 0);
});
test('bench use spot is 1.2 m in front of the centre and follows rotation', () => {
  let [x, z] = benchSpot(bench); near(x, 10); near(z, 21.2);
  [x, z] = benchSpot({ ...bench, ry: Math.PI / 2 }); near(x, 11.2); near(z, 20);
});
test('lift post circles rotate with the prop and leave the middle open', () => {
  const c = localCircles({ x: 0, z: 0, ry: 0 }, LIFT_POSTS); assert.deepEqual(c.map(a => a[0]), [-1.65, 1.65]);
  const r = localCircles({ x: 0, z: 0, ry: Math.PI / 2 }, LIFT_POSTS); near(r[1][0], 0); near(r[1][1], -1.65);
});
test('items on a bench drop to the floor, others stay', () => {
  const items = [
    { uid: 1, loc: 'world', x: 11, z: 20.2, y: 0.98 }, { uid: 2, loc: 'world', x: 11, z: 20.2, y: 0 },
    { uid: 3, loc: 'world', x: 40, z: 20, y: 0.98 }, { uid: 4, loc: 'pack' }, { uid: 5, loc: 'world', x: 7.5, z: 20, y: 0.98 },
  ];
  assert.deepEqual(benchDrops(items, bench).map(d => d.uid), [1, 5]);
  assert.deepEqual(benchDrops(items, bench)[0].patch, { y: 0 });
  assert.equal(onBench(items[2], bench), false);
  assert.equal(onBench(items[0], { ...bench, ry: Math.PI / 2 }), false);
  assert.equal(benchDrops(items, { ...bench, x: 100 }).length, 0);
});
test('pegboard slots use only existing tools and show present / empty', () => {
  const known = ['wrench', 'jack'];   // game/items.js TOOLS
  assert.ok(PEG_SLOTS.every(s => known.includes(s.tool)));
  assert.equal(new Set(PEG_SLOTS.map(s => s.id)).size, PEG_SLOTS.length);
  const items = [{ uid: 9, kind: 'tool', id: 'wrench', loc: 'garage', spot: 'peg', peg: pegKey(7, 'wrenchA') }, { uid: 10, loc: 'garage', spot: 'peg', peg: pegKey(8, 'jack') }];
  const st = pegState(items, 7);
  assert.equal(st.find(s => s.slot.id === 'wrenchA').item.uid, 9); assert.equal(st.filter(s => s.item).length, 1);
  assert.equal(freeSlotFor(items, 7, 'wrench').id, 'wrenchB'); assert.equal(freeSlotFor(items, 7, 'jack').id, 'jack');
  assert.equal(freeSlotFor(items, 8, 'jack'), null); assert.equal(freeSlotFor(items, 7, 'welder'), null);
});
test('selling the pegboard drops its tools; other boards keep theirs', () => {
  const items = [{ uid: 9, loc: 'garage', spot: 'peg', peg: pegKey(7, 'wrenchA') }, { uid: 10, loc: 'garage', spot: 'peg', peg: pegKey(8, 'jack') }];
  const d = pegDrops(items, { uid: 7, x: 0, z: 0, ry: 0 });
  assert.deepEqual(d.map(x => x.uid), [9]); assert.equal(d[0].patch.loc, 'world'); assert.equal(d[0].patch.y, 0);
});
test('nearestProp picks the closest of a kind', () => {
  const ps = [{ uid: 1, id: 'workbench', x: 0, z: 0 }, { uid: 2, id: 'workbench', x: 5, z: 5 }, { uid: 3, id: 'pegboard', x: 5, z: 5 }];
  assert.equal(nearestProp(ps, 'workbench', 4, 4).uid, 2); assert.equal(nearestProp(ps, 'carLift'), null);
});
