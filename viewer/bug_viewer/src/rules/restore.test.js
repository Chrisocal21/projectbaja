import test from 'node:test';
import assert from 'node:assert/strict';
import { BUG, CAJON, VEHICLES, defOfBuild, slotById } from './vehicles.js';
import { isFitted, isDriveable, missingToDrive, checkFit, checkDetach, withSlot, zoneAt } from './restore.js';

const full = { hidden: [], stripped: [] };
const tools = new Set(['wrench', 'jack', 'hoist']);
const at = (zone, open = []) => ({ zone, tools, open: new Set(open) });

test('a complete Bug drives; one sold without a battery does not, and says why', () => {
  assert.equal(isDriveable(BUG, full), true);
  const sold = { hidden: [], stripped: BUG.soldStripped };
  assert.equal(isDriveable(BUG, sold), false);
  assert.deepEqual(missingToDrive(BUG, sold).map(s => s.id), ['battery']);
});

test('a rough shell still drives: body panels are optional', () => {
  const shell = { hidden: ['hoodPanel', 'fenderFL', 'fenderFR', 'windshield', 'frontBumperP'], stripped: [] };
  assert.equal(isDriveable(BUG, shell), true);
});

test('fit order: first failure wins - full, deps, zone, cover, tool', () => {
  const b = { hidden: ['dash', 'steering'], stripped: ['battery'] };
  assert.match(checkFit(BUG, full, slotById(BUG, 'dash'), at('driver')).why, /Already has/);
  assert.match(checkFit(BUG, b, slotById(BUG, 'steering'), at('driver')).why, /dashboard must go on before/);
  assert.match(checkFit(BUG, b, slotById(BUG, 'battery'), at('front')).why, /rear of the car/);
  const shut = checkFit(BUG, b, slotById(BUG, 'battery'), at('rear'));
  assert.equal(shut.openCover, 'engineLid');
  assert.equal(checkFit(BUG, b, slotById(BUG, 'battery'), at('rear', ['engineLid'])).ok, true);
  assert.match(checkFit(BUG, b, slotById(BUG, 'battery'), { zone: 'rear', tools: new Set(), open: new Set(['engineLid']) }).why, /wrench/);
});

test('no cover to open once the lid itself is off', () => {
  const noLid = { hidden: ['engineLid'], stripped: ['battery'] };
  assert.equal(checkFit(BUG, noLid, slotById(BUG, 'battery'), at('rear')).ok, true);
});

