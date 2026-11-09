import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSync, summarize } from './cloudsync.js';
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
