import test from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, BUILDING, snap, slots, supported, conflicts, dependents, circles, floorRect, probePoints, inBuilding } from './structures.js';
import { OFFICE } from './office.js';

const at = (id, x, z, ry = 0) => ({ id, x, z, ry });
const found = [at('foundation', 2, 1), at('foundation', 4, 1)];   // a 4 x 2 m slab: cells x [1,3] and [3,5], z [0,2]

test('the grid lines up with the original buildings: the garage walls (x = +-7, z = +-6) and the wing are grid lines', () => {
  assert.equal(BUILDING.x1, 7); assert.equal(BUILDING.z0, -6); assert.equal(BUILDING.z1, 6);
  assert.ok(Math.abs(BUILDING.x0 - OFFICE.x0) < 1e-9, 'the building rect follows the wing');
  assert.deepEqual(snap('pillar', 6.8, 5.9), { x: 7, z: 6, ry: 0 });      // the garage's front-right corner
  assert.deepEqual(snap('pillar', -7.2, -6.2), { x: -7, z: -6, ry: 0 });  // the garage's back-left corner (where the wing joins)
  assert.equal(snap('foundation', 8.3, 1).x, 8);                          // a cell flush against the garage's side wall: spans x 7..9
  assert.equal(snap('wall', 8.1, 1.9).z, 2);
});
test('slabs can sit flush against the garage and the wing, but not on top of them', () => {
  assert.ok(!inBuilding('foundation', 8, 1), 'a cell beside the garage wall');
  assert.ok(!inBuilding('foundation', 8, 7), 'a cell in front of the garage');
  assert.ok(inBuilding('foundation', 6, 1), 'a cell over the garage floor');
  assert.ok(inBuilding('foundation', -12, 1), 'a cell over the wing');
  assert.ok(!inBuilding('foundation', -14, 1), 'a cell beside the wing: 0.2 m of overlap with its outer wall is fine');
  assert.ok(inBuilding('wall', 7, 2, Math.PI / 2), 'a wall on the garage wall itself');
  assert.ok(!inBuilding('pillar', 7, 2), 'a corner post can stand on the garage wall line, where a lean-to meets it');
  assert.ok(inBuilding('pillar', 3, 2), 'but not inside the garage');
  assert.ok(!inBuilding('wall', 8, 2, 0), 'a wall running out from the garage wall meets it at a T');
  assert.ok(inBuilding('wall', 4, 6, 0), 'a wall on the garage front line would double its front wall');
  assert.ok(!inBuilding('wall', 8, 6, 0), 'but the same line carries on past the garage corner, flush');
});
test('cells snap to cell centres, vertices to corners', () => {
  assert.deepEqual(snap('foundation', 3.7, -0.4), { x: 4, z: -1, ry: 0 });
  assert.deepEqual(snap('pillar', 3.7, -0.4), { x: 3, z: 0, ry: 0 });
});
test('walls snap to the nearest cell edge and turn to follow it', () => {
  assert.deepEqual(snap('wall', 2.1, 1.9), { x: 2, z: 2, ry: 0 });                  // near the +z edge of cell (2,1): runs along x
  const e = snap('wall', 2.9, 1.1); assert.equal(e.x, 3); assert.equal(e.z, 1); assert.ok(Math.abs(e.ry - Math.PI / 2) < 1e-9);   // near the +x edge: runs along z
  const g = snap('garageDoor', 3.6, 1.9); assert.equal(g.z, 2); assert.equal(g.x % 2, 1);   // 4 m pieces sit between grid lines
});
test('everything but a foundation needs a foundation on one side or under it', () => {
  assert.ok(supported('foundation', 9, 9, 0, []));
  assert.ok(supported('floor', 2, 1, 0, found));
  assert.ok(!supported('floor', 6, 1, 0, found));
  assert.ok(supported('wall', 2, 2, 0, found));
  assert.ok(supported('wall', 2, 0, 0, found));
  assert.ok(!supported('wall', 2, 4, 0, found));
  assert.ok(supported('wall', 5, 1, Math.PI / 2, found));   // east end of the slab
  assert.ok(supported('pillar', 3, 2, 0, found));
  assert.ok(supported('garageDoor', 3, 2, 0, found));       // spans two edges, either supported
  assert.ok(!supported('pillar', 9, 8, 0, found));
});
test('two pieces cannot share a slot, but different layers coexist', () => {
  const have = [...found, at('wall', 2, 2), at('floor', 2, 1)];
  assert.ok(conflicts('wall', 2, 2, 0, have));
  assert.ok(conflicts('door', 2, 2, 0, have));          // any edge piece on the same edge
  assert.ok(conflicts('garageDoor', 3, 2, 0, have));    // covers x 1..3 and 3..5: the first edge is taken
  assert.ok(!conflicts('wall', 4, 2, 0, have));
  assert.ok(conflicts('floor', 2, 1, 0, have));
  assert.ok(!conflicts('roof', 2, 1, 0, have));
  assert.ok(!conflicts('pillar', 3, 2, 0, have));
  assert.deepEqual(slots('garageDoor', 3, 2, 0).length, 2);
});
test('a foundation cannot be taken down from under the walls and floor that rest only on it', () => {
  const have = [...found, at('wall', 2, 2), at('floor', 2, 1), at('wall', 4, 2)];
  const first = have[0], second = have[1];
  assert.deepEqual(dependents(first, have).map(d => d.id).sort(), ['floor', 'wall']);
  assert.equal(dependents(second, have).length, 1);
  assert.equal(dependents(at('wall', 2, 2), have).length, 0);
});
test('doorways stay walkable: walls are solid along their length, doors leave a 1 m gap, garage doors 3 m', () => {
  const w = circles('wall', 0, 0, 0), d = circles('door', 0, 0, 0), g = circles('garageDoor', 0, 0, 0);
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
