import test from 'node:test'; import assert from 'node:assert/strict';
import { worldToMap, arrowDir, siteCleared } from './mapmath.js';
const H = 3000, near = (a, b) => Math.abs(a - b) < 1e-9;
test('north is up, +x is left (matches the 3D view)', () => {
  const [u0, v0] = worldToMap(0, 0, H), [un, vn] = worldToMap(0, 100, H), [ue] = worldToMap(100, 0, H);
  assert.ok(vn < v0); assert.ok(ue < u0); assert.ok(near(u0, 0.5) && near(v0, 0.5)); assert.ok(near(un, u0));
});
test('Dry Wells (+x,+z of garage) sits up-left of the garage; dunes (-x) to the right', () => {
  const g = worldToMap(0, 0, H), dw = worldToMap(1360, 600, H), du = worldToMap(-1980, 500, H);
  assert.ok(dw[0] < g[0] && dw[1] < g[1]); assert.ok(du[0] > g[0]);
});
test('arrow points where the player faces', () => {
  const d = (y) => arrowDir(y).map(v => Math.round(v * 1e6) / 1e6 + 0);
  assert.deepEqual(d(0).map(Math.abs), [0, 1]); assert.ok(d(0)[1] < 0);                       // facing +z -> up
  assert.deepEqual(d(Math.PI / 2), [-1, 0]);             // forward (1,0) = +x -> left
  assert.deepEqual(d(Math.PI).map(Math.abs), [0, 1]);    // facing -z -> down
});
test('siteCleared reads live item state', () => {
  const d = { containers: [{ id: 'a', site: 'barn' }], spots: [{ site: 'barn', x: 5, z: 5 }], heaps: [{ id: 'h', site: 'barn' }] };
  const s = { boxes: { a: { searched: true } }, items: [], heaps: ['h'] };
  assert.equal(siteCleared('barn', s, d), true);
  assert.equal(siteCleared('barn', { ...s, items: [{ loc: 'box', box: 'a' }] }, d), false);
  assert.equal(siteCleared('barn', { ...s, items: [{ loc: 'world', x: 5.5, z: 5 }] }, d), false);
  assert.equal(siteCleared('barn', { ...s, boxes: { a: { searched: false } } }, d), false);
  assert.equal(siteCleared('barn', { ...s, heaps: [] }, d), false);
  assert.equal(siteCleared('gas', s, d), false);
});
