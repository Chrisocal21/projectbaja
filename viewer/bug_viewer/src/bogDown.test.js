import test from 'node:test';
import assert from 'node:assert/strict';
import { stepSink, sinkEffect, isStuck, canDig, digWheel, sinkDeeper, STUCK_AT, SOFT, DIG } from './bogDown.js';

const run = (secs, o, sink = 0) => { for (let t = 0; t < secs; t += 1 / 60) sink = stepSink(sink, o, 1 / 60); return sink; };

test('spinning the wheels in silt digs the car in until it is stuck', () => {
  const s = run(3, { key: 'silt', throttle: 1, speed: 0.2, psi: 30 });
  assert.ok(s > STUCK_AT, `sink ${s}`); assert.ok(isStuck(s, 0.2, 1));
});
test('crawling through silt sinks you; carrying speed floats you over it', () => {
  const slow = run(4, { key: 'silt', throttle: 1, speed: 3, psi: 30 }), fast = run(4, { key: 'silt', throttle: 1, speed: 14, psi: 30 });
  assert.ok(slow > 0.5, `slow ${slow}`); assert.equal(fast, 0);
});
test('aired-down tires sink less than street pressure', () => {
  const street = run(1.5, { key: 'softSand', throttle: 1, speed: 0.5, psi: 30 }), aired = run(1.5, { key: 'softSand', throttle: 1, speed: 0.5, psi: 14 });
  assert.ok(aired < street * 0.7, `${aired} vs ${street}`);
});
test('ordinary loose sand drags but never strands you', () => {
  const s = run(10, { key: 'sand', throttle: 1, speed: 0, psi: 30 });
  assert.ok(s <= SOFT.sand.cap && s < STUCK_AT);
});
test('a parked car does not sink; firm ground and traction boards lift you out', () => {
  assert.equal(run(5, { key: 'silt', throttle: 0, speed: 0, psi: 30 }, 0.3), 0.3);
  assert.equal(run(2, { key: 'hardpack', throttle: 1, speed: 2, psi: 30 }, 0.8), 0);
  assert.equal(run(1, { key: 'silt', throttle: 1, speed: 0.3, psi: 30, boards: true }, 0.9), 0);
});
test('stuck deep, the drag beats what the tires can push; lightly sunk, it only slows you', () => {
  const push = 0.38 * 1.5 * 0.6;   // silt grip x the off-road tire factor x the share of weight on the driven (rear) wheels
  const deep = sinkEffect(0.6, 'silt'), light = sinkEffect(0.15, 'silt');
  assert.ok(0.03 * 3.2 * deep.rr > push * deep.mu, 'deep: stuck');
  assert.ok(0.03 * 3.2 * light.rr < push * light.mu * 0.8, 'light: still drives');
  assert.ok(deep.depth > light.depth && light.depth > 0);
  assert.deepEqual(sinkEffect(0, 'silt'), { rr: 1, mu: 1, depth: 0 });
  assert.ok(sinkEffect(0.6, 'silt', true).mu > 1, 'boards grip');
});
test('the shovel: each wheel dug takes sink away, a dug wheel needs no second dig unless the car sinks again', () => {
  let r = { n: 1 };
  for (const c of ['FL', 'FR', 'RL', 'RR']) { assert.ok(canDig(r, c)); r = digWheel(r, c); }
  assert.ok(r.n < STUCK_AT && Math.abs(r.n - (1 - 4 * DIG.perWheel)) < 1e-9);
  assert.equal(canDig(r, 'FL'), false);
  const again = sinkDeeper({ ...r, n: r.n + 0.3 }, r.n); assert.equal(canDig(again, 'FL'), true, 'sank again: dig again');
  assert.equal(canDig(sinkDeeper({ ...r }, r.n + 0.1), 'FL'), false, 'rising out keeps it dug');
  assert.equal(canDig({ n: 0 }, 'FL'), false, 'nothing to dig');
});
