import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICE, CAMPER, STAIRS, LOFT, WING_FREE, ANNEX, walkingLevel, inOffice, wingFree, annexWallCircles } from './office.js';
import { segByKey } from './openings.js';

test('office is attached left, camper and door are right, forecourt stays clear', () => {
  assert.equal(OFFICE.x1, -7);
  assert.ok(CAMPER.x > 18 && CAMPER.doorX < CAMPER.x);
  assert.ok(inOffice(-11, 0));
  assert.ok(!inOffice(0, 15));
  assert.ok(!inOffice(11, 0));
});
test('stairs rise in walkable increments and meet the loft without a gap', () => {
  let previous = STAIRS.bottom;
  for (let i = 0; i <= 180; i++) {
    const level = walkingLevel(-8.3, 4 - i / 30, previous);
    assert.ok(level >= previous - 1e-8);
    assert.ok(level - previous <= 1 / 6 + 1e-8);
    previous = level;
  }
  assert.equal(previous, LOFT.y);
  assert.equal(walkingLevel(-8.3, -2.05, previous), LOFT.y);
  assert.equal(walkingLevel(-11, -4, previous), LOFT.y);
});
test('bathroom underneath loft remains at ground level; stairs descend to reception', () => {
  assert.equal(walkingLevel(-11, -4, 0.12), 0.12);
  let previous = LOFT.y;
  for (let i = 0; i <= 180; i++) {
    const level = walkingLevel(-8.3, -2 + i / 30, previous);
    assert.ok(level <= previous + 1e-8);
    assert.ok(previous - level <= 1 / 6 + 1e-8);
    previous = level;
  }
  assert.equal(previous, 0.12);
});
test('the wing keeps its walkways: free floor is inside the wing, off the stairs, the bath and the shelves', () => {
  for (const f of WING_FREE) {
    assert.ok(inOffice(f.x0, f.z0) && inOffice(f.x1, f.z1));
    assert.ok(f.x0 > -10.4, 'clear of the bathroom wall');
    assert.ok(f.z0 > -4.4, 'clear of the parts shelves');
    assert.ok(f.z1 < STAIRS.z0, 'clear of the stair foot and the landing');
  }
  assert.ok(wingFree(-8.8, -3.2, 0.6));
  assert.ok(!wingFree(-8.8, -3.2, 2));            // too big to fit
  assert.ok(!wingFree(-11.8, 1.7));               // the reception counter
  assert.ok(!wingFree(-8.3, 1));                  // the stairs
  assert.ok(!wingFree(0, 15));
});
test('the office annex (the "Office expansion" upgrade) sits behind the west wall, its doorway matching openings.js segment OW3 exactly', () => {
  const door = segByKey('OW3');
  assert.equal(door.wall, 'OW');
  assert.equal(ANNEX.doorZ0, door.c - 1); assert.equal(ANNEX.doorZ1, door.c + 1);
  assert.equal(ANNEX.x1, OFFICE.x0, "the annex's near wall is the office's west wall, so the doorway lines up");
  assert.ok(ANNEX.z0 < ANNEX.doorZ0 && ANNEX.z1 > ANNEX.doorZ1, 'the annex is wider than its own doorway');
});
test("the annex's three solid walls block walking, but its doorway (z 0..2, through the office wall) does not", () => {
  const cs = annexWallCircles(), crossing = (x, z) => !cs.some(([cx, cz, r]) => Math.hypot(cx - x, cz - z) < r + 0.3);
  assert.ok(crossing(ANNEX.x0 + 2, 1), 'the middle of the room is clear');
  assert.ok(crossing(OFFICE.x0, 1), 'the doorway (z=1, inside the door span) is clear of the annex\'s own walls');
  assert.ok(!crossing(ANNEX.x0, 1), 'the far (west) wall blocks');
  assert.ok(!crossing(ANNEX.x0 + 2, ANNEX.z0), 'the south wall blocks');
  assert.ok(!crossing(ANNEX.x0 + 2, ANNEX.z1), 'the north wall blocks');
});
