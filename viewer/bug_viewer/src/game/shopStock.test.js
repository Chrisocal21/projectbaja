import test from 'node:test';
import assert from 'node:assert/strict';
import { shopRows, shelf, SPECIALTY, RESTOCK_HOURS } from './shopStock.js';

const slots = Object.values(SPECIALTY).flatMap(s => s.slots);
const cat = {
  part: slots.flatMap(s => [1, 2, 3].map(n => ({ id: s + n, slot: s }))),
  wheel: ['tire-a', 'tire-b', 'tire-c'].map(id => ({ id })), rim: ['r1', 'r2', 'r3', 'r4'].map(id => ({ id })), stock: [{ id: 'ecHood' }, { id: 'ecSeat' }, { id: 'ecDash' }],
};
const ctx = { cat, price: (k, id) => 200, supplyPrice: id => 20, martItems: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(id => ({ id: 'supply:' + id, kind: 'supply', itemId: id, price: 10, note: '' })) };
const at = (type, x) => ({ type, x, z: x * 2 + 5 });

test('a shop always sells the same things', () => { for (const t of ['offroad', 'junk', 'barn', 'gas']) assert.deepEqual(shopRows(at(t, 120), ctx), shopRows(at(t, 120), ctx)); });
test('two shops of one kind do not match', () => {
  for (const t of ['offroad', 'junk', 'barn']) { const a = shopRows(at(t, 120), ctx).rows.map(r => r.id).join(), b = shopRows(at(t, 9000), ctx).rows.map(r => r.id).join(); assert.notEqual(a, b, t); }
});
test('an off-road store leans one way and sells new; a junkyard sells used, cheaper', () => {
  const o = shopRows(at('offroad', 40), ctx), j = shopRows(at('junk', 40), ctx);
  assert.ok(o.rows.filter(r => r.note.startsWith('new')).length >= 6); assert.ok(Object.values(SPECIALTY).some(s => s.name === o.theme));
  const op = o.rows.find(r => r.kind === 'part'), jp = j.rows.find(r => r.kind === 'part'); assert.ok(op.price >= 200 && jp.price < 140);
});
test('the three kinds sell different mixes', () => {
  const kinds = t => new Set(shopRows(at(t, 77), ctx).rows.map(r => r.kind));
  assert.ok(kinds('barn').has('supply') && kinds('barn').has('junk')); assert.ok(kinds('junk').has('junk')); assert.ok(!kinds('offroad').has('junk'));
});
test('rows have unique ids and sane prices', () => {
  for (const t of ['offroad', 'junk', 'barn', 'gas']) for (const x of [3, 400, 7000]) { const { rows } = shopRows(at(t, x), ctx); assert.equal(new Set(rows.map(r => r.id)).size, rows.length); assert.ok(rows.length >= 4); assert.ok(rows.every(r => Number.isInteger(r.price) && r.price >= 1)); }
});
test('what you buy leaves the shelf and stays gone', () => {
  const s = at('junk', 55), first = shelf(s, ctx), row = first.rows[0], after = shelf(s, ctx, { [first.key]: [row.id] });
  assert.equal(after.rows.length, first.rows.length - 1); assert.ok(!after.rows.some(r => r.id === row.id)); assert.equal(after.soldCount, 1);
  assert.equal(shelf(at('junk', 56), ctx, { [first.key]: [row.id] }).soldCount, 0);
});
test('what you bought comes back on the shelf after three game days', () => {
  const s = at('junk', 55), first = shelf(s, ctx), row = first.rows[0], sold = { [first.key]: [row.id] }, soldAt = { [first.key]: { [row.id]: 10 } };
  assert.ok(!shelf(s, ctx, sold, 10 + RESTOCK_HOURS - 1, soldAt).rows.some(r => r.id === row.id));
  const back = shelf(s, ctx, sold, 10 + RESTOCK_HOURS, soldAt);
  assert.ok(back.rows.some(r => r.id === row.id)); assert.equal(back.soldCount, 0);
});
