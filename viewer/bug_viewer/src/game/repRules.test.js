import test from 'node:test';
import assert from 'node:assert/strict';
import { repOf, standing, payFor, gapScale, afterJob, isRegular, REGULAR_AT } from './repRules.js';

test('a new place is unknown and pays the base', () => {
  assert.equal(repOf({}), 0); assert.equal(standing(0), 'unknown'); assert.equal(payFor(100, {}, 'Rosa'), 100); assert.equal(gapScale({}), 1);
});
test('standing pays up to 25% more and shortens the wait up to 30%', () => {
  assert.equal(payFor(100, { rep: 100 }, 'x'), 125); assert.equal(payFor(100, { rep: 40 }, 'x'), 110);
  assert.equal(gapScale({ rep: 100 }), 0.7); assert.ok(gapScale({ rep: 30 }) < 1);
  assert.equal(standing(10), 'known'); assert.equal(standing(30), 'trusted'); assert.equal(standing(99), 'the place to go');
});
test('a customer who keeps coming back becomes a regular and pays 10% more', () => {
  let h = {}; for (let i = 0; i < REGULAR_AT; i++) { const a = afterJob(h, 'Dusty'); h = { rep: a.rep, regulars: a.regulars }; if (i === REGULAR_AT - 1) assert.match(a.note, /Dusty is a regular now/); }
  assert.equal(isRegular(h, 'Dusty'), true); assert.equal(isRegular(h, 'Rosa'), false);
  assert.equal(payFor(100, { regulars: h.regulars }, 'Dusty'), 110);
});
test('rep never passes 100 and says when the standing changes', () => {
  assert.equal(afterJob({ rep: 99 }, 'a').rep, 100); assert.match(afterJob({ rep: 9 }, 'a').note, /known now/);
});
