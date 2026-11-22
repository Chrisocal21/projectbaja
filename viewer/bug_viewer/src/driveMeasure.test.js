import test from 'node:test';
import assert from 'node:assert/strict';
import { stopDistance, timeTo } from './driveMeasure.js';

const SURF = ['pavement', 'hardpack', 'dirt', 'clay', 'gravel', 'sand', 'mud'];
test('print the table (for the docs)', () => { const t = SURF.map(s => `${s}: stop ${stopDistance(s).toFixed(1)} m from 20 m/s, 0-15 m/s ${timeTo(s).toFixed(1)} s`); console.log('\n' + t.join('\n')); assert.equal(t.length, 7); });
test('DRV-002/003: the same stop takes more road on looser ground, in a sensible order', () => {
  const d = Object.fromEntries(SURF.map(s => [s, stopDistance(s)]));
  assert.ok(d.pavement < d.hardpack && d.hardpack < d.dirt && d.dirt < d.clay && d.clay < d.gravel, JSON.stringify(d));
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
test('hardpack launches hard and controlled (research test 3): faster off the line than clay or gravel, close to pavement', () => {
  const h = timeTo('hardpack'), c = timeTo('clay'), g = timeTo('gravel'), p = timeTo('pavement');
  assert.ok(h < c && h < g, JSON.stringify({ h, c, g })); assert.ok(h - p < 0.6, JSON.stringify({ h, p }));
});
import { createBody, stepBody, readBody } from './rigid.js';
import { envFor, TEST_DIMS } from './driveMeasure.js';
import { onHit, effects, FRESH, serviced } from './wear.js';
const run6 = (e, seconds = 6) => { const b = createBody(TEST_DIMS, { y: 0.3 }); for (let i = 0; i < seconds * 120; i++) stepBody(b, TEST_DIMS, { throttle: 1, brake: false, steer: 0 }, e, 1 / 120); return { x: b.c.x, z: b.c.z, ...readBody(b, {}) }; };
test('B4: a punctured front tire drags the car to its side and costs speed; fixing it brings the straight line back', () => {
  const base = envFor('dirt'), w = onHit(FRESH(), { imp: 8, corner: 'FR', rock: true }, () => 0);
  const fx = effects(w), bad = { ...base, gripC: fx.gripC, rrC: fx.rrC }, fixed = effects(serviced(w, 'tires')), good = { ...base, gripC: fixed.gripC, rrC: fixed.rrC };
  const a = run6(base), b = run6(bad), c = run6(good);
  console.log(`straight: x ${a.x.toFixed(2)} speed ${a.v.toFixed(1)} | flat FR: x ${b.x.toFixed(2)} speed ${b.v.toFixed(1)} | fixed: x ${c.x.toFixed(2)} speed ${c.v.toFixed(1)}`);
  assert.ok(Math.abs(b.x) > Math.abs(a.x) + 0.3, 'the flat should pull the car sideways'); assert.ok(b.v < a.v, 'and slow it');
  assert.equal(c.x, a.x); assert.equal(c.v, a.v);   // repair undoes it exactly
});
test('B4: a blown rear damper at one corner changes how that corner rebounds after a drop', () => {
  const peak = e => { const b = createBody(TEST_DIMS, { y: 0.45 }); let up = 0; for (let i = 0; i < 4 * 120; i++) { stepBody(b, TEST_DIMS, { throttle: 0, brake: false, steer: 0 }, e, 1 / 120); if (i > 60) up = Math.max(up, Math.abs(b.travel[2] - (b.travel[3] ?? 0))); } return up; };
  const base = envFor('dirt'), w = onHit(FRESH(), { imp: 14, corner: 'RL' }, () => 0), bad = { ...base, dampC: effects(w).dampC };
  const a = peak(base), b = peak(bad); console.log(`left/right rear travel difference after a drop: sound ${a.toFixed(3)} | blown RL ${b.toFixed(3)}`);
  assert.ok(b > a + 0.002, `${b} vs ${a}`);
});
