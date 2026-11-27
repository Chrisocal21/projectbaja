import test from 'node:test';
import assert from 'node:assert/strict';
import { groupItems } from './invGroups.js';

test('same things share a line; different place, name or owner do not', () => {
  const name = i => i.id + (i.cond ?? '');
  const out = groupItems([
    { uid: 1, kind: 'supply', id: 'oil' }, { uid: 2, kind: 'supply', id: 'oil' },
    { uid: 3, kind: 'supply', id: 'oil', spot: 'roof' }, { uid: 4, kind: 'epart', id: 'carb', cond: 40 },
    { uid: 5, kind: 'epart', id: 'carb', cond: 90 }, { uid: 6, kind: 'stock', id: 'wheel' }, { uid: 7, kind: 'stock', id: 'wheel', cust: true },
  ], name);
  assert.deepEqual(out.map(g => [g.it.uid, g.n]), [[1, 2], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]]);
});
