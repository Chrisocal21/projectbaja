import test from 'node:test';
import assert from 'node:assert/strict';
import { GARAGE_SUPPLIES, SUPPLIES, suppliesIn, supplyName, supplyPrice, itemOf, SUPPLY_TABS } from './garageSupplies.js';

test('every supply and tool is orderable, named and priced, with a unique id', () => {
  assert.equal(new Set(GARAGE_SUPPLIES.map(r => r[0])).size, GARAGE_SUPPLIES.length);
  for (const [id, name, price] of GARAGE_SUPPLIES) { assert.ok(name && price > 0, id); assert.equal(supplyName(id), name); assert.equal(supplyPrice(id), price); }
  for (const k of Object.keys(SUPPLIES)) assert.ok(supplyName('supply:' + k) !== 'supply:' + k, k + ' is on the list');
});
test('the tabs split the list and cover all of it', () => {
  const n = SUPPLY_TABS.reduce((s, [k]) => s + suppliesIn(k).length, 0);
  assert.equal(n, GARAGE_SUPPLIES.length);
  assert.ok(suppliesIn('tools').every(r => r.id.startsWith('tool:')));
});
test('an order id unpacks into the item that is set down', () => {
  assert.deepEqual(itemOf('supply:oil'), ['supply', 'oil']); assert.deepEqual(itemOf('stock:battery'), ['stock', 'battery']); assert.deepEqual(itemOf('tool:jack'), ['tool', 'jack']);
});
test('ordering costs what Dusty charges over the counter', async () => {
  // (jobs.js imports the game store, so read its price list as text rather than importing it)
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./jobs.js', import.meta.url), 'utf8');
  for (const [id, , price] of [['stock:battery', 0, 60], ['tool:wrench', 0, 15], ['tool:jack', 0, 90]]) { assert.match(src, new RegExp(`'${id}', '[^']+', ${price},`)); assert.equal(supplyPrice(id), price); }
});
