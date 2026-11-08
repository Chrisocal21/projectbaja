import test from 'node:test';
import assert from 'node:assert/strict';
import { SEGMENTS, WALLS, snapCut, openWhy, wallCircles, wallRuns, segByKey } from './openings.js';
import { BUILDING, snap } from './structures.js';
import { OFFICE } from './office.js';

test('every opening is a 2 m run between its wall\'s bounds', () => {
  assert.equal(SEGMENTS.length, 19);                       // 6 on the right wall, 7 on the back wall, 6 on the office's west wall
  for (const s of SEGMENTS) {
    const w = WALLS[s.wall];
    assert.ok(s.c - 1 >= w.from - 1e-9 && s.c + 1 <= w.to + 1e-9);
  }
  assert.equal(WALLS.R.at, BUILDING.x1); assert.equal(WALLS.B.at, BUILDING.z0); assert.equal(WALLS.OW.at, OFFICE.x0);
});
test('the right and back walls sit exactly on the build grid, so their outside cell is a snappable foundation spot', () => {
  for (const s of SEGMENTS.filter(s => s.wall !== 'OW')) {
    const f = snap('foundation', s.out[0], s.out[1]);      // the outside cell centre is already a grid cell centre
    assert.ok(Math.abs(f.x - s.out[0]) < 1e-9 && Math.abs(f.z - s.out[1]) < 1e-9, `${s.key} outside cell is on the grid`);
  }
});
test("the office's west wall sits 0.2 m off the build grid by design (structures.js), so its outside cell is never snappable: the generic $120 doorway tool always refuses there, gracefully — only the Office expansion upgrade can open it", () => {
  for (const s of SEGMENTS.filter(s => s.wall === 'OW')) {
    const f = snap('foundation', s.out[0], s.out[1]);
    assert.ok(Math.abs(f.x - s.out[0]) > 0.05, `${s.key} outside cell is off-grid`);
    assert.match(openWhy(s, [{ x: f.x, z: s.out[1] }], []), /foundation/);   // the nearest a foundation can snap to is still too far
  }
});
test('aiming near a wall picks its opening; far away picks none', () => {
  assert.equal(snapCut(6.6, 1.1).key, 'R3');               // right wall, z 0..2
  assert.equal(snapCut(0.2, -5.4).key, 'B3');              // back wall, x -1..1
  assert.equal(snapCut(0, 0), null);                       // the middle of the garage
});
test('an opening needs a foundation slab against the wall, and can be cut once', () => {
  const s = segByKey('R3'), slab = [{ x: 8, z: 1 }];
  assert.match(openWhy(s, [], []), /foundation/);
  assert.match(openWhy(s, [{ x: 8, z: 3 }], []), /foundation/);   // a slab beside it is not enough
  assert.equal(openWhy(s, slab, []), '');
  assert.match(openWhy(s, slab, ['R3']), /already/);
});
test('cutting an opening frees a 1 m+ walk-through and leaves the rest of the wall solid', () => {
  const crossing = (cs, wall, c) => { for (let t = -1.2; t <= 1.2; t += 0.05) { const px = wall === 'R' ? 7 + t : c, pz = wall === 'R' ? c : -6 + t; if (cs.some(([x, z, r]) => Math.hypot(x - px, z - pz) < r + 0.3)) return false; } return true; };
  const closed = wallCircles([]), cut = wallCircles(['R3']);
  assert.ok(!crossing(closed, 'R', 1), 'closed wall blocks');
  assert.ok(crossing(cut, 'R', 1), 'the cut passes through its middle');
  assert.ok(crossing(cut, 'R', 0.5) && crossing(cut, 'R', 1.5), 'and about a metre either side');
  assert.ok(!crossing(cut, 'R', -2), 'other segments stay solid');
  assert.ok(!crossing(wallCircles(['B3']), 'R', 1));
  assert.equal(wallCircles([]).length > wallCircles(['R3', 'B3']).length, true);
});
test('a z-axis wall other than R (the office\'s west wall) still gets its circles stepped along z, not x', () => {
  const closed = wallCircles([]), near = closed.filter(([x, z]) => Math.abs(x - WALLS.OW.at) < 0.2);
  assert.ok(near.length >= 20, 'circles exist along the whole 12 m wall');
  const zs = near.map(([, z]) => z);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 10, 'they spread along z (the wall\'s own axis), not bunched at one z');
  assert.ok(near.every(([x]) => Math.abs(x - WALLS.OW.at) < 0.2), 'and stay at the wall\'s x, not spread sideways');
});
test('wall runs merge neighbouring cuts and cover the whole wall', () => {
  const r = wallRuns('R', ['R1', 'R2', 'R4']);
  assert.deepEqual(r.cut, [[-4, 0], [2, 4]]);
  assert.deepEqual(r.solid, [[-6, -4], [0, 2], [4, 6]]);
  const total = x => x.reduce((a, [u0, u1]) => a + u1 - u0, 0);
  assert.equal(total(r.solid) + total(r.cut), 12);
  assert.deepEqual(wallRuns('B', []).solid, [[-7, 7]]);
});
