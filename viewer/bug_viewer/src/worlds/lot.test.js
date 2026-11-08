import test from 'node:test';
import assert from 'node:assert/strict';
import { STALLS, STALL, LANE, openStalls, pickStall } from './lot.js';
import { OFFICE, CAMPER } from './office.js';

test('twelve stalls, six either side of a clear drive lane', () => {
  assert.equal(STALLS.length, 12);
  assert.equal(STALLS.filter(s => s.side < 0).length, 6);
  for (const s of STALLS) {
    const near = Math.abs(s.lx) - STALL.d / 2;
    assert.ok(near >= LANE.half, `${s.id} reaches into the lane`);
    assert.ok(s.lz - STALL.w / 2 >= STALL.z0 - 1e-9 && s.lz + STALL.w / 2 <= LANE.z1);
    assert.ok(Math.sign(s.fx) === s.side, 'cars face away from the lane');
  }
});
test('stalls clear the garage, the office wing and the camper', () => {
  for (const s of STALLS) {
    assert.ok(s.lz - STALL.w / 2 > OFFICE.z1 + 1, `${s.id} too close to the building front`);
    assert.ok(Math.abs(s.lx) + STALL.d / 2 < CAMPER.x - 6, `${s.id} too close to the camper`);
  }
});
test('a customer takes an open stall, never an occupied one, and null when full', () => {
  const taken = STALLS.slice(0, 11).map(({ lx, lz }) => ({ lx, lz }));
  assert.equal(pickStall(taken).id, STALLS[11].id);
  assert.equal(openStalls([{ lx: STALLS[3].lx + 0.5, lz: STALLS[3].lz }]).length, 11);
  assert.equal(pickStall(STALLS.map(({ lx, lz }) => ({ lx, lz }))), null);
  assert.equal(new Set(Array.from({ length: 200 }, () => pickStall([], Math.random).id)).size, 12);
});
