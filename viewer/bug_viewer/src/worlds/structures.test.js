import test from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, snap, slots, supported, conflicts, dependents, circles, floorRect, probePoints } from './structures.js';

const at = (id, x, z, ry = 0) => ({ id, x, z, ry });
const found = [at('foundation', 1, 1), at('foundation', 3, 1)];   // a 4 x 2 m slab: cells (0,0) and (1,0)

test('cells snap to 2 m cell centres, vertices to corners, so pieces line up with the garage (even grid lines)', () => {
  assert.deepEqual(snap('foundation', 3.7, -0.4), { x: 3, z: -1, ry: 0 });
  assert.deepEqual(snap('pillar', 3.7, -0.4), { x: 4, z: 0, ry: 0 });
  assert.equal(snap('foundation', 7.2, 6.5).x % 2, 1);
});
test('walls snap to the nearest cell edge and turn to follow it', () => {
  assert.deepEqual(snap('wall', 1.1, 1.9), { x: 1, z: 2, ry: 0 });                 // near the +z edge of cell (0,0): runs along x
  const e = snap('wall', 1.9, 1.1); assert.equal(e.x, 2); assert.equal(e.z, 1); assert.ok(Math.abs(e.ry - Math.PI / 2) < 1e-9);   // near the +x edge: runs along z
  const g = snap('garageDoor', 2.6, 1.9); assert.equal(g.z, 2); assert.equal(g.x % 2, 0);   // 4 m pieces sit between grid corners
});
test('everything but a foundation needs a foundation on one side or under it', () => {
  assert.ok(supported('foundation', 9, 9, 0, []));
  assert.ok(supported('floor', 1, 1, 0, found));
  assert.ok(!supported('floor', 5, 1, 0, found));
  assert.ok(supported('wall', 1, 2, 0, found));     // edge of cell (0,0)
  assert.ok(supported('wall', 1, 0, 0, found));     // the other side of the same cell's far edge: still next to cell (0,0)
  assert.ok(!supported('wall', 1, 4, 0, found));
  assert.ok(supported('wall', 4, 1, Math.PI / 2, found));   // east end of the slab
  assert.ok(supported('pillar', 2, 2, 0, found));
  assert.ok(supported('garageDoor', 2, 2, 0, found));       // spans two edges, either supported
  assert.ok(!supported('pillar', 8, 8, 0, found));
});
test('two pieces cannot share a slot, but different layers coexist', () => {
  const have = [...found, at('wall', 1, 2), at('floor', 1, 1)];
  assert.ok(conflicts('wall', 1, 2, 0, have));
  assert.ok(conflicts('door', 1, 2, 0, have));          // any edge piece on the same edge
  assert.ok(conflicts('garageDoor', 2, 2, 0, have));    // covers (0..2) and (2..4): the first edge is taken
  assert.ok(!conflicts('wall', 3, 2, 0, have));
  assert.ok(conflicts('floor', 1, 1, 0, have));
  assert.ok(!conflicts('roof', 1, 1, 0, have));
  assert.ok(!conflicts('pillar', 2, 2, 0, have));
  assert.deepEqual(slots('garageDoor', 2, 2, 0).length, 2);
});
test('a foundation cannot be taken down from under the walls and floor that rest only on it', () => {
  const have = [...found, at('wall', 1, 2), at('floor', 1, 1), at('wall', 3, 2)];
  const first = have[0], second = have[1];
  assert.deepEqual(dependents(first, have).map(d => d.id).sort(), ['floor', 'wall']);   // floor + the wall over cell (0,0) only
  assert.equal(dependents(second, have).length, 1);
  assert.equal(dependents(at('wall', 1, 2), have).length, 0);
});
test('doorways stay walkable: walls are solid along their length, doors leave a 1 m gap, garage doors 3 m', () => {
  const w = circles('wall', 0, 0, 0), d = circles('door', 0, 0, 0), g = circles('garageDoor', 0, 0, 0);
  // walk straight THROUGH the piece along z at several x offsets: solid walls block every one, doors only the middle
  const passable = (cs, xOff) => { for (let t = -1.5; t <= 1.5; t += 0.05) if (cs.some(([cx, cz, r]) => Math.hypot(cx - xOff, cz - t) < r + 0.3)) return false; return true; };
  assert.ok([-0.9, 0, 0.9].every(x => !passable(w, x)), 'a plain wall blocks every crossing');
  assert.ok(passable(d, 0) && !passable(d, 0.9), 'a door passes through the middle only');
  assert.ok(passable(g, 0) && passable(g, 1.2) && !passable(g, 1.95), 'a garage door passes a car through its opening');
  assert.equal(circles('pillar', 4, 4)[0][2], 0.22);
  assert.equal(circles('foundation', 1, 1).length, 0);
});
test('foundations and floors are walkable, with a step height; probe points cover a piece', () => {
  assert.equal(floorRect('foundation', 1, 1).top, 0.12);
  assert.ok(floorRect('floor', 1, 1).top > floorRect('foundation', 1, 1).top);
  assert.equal(floorRect('wall', 1, 2), null);
  assert.equal(probePoints('foundation', 1, 1).length, 5);
  assert.equal(probePoints('garageDoor', 0, 0, 0).length, 3);
  assert.ok(Object.values(PIECES).every(p => p.price > 0 && p.name));
});
