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
import { onHit, effects as fx, FRESH as FR, clues as cl, inspect as insp, partCost as pc, serviced as sv, serviceJob as sj, flatCorners as fc } from './wear.js';
test('a hard landing can blow one damper, and only that corner rebounds loose', () => {
  const w = onHit(FR(), { imp: 14, corner: 'RL' }, () => 0);
  assert.ok(w.shockC.RL >= 0.5 && w.shockC.RR === 0);
  const e = fx(w); assert.ok(e.dampC.RL < 0.7 && e.dampC.RR === undefined);
  assert.match(insp(w).join(' '), /rear-left damper/);
});
test('a rock strike or a low-pressure pinch can puncture a tire: that corner grips less and drags', () => {
  const w = onHit(FR(), { imp: 8, corner: 'FR', rock: true }, () => 0);
  assert.deepEqual(fc(w), ['FR']); const e = fx(w); assert.ok(e.gripC.FR < 1 && e.rrC.FR > 1);
  assert.deepEqual(fc(onHit(FR(), { imp: 4, corner: 'FL', pinch: true }, () => 0.99)), ['FL']);
  assert.deepEqual(fc(onHit(FR(), { imp: 8, corner: 'FR', rock: true }, () => 0.99)), []);   // unlucky roll: it holds
  assert.match(cl(w).join(' '), /front-right tire is flat/);
});
test('the service wrench and jack put the failures back, and cost something while one is wrong', () => {
  const w = onHit(onHit(FR(), { imp: 14, corner: 'RR' }, () => 0), { imp: 13, corner: 'FL' }, () => 0);
  assert.ok(pc(w, 'shocks') > 0 && pc(w, 'tires') > 0); assert.equal(sj(w, 'jack'), 'tires'); assert.equal(sj(w, 'wrench'), 'shocks');
  const s = sv(sv(w, 'shocks'), 'tires'); assert.equal(pc(s, 'shocks'), 0); assert.equal(pc(s, 'tires'), 0); assert.deepEqual(fc(s), []);
  assert.deepEqual(fx(s).dampC, {});
});
test('an old save with no per-corner numbers still works', () => {
  const old = { shocks: 0.3, tires: 0.1, align: 0, engine: 0, side: 1 };
  assert.ok(fx(old).damp < 1); assert.deepEqual(fc(old), []); assert.ok(pc(old, 'shocks') > 0);
});