test('detach respects reverse dependencies', () => {
  assert.match(checkDetach(BUG, full, slotById(BUG, 'dash'), at('driver')).why, /steering wheel, driver's door, passenger door and windshield/);
  assert.match(checkDetach(BUG, full, slotById(BUG, 'engine'), at('rear', ['engineLid'])).why, /battery/);
  assert.equal(checkDetach(BUG, full, slotById(BUG, 'steering'), at('driver')).openCover, 'doorL');   // reach in through the open door
  assert.equal(checkDetach(BUG, full, slotById(BUG, 'steering'), at('driver', ['doorL'])).ok, true);
});

test('blocked checks name the blocking slots and a code (assembly guide §9.3)', () => {
  const b = { hidden: ['dash', 'steering'], stripped: ['battery'] };
  const st = checkFit(BUG, b, slotById(BUG, 'steering'), at('driver'));
  assert.equal(st.code, 'blocked'); assert.deepEqual(st.blockers, ['dash']);
  const shut = checkFit(BUG, b, slotById(BUG, 'battery'), at('rear'));
  assert.equal(shut.code, 'cover_shut'); assert.deepEqual(shut.blockers, ['engineLid']);
  assert.equal(checkFit(BUG, full, slotById(BUG, 'dash'), at('driver')).code, 'full');
  assert.equal(checkFit(BUG, b, slotById(BUG, 'battery'), at('rear', ['engineLid'])).code, 'ok');
  const dd = checkDetach(BUG, full, slotById(BUG, 'dash'), at('driver'));
  assert.equal(dd.code, 'blocked'); assert.ok(dd.blockers.includes('steering') && dd.blockers.includes('windshield'));
});

test('withSlot toggles pieces and stripped parts without mutating', () => {
  const b = withSlot(BUG, full, 'battery', false), c = withSlot(BUG, b, 'hoodPanel', false);
  assert.deepEqual(full, { hidden: [], stripped: [] });
  assert.equal(isFitted(BUG, c, 'battery'), false); assert.equal(isFitted(BUG, c, 'hoodPanel'), false);
  assert.equal(isFitted(BUG, withSlot(BUG, c, 'battery', true), 'battery'), true);
});

test('zones: nose is front, tail is rear, +x side is the driver', () => {
  assert.equal(zoneAt(BUG, 0, 2.2), 'front'); assert.equal(zoneAt(BUG, 0, -2.2), 'rear');
  assert.equal(zoneAt(BUG, 1.2, 0), 'driver'); assert.equal(zoneAt(BUG, -1.2, 0), 'passenger');
});

// ---- the El Cajon: the same rules over a second definition ----
const ids = def => def.slots.map(s => s.id);
const cajonFull = { def: 'cajon', hidden: [], stripped: [] };

test('El Cajon slot ids never collide with the Bug (a loose part must belong to exactly one vehicle)', () => {
  const bug = new Set(ids(BUG)); assert.deepEqual(ids(CAJON).filter(i => bug.has(i)), []);
  assert.equal(new Set(ids(CAJON)).size, ids(CAJON).length);
  assert.ok(ids(CAJON).every(i => i.startsWith('ec')));
});
test('a build says which vehicle it is; old builds are the Bug', () => {
  assert.equal(defOfBuild(cajonFull), CAJON); assert.equal(defOfBuild(full), BUG); assert.equal(defOfBuild(null), BUG); assert.equal(VEHICLES.cajon, CAJON);
});
test('every El Cajon cover, "after" and part name points at something real', () => {
  const have = new Set(ids(CAJON));
  for (const s of CAJON.slots) { for (const a of s.after) assert.ok(have.has(a), `${s.id} after ${a}`); if (s.cover) assert.ok(CAJON.covers[s.cover], `${s.id} cover ${s.cover}`); }
  for (const [id, c] of Object.entries(CAJON.covers)) assert.ok(have.has(id) && slotById(CAJON, id).piece === c.piece, `cover ${id}`);
  const pieces = CAJON.slots.map(s => s.piece).filter(Boolean); assert.equal(new Set(pieces).size, pieces.length);   // one slot per model part
  assert.deepEqual(Object.keys(CAJON.mounts).sort(), ['FL', 'FR', 'RL', 'RR']);
  assert.deepEqual(CAJON.slots.filter(s => s.wheel).map(s => s.wheel).sort(), ['FL', 'FR', 'RL', 'RR']);
});
test('a whole El Cajon drives; without its engine, battery, steering wheel, bench seat or any wheel it does not', () => {
  assert.equal(isDriveable(CAJON, cajonFull), true);
  assert.deepEqual(missingToDrive(CAJON, { hidden: [], stripped: ['ecEngine', 'ecBattery', 'ecWheelRL'] }).map(s => s.id), ['ecEngine', 'ecBattery', 'ecWheelRL']);
  assert.deepEqual(missingToDrive(CAJON, { hidden: ['steering_wheel', 'seat'], stripped: [] }).map(s => s.id), ['ecSeat', 'ecSteering']);
  assert.equal(isDriveable(CAJON, { hidden: ['hood', 'grille', 'tailgate', 'front_bumper', 'rear_bumper'], stripped: [] }), true);   // a rough truck still drives
});
test('El Cajon: the engine is under the hood, so the hood has to be open to get at it, and it needs the hoist', () => {
  const engine = slotById(CAJON, 'ecEngine'), bare = { def: 'cajon', hidden: [], stripped: ['ecEngine'] };
  const shut = checkFit(CAJON, bare, engine, { zone: 'front', tools, open: new Set() });
  assert.equal(shut.code, 'cover_shut'); assert.equal(shut.openCover, 'ecHood');
  assert.equal(checkFit(CAJON, bare, engine, { zone: 'front', tools, open: new Set(['ecHood']) }).ok, true);
  assert.equal(checkFit(CAJON, bare, engine, { zone: 'front', tools: new Set(['wrench']), open: new Set(['ecHood']) }).code, 'no_tool');
  assert.equal(checkFit(CAJON, bare, engine, { zone: 'rear', tools, open: new Set(['ecHood']) }).code, 'zone');   // round the back is the wrong end
  const noHood = { def: 'cajon', hidden: ['hood'], stripped: ['ecEngine'] };
  assert.equal(checkFit(CAJON, noHood, engine, { zone: 'front', tools, open: new Set() }).ok, true);   // no hood on: nothing to open
});
test('El Cajon: parts go on in the order a mechanic would (dash, then steering wheel and glass; engine, then battery, grille and lights)', () => {
  const nothing = { def: 'cajon', hidden: ['dash', 'steering_wheel', 'windshield', 'grille', 'headlights'], stripped: ['ecEngine', 'ecBattery'] }, door = ['ecDoorL'];
  assert.match(checkFit(CAJON, nothing, slotById(CAJON, 'ecSteering'), { zone: 'driver', tools, open: new Set(door) }).why, /dashboard must go on before/);
  assert.match(checkFit(CAJON, nothing, slotById(CAJON, 'ecBattery'), { zone: 'front', tools, open: new Set(['ecHood']) }).why, /engine must go on before/);
  assert.match(checkFit(CAJON, nothing, slotById(CAJON, 'ecHeadlights'), { zone: 'front', tools, open: new Set() }).why, /grille must go on before/);
  assert.match(checkDetach(CAJON, cajonFull, slotById(CAJON, 'ecEngine'), { zone: 'front', tools, open: new Set(['ecHood']) }).why, /battery/);   // battery and grille sit on the engine
  assert.match(checkDetach(CAJON, cajonFull, slotById(CAJON, 'ecDash'), { zone: 'driver', tools, open: new Set(door) }).why, /steering wheel/);
});
test('El Cajon: the cab parts are reached through the driver\'s door; the zones are along a long truck', () => {
  const seat = slotById(CAJON, 'ecSeat'), shut = checkDetach(CAJON, cajonFull, seat, { zone: 'driver', tools, open: new Set() });
  assert.equal(shut.code, 'blocked');   // the doors depend on the seat, so they come off first
  const noDoors = { def: 'cajon', hidden: ['driver_door', 'passenger_door'], stripped: [] };
  assert.equal(checkDetach(CAJON, noDoors, seat, { zone: 'passenger', tools, open: new Set() }).ok, true);   // doors off: reach in from either side
  assert.equal(zoneAt(CAJON, 0, 2.3), 'front'); assert.equal(zoneAt(CAJON, 0, -2.4), 'rear');
  assert.equal(zoneAt(CAJON, 1.3, 0.4), 'driver'); assert.equal(zoneAt(CAJON, -1.3, 0.4), 'passenger');   // beside the door
  assert.equal(zoneAt(CAJON, 1.3, -1.6), 'rear');   // beside the bed is the rear zone
});
