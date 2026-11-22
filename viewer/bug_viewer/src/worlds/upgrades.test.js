import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, STAGES, stageById, stagesOf, ownedStages, whyNot, nextStage, effectsOf, ORDER_HOURS_BASE } from './upgrades.js';
import { rowsAtLevel } from './lot.js';

test('every stage has a track, a price, a note, known prerequisites and a unique id', () => {
  assert.equal(new Set(STAGES.map(s => s.id)).size, STAGES.length);
  for (const s of STAGES) {
    assert.ok(TRACKS.some(t => t.id === s.track), `${s.id} track`);
    assert.ok(s.price > 0 && s.note && s.name, s.id);
    for (const n of s.needs) assert.ok(stageById[n], `${s.id} needs ${n}`);
  }
  for (const t of TRACKS) assert.ok(stagesOf(t.id).length >= 2, `${t.id} has stages`);
});
test('prerequisites never loop (every stage can be reached by buying in some order)', () => {
  const owned = new Set(); let moved = true;
  while (moved) { moved = false; for (const s of STAGES) if (!owned.has(s.id) && s.needs.every(n => owned.has(n))) { owned.add(s.id); moved = true; } }
  assert.equal(owned.size, STAGES.length);
});
test('the parking stages match the lot they build', () => {
  assert.ok(stageById.parking1.note.includes(String(rowsAtLevel(1) * 2)));
  assert.ok(stageById.parking2.note.includes(String(rowsAtLevel(2) * 2)));
});
test('old saves read correctly: lift, lot, office annex and trailer keys map onto stages', () => {
  const o = ownedStages({ upgrades: { lift2: 1, parking: 1, office: 1 }, trailer: ['roof', 'paint'] });
  assert.deepEqual([...o].sort(), ['annex', 'camper-paint', 'camper-roof', 'lift2', 'parking1'].sort());
  assert.ok(ownedStages({ upgrades: { parking: 2 } }).has('parking2') && ownedStages({ upgrades: { parking: 2 } }).has('parking1'));
  assert.equal(ownedStages({}).size, 0); assert.equal(ownedStages(undefined).size, 0);
  assert.ok(ownedStages({ stages: ['airTools'] }).has('airTools'));
});
test('buying order: prerequisites, cash and already-built are each explained', () => {
  const none = new Set();
  assert.match(whyNot('proTools', none, 99999), /First: Air tools and Second car lift/);
  assert.match(whyNot('airTools', none, 100), /Not enough cash/);
  assert.equal(whyNot('airTools', none, 100, true), '', 'creative is free');
  assert.equal(whyNot('airTools', none, 900), '');
  assert.equal(whyNot('airTools', new Set(['airTools']), 9999), 'Already built.');
  assert.equal(whyNot('nope', none, 1), 'Unknown upgrade.');
});
test('nextStage walks a track in order and ends with null', () => {
  const owned = new Set();
  assert.equal(nextStage('office', owned).id, 'phoneLine');
  owned.add('phoneLine'); assert.equal(nextStage('office', owned).id, 'annex');
  owned.add('annex'); assert.equal(nextStage('office', owned).id, 'supplierAccount');
  owned.add('supplierAccount'); assert.equal(nextStage('office', owned).id, 'office1');
  owned.add('office1'); assert.equal(nextStage('office', owned), null);
});
test('effects: order time, hold speed and pack size step up with the stages', () => {
  assert.deepEqual(effectsOf(new Set()), { orderHours: ORDER_HOURS_BASE, holdScale: 1, packBonus: 0 });
  assert.equal(effectsOf(new Set(['phoneLine'])).orderHours, 2);
  assert.equal(effectsOf(new Set(['phoneLine', 'annex', 'supplierAccount'])).orderHours, 1);
  assert.equal(effectsOf(new Set(['airTools'])).holdScale, 0.7);
  assert.equal(effectsOf(new Set(['airTools', 'lift2', 'proTools'])).holdScale, 0.5);
  assert.equal(effectsOf(new Set(['camper-locker'])).packBonus, 2);
});
