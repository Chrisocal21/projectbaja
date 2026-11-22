import test from 'node:test';
import assert from 'node:assert/strict';
import { BINS, inBin, usedOf, stowBlock, binPrompt } from './binRules.js';
const size = i => i.s || 1, name = i => i.id;
const items = [{ uid: 1, id: 'coil', loc: 'bin', bin: 7, s: 1 }, { uid: 2, id: 'carb', loc: 'bin', bin: 7, s: 2 }, { uid: 3, id: 'plugs', loc: 'bin', bin: 8 }, { uid: 4, id: 'x', loc: 'pack' }];
test('a bin knows what is in it, by prop, and how full it is', () => {
  assert.deepEqual(inBin(items, 7).map(i => i.id), ['coil', 'carb']); assert.equal(usedOf(items, 7, size), 3); assert.equal(usedOf(items, 9, size), 0);
});
test('a full bin refuses, and says how full', () => {
  assert.equal(stowBlock('partsBin', items, 7, { s: 2 }, size), '');
  assert.match(stowBlock('partsBin', items, 7, { s: 10 }, size), /full \(3\/12\)/);
  assert.match(stowBlock('nope', items, 7, {}, size), /not a bin/);
});
test('the prompt lists the newest things and what E does', () => {
  assert.match(binPrompt('partsBin', items, 7, size, name, false), /^Parts bin 3\/12: carb, coil {2}· {2}nothing to put in {2}· {2}Click takes the last thing out$/);
  assert.match(binPrompt('partsBin', [], 7, size, name, true), /empty {2}· {2}E puts it in$/);
  assert.ok(Object.values(BINS).every(b => b.cap > 0));
});
