import test from 'node:test';
import assert from 'node:assert/strict';
import { BLUEPRINTS, newBp, missing, fedFrac, feed, work, needText, costText, stageOf, refundMats, matsText, isBlueprintable } from './blueprints.js';

test('a fresh blueprint needs everything and cannot be worked', () => {
  const bp = newBp();
  assert.deepEqual(missing(bp, 'shelfTires'), { wood: 3, scrap: 4, bolts: 4 });
  assert.equal(fedFrac(bp, 'shelfTires'), 0);
  const r = work(bp, 'shelfTires', 1); assert.equal(r.ok, false); assert.match(r.why, /Put the materials in first/);
  assert.equal(needText(bp, 'shelfTires'), 'wood 0/3 · scrap metal 0/4 · fasteners 0/4');
  assert.equal(costText('shelfTires'), '3 wood + 4 scrap metal + 4 fasteners');
  assert.ok(isBlueprintable('partsRack')); assert.ok(!isBlueprintable('welder'));
});

test('feeding takes only what is missing, and only what you have', () => {
  const a = feed(newBp(), 'shelfTires', { wood: 10, scrap: 1, bolts: 4 });
  assert.deepEqual(a.used, { wood: 3, scrap: 1, bolts: 4 }); assert.equal(a.n, 8);
  assert.deepEqual(missing(a.bp, 'shelfTires'), { scrap: 3 });
  const b = feed(a.bp, 'shelfTires', { wood: 10, scrap: 0 }); assert.equal(b.n, 0);
  const c = feed(a.bp, 'shelfTires', { scrap: 9 }); assert.deepEqual(c.used, { scrap: 3 }); assert.deepEqual(missing(c.bp, 'shelfTires'), {});
  assert.equal(fedFrac(c.bp, 'shelfTires'), 1);
});

test('work only goes as far as the materials put in, then finishes', () => {
  const half = feed(newBp(), 'partsRack', { wood: 3 }).bp;   // 3 of 9 pieces
  assert.equal(fedFrac(half, 'partsRack'), 1 / 3);
  let bp = half, r;
  for (let i = 0; i < 100; i++) { r = work(bp, 'partsRack', 0.5); if (!r.ok) break; bp = r.bp; }
  assert.equal(bp.work, 1 / 3); assert.match(r.why, /Out of materials/);
  bp = feed(bp, 'partsRack', { scrap: 3, bolts: 3 }).bp;
  let done = false; for (let i = 0; i < 100 && !done; i++) { r = work(bp, 'partsRack', 0.5); assert.ok(r.ok); bp = r.bp; done = r.done; }
  assert.ok(done); assert.equal(bp.work, 1);
  assert.ok(BLUEPRINTS.partsRack.secs / 0.5 <= 100);
});

test('stages follow the work', () => {
  const s = BLUEPRINTS.shelfTires.stages;
  assert.equal(stageOf({ work: 0 }, 'shelfTires'), s[0]);
  assert.equal(stageOf({ work: 0.5 }, 'shelfTires'), s[1]);
  assert.equal(stageOf({ work: 1 }, 'shelfTires'), s[2]);
});

test('taking it down gives back every piece (canon #024)', () => {
  const bp = feed(newBp(), 'shelfTires', { wood: 2, scrap: 4 }).bp;
  assert.deepEqual(refundMats({ bp }), { wood: 2, scrap: 4 });
  assert.deepEqual(refundMats({ made: { wood: 3, scrap: 4 } }), { wood: 3, scrap: 4 });
  assert.deepEqual(refundMats({ made: true, paid: 0 }), {});   // racks crafted at the bench before blueprints: nothing on record
  assert.equal(matsText({ wood: 3, scrap: 4 }), '3 wood + 4 scrap metal');
});
