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
  assert.ok(!crossing(WING.counter.x, 1), 'the counter blocks');
  assert.ok(crossing(-14.6, 3.2) && crossing(OFFICE.x0, 3.2), 'you can still get from the doorway into the wing past the counter');
});
test('office level 2: shelving and the supplier desk block, but the way from the doorway to the front door stays open', () => {
  assert.equal(officeLevelOf(new Set(['office1', 'office2'])), 2);
  const cs = wingWallCircles(2), crossing = (x, z) => !cs.some(([cx, cz, r]) => Math.hypot(cx - x, cz - z) < r + 0.3);
  assert.ok(!crossing(PARTS_ROOM.shelves[0].x, -3), 'the west shelves block'); assert.ok(!crossing(PARTS_ROOM.desk.x, 1), 'the supplier desk blocks');
  assert.ok(crossing(-15.2, -3), 'the middle of the parts room is clear'); assert.ok(crossing(-15.5, 4) && crossing(-14.6, 3.2), 'doorway to front door still open');
  assert.ok(wingWallCircles(1).length < cs.length, 'level 1 has no shelves');
});
test('office level 3: a stair climbs the west wall to a second floor; you cannot be lifted onto it from below', () => {
  assert.equal(officeLevelOf(new Set(['office1', 'office2', 'office3'])), 3);
  const { stair: s, floor: f, y } = WING_UP, mid = (s.x0 + s.x1) / 2;
  assert.equal(wingLevel(mid, s.zBottom + 0.3), 0.12, 'ground at the foot of the stair');
  assert.ok(Math.abs(wingLevel(mid, s.zTop + 0.01) - y) < 0.2, 'the top step meets the upstairs floor');
  let last = 0.12; for (let z = s.zBottom; z >= s.zTop; z -= 0.05) { const h = wingLevel(mid, z); assert.ok(h >= last - 1e-9 && h - last < 0.25, 'steps only rise, in small steps'); last = h; }
  const inFloor = [(f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2];
  assert.equal(wingLevel(...inFloor, 0.12), 0.12, 'under the upstairs floor you stay on the ground'); assert.equal(wingLevel(...inFloor, y), y);
  assert.ok(inWing(...inFloor) && inWing(mid, s.zTop));
  const cs = wingWallCircles(3);
  assert.ok(cs.filter(c => c[4] == null && c[3] === 2.7 && c[0] < s.x1 + 0.5 && c[1] < 1.4 && c[1] > s.zTop).length === 0, "nothing stands at the stair foot");
  assert.ok(!cs.some(c => c[4] == null && Math.abs(c[0] - PARTS_ROOM.shelves[0].x) < 0.01 && c[3] === 2.7), 'the west shelving is gone');
  assert.ok(cs.some(c => c[4] === 2.6), 'the team table only bites upstairs');
  assert.ok(wingWallCircles(2).every(c => c[4] == null), 'before level 3 nothing is upstairs');
});
