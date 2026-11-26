import test from 'node:test';
import assert from 'node:assert/strict';
import { matFinds, matName, FOREST_VERGE } from './matFinds.js';

const sites = Array.from({ length: 40 }, (_, i) => ({ type: i % 2 ? 'gas' : 'rest', x: 1000 + i * 731, z: -500 + i * 377, ry: i * 0.4 }));
const forest = (k, x, z) => ({ kind: 'forest', x, z, path: [[x - 100, z], [x - 50, z + 5], [x, z], [x + 50, z - 5], [x + 100, z]] });
const wild = [forest(0, 0, 0), { kind: 'ford', x: 500, z: 500, path: [[0, 0], [10, 0]] }, forest(2, 3000, 2000), forest(3, -4000, 900)];

test('roadside: about half the stops have one small find, the same every time', () => {
  const a = matFinds(sites, []), b = matFinds(sites, []);
  assert.deepEqual(a, b, 'seeded by where the stop is');
  assert.ok(a.length >= 10 && a.length <= 30, `${a.length} of 40 stops`);
  assert.ok(a.every(f => f.n >= 1 && f.n <= 2 && (f.id === 'wood' || f.id === 'scrap')), 'scarce: one or two pieces');
  assert.equal(new Set(a.map(f => f.key)).size, a.length, 'keys are unique');
});
test('forests: one or two bundles per forest trail, on the verge beside the trail; other trails get none', () => {
  const f = matFinds([], wild);
  assert.ok(f.length >= 3 && f.length <= 6);
  assert.ok(f.every(x => x.key.startsWith('wf0') || x.key.startsWith('wf2') || x.key.startsWith('wf3')), 'not the creek ford');
  for (const x of f) {   // within a few metres of the trail line, not on it
    const w = wild[+x.key.slice(2).split('-')[0]], d = Math.min(...w.path.slice(1).map((p, i) => { const a = w.path[i], dx = p[0] - a[0], dz = p[1] - a[1], t = Math.max(0, Math.min(1, ((x.x - a[0]) * dx + (x.z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x.x - a[0] - dx * t, x.z - a[1] - dz * t); }));
    assert.ok(d > 1.5 && d <= FOREST_VERGE + 0.01, `${x.key} lies ${d.toFixed(2)} m off the trail`);
    assert.ok(x.n >= 2 && x.n <= 3);
  }
  assert.ok(f.filter(x => x.id === 'wood').length >= f.length / 2, 'mostly wood in the forest');
});
test('names', () => { assert.equal(matName('wood', 3), 'Wood planks (3)'); assert.equal(matName('scrap'), 'Scrap metal'); });
