import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inStore, bill, ringUp } from './dustyRules.js';
import { GOODS_SPOTS } from '../worlds/dustyGoods.js';

const items = () => [{ uid: 1, kind: 'supply', id: 'oil', loc: 'pack', unpaid: 12 }, { uid: 2, kind: 'mat', id: 'wood', n: 2, loc: 'pack', unpaid: 14 }, { uid: 3, kind: 'tool', id: 'wrench', loc: 'hand' }];

test('ringing up pays for the unpaid things only, and materials go to the tally', () => {
  const sale = ringUp(items(), 100);
  assert.equal(sale.total, 26);
  assert.deepEqual(sale.mats, [['wood', 2]]);
  assert.deepEqual(sale.items.map(i => i.uid), [1, 3]);
  assert.ok(sale.items.every(i => !('unpaid' in i)));
});
test('not enough cash: nothing is sold', () => {
  const list = items();
  assert.equal(ringUp(list, 25), null);
  assert.equal(bill(list), 26);
});
test('inside the store, and out the door', () => {
  assert.ok(inStore(0, -12));
  assert.ok(inStore(-5.6, -8.4));    // in the doorway
  assert.ok(!inStore(-5.6, -7.9));   // outside it
  assert.ok(!inStore(9, -12));
});
test('everything Dusty sells has one spot inside the store (the wash is a service)', () => {
  const src = readFileSync(new URL('./jobs.js', import.meta.url), 'utf8');
  const fixed = [...src.slice(src.indexOf('export const STORE_ITEMS'), src.indexOf('/** what a job needs')).matchAll(/^  \['([a-z]+:[a-z-]+)'/gm)].map(m => m[1]);
  const sold = [...fixed, ...['oil', 'bulb', 'plug', 'wipers', 'belt'].map(id => 'supply:' + id)].sort();
  assert.deepEqual(GOODS_SPOTS.map(g => g[0]).sort(), sold);
  for (const [, x, , z] of GOODS_SPOTS) assert.ok(inStore(x, z));
});
