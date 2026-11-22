import test from 'node:test';
import assert from 'node:assert/strict';
import { STAND_CAP, STANDS, standFor, stockOf, roomOn, addStock, takeStock, standPrompt } from './stock.js';

test('a stand for every supply the garage runs on, none overlapping', () => {
  assert.equal(STANDS.length, 6); assert.deepEqual(STANDS.map(s => s.id), ['oil', 'bulb', 'plug', 'wipers', 'belt', 'battery']);
  const zs = STANDS.map(s => s.lz); for (let i = 1; i < zs.length; i++) assert.ok(zs[i] - zs[i - 1] >= 0.8);
  assert.equal(standFor('supply', 'oil').id, 'oil'); assert.equal(standFor('stock', 'battery').id, 'battery'); assert.equal(standFor('part', 'oil'), null);
});
test('stands start empty and fill up to ten, never beyond', () => {
  let h = {}; assert.equal(stockOf(h, 'oil'), 0); assert.equal(roomOn(h, 'oil'), STAND_CAP);
  let r = addStock(h, 'oil', 4); h = r.home; assert.equal(r.added, 4); assert.equal(stockOf(h, 'oil'), 4);
  r = addStock(h, 'oil', 20); assert.equal(r.added, 6); assert.equal(stockOf(r.home, 'oil'), 10);
  assert.equal(addStock(r.home, 'oil', 1).added, 0); assert.equal(stockOf(r.home, 'bulb'), 0);   // other stands are separate
});
test('taking one off the stand', () => {
  const h = addStock({}, 'belt', 2).home; let r = takeStock(h, 'belt'); assert.ok(r.ok); assert.equal(stockOf(r.home, 'belt'), 1);
  r = takeStock(takeStock(r.home, 'belt').home, 'belt'); assert.ok(!r.ok); assert.equal(stockOf(r.home, 'belt'), 0);
});
test('the prompt says what E will do', () => {
  assert.match(standPrompt({}, 'oil', false), /none in stock/); assert.match(standPrompt({ stock: { oil: 3 } }, 'oil', false), /Take one.*3\/10/);
  assert.match(standPrompt({ stock: { oil: 3 } }, 'oil', true), /Stock the motor oil \(3\/10\)/); assert.match(standPrompt({ stock: { oil: 10 } }, 'oil', true), /Take one/);
});
