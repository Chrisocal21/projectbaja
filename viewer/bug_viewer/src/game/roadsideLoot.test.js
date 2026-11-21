import test from 'node:test';
import assert from 'node:assert/strict';
import { roadsideLoot, ROADSIDE_LAYOUT } from './roadsideLoot.js';

const sites = [{ type: 'gas', x: 1000, z: -2000, ry: 0 }, { type: 'rest', x: -500, z: 300, ry: Math.PI / 2 }, { type: 'gas', x: 40, z: 90, ry: 1 }];

test('every roadside stop gets its containers, with unique ids and a type the game knows', () => {
  const { containers } = roadsideLoot(sites);
  assert.equal(containers.length, sites.reduce((n, q) => n + ROADSIDE_LAYOUT[q.type].containers.length, 0));
  assert.equal(new Set(containers.map(c => c.id)).size, containers.length);
  for (const c of containers) assert.ok(['box', 'crate', 'drawer'].includes(c.type), c.type);
});
test('the same sites always give the same loot places', () => {
  assert.deepEqual(roadsideLoot(sites), roadsideLoot(sites));
});
test('containers are placed in the stop\'s own frame (+z faces the road)', () => {
  const { containers } = roadsideLoot([{ type: 'gas', x: 0, z: 0, ry: 0 }]);
  const box = containers.find(c => c.id === 'rs0-0');   // local (8.5, -6.2)
  assert.ok(Math.abs(box.x - 8.5) < 1e-9 && Math.abs(box.z + 6.2) < 1e-9);
  const turned = roadsideLoot([{ type: 'gas', x: 0, z: 0, ry: Math.PI / 2 }]).containers.find(c => c.id === 'rs0-0');   // local +z now points to world +x
  assert.ok(Math.abs(turned.x - (-6.2)) < 1e-9 && Math.abs(turned.z - (-8.5)) < 1e-9, `${turned.x}, ${turned.z}`);
});
test('containers stand on the ground and spots sit inside the place', () => {
  const { containers, spots } = roadsideLoot(sites, (x, z) => 7);
  assert.ok(containers.every(c => c.y === 7));
  for (const s of spots) assert.ok(Math.hypot(s.x - sites[Number(s.site.slice(2))].x, s.z - sites[Number(s.site.slice(2))].z) < 20);
});
test('a classic map (no roadside) has no finds', () => {
  assert.deepEqual(roadsideLoot([]), { containers: [], spots: [] });
});

import { wreckSites, FAR_KM } from './roadsideLoot.js';
test('wrecks stand at every other rest area, beside the building, never at gas stations', () => {
  const many = [{ type: 'rest', x: 0, z: 0, ry: 0 }, { type: 'gas', x: 50, z: 0, ry: 0 }, { type: 'rest', x: 100, z: 0, ry: 0 }, { type: 'rest', x: 200, z: 0, ry: 0 }, { type: 'rest', x: 300, z: 0, ry: 0 }];
  const w = wreckSites(many);
  assert.deepEqual(w.map(q => q.site), ['rs0', 'rs3']);   // rests are rs0, rs2, rs3, rs4: every other one
  assert.ok(Math.abs(w[0].x + 10.5) < 1e-9 && Math.abs(w[0].z + 3) < 1e-9);
  assert.equal(wreckSites(many, 1).length, 1);
});
test('stops far from home are worth more', () => {
  const { containers } = roadsideLoot([{ type: 'gas', x: 0, z: 0, ry: 0 }, { type: 'gas', x: FAR_KM * 3, z: 0, ry: 0 }]);
  assert.ok(containers[0].far < 0.01 && containers.at(-1).far === 2);
});
