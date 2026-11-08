import test from 'node:test';
import assert from 'node:assert/strict';
import { surface, placeable, placement, byId } from './types.js';
import { snap, snapRot, rotatedFootprint, snapPoint, bounds, insideSurface, overlaps, accepts, canStackOn, stackHeight, restY, why, clipTo, clipsWith } from './rules.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''} expected ${b}, got ${a}`);
const nearPt = (p, x, z, msg) => { near(p.x, x, msg); near(p.z, z, msg); };

// a 2 x 1 m bench that takes tools and tires, the shop floor that takes anything
const bench = surface({ id: 'bench', size: [2, 1], gridSteps: [0.5, 0.25, 0.05], accepts: ['tool', 'tire'] });
const floor = surface({ id: 'floor', size: [6, 4], gridSteps: [0.5], accepts: ['*'] });
const tire = placeable({ id: 'tire', footprint: [0.6, 0.6], height: 0.2, tags: ['tire'], stackable: true });
const box = placeable({ id: 'box', footprint: [0.5, 0.5], height: 0.3, tags: ['tool'] });
const long = placeable({ id: 'long', footprint: [1, 0.5], height: 0.1, tags: ['tool'], stackOn: ['crate'] });
const crate = placeable({ id: 'crate', footprint: [1, 1], height: 0.5, tags: ['crate'] });
const engine = placeable({ id: 'engine', footprint: [0.8, 0.6], height: 0.6, tags: ['engine'] });
const items = byId([tire, box, long, crate, engine]);
const on = (s, item, x, z, extra = {}) => placement({ item: item.id, surface: s.id, x, z, ...extra });

