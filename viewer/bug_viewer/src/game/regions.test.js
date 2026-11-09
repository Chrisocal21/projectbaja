import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, exitHit, regionOfWorld } from './regions.js';

test('every exit leads to a real region and arrives outside every exit circle (no travel ping-pong)', () => {
  for (const r of Object.values(REGIONS)) for (const e of r.exits) {
    const to = REGIONS[e.to]; assert.ok(to, `${r.id}->${e.to}`);
    for (const back of to.exits) assert.ok(Math.hypot(e.arrive.x - back.x, e.arrive.z - back.z) > back.r + 5, `arrival of ${e.id} sits inside ${back.id}`);
  }
});
test('dev exits only work in dev sessions', () => {
  const e = REGIONS.county.exits[0];
  assert.equal(exitHit('county', e.x, e.z, false), null);
  assert.equal(exitHit('county', e.x, e.z, true)?.id, e.id);
  assert.equal(exitHit('county', e.x + 50, e.z, true), null);
});
test('regions find their world', () => { assert.equal(regionOfWorld('county').id, 'county'); assert.equal(regionOfWorld('nope'), null); });
