import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tireMax, tireInches, liftNeeded } from './clearance.js';

const json = f => JSON.parse(readFileSync(new URL(`../catalog/${f}.json`, import.meta.url)));
const kits = json('parts').filter(p => p.lift), lifts = kits.map(p => p.lift), tires = json('wheels').filter(w => w.kind === 'tire');

test('lift kits: a 2-inch and a 4-inch kit in the lift slot, each with a loose kit model', () => {
  assert.deepEqual(kits.map(p => [p.id, p.slot, p.lift]), [['LIFT_2in', 'lift', 0.05], ['LIFT_4in', 'lift', 0.1]]);
  assert.ok(json('slots').some(s => s.id === 'lift'));
});

test('stock-size tires need no lift; 31s need the 2-inch kit; 33s need the 4-inch kit', () => {
  const need = id => liftNeeded(tires.find(w => w.id === id).scale || 1, lifts);
  assert.equal(need('tire-desert'), 0);
  assert.equal(need('tire-desert-31'), 0.05);
  assert.equal(need('tire-desert-33'), 0.1);
  assert.equal(need('tire-deep-33'), 0.1);
  assert.deepEqual(['tire-desert', 'tire-desert-31', 'tire-desert-33'].map(id => tireInches(tires.find(w => w.id === id).scale || 1)), [27, 31, 33]);
});

test('every tire set fits on the biggest lift kit', () => {
  for (const w of tires) assert.ok((w.scale || 1) <= tireMax(Math.max(...lifts)) + 1e-9, w.id);
});

test('more lift never makes room for less tire', () => {
  for (let l = 0; l < 0.3; l += 0.025) assert.ok(tireMax(l + 0.025) >= tireMax(l));
});
