import test from 'node:test';
import assert from 'node:assert/strict';
import { BUG } from '../rules/vehicles.js';
import { isFitted, missing } from '../rules/restore.js';
import { apartBuild, apartItems, gridSpots, nextStep, ALREADY, apartSlots } from './teardown.js';

const whole = { hidden: [], stripped: [] };
test('taken apart: every slot is off except the two parts already lying in the garage', () => {
  const b = apartBuild(whole);
  assert.equal(missing(BUG, b).length, apartSlots().length); assert.ok(apartItems().every(i => i[1] !== 'shell'), 'the body shell is not a loose part'); assert.equal(isFitted(BUG, b, 'engine'), false); assert.equal(isFitted(BUG, b, 'doorL'), false); assert.equal(isFitted(BUG, b, 'seatDriver'), true);
});
test('one loose part per slot, engine with its pieces, a flat battery, three wheels', () => {
  const items = apartItems(() => 0.5); assert.equal(items.length, apartSlots().length);
  assert.equal(items.filter(i => i[1] === 'wheel').length, 3); assert.ok(items.find(i => i[1] === 'engine')[2].parts.t1); assert.equal(items.find(i => i[1] === 'battery')[2].charge, 0.1);
  assert.ok(items.some(i => i[1] === 'doorL') && !items.some(i => i[1] === 'frontBumper'), 'only the picked parts come off');
});
test('the floor spots are all different and inside the garage', () => {
  const s = gridSpots(40); assert.equal(s.length, 40); assert.equal(new Set(s.map(([x, z]) => x + ',' + z)).size, 40);
  assert.ok(s.every(([x, z]) => x > 2 && x < 6 && z > -5.5 && z < 6.5));
});
test('the next step starts with a drive part nothing blocks, and ends null when the car is whole', () => {
  const n = nextStep(apartBuild(whole)); assert.ok(['start', 'steer', 'drive', 'grip'].includes(n.slot.fn)); assert.match(n.text, /next:/);
  assert.equal(nextStep(whole), null);
  assert.notEqual(nextStep(apartBuild(whole)).slot.id, 'steering', 'the steering wheel needs the dash first');
});
import { layoutParts, SHELF, TIRE_SHELF, FLOOR_SPOTS } from './teardown.js';
test('every loose part has its own place: the red shelf, the tire shelf or the floor corner, nothing doubled', () => {
  const lay = layoutParts(), ids = apartSlots().map(s => s.id), onTires = id => TIRE_SHELF.at[id] != null;
  assert.ok(ids.every(id => lay[id] || onTires(id)), 'every part is placed: ' + ids.filter(id => !lay[id] && !onTires(id)).join());
  assert.ok(ids.filter(s => BUG.slots.find(x => x.id === s).wheel).every(onTires), 'wheels go on the tire shelf');
  const placed = ids.filter(id => lay[id]);
  assert.equal(new Set(placed.map(id => lay[id].x.toFixed(2) + ',' + lay[id].z.toFixed(2) + ',' + lay[id].y.toFixed(2))).size, placed.length);
  SHELF.rows.forEach(b => { const w = b.reduce((n, id) => n + [0, 0.34, 0.5, 0.72, 0.9][BUG.slots.find(s => s.id === id).size] + 0.05, 0); assert.ok(w <= SHELF.len, 'red shelf board is too full: ' + w); });
  assert.ok(Object.keys(FLOOR_SPOTS).every(k => lay[k].y === 0)); assert.ok(['seatPassenger', 'seatBack'].every(k => lay[k].y === 0), 'seats on the floor');
});
import { tipFor } from './teardown.js';
test('each next step carries a how-to line, with the special cases for the engine, the battery and wheels', () => {
  const slot = id => BUG.slots.find(s => s.id === id), b = apartBuild(whole);
  assert.match(tipFor(slot('engine'), b), /hoist/); assert.match(tipFor(slot('battery'), b), /flat.*charger/); assert.match(tipFor(slot('wheelFL'), b), /jack/);
  assert.match(tipFor(slot('doorL'), b), /driver's door.*bolt it on/); assert.match(tipFor(slot('plate'), b), /back of the car/);
  assert.match(tipFor(slot('dash'), whole), /Click it/); assert.match(tipFor(slot('steering'), { ...whole }), /Open the driver's door first/);
  assert.ok(nextStep(b).tip.length > 20);
});
