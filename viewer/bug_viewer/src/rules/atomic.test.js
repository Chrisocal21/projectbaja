// Slice A: one part, one tool, one atomic install, and it survives a save + reload.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTx, snapshotOf } from './atomic.js';
import { BUG, slotById } from './vehicles.js';
import { isFitted, checkFit, checkDetach, withSlot } from './restore.js';

/** a stand-in for game/store.js: the same shape of state, a fake localStorage, and the same transaction wiring */
function makeGame() {
  const disk = { data: null, writes: 0 };
  const g = {
    cash: 1500, mats: { scrap: 0 }, home: {},
    build: { hidden: ['seatDriver'], stripped: ['wheelRR'] },                 // new game: rear-right hub bare (canon: off after a flat)
    items: [{ uid: 1, kind: 'stock', id: 'wheel', set: 'stock', loc: 'world', x: 2.7, z: 2.4 }, { uid: 2, kind: 'tool', id: 'wrench', loc: 'pack' }],
  };
  const write = () => { disk.writes++; disk.data = JSON.stringify({ cash: g.cash, items: g.items, build: g.build, mats: g.mats, home: g.home }); };
  const tx = createTx({ snapshot: () => snapshotOf(g), restore: s => Object.assign(g, s), write });
  const persist = () => tx.request();
  return { g, disk, tx, persist, reload: () => JSON.parse(disk.data) };
}
const tools = new Set(['wrench', 'jack']);
/** where the Bug's four stock wheels are: each one is on a hub or is exactly one loose item, never both */
const wheelPlaces = (build, items) => BUG.slots.filter(s => s.wheel && isFitted(BUG, build, s.id)).length + items.filter(i => i.kind === 'stock' && i.id === 'wheel').length;

function fitHeld(t, uid) {   // what main.jsx doFit does for a stock wheel, inside one transaction
  const it = t.g.items.find(i => i.uid === uid), slot = slotById(BUG, 'wheelRR');
  const r = checkFit(BUG, t.g.build, slot, { tools, open: new Set() }); if (!r.ok) return r;
  t.tx.run(() => { t.g.items = t.g.items.filter(x => x !== it); t.persist(); t.g.build = withSlot(BUG, t.g.build, 'wheelRR', true); t.persist(); });
  return r;
}
function detachToHand(t) {   // what doDetach does: the wheel comes off into your hands
  const r = checkDetach(BUG, t.g.build, slotById(BUG, 'wheelRR'), { tools, open: new Set() }); if (!r.ok) return r;
  t.tx.run(() => { t.g.items = [...t.g.items, { uid: 3, kind: 'stock', id: 'wheel', set: 'stock', loc: 'hand' }]; t.persist(); t.g.build = withSlot(BUG, t.g.build, 'wheelRR', false); t.persist(); });
  return r;
}

test('a transaction turns many save requests into one write', () => {
  const t = makeGame();
  t.tx.run(() => { t.persist(); t.persist(); t.tx.run(() => t.persist()); });
  assert.equal(t.disk.writes, 1);
  t.persist(); assert.equal(t.disk.writes, 2, 'outside a transaction every request writes');
});

test('a failed transaction restores the state and writes nothing', () => {
  const t = makeGame(); t.persist(); const before = t.disk.data;
  assert.throws(() => t.tx.run(() => { t.g.items = []; t.persist(); t.g.cash = 0; throw new Error('crash mid-install'); }));
  assert.equal(t.g.items.length, 2); assert.equal(t.g.cash, 1500); assert.equal(t.disk.data, before);
});

test('Slice A: new game has the rear-right hub bare and its wheel lying loose', () => {
  const t = makeGame();
  assert.equal(isFitted(BUG, t.g.build, 'wheelRR'), false);
  assert.equal(wheelPlaces(t.g.build, t.g.items), 4);
});

test('Slice A: the wheel needs the jack; without it nothing changes', () => {
  const t = makeGame(); t.g.items[0].loc = 'hand';
  const r = checkFit(BUG, t.g.build, slotById(BUG, 'wheelRR'), { tools: new Set(['wrench']), open: new Set() });
  assert.equal(r.code, 'no_tool'); assert.match(r.why, /jack/);
  assert.equal(t.disk.writes, 0);
});

test('Slice A: fitting the wheel is one write, and it is still on after a reload', () => {
  const t = makeGame(); t.g.items[0].loc = 'hand';
  assert.equal(fitHeld(t, 1).ok, true);
  assert.equal(t.disk.writes, 1, 'the item list and the car are saved together');
  const saved = t.reload();
  assert.equal(isFitted(BUG, saved.build, 'wheelRR'), true);
  assert.equal(saved.items.some(i => i.kind === 'stock' && i.id === 'wheel'), false, 'the wheel is not also lying around');
  assert.equal(wheelPlaces(saved.build, saved.items), 4);
});

test('Slice A: taking the wheel off again never duplicates it', () => {
  const t = makeGame(); t.g.items[0].loc = 'hand'; fitHeld(t, 1);
  assert.equal(detachToHand(t).ok, true);
  const saved = t.reload();
  assert.equal(isFitted(BUG, saved.build, 'wheelRR'), false);
  assert.equal(saved.items.filter(i => i.kind === 'stock' && i.id === 'wheel' && i.loc === 'hand').length, 1);
  assert.equal(wheelPlaces(saved.build, saved.items), 4);
  assert.equal(fitHeld(t, 3).ok, true, 'and it goes back on');
  assert.equal(wheelPlaces(t.reload().build, t.reload().items), 4);
});
