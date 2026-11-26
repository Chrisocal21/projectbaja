import test from 'node:test';
import assert from 'node:assert/strict';
import { MAT_ORDER, matWord, matsText, addMats, shortOf, CUT, cutWhy, SALVAGE, MAT_PACKS } from './materials.js';
import { BLUEPRINTS } from './blueprints.js';

test('four materials, with plain words', () => {
  assert.deepEqual(MAT_ORDER, ['wood', 'scrap', 'steel', 'bolts']);
  assert.equal(matsText({ bolts: 2, wood: 3, steel: 0 }), '3 wood + 2 fasteners');
  assert.equal(matWord('steel'), 'steel');
});

test('adding and taking away never goes below zero and leaves the old tally alone', () => {
  const a = { scrap: 1 }, b = addMats(a, { scrap: 2, bolts: 3 });
  assert.deepEqual(b, { scrap: 3, bolts: 3 }); assert.deepEqual(a, { scrap: 1 });
  assert.deepEqual(addMats(b, { scrap: 9 }, -1), { scrap: 0, bolts: 3 });
  assert.deepEqual(shortOf({ wood: 2 }, { wood: 3, bolts: 1 }), { wood: 1, bolts: 1 });
  assert.deepEqual(shortOf({ wood: 3 }, { wood: 3 }), {});
});

test('cutting needs the grinder, power and enough scrap', () => {
  assert.match(cutWhy({ tool: 'wrench', power: true, mats: { scrap: 9 } }), /grinder/);
  assert.match(cutWhy({ tool: 'grinder', power: false, mats: { scrap: 9 } }), /power/);
  assert.match(cutWhy({ tool: 'grinder', power: true, mats: { scrap: 1 } }), /1\/2/);
  assert.equal(cutWhy({ tool: 'grinder', power: true, mats: { scrap: 2 } }), '');
  assert.deepEqual(CUT.give, { steel: 1 });
});

test('salvage, packs and blueprints only use the four materials', () => {
  const all = [...Object.values(SALVAGE).map(s => s.give), ...Object.values(BLUEPRINTS).map(b => b.mats), CUT.take, CUT.give];
  for (const m of all) for (const k of Object.keys(m)) assert.ok(MAT_ORDER.includes(k), k);
  for (const k of Object.keys(MAT_PACKS)) assert.ok(MAT_ORDER.includes(k), k);
});
