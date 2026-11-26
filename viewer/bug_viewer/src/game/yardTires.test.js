import test from 'node:test';
import assert from 'node:assert/strict';
import { yardTires, isScrapTire, yardLeft, yardBlocks, yardCheck, YARD_SPOTS, TIRE_PILE } from './yardTires.js';
import { LANE } from '../worlds/lot.js';

test('a new game scatters sixteen tires: eleven for the scrap pile, five worth keeping, one of those holed', () => {
  const t = yardTires(() => 0.5);
  assert.equal(t.length, 16);
  assert.equal(t.filter(isScrapTire).length, 11);
  const keep = t.filter(i => !isScrapTire(i));
  assert.equal(keep.length, 5);
  assert.equal(keep.filter(i => i.hole).length, 1);
});

test('no tire lies in the building, in the drive lane or on the scrap pile', () => {
  for (const [x, z] of YARD_SPOTS) {
    assert.ok(!(x > -13.6 && x < 7.6 && Math.abs(z) < 6.6), `in the building: ${x},${z}`);
    assert.ok(!(Math.abs(x) < LANE.half && z > LANE.z0 && z < LANE.z1), `in the lane: ${x},${z}`);
    assert.ok(Math.hypot(x - TIRE_PILE.lx, z - TIRE_PILE.lz) > 2.5);
  }
});

test('the yard blocks opening until every tire is racked or thrown, then stays clear', () => {
  let items = [{ yard: true, loc: 'world' }, { yard: true, loc: 'hand' }, { loc: 'world' }], home = { yard: { done: false } };
  assert.equal(yardLeft(items), 2);
  assert.equal(yardCheck(home, items), home);
  items = [{ yard: true, loc: 'garage' }, { loc: 'world' }];
  home = yardCheck(home, items);
  assert.equal(yardBlocks(home), false);
  assert.equal(yardCheck(home, [{ yard: true, loc: 'world' }]), home);
  assert.equal(yardBlocks({}), false);   // an older save never had a yard to clear
});

test('a customer wheel and a good tire are never scrap', () => {
  assert.equal(isScrapTire({ kind: 'stock', id: 'wheel', tread: 0.05, cust: true }), false);
  assert.equal(isScrapTire({ kind: 'stock', id: 'wheel', tread: 0.6 }), false);
  assert.equal(isScrapTire({ kind: 'stock', id: 'battery' }), false);
});
