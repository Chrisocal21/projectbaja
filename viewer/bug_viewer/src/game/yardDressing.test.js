import test from 'node:test';
import assert from 'node:assert/strict';
import { DRESSING, dressingCircles } from './yardDressing.js';
import { TIRE_PILE, YARD_SPOTS } from './yardTires.js';

test('yard junk has bump circles and stays off the tire pile and the loose yard tires', () => {
  const circles = dressingCircles();
  assert.equal(circles.length, DRESSING.reduce((n, d) => n + d.circles.length, 0));
  for (const [x, z, r] of circles) {
    assert.ok(Math.hypot(x - TIRE_PILE.lx, z - TIRE_PILE.lz) > r + 1.6, 'clear of the scrap pile');
    for (const [tx, tz] of YARD_SPOTS) assert.ok(Math.hypot(x - tx, z - tz) > r + 0.4, 'clear of a yard tire');
  }
});

test('the dumpster turned side-on puts its two circles along local x', () => {
  const [a, b] = dressingCircles();
  assert.ok(Math.abs(a[1] - b[1]) < 1e-9); assert.ok(Math.abs(Math.abs(a[0] - b[0]) - 0.9) < 1e-9);
});
