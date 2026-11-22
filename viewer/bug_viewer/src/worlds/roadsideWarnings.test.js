import test from 'node:test';
import assert from 'node:assert/strict';
import { curveWarnings } from './roadsideWarnings.js';

function bentRoad() {
  const coords = [];
  for (let i = 0; i < 30; i++) coords.push([0, i * 20]);
  for (let i = 1; i <= 20; i++) {
    const a = i / 20 * Math.PI / 2;
    coords.push([120 * (1 - Math.cos(a)), 580 + 120 * Math.sin(a)]);
  }
  for (let i = 1; i <= 25; i++) coords.push([120 + i * 20, 700]);
  let s = 0;
  return { name: 'Mex 1', kind: 'major', style: { half: 5 }, pts: coords.map(([x, z], i) => {
    if (i) s += Math.hypot(x - coords[i - 1][0], z - coords[i - 1][1]);
    const a = coords[Math.max(0, i - 1)], b = coords[Math.min(coords.length - 1, i + 1)], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { x, z, s, tx: (b[0] - a[0]) / len, tz: (b[1] - a[1]) / len };
  }) };
}

test('curve warning stands before the bend, beyond pavement, and skips water', () => {
  const road = bentRoad();
  const network = { roads: [road], isNear: (x, z, pad) => road.pts.some(p => Math.hypot(x - p.x, z - p.z) < road.style.half + pad) };
  const signs = curveWarnings(network, () => null, () => 3);
  assert.ok(signs.length > 0);
  assert.equal(signs[0].turn, 'right');
  assert.ok(signs[0].z < 700);
  assert.ok(signs.every(p => !network.isNear(p.x, p.z, 5)));
  assert.equal(curveWarnings(network, () => 0, () => 3).length, 0);
});