test('snap rounds to the step, any step size', () => {
  near(snap(0.74, 0.5), 0.5); near(snap(0.76, 0.5), 1);
  near(snap(0.37, 0.25), 0.25); near(snap(0.38, 0.25), 0.5);
  near(snap(1.234, 0.05), 1.25);
});
test('an item centre snaps so its edges land on grid lines: odd sizes sit in a cell, even sizes span cells', () => {
  nearPt(snapPoint(bench, 0.6, 0.6, 0, box.footprint), 0.75, 0.75, '0.5 m box on 0.5 grid sits in a cell, not on a line');
  nearPt(snapPoint(bench, 0.9, 0.3, 0, long.footprint), 1, 0.25, '1 m item spans two cells: centre on a line');
  nearPt(snapPoint(bench, 0.6, 0.6, 1, box.footprint), 0.5, 0.5, 'finer 0.25 grid');
  nearPt(snapPoint(bench, 0.62, 0.41, 2, box.footprint), 0.6, 0.4, 'fine 0.05 grid');
});
test('snapping keeps the item on the surface; free mode skips the grid but still clamps', () => {
  nearPt(snapPoint(bench, 5, -3, 0, box.footprint), 1.75, 0.25, 'clamped to the far corner, flush');
  nearPt(snapPoint(bench, 0.613, 0.47, null, box.footprint), 0.613, 0.47, 'free: as given');
  nearPt(snapPoint(bench, 1.99, 0.1, 'free', box.footprint), 1.75, 0.25, 'free: still clamped inside');
});
test('snapping uses the turned footprint', () => {
  nearPt(snapPoint(bench, 0.3, 0.4, 0, long.footprint, Math.PI / 2), 0.25, 0.5, 'turned 90: 0.5 wide along x, 1 deep along z');
});
test('rotation: 90 mode rounds to quarter turns, free mode keeps the angle; both normalised to [0, 2pi)', () => {
  near(snapRot(0.9, '90'), Math.PI / 2);
  near(snapRot(-0.2, '90'), 0);
  near(snapRot(-Math.PI / 2, '90'), 3 * Math.PI / 2);
  near(snapRot(0.9, 'free'), 0.9);
  near(snapRot(-0.5, 'free'), 2 * Math.PI - 0.5);
  near(snapRot(4 * Math.PI, 'free'), 0);
});
test('a quarter turn swaps the footprint exactly; a free turn takes the AABB of the turned rect', () => {
  assert.deepEqual(rotatedFootprint([1, 0.5], Math.PI / 2), [0.5, 1]);
  assert.deepEqual(rotatedFootprint([1, 0.5], Math.PI), [1, 0.5]);
  const [w, d] = rotatedFootprint([1, 1], Math.PI / 4);
  near(w, Math.SQRT2); near(d, Math.SQRT2);
});
test('bounds and inside-the-surface, edges allowed to sit on the surface edge', () => {
  assert.deepEqual(bounds(on(bench, box, 0.25, 0.25), box), { x0: 0, x1: 0.5, z0: 0, z1: 0.5 });
  assert.ok(insideSurface(bench, on(bench, box, 1.75, 0.75), box), 'flush in the far corner');
  assert.ok(!insideSurface(bench, on(bench, box, 1.8, 0.75), box), 'hanging off the end');
  assert.ok(insideSurface(bench, on(bench, long, 1, 0.5, { rot: Math.PI / 2 }), long), 'turned, 1 m deep on a 1 m bench: just fits');
  assert.ok(!insideSurface(bench, on(bench, long, 1, 0.4, { rot: Math.PI / 2 }), long), 'turned and nudged: off the back');
});
test('flush edges and corners do not overlap; real overlap does', () => {
  const a = { x0: 0, x1: 0.5, z0: 0, z1: 0.5 };
  assert.ok(!overlaps(a, { x0: 0.5, x1: 1, z0: 0, z1: 0.5 }), 'side by side');
  assert.ok(!overlaps(a, { x0: 0.5, x1: 1, z0: 0.5, z1: 1 }), 'corner to corner');
  assert.ok(overlaps(a, { x0: 0.45, x1: 1, z0: 0.1, z1: 0.4 }));
});
test('surfaces take items by tag, wildcard or empty takes anything', () => {
  assert.ok(accepts(bench, box));
  assert.ok(!accepts(bench, engine));
  assert.ok(accepts(floor, engine));
  assert.ok(accepts(surface({ id: 'any', size: [1, 1] }), engine), 'empty accepts list');
});
test('stacking: tire on tire, things on what they name, nothing else; height is the top of the one below', () => {
  assert.ok(canStackOn(tire, tire));
  assert.ok(canStackOn(long, crate), 'stackOn names a tag of the bottom');
  assert.ok(!canStackOn(box, box), 'not stackable');
  assert.ok(!canStackOn(tire, crate), 'stackable only on other stackables');
  near(stackHeight(on(floor, tire, 1, 1, { y: 0.2 }), tire), 0.4);
  const pile = [on(floor, tire, 1, 1), on(floor, tire, 1, 1, { y: 0.2 })];
  near(restY(on(floor, tire, 1.1, 1), tire, pile, items), 0.4, 'a third tire rests on the second');
  near(restY(on(floor, box, 1, 1), box, pile, items), 0, 'a box cannot use the tires');
});
test('why(): null when fine, a reason for each way it can go wrong', () => {
  const there = [on(floor, box, 1.25, 1.25), on(floor, tire, 3, 2), on(floor, crate, 4.5, 1.5)];
  assert.equal(why(floor, box, on(floor, box, 1.75, 1.25), there, items), null, 'flush beside the box');
  assert.equal(why(bench, engine, on(bench, engine, 1, 0.5), [], items), "this surface doesn't take that");
  assert.equal(why(floor, box, on(floor, box, 5.9, 1), there, items), 'off the surface');
  assert.equal(why(floor, box, on(floor, box, 1.4, 1.3), there, items), "something's in the way");
  assert.equal(why(floor, tire, on(floor, tire, 3, 2, { y: 0.2 }), there, items), null, 'tire stacked on a tire');
  assert.equal(why(floor, tire, on(floor, tire, 3, 2, { y: 0.1 }), there, items), "something's in the way", 'stacked at the wrong height');
  assert.equal(why(floor, box, on(floor, box, 3, 2, { y: 0.2 }), there, items), "can't stack on that");
  assert.equal(why(floor, long, on(floor, long, 4.5, 1.5, { y: 0.5 }), there, items), null, 'a long tool on the crate it names');
  assert.equal(why(floor, tire, on(floor, tire, 3.5, 2, { y: 0.2 }), there, items), 'it would tip off');
  assert.equal(why(floor, tire, on(floor, tire, 5, 3.5, { y: 0.4 }), there, items), 'nothing to sit on');
  const noStack = surface({ id: 'floor', size: [6, 4], accepts: ['*'], stackable: false });
  assert.equal(why(noStack, tire, on(floor, tire, 3, 2, { y: 0.2 }), there, items), "can't stack here");
  assert.equal(why(bench, box, on(bench, box, 1.25, 0.5), there, items), null, 'items on another surface never collide');
});
test('placements get an id: auto-made and unique when left out, kept when given', () => {
  const a = on(floor, box, 1, 1), b = on(floor, box, 1, 1);
  assert.equal(typeof a.id, 'string'); assert.ok(a.id);
  assert.notEqual(a.id, b.id, 'two placements, two ids');
  assert.equal(on(floor, box, 1, 1, { id: 'mine' }).id, 'mine');
  assert.throws(() => on(floor, box, 1, 1, { id: 7 }), /id/);
});
test('why() / restY() skip the placement being checked by id, so a move does not collide with its own old spot', () => {
  const old = on(floor, box, 1.25, 1.25, { id: 'b1' }), there = [old, on(floor, tire, 3, 2, { id: 't1' })];
  const moved = on(floor, box, 1.4, 1.3, { id: 'b1' });   // a new object for the same placement, overlapping where it was
  assert.equal(why(floor, box, moved, there, items), null, 'same id: its old spot is not in the way');
  assert.equal(why(floor, box, on(floor, box, 1.4, 1.3), there, items), "something's in the way", 'a different box still collides');
  const tireMove = on(floor, tire, 3, 2, { id: 't1' });
  near(restY(tireMove, tire, there, items), 0, 'a tire being moved does not stack on itself');
  assert.equal(why(floor, tire, { ...tireMove, y: 0.2 }, there, items), 'nothing to sit on', 'nor sit on itself');
});
test('why() falls back to the object itself for placements without an id', () => {
  const bare = { item: 'box', surface: 'floor', x: 1.25, z: 1.25, rot: 0, y: 0 };
  assert.equal(why(floor, box, bare, [bare], items), null, 'the same object in the list is skipped');
  assert.equal(why(floor, box, { ...bare }, [bare], items), "something's in the way", 'an id-less copy is a different thing');
});
test('lab surfaces: surface-local <-> world round-trips, even on a turned surface', async () => {
  const { SURFACES, toWorld, toLocal } = await import('./labData.js');
  for (const s of SURFACES) for (const [x, z] of [[0, 0], [s.size[0], s.size[1]], [0.3, 0.1]]) {
    const w = toWorld(s, x, z, 0.2); near(w.y, s.at.y + 0.2); nearPt(toLocal(s, w.x, w.z), x, z, s.id);
  }
  const s = SURFACES.find(q => q.id === 'floor'), c = toWorld(s, s.size[0] / 2, s.size[1] / 2);
  near(c.x, s.at.x); near(c.z, s.at.z, 'the local centre is the world anchor');
});
test('bad catalog data fails at load', () => {
  assert.throws(() => surface({ id: 's', size: [1, 1], gridSteps: [0.25, 0.5] }), /coarsest first/);
  assert.throws(() => placeable({ id: 'p', footprint: [1], height: 1 }), /footprint/);
  assert.throws(() => byId([tire, tire]), /duplicate/);
});

