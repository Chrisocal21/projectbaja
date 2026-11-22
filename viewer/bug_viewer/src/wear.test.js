import test from 'node:test';
import assert from 'node:assert/strict';
import { wearNote, wearMods, inspect, FRESH, onLanding, onBottomOut, drive, effects, clues, serviceCost } from './wear.js';

test('fresh car has no effects and no clues', () => { const e = effects(FRESH()); assert.deepEqual([e.damp, e.grip, e.power, e.pull], [1, 1, 1, 0]); assert.equal(clues(FRESH()).length, 0); });
test('soft landings do nothing, hard ones wear shocks and align it', () => {
  assert.equal(onLanding(FRESH(), 4).shocks, 0);
  const w = onLanding(FRESH(), 12); assert.ok(w.shocks > 0.005 && w.align > 0.005);
});
test('worn out is bounded: never worse than the stated limits', () => { const e = effects({ shocks: 1, tires: 1, align: 1, engine: 1, side: -1 }); assert.ok(e.damp >= 0.6 && e.grip >= 0.8 && e.power >= 0.75 && Math.abs(e.pull) <= 0.025); assert.ok(e.pull < 0); });
test('wear never passes 1', () => { let w = FRESH(); for (let i = 0; i < 500; i++) w = onBottomOut(onLanding(w, 20)); assert.equal(w.shocks, 1); });
test('wading while hot hurts the engine far more than heat alone', () => { const a = drive(FRESH(), 10, { hot: true }), b = drive(FRESH(), 10, { hot: true, wading: 0.4 }); assert.ok(b.engine > a.engine * 5); });
test('driving fast on rough ground wears tires (slowly); idling does not', () => { assert.ok(drive(FRESH(), 6000, { speed: 25, rough: 0.5 }).tires > 0.01); assert.equal(drive(FRESH(), 600, { speed: 0 }).tires, 0); });
test('clues appear and service costs scale with wear', () => { const w = onLanding(FRESH(), 14); w.shocks = 0.7; assert.equal(serviceCost(FRESH()), 0); assert.match(clues(w)[0], /bouncy|soft/); assert.ok(serviceCost(w) > serviceCost(FRESH())); });

test('a bouncy ride can be tire pressure, and the inspection says so', () => {
  const w = { ...FRESH(), shocks: 0.4 };
  assert.match(clues(w, 32)[0], /tire pressure/); assert.doesNotMatch(clues(w, 20)[0], /tire pressure/);
  assert.ok(inspect(FRESH(), 32).some(l => /not a worn part/i.test(l)));
  assert.deepEqual(inspect(FRESH(), 20), ['Looks good: nothing worn that you can find.']);
});

test('fitted parts slow the wear', () => {
  const stock = wearMods({ parts: {}, wheels: 'stock' }), built = wearMods({ parts: { suspension: 'PART_006_TrailShockSet', shocks: 'SHOCK_001_Coilover', skid: 'GUARD_SkidPlate', engineCooling: 'EMOD_Doghouse' }, wheels: 'tire-deep' });
  assert.ok(built.shocks < stock.shocks && built.engine < 1 && built.tires < 1 && built.align < 1);
  assert.ok(onLanding(FRESH(), 12, built).shocks < onLanding(FRESH(), 12, stock).shocks);
  assert.deepEqual(wearMods(null), { shocks: 1, tires: 1, align: 1, engine: 1 });
});

test('wearNote describes what a part does', () => { assert.match(wearNote('part', 'SHOCK_001_Coilover'), /slows shock wear 45%/); assert.match(wearNote('part', 'EXH_Megaphone'), /speeds up engine wear 10%/); assert.equal(wearNote('part', 'nothing'), ''); assert.match(wearNote('wheel', 'tire-tread'), /tire wear 30%/); });
