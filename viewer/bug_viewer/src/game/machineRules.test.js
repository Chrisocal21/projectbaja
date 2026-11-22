import test from 'node:test';
import assert from 'node:assert/strict';
import { planMachine, wheelOfItem } from './machineRules.js';
import { rimSizeOf } from './wheelAssembly.js';

// 'stock' is the Bug's 15 inch tire; 'tire-light' is a big rugged 17 inch one
const sizes = { tireSize: s => (s === 'tire-light' ? 17 : 15), rimSize: rimSizeOf };
const wheel = (o = {}) => ({ kind: 'stock', id: 'wheel', set: 'stock', tread: 0.5, ...o });

test('an old wheel (no rim, hole or air fields) behaves as a good steel wheel', () => {
  const w = wheelOfItem(wheel(), sizes);
  assert.equal(w.rim.id, 'steel'); assert.equal(w.air, 1); assert.equal(w.tire.hole, false);
});
test('a good wheel at the machine: the tire comes off, the rim stays in hand, the tire lands on the floor with its tread', () => {
  const p = planMachine({ held: wheel({ tread: 0.42 }), sizes });
  assert.equal(p.ok, true); assert.equal(p.verb, 'Take the tire off the rim');
  assert.deepEqual(p.apply.held, { kind: 'rim', id: 'steel' });
  assert.deepEqual(p.apply.spawn, [{ kind: 'tire', id: 'stock', tread: 0.42, hole: false }]);
});
test('a punctured wheel is patched first, and that uses a plug kit', () => {
  const holed = wheel({ hole: true, air: 0.1 });
  const no = planMachine({ held: holed, hasKit: false, sizes });
  assert.equal(no.ok, false); assert.match(no.why, /plug kit/);
  const yes = planMachine({ held: holed, hasKit: true, sizes });
  assert.equal(yes.ok, true); assert.equal(yes.apply.useKit, true); assert.equal(yes.apply.held.hole, false);
});
test('a flat wheel is inflated, and that needs the compressor', () => {
  const flat = wheel({ air: 0.1 });
  assert.match(planMachine({ held: flat, hasAir: false, sizes }).why, /compressor/);
  const r = planMachine({ held: flat, hasAir: true, sizes });
  assert.equal(r.ok, true); assert.equal(r.apply.held.air, 1);
});
test('a rim mounts the tire lying beside the machine and keeps its tread; the tire is used up', () => {
  const r = planMachine({ held: { kind: 'rim', id: 'retro' }, nearby: [{ uid: 9, kind: 'tire', id: 'stock', tread: 0.3, hole: true }], sizes });
  assert.equal(r.ok, true);
  assert.deepEqual(r.apply.held, { kind: 'stock', id: 'wheel', set: 'stock', tread: 0.3, rim: 'retro', hole: true, air: 0 });
  assert.deepEqual(r.apply.consume, [9]);
});
test('a tire in hand mounts on a rim on the floor', () => {
  const r = planMachine({ held: { kind: 'tire', id: 'stock', tread: 0.8 }, nearby: [{ uid: 4, kind: 'rim', id: 'steel' }], sizes });
  assert.equal(r.ok, true); assert.equal(r.apply.held.rim, 'steel'); assert.deepEqual(r.apply.consume, [4]);
});
test('a tire of the wrong size is refused with the sizes in the message; a right-size one nearby is chosen', () => {
  const big = { uid: 1, kind: 'tire', id: 'tire-light', tread: 1 }, ok = { uid: 2, kind: 'tire', id: 'stock', tread: 1 };
  const bad = planMachine({ held: { kind: 'rim', id: 'steel' }, nearby: [big], sizes });
  assert.equal(bad.ok, false); assert.match(bad.why, /17" rim; this rim is 15"/);
  assert.deepEqual(planMachine({ held: { kind: 'rim', id: 'steel' }, nearby: [big, ok], sizes }).apply.consume, [2]);
});
test('nothing on the floor to mount says so; things that are not wheels are not for the machine', () => {
  assert.match(planMachine({ held: { kind: 'rim', id: 'steel' }, nearby: [], sizes }).why, /tire on the floor/);
  assert.match(planMachine({ held: { kind: 'tire', id: 'stock' }, nearby: [], sizes }).why, /rim on the floor/);
  assert.equal(planMachine({ held: { kind: 'part', id: 'x' }, sizes }).na, true);
  assert.equal(planMachine({ held: null, sizes }).na, true);
});
test('dismount then mount puts the same tire and rim back together (round trip)', () => {
  const start = wheel({ tread: 0.37, rim: 'retro' });
  const d = planMachine({ held: start, sizes });
  const m = planMachine({ held: d.apply.held, nearby: [{ uid: 7, ...d.apply.spawn[0] }], sizes });
  assert.equal(m.apply.held.rim, 'retro'); assert.equal(m.apply.held.tread, 0.37); assert.equal(m.apply.held.set, 'stock');
});

import { planTray } from './machineRules.js';
test('a rim and a fitting tire on the tray become a wheel with no air; a wrong size is explained', () => {
  const sz = { tireSize: s => (s === 'big' ? 17 : 15), rimSize: r => (r === 'retro' ? 15 : 17) };
  const ok = planTray([{ uid: 1, kind: 'rim', id: 'retro' }, { uid: 2, kind: 'tire', id: 'stock', tread: 0.5 }], sz);
  assert.equal(ok.ok, true); assert.deepEqual(ok.consume, [1, 2]); assert.equal(ok.wheel.air, 0); assert.equal(ok.wheel.rim, 'retro');
  const bad = planTray([{ uid: 1, kind: 'rim', id: 'retro' }, { uid: 2, kind: 'tire', id: 'big', tread: 1 }], sz);
  assert.equal(bad.ok, false); assert.match(bad.why, /rim/);
  assert.equal(planTray([{ uid: 1, kind: 'rim', id: 'retro' }], sz), null);
});
