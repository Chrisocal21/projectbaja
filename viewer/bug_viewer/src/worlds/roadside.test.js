import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoadside } from './roadside.js';
import { buildJunctions } from './junctions.js';

const bounds = { x0: -20000, x1: 20000, z0: -20000, z1: 20000 };

test('rest areas stand beside a long straight freeway, facing it, spaced apart', () => {
  const roads = [{ name: 'I-8', kind: 'major', pts: Array.from({ length: 41 }, (_, i) => [i * 500 - 10000, 0]) }];
  const R = buildRoadside(roads, { furniture: [], ramps: [] }, { bounds });
  assert.ok(R.rest >= 2, 'rest areas: ' + R.rest);
  for (const s of R.sites) { assert.ok(Math.abs(Math.abs(s.z) - 42) < 1); assert.ok(Math.sin(s.ry) * 0 + Math.cos(s.ry) * (s.z > 0 ? -1 : 1) > 0.99); }   // heading east: right is +z (south); faces north
  for (let i = 0; i < R.sites.length; i++) for (let j = i + 1; j < R.sites.length; j++) assert.ok(Math.hypot(R.sites[i].x - R.sites[j].x, R.sites[i].z - R.sites[j].z) > 400);
});

test('no rest area at a junction, none on steep ground', () => {
  const roads = [{ name: 'I-8', kind: 'major', pts: Array.from({ length: 41 }, (_, i) => [i * 500 - 10000, 0]) }];
  const busy = { furniture: Array.from({ length: 41 }, (_, i) => ({ type: 'stop', x: i * 500 - 10000, z: 0 })), ramps: [] };
  assert.equal(buildRoadside(roads, busy, { bounds }).rest, 0);
  assert.equal(buildRoadside(roads, { furniture: [], ramps: [] }, { bounds, ground: (x, z) => z * 0.5 }).rest, 0);   // 0.5 slope everywhere
});

test('gas stations come from interchanges and are deterministic', () => {
  const roads = [
    { name: 'I-8', kind: 'major', pts: [[-1000, 0], [1000, 0]] },
    ...Array.from({ length: 6 }, (_, k) => ({ name: 'CA-' + k, kind: 'secondary', pts: [[k * 3000 - 7000 + 5000, 0], [k * 3000 - 7000 + 5000, 1500]] })),
  ];
  const j = buildJunctions(roads, bounds);
  const a = buildRoadside(roads, j, { bounds }), b = buildRoadside(roads, j, { bounds });
  assert.deepEqual(a.sites, b.sites);
  for (const s of a.sites) assert.ok(s.type === 'rest' || s.type === 'gas');
});
