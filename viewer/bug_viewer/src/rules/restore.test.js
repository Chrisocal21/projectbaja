import test from 'node:test';
import assert from 'node:assert/strict';
import { BUG, slotById } from './vehicles.js';
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
