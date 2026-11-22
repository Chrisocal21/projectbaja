import test from 'node:test';
import assert from 'node:assert/strict';
import { makeOrder, addOrder, orderLine, ledgerTotals, KEEP } from './workRules.js';

const job = { who: 'Pastor Dale', title: 'Oil change' };
test('an order says who, what, what was used and what it paid', () => {
  const o = makeOrder(job, 'Motor oil', 61, 9.123); assert.deepEqual(o, { who: 'Pastor Dale', job: 'Oil change', used: 'Motor oil', pay: 61, t: 9.1 });
  assert.equal(orderLine(o), 'Pastor Dale: Oil change (Motor oil) +$61'); assert.equal(makeOrder(job, '', 5, 1).used, 'your hands');
});
test('the ledger keeps the last 40 and totals them, naming a repeat customer', () => {
  let log = []; for (let i = 0; i < KEEP + 5; i++) log = addOrder(log, makeOrder(job, 'x', 10, i)); assert.equal(log.length, KEEP); assert.equal(log[0].t, 5);
  const t = ledgerTotals([makeOrder({ who: 'Rosa', title: 'b' }, 'y', 20, 1), makeOrder(job, 'x', 10, 2), makeOrder(job, 'x', 10, 3)]);
  assert.equal(t.jobs, 3); assert.equal(t.pay, 40); assert.equal(t.best, 'Pastor Dale (2x)'); assert.equal(ledgerTotals(undefined).jobs, 0);
});
