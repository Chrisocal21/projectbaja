import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE_SLOTS, freshParts, removeBlock, fitBlock, missingOf, weakest, partsOf, engineTag } from './engineRules.js';

test('a fresh engine has every piece with a condition', () => {
  const p = freshParts(() => 0.5);
  assert.equal(Object.keys(p).length, ENGINE_SLOTS.length);
  assert.ok(Object.values(p).every(x => x.c >= 0 && x.c <= 100));
  assert.deepEqual(missingOf(p), []);
});
test('an old engine with no parts field counts as complete', () => { assert.equal(Object.keys(partsOf({})).length, ENGINE_SLOTS.length); assert.equal(engineTag({}), ''); });
test('the carburetor stays until the air cleaner is off', () => {
  const p = freshParts(() => 0.5);
  assert.match(removeBlock(p, 'carb'), /air cleaner/);
  delete p.airCleaner; assert.equal(removeBlock(p, 'carb'), '');
});
test('a piece that is off cannot come off again, and one that is on cannot go on twice', () => {
  const p = freshParts(() => 0.5); delete p.coil;
  assert.match(removeBlock(p, 'coil'), /not on/);
  assert.match(fitBlock(p, 'carb'), /already/);
  assert.equal(fitBlock(p, 'coil'), '');
  assert.match(fitBlock(p, 'banana'), /not an engine part/);
});
test('the weakest piece is named, and a stripped engine says how many are off', () => {
  const p = freshParts(() => 0.5); p.starter.c = 5;
  assert.equal(weakest(p).id, 'starter');
  delete p.carb; delete p.coil;
  assert.match(engineTag({ parts: p }), /2 parts off/);
  assert.equal(weakest({}), null);
});
test('a piece cannot go on under something that sits over it', () => {
  const p = freshParts(() => 0.5); delete p.carb;
  assert.match(fitBlock(p, 'carb'), /air cleaner/);
  delete p.airCleaner; assert.equal(fitBlock(p, 'carb'), '');
});
test('the air cleaner cannot go on before the carburetor it covers', () => {
  const p = freshParts(() => 0.5); delete p.carb; delete p.airCleaner;
  assert.match(fitBlock(p, 'airCleaner'), /carburetor first/);
  assert.equal(fitBlock(p, 'carb'), '');
});
import { engineStartCheck, DEAD } from './engineRules.js';
import { startCheck } from '../rules/fuel.js';
test('a complete engine starts, and an old engine with no parts field does too', () => {
  assert.equal(engineStartCheck(freshParts(() => 0.5)).ok, true);
  assert.equal(engineStartCheck(undefined).ok, true);
});
test('a missing or shot piece stops the start and the reason names it', () => {
  const p = freshParts(() => 0.5); delete p.plugs;
  assert.match(engineStartCheck(p).why, /spark plugs/);
  const q = freshParts(() => 0.5); q.starter.c = DEAD - 1;
  assert.match(engineStartCheck(q).why, /starter motor is shot \(14%\)/);
  const r = freshParts(() => 0.5); delete r.fanBelt; delete r.exhaust;
  assert.equal(engineStartCheck(r).ok, true);   // the belt and exhaust do not stop a start
});
test('the engine check slots into startCheck after the battery and before the fuel', () => {
  const bad = engineStartCheck({ ...freshParts(() => 0.5), coil: undefined });
  assert.match(startCheck({ battery: true, litres: 0, engine: bad }).why, /coil/);
  assert.match(startCheck({ battery: false, litres: 5, engine: bad }).why, /battery/);
  assert.match(startCheck({ battery: true, litres: 0, engine: { ok: true } }).why, /dry/);
});
