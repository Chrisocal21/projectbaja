import test from 'node:test';
import assert from 'node:assert/strict';
import { maxCustomers, jobPool, sanitizeJobs } from './custQueue.js';

test('two customers can wait at the start; more with bays and parking', () => {
  assert.equal(maxCustomers(1, 0), 2);
  assert.equal(maxCustomers(3, 0), 4);
  assert.equal(maxCustomers(1, 2), 4);
  assert.equal(maxCustomers(0, 0), 2);
});

test('nobody already waiting, nor the last customer, comes again', () => {
  const jobs = [{ id: 'a' }, { id: 'b' }, { id: 'c', needsGarage: 'tireChanger' }, { id: 'd' }];
  assert.deepEqual(jobPool(jobs, [{ id: 'a' }], 'b', () => false).map(j => j.id), ['d']);
  assert.deepEqual(jobPool(jobs, [], null, () => true).map(j => j.id), ['a', 'b', 'c', 'd']);
});

test('an old save with one customer becomes a list of one', () => {
  const out = sanitizeJobs(undefined, { id: 'oil', stall: 3, x: 1, z: 2, h: 0.5 });
  assert.equal(out.length, 1); assert.equal(out[0].id, 'oil'); assert.equal(out[0].uid, 1); assert.ok([1, 2, 3].includes(out[0].look));
  assert.deepEqual(sanitizeJobs(undefined, null), []);
});

test('bad, unknown and repeated customers are dropped; uids stay unique', () => {
  const out = sanitizeJobs([{ id: 'a', x: 1, z: 1, uid: 4 }, { id: 'a', x: 2, z: 2 }, { id: 'b', x: NaN, z: 1 }, { id: 'gone', x: 1, z: 1 }, { id: 'c', x: 3, z: 3, uid: 4 }, null], null, id => id !== 'gone');
  assert.deepEqual(out.map(j => j.id), ['a', 'c']);
  assert.equal(new Set(out.map(j => j.uid)).size, 2);
  assert.equal(out[0].h, 0);
  assert.deepEqual(sanitizeJobs([], { id: 'a', x: 1, z: 1 }), []);   // a new list wins over the old single job
});