// clip together: jerry cans (0.4 x 0.2, clip true), a fuel-group bottle, and a plain box that never clips
const can = placeable({ id: 'can', footprint: [0.4, 0.2], height: 0.45, tags: ['tool'], clip: 'fuel' });
const flask = placeable({ id: 'flask', footprint: [0.1, 0.1], height: 0.3, tags: ['tool'], clip: 'fuel' });
const tbox = placeable({ id: 'tbox', footprint: [0.4, 0.2], height: 0.25, tags: ['tool'], clip: true });
const citems = byId([can, flask, tbox, box, tire]);
test('clip: near a can, a held can goes flush against its nearest side and lines up along it', () => {
  const there = [on(floor, can, 2, 2, { id: 'c1' })];
  const c = clipTo(floor, can, on(floor, can, 2.43, 2.06), there, citems);   // 0.03 m gap off its +x end, 6 cm out of line
  nearPt(c, 2.4, 2, 'flush on +x, centres in line');
  const d = clipTo(floor, can, on(floor, can, 1.95, 2.28), there, citems);   // 0.08 m gap off its +z side
  nearPt(d, 2, 2.2, 'flush on +z');
  const o = clipTo(floor, can, on(floor, can, 2.37, 2), there, citems);      // overlapping by 3 cm: pushed out flush
  nearPt(o, 2.4, 2);
  assert.equal(why(floor, can, c, there, citems), null, 'the clipped spot fits');
});
test('clip: copies the neighbour rotation, and works along the sides of a turned neighbour', () => {
  const there = [on(floor, can, 2, 2, { id: 'c1', rot: Math.PI / 2 })];   // turned: 0.2 along x, 0.4 along z
  const c = clipTo(floor, can, on(floor, can, 2.25, 2.02, { rot: 0.3 }), there, citems);
  near(c.rot, Math.PI / 2, 'rotation copied');
  nearPt(c, 2.2, 2, 'flush on its long side');
});
test('clip: different sizes in one clip group line up by an end edge when that is nearer', () => {
  const there = [on(floor, can, 2, 2, { id: 'c1' })];   // x 1.8..2.2, z 1.9..2.1
  const c = clipTo(floor, flask, on(floor, flask, 2.13, 2.19), there, citems);   // just past its +z side, near the +x end
  nearPt(c, 2.15, 2.15, 'flush on +z, high x edges level');
});
test('clip: refused when there is no room, ignores other kinds, other heights and far-away items', () => {
  const blocked = [on(floor, can, 2, 2, { id: 'c1' }), on(floor, box, 2.65, 2)];   // a box sits where the clipped can would go
  const pl = on(floor, can, 2.43, 2.06);
  assert.equal(clipTo(floor, can, pl, blocked, citems), pl, 'no room: unchanged, same object');
  const wall = [on(floor, can, 5.8, 2, { id: 'c1' })];   // its +x side is the surface edge
  const p2 = on(floor, can, 6.0, 2.05);
  assert.equal(clipTo(floor, can, p2, wall, citems), p2, 'clipped spot would be off the surface');
  const other = [on(floor, tbox, 2, 2)];
  assert.equal(clipTo(floor, can, pl, other, citems), pl, 'a toolbox is not a can');
  assert.ok(clipsWith(tbox, tbox) && clipsWith(can, flask) && !clipsWith(can, tbox) && !clipsWith(box, box) && !clipsWith(tire, tire));
  assert.equal(clipTo(floor, box, on(floor, box, 1.78, 1.25), [on(floor, box, 1.25, 1.25)], citems).x, 1.78, 'items without clip never clip');
  assert.equal(clipTo(floor, can, on(floor, can, 2.6, 2), [on(floor, can, 2, 2)], citems).x, 2.6, 'beyond the magnet: free');
  const p3 = on(floor, can, 2.43, 2, { y: 0.3 });
  assert.equal(clipTo(floor, can, p3, [on(floor, can, 2, 2)], citems), p3, 'a different height never clips');
  assert.equal(clipTo(floor, can, on(floor, can, 2.5, 2), [on(floor, can, 2, 2)], citems, { magnet: 0.2 }).x, 2.4, 'magnet distance is data');
});
test('clip: a moved can does not clip to its own old spot', () => {
  const there = [on(floor, can, 2, 2, { id: 'c1' })];
  assert.equal(clipTo(floor, can, on(floor, can, 2.1, 2, { id: 'c1' }), there, citems).x, 2.1);
});
test('clip field: false by default, true or a group name, anything else fails at load', () => {
  assert.equal(box.clip, false); assert.equal(tbox.clip, true); assert.equal(can.clip, 'fuel');
  assert.throws(() => placeable({ id: 'p', footprint: [1, 1], height: 1, clip: 3 }), /clip/);
});
