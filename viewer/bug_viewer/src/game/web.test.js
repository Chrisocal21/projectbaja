import test from 'node:test';
import assert from 'node:assert/strict';
import { WEB_SITES, SUPPLY_BUNDLES, classifieds, boardDay, openListings, listingTotal, TOWNS, SELLER_DROP } from './web.js';

const parts = Array.from({ length: 12 }, (_, i) => ({ kind: 'part', id: 'P' + i, name: 'Part ' + i, price: 100 + i * 40 }));

test('the sites: four, each with a name, an address and a colour', () => {
  assert.equal(WEB_SITES.length, 4); assert.equal(new Set(WEB_SITES.map(s => s.id)).size, 4);
  assert.ok(WEB_SITES.every(s => s.name && /\./.test(s.url) && /^#/.test(s.color)));
});
test('the supply yard: bigger bundles are a little cheaper per piece; steel costs more than lumber', () => {
  const per = id => { const b = SUPPLY_BUNDLES.find(x => x.id === id); return b.price / b.n; };
  assert.ok(per('lumber12') < per('lumber5') && per('steel12') < per('steel5'));
  assert.ok(per('steel5') > per('lumber5'));
});
test('the classifieds board: the same all day, new the next day; junk lots and used parts from real towns', () => {
  const a = classifieds(3, parts, 7), b = classifieds(3, parts, 7), c = classifieds(4, parts, 7);
  assert.deepEqual(a, b, 'same day, same board');
  assert.notDeepEqual(a.map(l => l.title), c.map(l => l.title), 'a new day, a new board');
  const junk = a.filter(l => l.type === 'junk'), used = a.filter(l => l.type === 'part');
  assert.ok(junk.length >= 3 && junk.length <= 4 && used.length >= 3 && used.length <= 4);
  assert.equal(new Set(junk.map(l => l.lot)).size, junk.length, 'no lot posted twice');
  assert.ok(a.every(l => TOWNS.includes(l.town)), 'sellers live in real towns');
  assert.ok(junk.every(l => l.n >= 2 && (l.mat === 'wood' || l.mat === 'scrap') && l.price > 0 && l.price % 5 === 0));
  assert.ok(used.every(l => l.price < l.newPrice && l.price >= l.newPrice * 0.4), 'used parts are cheaper than new');
  assert.equal(new Set(a.map(l => l.id)).size, a.length);
  assert.ok(a.every((l, i) => i === 0 || a[i - 1].hoursAgo <= l.hoursAgo), 'newest first');
});
test('no parts to offer: only junk lots', () => { assert.ok(classifieds(1, [], 0).every(l => l.type === 'junk')); });
test('day, sold listings, totals', () => {
  assert.equal(boardDay(0), 0); assert.equal(boardDay(23.9), 0); assert.equal(boardDay(24), 1); assert.equal(boardDay(undefined), 0);
  const a = classifieds(2, parts, 1); assert.equal(openListings(a, { [a[0].id]: true }).length, a.length - 1);
  const j = a.find(l => l.type === 'junk'), p = a.find(l => l.type === 'part');
  assert.equal(listingTotal(j), j.price + SELLER_DROP); assert.equal(listingTotal(p), p.price);
});
