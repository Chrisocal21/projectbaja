import test from 'node:test';
import assert from 'node:assert/strict';
import { towQuote, TOW } from './towLogic.js';
const garage = { x: 0, z: 0 };
test('the tow costs a call-out fee plus the distance, and takes longer the farther you are', () => {
  const a = towQuote({ x: 5000, z: 0 }, garage, 1000), b = towQuote({ x: 50000, z: 0 }, garage, 1000);
  assert.equal(a.fee, TOW.base + 5 * TOW.perKm); assert.ok(b.fee > a.fee && b.hours > a.hours); assert.equal(b.hours <= TOW.maxHours, true);
});
test('at the garage there is nothing to tow, and a broke player is still brought home for what they have', () => {
  assert.equal(towQuote({ x: 20, z: 20 }, garage, 500).near, true);
  const q = towQuote({ x: 20000, z: 0 }, garage, 30); assert.equal(q.charge, 30); assert.ok(q.fee > 30);
});
