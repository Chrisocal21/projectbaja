import test from 'node:test';
import assert from 'node:assert/strict';
import { SIDE_BAY, BUG_BAY, inSideBay, roofAt, onBugSpot } from './sideBay.js';
import { segByKey } from './openings.js';
import { BUILDING, inBuilding } from './structures.js';
import { CAMPER } from './office.js';
import { STALLS } from './lot.js';
import { FLOOR_SPOTS } from '../game/teardown.js';
import { YARD_SPOTS, TIRE_PILE } from '../game/yardTires.js';

const BUG = { w: 1.6, l: 4.1 };

test('the side bay sits against the shop east wall, clear of the camper and the customer stalls', () => {
  assert.equal(SIDE_BAY.x0, BUILDING.x1);
  assert.ok(SIDE_BAY.x1 + 1 < CAMPER.x - 1.7, 'room to walk between the bay and the camper');
  for (const s of STALLS) assert.ok(!(Math.abs(s.lx - (SIDE_BAY.x0 + SIDE_BAY.x1) / 2) < 6 && s.lz - 1.5 < SIDE_BAY.apron.z1), `stall ${s.id} in front of the bay door`);
});

test('the Bug fits in the bay with room to work round it, and drives straight out of the door', () => {
  const half = BUG.w / 2;
  assert.ok(BUG_BAY.x - half - SIDE_BAY.x0 > 1.3 && SIDE_BAY.x1 - (BUG_BAY.x + half) > 1.3, 'a working gap each side');
  assert.ok(BUG_BAY.z - BUG.l / 2 - SIDE_BAY.z0 > 3, 'room behind for the engine');
  assert.ok(SIDE_BAY.door.x0 < BUG_BAY.x - half - 0.6 && SIDE_BAY.door.x1 > BUG_BAY.x + half + 0.6, 'the door is wide enough');
  assert.ok(inSideBay(BUG_BAY.x, BUG_BAY.z, 1) && onBugSpot(BUG_BAY.x, BUG_BAY.z));
});

test('the walk-through from the shop is the back corner of the east wall', () => {
  const s = segByKey(SIDE_BAY.cut);
  assert.equal(s.x, SIDE_BAY.x0);
  assert.ok(s.z > SIDE_BAY.z0 && s.z < BUG_BAY.z - BUG.l / 2, 'behind the car');
});

test('the lean-to roof falls from the shop eave to the low wall, over the door', () => {
  assert.equal(roofAt(SIDE_BAY.x0), SIDE_BAY.hHigh);
  assert.equal(roofAt(SIDE_BAY.x1), SIDE_BAY.hLow);
  assert.ok(SIDE_BAY.door.h < SIDE_BAY.hLow - 0.3);
});

test('the Bug parts on the floor are inside the bay, off the car spot and out of the drive-out path', () => {
  for (const [id, [x, z]] of Object.entries(FLOOR_SPOTS)) {
    assert.ok(inSideBay(x, z, 0.4), `${id} not in the bay`);
    assert.ok(!onBugSpot(x, z), `${id} on the car spot`);
    if (z > BUG_BAY.z) assert.ok(Math.abs(x - BUG_BAY.x) > BUG.w / 2 + 0.8, `${id} blocks the way out`);
  }
});

test('no yard tire is in the bay, on its apron or in front of its door', () => {
  for (const [x, z] of YARD_SPOTS) {
    assert.ok(!inSideBay(x, z, -0.6), `in the bay: ${x},${z}`);
    assert.ok(!(x > SIDE_BAY.apron.x0 - 0.6 && x < SIDE_BAY.apron.x1 + 0.6 && z > SIDE_BAY.z1 && z < SIDE_BAY.apron.z1 + 3), `in front of the door: ${x},${z}`);
  }
  assert.ok(!inSideBay(TIRE_PILE.lx, TIRE_PILE.lz, -2));
});

test('build mode cannot put a foundation or a wall inside the side bay', () => {
  assert.ok(inBuilding('foundation', 9, 1));
  assert.ok(inBuilding('wall', 10, 2));
  assert.ok(!inBuilding('foundation', 15, 1));
});
