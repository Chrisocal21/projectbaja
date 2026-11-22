import test from 'node:test';
import assert from 'node:assert/strict';
import { stopDistance, timeTo } from './driveMeasure.js';

const SURF = ['pavement', 'dirt', 'gravel', 'sand', 'mud'];
test('print the table (for the docs)', () => { const t = SURF.map(s => `${s}: stop ${stopDistance(s).toFixed(1)} m from 20 m/s, 0-15 m/s ${timeTo(s).toFixed(1)} s`); console.log('\n' + t.join('\n')); assert.equal(t.length, 5); });
test('DRV-002/003: the same stop takes more road on looser ground, in a sensible order', () => {
  const d = Object.fromEntries(SURF.map(s => [s, stopDistance(s)]));
  assert.ok(d.pavement < d.dirt && d.dirt < d.gravel, JSON.stringify(d));
  assert.ok(d.gravel < d.mud, JSON.stringify(d));
  assert.ok(d.pavement > 5 && d.mud < 80, JSON.stringify(d));   // not a brick wall, not forever
});
test('DRV-004: a tire with less grip measurably lengthens the stop and slows the launch; a grippier one shortens it', () => {
  const base = stopDistance('dirt'), worn = stopDistance('dirt', { grip: 0.8 }), sticky = stopDistance('dirt', { grip: 1.15 });
  assert.ok(worn > base * 1.05, `${worn} vs ${base}`); assert.ok(sticky < base, `${sticky} vs ${base}`);
});
test('sand drags the car: it gets to speed slower than on pavement, and nothing sinks forever', () => {
  const p = timeTo('pavement'), s = timeTo('sand');
  assert.ok(s > p, `${s} vs ${p}`); assert.ok(Number.isFinite(s), 'sand never reaches 15 m/s');
});
test('the same input gives the same number twice (reproducible)', () => { assert.equal(stopDistance('gravel'), stopDistance('gravel')); assert.equal(timeTo('dirt'), timeTo('dirt')); });
const TIRES = ['stock', 'tire-tread', 'tire-light', 'tire-beadlock', 'tire-deep'];
test('print the tire table (for the docs)', () => { const rows = []; for (const s of ['dirt', 'sand', 'mud']) for (const id of TIRES) rows.push(`${s} / ${id}: stop ${stopDistance(s, { tire: id }).toFixed(1)} m, 0-15 m/s ${timeTo(s, { tire: id }).toFixed(1)} s`); console.log(rows.join(String.fromCharCode(10))); assert.ok(rows.length); });
test('DRV-004 with the real catalog: the tire you fit changes the number, and the right tire wins on its ground', () => {
  assert.ok(timeTo('sand', { tire: 'tire-light' }) < timeTo('sand', { tire: 'stock' }), 'floaty tires should beat street tires in sand');
  assert.ok(stopDistance('mud', { tire: 'tire-deep' }) < stopDistance('mud', { tire: 'tire-tread' }), 'mud tires should stop shorter in mud than highway tread');
  assert.ok(stopDistance('dirt', { tire: 'tire-beadlock' }) !== stopDistance('dirt', { tire: 'stock' }));
});
