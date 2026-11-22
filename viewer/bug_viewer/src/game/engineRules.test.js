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
