import test from 'node:test';
import assert from 'node:assert/strict';
import { surface, placeable, placement, byId } from './types.js';
import { posed, why, restY, clipTo, toWall, snapPoint, nearestMount, atMount } from './rules.js';
import { VEHICLE_SURFACES, surfacesFor, toCar, fromCar, obstacleBoxes } from './vehicleSurfaces.js';
import { TIRE, GAME_PLACEABLES, placeableIdFor, posesOf, TIRE_SIZE } from './gameItems.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''} expected ${b}, got ${a}`);
const items = GAME_PLACEABLES;
const on = (s, id, x, z, extra = {}) => placement({ item: id, surface: s.id, x, z, ...extra });
const upright = posed(TIRE, 'upright');

test('poses: a tire stands upright thin and tall, clips instead of stacking; no pose / unknown pose = as defined', () => {
  assert.deepEqual(upright.footprint, [TIRE_SIZE.width, TIRE_SIZE.dia]);
  near(upright.height, TIRE_SIZE.dia);
  assert.equal(upright.stackable, false); assert.equal(upright.clip, 'tireUpright'); assert.equal(upright.pose, 'upright');
  assert.equal(posed(TIRE, null), TIRE); assert.equal(posed(TIRE, 'sideways'), TIRE);
  assert.deepEqual(posesOf('tire'), [null, 'upright']); assert.deepEqual(posesOf('crate1'), [null]);
  assert.throws(() => placeable({ id: 'p', footprint: [1, 1], height: 1, poses: { up: { colour: 'red' } } }), /poses/);
  assert.throws(() => placement({ item: 'tire', surface: 's', x: 0, z: 0, pose: 3 }), /pose/);
});
test('existing placements are read in their own pose: a flat tire stacks on a flat one, never on an upright one', () => {
  const floor = surface({ id: 'f', size: [3, 3], accepts: ['*'] });
  near(restY(on(floor, 'tire', 1, 1), TIRE, [on(floor, 'tire', 1, 1)], items), TIRE_SIZE.width, 'flat on flat stacks');
  near(restY(on(floor, 'tire', 1, 1), TIRE, [on(floor, 'tire', 1, 1, { pose: 'upright' })], items), 0, 'not on an upright one');
  assert.equal(why(floor, TIRE, on(floor, 'tire', 1.2, 1), [on(floor, 'tire', 1, 1, { pose: 'upright' })], items), "something's in the way");
});
test('clearance and blocks: too tall for the headroom is refused; nothing overlaps a wheel well below its top', () => {
  const s = surface({ id: 's', size: [1, 1], clearance: 0.5, blocks: [{ x0: 0, z0: 0, x1: 0.3, z1: 1, top: 0.3 }] });
  assert.equal(why(s, upright, on(s, 'tire', 0.7, 0.5, { pose: 'upright' }), [], items), 'too tall for here');
  assert.equal(why(s, GAME_PLACEABLES.crate1, on(s, 'crate1', 0.4, 0.5), [], items), "something's in the way", 'overlaps the well');
  assert.equal(why(s, GAME_PLACEABLES.crate1, on(s, 'crate1', 0.47, 0.5), [], items), null, 'flush beside the well');
});
test('walls: free placement pulls flush to a wall within the magnet, not past it, not into something', () => {
  const s = surface({ id: 's', size: [2, 1.5], walls: ['z0'] });
  const pl = on(s, 'tire', 1, 0.42, { pose: 'upright' });   // its z0 edge 0.075 from the wall
  near(toWall(s, upright, pl, [], items).z, TIRE_SIZE.dia / 2, 'flush');
  assert.equal(toWall(s, upright, on(s, 'tire', 1, 0.6, { pose: 'upright' }), [], items).z, 0.6, 'beyond the magnet: free');
  near(clipTo(s, upright, pl, [], items).z, TIRE_SIZE.dia / 2, 'clipTo falls back to the wall when no neighbour');
  const noWalls = surface({ id: 's', size: [2, 1.5] });
  assert.equal(clipTo(noWalls, upright, pl, [], items), pl);
});
test('upright tires clip side by side, lined up, against the wall', () => {
  const s = surface({ id: 's', size: [2, 1.5], walls: ['z0'] }), there = [];
  let x = 0.4;
  for (let i = 0; i < 4; i++) {
    const held = on(s, 'tire', x + 0.06, 0.40, { pose: 'upright' });   // a little off each time
    const c = clipTo(s, upright, held, there, items);
    assert.equal(why(s, upright, c, there, items), null);
    near(c.z, TIRE_SIZE.dia / 2, `tire ${i + 1} against the wall`);
    if (i) near(c.x, there[i - 1].x + TIRE_SIZE.width, `tire ${i + 1} flush beside the last`);
    there.push({ ...c, id: 't' + i }); x = c.x + TIRE_SIZE.width;
  }
});

