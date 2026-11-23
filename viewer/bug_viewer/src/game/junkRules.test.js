import test from 'node:test';
import assert from 'node:assert/strict';
import { loadsOf, leftOf, sizeOf, haul, haulPrompt, LOADS } from './junkRules.js';

const j = { id: 'j-papers', kind: 'papers', label: 'decades of newspapers' };
test('a pile goes out in loads and shrinks with each one', () => {
  let home = {}; assert.equal(leftOf(home, j), 3); assert.equal(sizeOf(home, j), 1);
  const a = haul(home, j); assert.equal(a.n, 1); assert.equal(a.last, false);
  home = { junkLoads: { 'j-papers': a.n } }; assert.equal(sizeOf(home, j), 2 / 3);
  home = { junkLoads: { 'j-papers': haul(home, j).n } }; assert.equal(haul(home, j).last, true);
});
test('the prompt says how many loads are left, and every kind has loads', () => {
  assert.match(haulPrompt({}, j), /^Press E — Pick up decades of newspapers$/);
  assert.match(haulPrompt({ junkLoads: { 'j-papers': 2 } }, j), /^Press E/);
  for (const k of Object.keys(LOADS)) assert.ok(loadsOf(k) >= 2);
  assert.equal(loadsOf('mystery'), 2);
});
