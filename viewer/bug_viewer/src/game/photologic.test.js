import test from 'node:test';
import assert from 'node:assert/strict';
import { placeName, coordText, newPhoto, addPhoto, postedFeed } from './photologic.js';

const areas = { a: { name: 'Dry Wells', x: 100, z: 0, r: 50 }, b: { name: 'Lake', x: -500, z: 0, rx: 100, rz: 50 } };
test('placeName: inside, near, none', () => {
  assert.equal(placeName(110, 10, areas), 'Dry Wells');
  assert.equal(placeName(300, 0, areas), 'Open country near Dry Wells');
  assert.equal(placeName(0, 0, {}), 'Open country');
  assert.equal(placeName(-500, 40, areas), 'Lake');
});
test('coordText rounds', () => assert.equal(coordText(12.6, -3.2), '13, -3'));
test('addPhoto drops oldest unposted first', () => {
  let l = [];
  for (let i = 0; i < 4; i++) l = addPhoto(l, { ...newPhoto({ id: i, x: 0, z: 0 }), posted: i === 0 }, 3);
  assert.deepEqual(l.map(p => p.id), [0, 2, 3]);
});
test('postedFeed newest first', () => {
  const l = [{ id: 1, posted: true }, { id: 2, posted: false }, { id: 3, posted: true }];
  assert.deepEqual(postedFeed(l).map(p => p.id), [3, 1]);
});