// ---- the vehicle adapter ----
const bugCtx = (o = {}) => ({ body: 'classic', parts: {}, coverFitted: () => true, coverOpen: () => false, lift: 0, ...o });
test('adapter: the Bug front trunk needs the hood open (or off), the roof rack needs the rack, the luggage shelf is always there', () => {
  const ids = ctx => surfacesFor('bug', ctx).map(s => s.id);
  assert.deepEqual(ids(bugCtx()), ['luggageShelf']);
  assert.deepEqual(ids(bugCtx({ coverOpen: id => id === 'hoodPanel' })), ['frontTrunk', 'luggageShelf']);
  assert.deepEqual(ids(bugCtx({ coverFitted: () => false })), ['frontTrunk', 'luggageShelf'], 'no hood fitted: open to the sky');
  assert.deepEqual(ids(bugCtx({ parts: { roofRack: 'ACC_RoofRack' } })), ['luggageShelf', 'roofRack']);
  assert.equal(surfacesFor('bug', bugCtx({ all: true })).length, 3, 'all: what to draw even when closed');
  assert.ok(surfacesFor('bug', bugCtx({ all: true })).find(s => s.id === 'frontTrunk').usable === false);
});
test('adapter: per-body heights, lift raises everything, unknown vehicles have no surfaces', () => {
  const y = (ctx, id) => surfacesFor('bug', { ...bugCtx({ all: true }), ...ctx }).find(s => s.id === id).at.y;
  near(y({ body: 'classic-stage2' }, 'roofRack') - y({}, 'roofRack'), 0.14);
  near(y({ lift: 0.1 }, 'frontTrunk') - y({}, 'frontTrunk'), 0.1);
  near(surfacesFor('bug', bugCtx({ body: 'nope', all: true }))[0].at.y, y({}, 'frontTrunk'), 'unknown body: first body');
  assert.deepEqual(surfacesFor('pickup78', {}), []); assert.deepEqual(surfacesFor('nope', {}), []);
  assert.equal(surfacesFor('pickup84', {}).length, 1);
});
test('surface-local <-> car-local round trip; the local centre is the anchor', () => {
  for (const s of [...surfacesFor('bug', bugCtx({ all: true })), ...surfacesFor('pickup84', {})]) for (const [x, z] of [[0, 0], [0.3, 0.2], [s.size[0], s.size[1]]]) {
    const c = toCar(s, x, z, 0.1), b = fromCar(s, c.x, c.z); near(b.x, x); near(b.z, z); near(c.y, s.at.y + 0.1);
  }
  const s = surfacesFor('pickup84', {})[0], c = toCar(s, s.size[0] / 2, s.size[1] / 2); near(c.z, s.at.z);
});
test('game items map to placeables: tires to the tire, everything else to its size crate, a shell to nothing', () => {
  assert.equal(placeableIdFor({ kind: 'stock', id: 'wheel' }, 3), 'tire');
  assert.equal(placeableIdFor({ kind: 'wheel', id: 'x' }, 4), 'tire');
  assert.equal(placeableIdFor({ kind: 'part', id: 'x' }, 2), 'crate2');
  assert.equal(placeableIdFor({ kind: 'shell', id: 'x' }, 9), null);
});
test('real capacities (measured): Bug front trunk takes two small crates or one medium, not a large one', () => {
  const ft = surfacesFor('bug', bugCtx({ coverFitted: () => false })).find(s => s.id === 'frontTrunk'), c1 = GAME_PLACEABLES.crate1;
  const a = on(ft, 'crate1', 0.17, 0.2), b = on(ft, 'crate1', 0.51, 0.2);
  assert.equal(why(ft, c1, a, [], items), null); assert.equal(why(ft, c1, b, [a], items), null);
  assert.equal(why(ft, c1, on(ft, 'crate1', 0.8, 0.2), [a, b], items), 'off the surface', 'no third across');
  assert.equal(why(ft, GAME_PLACEABLES.crate2, on(ft, 'crate2', 0.45, 0.3, { rot: Math.PI / 2 }), [], items), null, 'a medium crate turned');
  assert.equal(why(ft, GAME_PLACEABLES.crate3, on(ft, 'crate3', 0.45, 0.3), [], items), 'off the surface');
  assert.equal(why(ft, upright, on(ft, 'tire', 0.45, 0.3, { pose: 'upright', rot: Math.PI / 2 }), [], items), 'too tall for here', 'no spare tire under this hood');
});
test("real capacities (measured): the '84 bed takes 3 upright Bug tires against the cab between the wheel wells, not 4", () => {
  const bed = surfacesFor('pickup84', {})[0], there = [];
  const half = TIRE_SIZE.dia / 2, x0 = bed.blocks[0].x1 + TIRE_SIZE.width / 2;
  for (let i = 0; i < 3; i++) { const pl = on(bed, 'tire', x0 + i * TIRE_SIZE.width, half, { pose: 'upright', id: 't' + i }); assert.equal(why(bed, upright, pl, there, items), null, `tire ${i + 1}`); there.push(pl); }
  assert.notEqual(why(bed, upright, on(bed, 'tire', x0 + 3 * TIRE_SIZE.width, half, { pose: 'upright' }), there, items), null, 'a 4th hits the wheel well');
  const gapBehindWells = bed.size[1] - bed.blocks[0].z1;
  assert.ok(gapBehindWells < TIRE_SIZE.dia, `behind the wells there is ${gapBehindWells.toFixed(2)} m, a tire is ${TIRE_SIZE.dia} m`);
  const flat = on(bed, 'tire', bed.size[0] / 2, bed.size[1] - half);   // lying flat at the tailgate it fits, and they stack
  assert.equal(why(bed, TIRE, flat, [], items), null);
  // snapping keeps upright tires inside the bed with the turned footprint
  const p = snapPoint(bed, 5, -1, 'free', upright.footprint, 0); near(p.z, half); near(p.x, bed.size[0] - TIRE_SIZE.width / 2);
});
test('every declared surface is valid data with a name and an anchor', () => {
  const all = Object.values(VEHICLE_SURFACES).flatMap(v => (Array.isArray(v) ? v : Object.values(v).flat()));
  for (const s of all) { assert.ok(s.name && s.at && Number.isFinite(s.at.y), s.id); assert.ok(s.gridSteps.length); }
  assert.ok(byId(surfacesFor('bug', bugCtx({ all: true }))), 'surface ids unique per vehicle');
});

