import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWheel, mount, dismount, patch, inflate, checkRoll, checkMount, isFlat, sizeFromDia, HOLD } from './wheelAssembly.js';

const rim15 = { id: 'steel', size: 15 }, rim17 = { id: 'beadlock', size: 17 };
const tire15 = { id: 'stock', size: 15, tread: 0.6 };

test('a tire only goes on a rim of its size', () => {
  assert.equal(checkMount(rim15, tire15).ok, true);
  const bad = checkMount(rim17, tire15);
  assert.equal(bad.ok, false); assert.match(bad.why, /15" rim; this rim is 17"/);
  assert.equal(checkMount(null, tire15).ok, false);
  assert.equal(checkMount(rim15, null).ok, false);
});
test('mounting makes a wheel that still needs air; the tire keeps its tread', () => {
  const r = mount(rim15, tire15);
  assert.equal(r.ok, true); assert.equal(r.wheel.air, 0); assert.equal(r.wheel.tire.tread, 0.6); assert.equal(r.seconds, HOLD.mount);
  assert.equal(checkRoll(r.wheel).ok, false);
});
test('dismount gives back the bare rim and the same tire, and refuses a bare rim', () => {
  const w = makeWheel({ rim: rim15, tire: tire15 });
  const r = dismount(w);
  assert.equal(r.ok, true); assert.deepEqual(r.rim, rim15); assert.equal(r.tire.tread, 0.6);
  assert.equal(dismount(makeWheel({ rim: rim15 })).ok, false);
});
test('mount then dismount returns what went in (round trip)', () => {
  const m = mount(rim15, tire15).wheel, d = dismount(m);
  assert.deepEqual(d.rim, rim15); assert.deepEqual({ ...d.tire }, { tread: 0.6, hole: false, id: 'stock', size: 15 });
});
test('a hole must be patched before the tire will take air; patching needs the kit', () => {
  const holed = makeWheel({ rim: rim15, tire: { ...tire15, hole: true }, air: 0.1 });
  assert.equal(isFlat(holed), true);
  assert.match(inflate(holed, true).why, /patch it first/);
  assert.match(patch(holed.tire, false).why, /plug kit/);
  const fixed = { ...holed, tire: patch(holed.tire, true).tire };
  const full = inflate(fixed, true);
  assert.equal(full.ok, true); assert.equal(checkRoll(full.wheel).ok, true);
  assert.equal(inflate(fixed, false).ok, false);   // no compressor
});
test('inflate does not mutate the wheel it was given', () => {
  const w = makeWheel({ rim: rim15, tire: tire15, air: 0.1 }); inflate(w, true);
  assert.equal(w.air, 0.1);
});
test('rim size class follows tire diameter', () => {
  assert.equal(sizeFromDia(0.64), 15); assert.equal(sizeFromDia(0.8), 16); assert.equal(sizeFromDia(0.95), 17);
});
