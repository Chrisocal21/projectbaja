import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICE, CAMPER, STAIRS, LOFT, WING_FREE, ANNEX, walkingLevel, inOffice, wingFree, annexWallCircles, WING, wingWallCircles, officeLevelOf, PARTS_ROOM, WING_UP, wingLevel, inWing } from './office.js';
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
test('office level 1: the wing meets the office wall, its doorway is two openings, and the walls block but the doors and doorway do not', () => {
  assert.equal(WING.x1, OFFICE.x0);
  assert.deepEqual(WING.openings, ['OW3', 'OW4']);
  assert.equal(officeLevelOf(new Set(['office1'])), 1); assert.equal(officeLevelOf(new Set()), 0);
  const cs = wingWallCircles(), crossing = (x, z) => !cs.some(([cx, cz, r]) => Math.hypot(cx - x, cz - z) < r + 0.3);
  assert.ok(crossing(-15.5, 3.2), 'the waiting area is clear');
  assert.ok(crossing(-15.5, WING.z1), 'the customer door is open');
  assert.ok(!crossing(WING.x0, 2), 'the west wall blocks'); assert.ok(!crossing(-15.5, WING.z0), 'the north wall blocks');
  assert.ok(!crossing(-17, WING.z1), 'the front wall beside the door blocks');
  assert.ok(crossing(-14.6, 1) && crossing(-14.6, 3.2) && crossing(OFFICE.x0 - 0.5, 2), 'no second counter: the doorway to Walt\'s counter is open');
});
test('office level 2: shelving and the supplier desk block, but the way from the doorway to the front door stays open', () => {
  assert.equal(officeLevelOf(new Set(['office1', 'office2'])), 2);
  const cs = wingWallCircles(2), crossing = (x, z) => !cs.some(([cx, cz, r]) => Math.hypot(cx - x, cz - z) < r + 0.3);
  assert.ok(!crossing(PARTS_ROOM.shelves[0].x, -3), 'the west shelves block'); assert.ok(!crossing(PARTS_ROOM.desk.x, 1), 'the supplier desk blocks');
  assert.ok(crossing(-15.2, -3), 'the middle of the parts room is clear'); assert.ok(crossing(-15.5, 4) && crossing(-14.6, 3.2), 'doorway to front door still open');
  assert.ok(wingWallCircles(1).length < cs.length, 'level 1 has no shelves');
});
test("office level 3: the team room upstairs is reached from Walt's loft through a doorway in his west wall, not a second stair", () => {
  assert.equal(officeLevelOf(new Set(['office1', 'office2', 'office3'])), 3);
  const { floor: f, door: d, y } = WING_UP, inFloor = [(f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2];
  assert.ok(!('stair' in WING_UP) && !('landing' in WING_UP), 'one stair: Walt\'s');
  assert.equal(wingLevel(...inFloor, 0.12), 0.12, 'under the upstairs floor you stay on the ground'); assert.equal(wingLevel(...inFloor, y), y);
  assert.equal(y, LOFT.y, 'the team room floor is level with the loft');
  // walking west along the loft, through the doorway, onto the team room floor: never a gap to fall through
  const z = (d.z0 + d.z1) / 2; assert.ok(z > LOFT.z0 && z < LOFT.z1, 'the doorway opens off the loft');
  for (let x = -9; x >= -16; x -= 0.05) {
    const h = inOffice(x, z) ? walkingLevel(x, z, y) : inWing(x, z) ? wingLevel(x, z, y) : null;
    if (h !== null) assert.equal(h, y, `a drop at x ${x.toFixed(2)}`);
  }
  assert.equal(f.x1, OFFICE.x0); assert.equal(LOFT.x0, OFFICE.x0);
  const cs = wingWallCircles(3);
  assert.ok(cs.some(c => c[4] == null && Math.abs(c[0] - PARTS_ROOM.shelves[0].x) < 0.01 && c[3] === 2.7), 'the west shelving stays');
  assert.ok(cs.some(c => c[4] === 2.6 && Math.abs(c[1] - f.z1) < 0.1), 'a rail along the open edge, upstairs only');
  assert.ok(cs.some(c => c[4] === 2.6), 'the team table only bites upstairs');
  assert.ok(wingWallCircles(2).every(c => c[4] == null), 'before level 3 nothing is upstairs');
});
