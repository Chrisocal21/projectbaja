import test from 'node:test';
import assert from 'node:assert/strict';
import { compass, nearest, hintFor, buildDiscoverables, foundNow, progress, REACH } from './discoveries.js';

test('compass words: north is -z, east is +x', () => {
  assert.equal(compass(0, 0, 0, -100), 'north'); assert.equal(compass(0, 0, 100, 0), 'east'); assert.equal(compass(0, 0, 0, 100), 'south');
  assert.equal(compass(0, 0, -100, 100), 'south-west'); assert.equal(compass(0, 0, 100, -100), 'north-east');
});
test('nearest town and the hint for something not found yet', () => {
  const towns = [{ name: 'Ensenada', x: 0, z: 0 }, { name: 'Tecate', x: 5000, z: 0 }];
  assert.equal(nearest(towns, 4000, 10).name, 'Tecate');
  assert.equal(hintFor({ x: 900, z: -900 }, towns), 'north-east of Ensenada');
  assert.equal(hintFor({ x: 10, z: 10 }, towns), 'in Ensenada');
  assert.equal(hintFor({ x: 1, z: 1 }, []), '');
});
const world = () => buildDiscoverables({
  towns: [{ name: 'Ensenada', x: 0, z: 0 }], places: [{ id: 'garage', name: "Walt's Garage", x: 500, z: 500 }],
  stops: [{ type: 'gas', x: 1000, z: 0 }, { type: 'rest', x: 2000, z: 0 }], wrecks: [{ id: 7, name: 'Wrecked Bug', x: 300, z: 300 }],
  courses: [{ id: 'mdr-flats', name: 'The Flats', start: { x: -800, z: 0 } }],
});
test('every kind of place becomes one discoverable with a stable id and a reach', () => {
  const w = world(); assert.equal(w.length, 6);
  assert.deepEqual(w.map(d => d.id).sort(), ['place-garage', 'race-mdr-flats', 'stop-0', 'stop-1', 'town-Ensenada', 'wreck-7']);
  assert.ok(w.every(d => d.reach === REACH[d.kind])); assert.match(w.find(d => d.id === 'stop-0').hint, /of Ensenada/);
});
test('you find a place by getting within its reach, once', () => {
  const w = world(), found = {};
  assert.equal(foundNow(w, found, 1000, 80).length, 0);   // 80 m from the gas stop: too far (reach 55)
  const hit = foundNow(w, found, 1000, 40); assert.deepEqual(hit.map(d => d.id), ['stop-0']);
  found['stop-0'] = true; assert.equal(foundNow(w, found, 1000, 40).length, 0);
  assert.deepEqual(foundNow(w, found, 0, 100).map(d => d.id), ['town-Ensenada']);   // a town counts from 450 m
});
test('progress counts by kind', () => {
  const p = progress(world(), { 'stop-0': true, 'town-Ensenada': true });
  assert.equal(p.total, 6); assert.equal(p.found, 2); assert.deepEqual(p.byKind.stop, { total: 2, found: 1 }); assert.deepEqual(p.byKind.wreck, { total: 1, found: 0 });
});
