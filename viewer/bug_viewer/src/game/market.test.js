import test from 'node:test';
import assert from 'node:assert/strict';
import { BUYERS, CAP, categoryOf, demand, heldNow, offer, recordSale, DECAY_PER_HOUR } from './market.js';

const tire = { kind: 'tire' }, oil = { kind: 'supply', id: 'oil' };
test('categories', () => {
  assert.equal(categoryOf({ kind: 'part' }), 'parts'); assert.equal(categoryOf({ kind: 'wheel' }), 'parts'); assert.equal(categoryOf(oil), 'supplies');
  assert.equal(categoryOf(tire), 'tires'); assert.equal(categoryOf({ kind: 'memento' }), null);
});
test('demand falls as a buyer fills up and bottoms out at the cap', () => {
  assert.ok(demand(0) > demand(4) && demand(4) > demand(CAP)); assert.equal(demand(CAP), demand(CAP * 3)); assert.ok(demand(0) > 1 && demand(CAP) < 1);
});
test('selling to a buyer lowers his next offer; the other buyer is unaffected', () => {
  let m = {}; const first = offer(tire, 0, 'dusty', m, 0).price;
  for (let i = 0; i < 4; i++) m = recordSale(m, tire, 'dusty', 0);
  const later = offer(tire, 0, 'dusty', m, 0).price;
  assert.ok(later < first, `${later} < ${first}`); assert.equal(offer(tire, 0, 'warehouse', m, 0).price, offer(tire, 0, 'warehouse', {}, 0).price);
});
test('shelves empty with game time, so the price recovers', () => {
  let m = {}; for (let i = 0; i < 6; i++) m = recordSale(m, tire, 'dusty', 10);
  assert.equal(heldNow(m, 'dusty', 'tires', 10), 6); assert.equal(heldNow(m, 'dusty', 'tires', 10 + 6 / DECAY_PER_HOUR), 0);
  assert.ok(offer(tire, 0, 'dusty', m, 10 + 2).price > offer(tire, 0, 'dusty', m, 10).price);
  assert.equal(heldNow(m, 'dusty', 'tires', 0), 6);   // the game clock restarted lower (new session): nothing is forgotten, nothing has passed
});
test('the warehouse pays more for junk and tires, and does not buy supplies', () => {
  assert.ok(offer({ kind: 'junk', id: 'engineblock' }, 0, 'warehouse', {}, 0).price > offer({ kind: 'junk', id: 'engineblock' }, 0, 'dusty', {}, 0).price);
  assert.equal(offer(oil, 12, 'warehouse', {}, 0).price, 0); assert.ok(offer(oil, 12, 'dusty', {}, 0).price > 0); assert.ok(BUYERS.dusty && BUYERS.warehouse);
});