// ---- Stage 3 finish: tire mounts 5-8, solid fixtures/loose crates, trailers ----
const bed = () => surfacesFor('pickup84', {})[0];
test('bed mounts 5-8: four real-size upright tires fit side by side against the cab, the outer two over the wheel wells', () => {
  const b = bed(), there = [];
  assert.deepEqual(b.mounts.map(m => m.label), ['Tire mount 5', 'Tire mount 6', 'Tire mount 7', 'Tire mount 8']);
  for (const m of b.mounts) {
    const pl = { ...atMount(m, 'tire', b.id, 'u' + m.id) };
    assert.equal(why(b, upright, pl, there, items), null, `${m.label} is a legal spot even with the others filled`);
    near(pl.z, TIRE_SIZE.dia / 2, 'flush against the cab wall'); there.push(pl);
  }
  assert.deepEqual(b.mounts.map(m => m.y), [0.28, 0, 0, 0.28], 'outer mounts stand on the well tops');
  assert.equal(there.length, 4);
  // none of them overlap in plan
  for (let i = 1; i < 4; i++) assert.ok(there[i].x - there[i - 1].x >= TIRE_SIZE.width - 1e-9, 'mounts at least a tire-width apart');
});
test('a tire on a well top needs the well under it: raised anywhere else it has nothing to sit on', () => {
  const b = bed();
  assert.equal(why(b, upright, on(b, 'tire', 0.19, TIRE_SIZE.dia / 2, { pose: 'upright', y: 0.28 }), [], items), null);
  assert.equal(why(b, upright, on(b, 'tire', 0.8, TIRE_SIZE.dia / 2, { pose: 'upright', y: 0.28 }), [], items), 'nothing to sit on');
  assert.equal(why(b, upright, on(b, 'tire', 0.19, TIRE_SIZE.dia / 2, { pose: 'upright', y: 0.1 }), [], items), "something's in the way", 'sunk into the well');
});
test('nearestMount: snaps within reach, prefers a free mount, says taken when only taken ones are near, ignores items that are not tires', () => {
  const b = bed(), m = b.mounts, there = [];
  assert.equal(nearestMount(b, 0.8, 1.4, items.tire, there, items), null, 'far from every mount');
  assert.equal(nearestMount(b, 0.62, 0.4, items.tire, there, items).mount.id, 'm6');
  there.push(atMount(m[1], 'tire', b.id, 'u6'));
  const r = nearestMount(b, 0.62, 0.4, items.tire, there, items);
  assert.equal(r.mount.id, 'm7', 'm6 taken: the next free one in range wins'); assert.equal(r.taken, false);
  const t = nearestMount(b, 0.62, 0.4, items.tire, there, items, 0.1); assert.deepEqual([t.mount.id, t.taken], ['m6', true]);
  assert.equal(nearestMount(b, 0.6, 0.35, items.crate1, [], items), null, 'a crate does not go in a tire mount');
  assert.equal(nearestMount(surfacesFor('bug', { all: true, ...bugCtx() })[0], 0.4, 0.3, items.tire, [], items), null, 'surfaces without mounts');
});
test('mount data is validated', () => {
  assert.throws(() => surface({ id: 's', size: [1, 1], mounts: [{ id: 'a', x: 0.5 }] }), /mounts/);
  assert.throws(() => surface({ id: 's', size: [1, 1], mounts: [{ id: 'a', x: 0.5, z: 0.5 }, { id: 'a', x: 0.2, z: 0.2 }] }), /unique/);
});
test('fixtures and loose crates are solid: fitted roof jerry cans block the rack, a 4th cab crate blocks the luggage shelf, truck bed crates block the bed', () => {
  const rack = ctx => surfacesFor('bug', bugCtx({ parts: { roofRack: 'ACC_RoofRack', ...ctx.parts }, loose: ctx.loose })).find(s => s.id === 'roofRack');
  assert.equal(rack({}).blocks.length, 0);
  const cans = rack({ parts: { roofGear: 'ROOF_JerryCans' } }), c1 = GAME_PLACEABLES.crate1;
  assert.equal(cans.blocks.length, 2);
  assert.equal(why(cans, c1, on(cans, 'crate1', 0.28, 0.33), [], items), "something's in the way", 'on top of a jerry can');
  assert.equal(why(cans, c1, on(cans, 'crate1', 0.48, 0.7), [], items), null, 'clear of both cans');
  const shelf = loose => surfacesFor('bug', bugCtx({ loose })).find(s => s.id === 'luggageShelf');
  assert.equal(shelf([]).blocks.length, 0); assert.equal(shelf([{ spot: 'cab', size: 1 }, { spot: 'cab', size: 1 }, { spot: 'cab', size: 1 }]).blocks.length, 0, 'cab crates 1-3 sit ahead of the shelf');
  const four = shelf([1, 1, 1, 1].map(size => ({ spot: 'cab', size })));
  assert.equal(four.blocks.length, 1); assert.equal(why(four, c1, on(four, 'crate1', 0.5, 0.175, { rot: Math.PI / 2 }), [], items), "something's in the way");
  const truckBed = loose => surfacesFor('pickup84', { loose })[0];
  assert.equal(truckBed([]).blocks.length, 2, 'just the wheel wells'); assert.equal(truckBed([{ spot: 'bed', size: 2 }]).blocks.length, 3);
  assert.deepEqual(obstacleBoxes('pickup84', { loose: [{ spot: 'cab', size: 1 }] }), [], 'cab crates are not in the bed');
  const lb = truckBed([{ spot: 'bed', size: 2 }]).blocks[2];
  assert.ok(lb.z0 >= 0 && lb.z0 < 0.1, 'bed crates start at the cab wall (the bed is at +z)');
});
test('trailer surfaces (data only): a flat deck and an enclosed floor with real sizes, usable, no mounts needed', () => {
  const flat = surfacesFor('trailerFlat', {})[0], box = surfacesFor('trailerEnclosed', {})[0];
  assert.deepEqual(flat.size, [1.6, 3.0]); assert.deepEqual(box.size, [1.7, 3.2]);
  assert.ok(flat.usable && box.usable); assert.ok(box.clearance < flat.clearance, 'the enclosed one has a roof');
  // 4 upright tires side by side across the flat deck, and a stack of crates only fits the enclosed one up to its roof
  for (let i = 0; i < 5; i++) assert.equal(why(flat, upright, on(flat, 'tire', 0.135 + i * 0.27, 0.345, { pose: 'upright' }), [], items), null);
  assert.equal(why(box, upright, on(box, 'tire', 0.5, 0.5, { pose: 'upright' }), [], items), null, 'upright tire 0.69 m: fits under 1.7 m');
  assert.equal(why(box, GAME_PLACEABLES.crate4, on(box, 'crate4', 0.5, 0.6, { y: 1.3 }), [], items), 'too tall for here', 'the roof');
  assert.equal(why(box, GAME_PLACEABLES.crate4, on(box, 'crate4', 0.5, 0.6), [], items), null);
});
