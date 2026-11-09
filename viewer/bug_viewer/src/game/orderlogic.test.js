import test from 'node:test';
import assert from 'node:assert/strict';
import { newOrder, advanceOrders, clockDelta, etaText, ORDER_HOURS } from './orderlogic.js';

test('a new order waits the full time', () => assert.deepEqual(newOrder('part', 'x'), { kind: 'part', id: 'x', left: ORDER_HOURS }));
test('time passing counts the order down, nothing arrives early', () => {
  const r = advanceOrders([newOrder('part', 'x')], 1);
  assert.equal(r.arrived.length, 0); assert.equal(r.orders[0].left, ORDER_HOURS - 1);
});
test('arrives when the time is up, others keep waiting', () => {
  const r = advanceOrders([{ kind: 'part', id: 'a', left: 0.5 }, { kind: 'wheel', id: 'b', left: 2 }], 0.5);
  assert.deepEqual(r.arrived.map(o => o.id), ['a']); assert.deepEqual(r.orders.map(o => o.id), ['b']);
});
test('does not change the input and ignores negative time', () => {
  const orders = [newOrder('rim', 'r')], r = advanceOrders(orders, -5);
  assert.equal(orders[0].left, ORDER_HOURS); assert.equal(r.orders[0].left, ORDER_HOURS);
});
test('sleeping through the wait delivers everything', () => assert.equal(advanceOrders([newOrder('part', 'x'), newOrder('rim', 'y')], 8).arrived.length, 2));
test('clock delta: forward, across midnight, and ignores big jumps', () => {
  assert.equal(clockDelta(9, 9.25), 0.25); assert.equal(clockDelta(23.5, 0.5), 1); assert.equal(clockDelta(9, 6), 0);
});
test('eta text', () => { assert.equal(etaText(0), 'any moment'); assert.equal(etaText(0.5), '30 min'); assert.equal(etaText(2.25), '2.3 h'); });
