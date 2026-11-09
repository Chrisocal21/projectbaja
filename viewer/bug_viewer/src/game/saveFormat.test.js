import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, wrap, CURRENT, FORMAT, allocUid, sanitizeJob, sanitizeCrates, resumePlan, validPose, migrations, keysToPrune } from './saveFormat.js';
import { unstoreMove } from './stash.js';

const v0 = { cash: 777, owned: ['car:bug'], items: [{ uid: 4, kind: 'tool', id: 'wrench', loc: 'pack' }, { uid: 9, kind: 'part', id: 'x', loc: 'hand' }], props: [{ uid: 3, id: 'bench' }, { uid: 12, id: 'lift' }], home: { cleared: ['a'], power: true, letter: true, fixtures: true, fixturesV: 2, stored: [{ uid: 20, id: 's' }] }, mats: { scrap: 5 }, clock: 14 };

test('empty / corrupt / newer are told apart', () => {
  assert.equal(parseSave(null).status, 'empty');
  assert.equal(parseSave('{not json').status, 'corrupt');
  assert.equal(parseSave('42').status, 'corrupt');
  assert.equal(parseSave(JSON.stringify({ format: FORMAT, version: CURRENT + 1, data: {} })).status, 'newer');
  assert.equal(parseSave(JSON.stringify({ format: FORMAT, version: 1, data: 'x' })).status, 'corrupt');
});
test('a bare v0 blob migrates to the current version without losing anything', () => {
  const r = parseSave(JSON.stringify(v0)); assert.equal(r.status, 'ok'); assert.equal(r.from, 0);
  const d = r.data;
  assert.equal(d.cash, 777); assert.equal(d.clock, 14); assert.deepEqual(d.owned, ['car:bug']); assert.equal(d.mats.scrap, 5);
  assert.equal(d.items.length, 2); assert.equal(d.props.length, 2);
  assert.equal(d.home.fixturesV, 2, 'sold fixtures stay sold: V3 will still seed only its own batch'); assert.equal(d.home.power, true); assert.deepEqual(d.home.cleared, ['a']);
  assert.deepEqual(d.nextUid, { props: 21, items: 10 });
  assert.equal(d.job, null); assert.equal(d.onFoot, null);
});
test('fixturesV is inferred for the oldest saves and defaults fill a bare home', () => {
  assert.equal(parseSave(JSON.stringify({ home: { fixtures: true } })).data.home.fixturesV, 1);
  const d = parseSave(JSON.stringify({})).data;
  assert.equal(d.home.fixturesV, 0); assert.deepEqual(d.home.stored, []); assert.deepEqual(d.nextUid, { props: 1, items: 1 });
});
test('a current envelope round-trips untouched', () => {
  const env = wrap({ cash: 5, nextUid: { props: 8, items: 3 } }, 123);
  assert.equal(env.slot, 'main'); assert.equal(env.savedAt, 123);
  const r = parseSave(JSON.stringify(env)); assert.equal(r.status, 'ok'); assert.equal(r.from, CURRENT); assert.deepEqual(r.data, env.data);
});
test('migrations table covers every version below CURRENT', () => { for (let v = 0; v < CURRENT; v++) assert.equal(typeof migrations[v], 'function'); });
test('allocUid never reuses an id, even after deletions or with stored props', () => {
  const c = { props: 5 }; const live = [{ uid: 7 }];
  assert.equal(allocUid(c, 'props', live, [{ uid: 30 }]), 31); assert.equal(c.props, 32);
  assert.equal(allocUid(c, 'props', []), 32);   // counter keeps going although the list is empty
});
test('unstoreMove uses the allocator on a collision', () => {
  const r = unstoreMove([{ uid: 2 }], [{ uid: 2, id: 'a' }], 2, 0, 0, 0, () => 99); assert.equal(r.props.find(p => p.id === 'a').uid, 99);
  assert.equal(unstoreMove([], [{ uid: 2, id: 'a' }], 2, 0, 0, 0).props[0].uid, 2);
});
test('job, crates and resume pose are validated', () => {
  assert.deepEqual(sanitizeJob({ id: 'j', stall: 1, x: 1, z: 2, h: 0 }), { id: 'j', stall: 1, x: 1, z: 2, h: 0 });
  assert.equal(sanitizeJob({ id: 'j', x: NaN, z: 2 }), null); assert.equal(sanitizeJob({ id: 'gone', x: 1, z: 2 }, id => id === 'j'), null); assert.equal(sanitizeJob(null), null);
  assert.deepEqual(sanitizeCrates({ a: 5000, b: 1, c: 'x' }, 1000), { a: 5000 });
  assert.equal(validPose({ x: 1, z: 2, yaw: 0 }), true); assert.equal(validPose({ x: 1, z: Infinity }), false); assert.equal(validPose({ x: 9e9, z: 0 }), false);
  const car = { x: 1, z: 1, h: 0 };
  assert.deepEqual(resumePlan({ onFoot: true, walkPose: { x: 1, z: 2, yaw: 3 } }, car), { onFoot: true, walkPose: { x: 1, z: 2, yaw: 3 } });
  assert.equal(resumePlan({ onFoot: true, walkPose: { x: 'a' } }, car), null);
  assert.deepEqual(resumePlan({ onFoot: false }, car), { onFoot: false, walkPose: null });
  assert.equal(resumePlan({ onFoot: false }, null), null);
  assert.equal(resumePlan({}, car), null);
});
test('pruning keeps the newest 3 backups and 3 corrupt copies, never the main save', () => {
  const keys = ['baja-save-v1', 'other', ...[1, 5, 3, 9, 7].map(t => `baja-save-backup-v1-${t}`), ...[2, 4, 6, 8].map(t => `baja-save-corrupt-${t}`)];
  assert.deepEqual(keysToPrune(keys).sort(), ['baja-save-backup-v1-1', 'baja-save-backup-v1-3', 'baja-save-corrupt-2']);
  assert.deepEqual(keysToPrune(['baja-save-v1', 'baja-save-backup-v1-1']), []);
});
