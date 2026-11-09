import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSync, summarize, autoDecision } from './cloudsync.js';
import { wrap, CURRENT } from './saveFormat.js';

test('summarize reads an envelope and rejects junk', () => {
  assert.equal(summarize(''), null); assert.equal(summarize('nope'), null);
  assert.deepEqual(summarize(JSON.stringify(wrap({}, 5))), { savedAt: 5, version: CURRENT });
});
test('decideSync', () => {
  const a = { savedAt: 1, version: CURRENT }, b = { savedAt: 2, version: CURRENT };
  assert.equal(decideSync(null, null), 'nothing');
  assert.equal(decideSync(a, null), 'upload');
  assert.equal(decideSync(null, a), 'download');
  assert.equal(decideSync(a, a), 'same');
  assert.equal(decideSync(a, b), 'ask');
  assert.equal(decideSync(a, { savedAt: 9, version: CURRENT + 1 }), 'refuse');
});

test('autoDecision never overwrites a cloud save this device did not sync', () => {
  const v = CURRENT, L = t => ({ savedAt: t, version: v });
  assert.equal(autoDecision(null, null, null), 'skip');
  assert.equal(autoDecision(L(5), null, null), 'upload');           // empty cloud
  assert.equal(autoDecision(L(5), L(3), null), 'conflict');          // first time, cloud has something
  assert.equal(autoDecision(L(5), L(3), 3), 'upload');               // cloud is what we last synced, we have newer
  assert.equal(autoDecision(L(3), L(3), 3), 'idle');                 // nothing new
  assert.equal(autoDecision(L(5), L(4), 3), 'conflict');             // another device uploaded
  assert.equal(autoDecision(L(5), { savedAt: 9, version: v + 1 }, 9), 'skip');
});
