import test from 'node:test';
import assert from 'node:assert/strict';
import { FINISH_TOOLS, CANS, stepJob, getFinish, setFinish, finishMaterial, isFinishTool } from './finishJobs.js';
import { CAN_IDS, tintChannel, tintStep, getTint, setTint } from './finishJobs.js';
import { newPanel, stateName } from './rules/finish.js';

const hold = (tool, panel, seconds, base) => { let p = panel; for (let t = 0; t < seconds; t += 0.1) { const r = stepJob(tool, p, 0.1, base); if (!r.ok) return { ...r, panel: p }; p = r.panel; } return { ok: true, panel: p }; };

test('holding the spray can long enough paints bare fiberglass its own colour; the can is the choice', () => {
  const r = hold('spray-red', null, 3.5, 'glass');
  assert.equal(stateName(r.panel), 'painted'); assert.equal(r.panel.color, CANS['spray-red'][1]);
  assert.equal(finishMaterial(r.panel).color, CANS['spray-red'][1]);
});
test('a different can will not paint over a finished coat: grind first', () => {
  const red = hold('spray-red', null, 3.5, 'glass').panel;
  assert.match(stepJob('spray-blue', red, 0.1).why, /grind/i);
  const bare = hold('grinder', red, 5).panel;
  assert.equal(stepJob('spray-blue', bare, 0.1).ok, true);
});
test('buffer needs paint, hose needs dirt, grinder needs rust or paint', () => {
  assert.equal(stepJob('buffer', null, 0.1).ok, false);
  assert.equal(stepJob('hose', null, 0.1).ok, false);
  assert.equal(stepJob('grinder', null, 0.1).ok, false);
  const done = hold('buffer', hold('spray-white', null, 3.5, 'glass').panel, 5).panel;
  assert.ok(done.gloss >= 0.99);
});
test('rust and dirt change what a panel looks like', () => {
  const clean = finishMaterial(newPanel('steel'));
  assert.notEqual(finishMaterial(newPanel('steel', { rust: 1 })).color, clean.color);
  assert.notEqual(finishMaterial(newPanel('steel', { dirt: 1 })).color, clean.color);
});
test('finish state saves per vehicle and panel without touching the old home', () => {
  const home = { cash: 5 }, p = newPanel('glass', { dirt: 0.5 });
  const h2 = setFinish(home, 'bug', 'up:hood', p);
  assert.equal(getFinish(h2, 'bug', 'up:hood').dirt, 0.5); assert.equal(getFinish(h2, 'cajon', 'up:hood'), null); assert.equal(home.finish, undefined);
  assert.equal(getFinish(setFinish(h2, 'bug', 'up:roof', p), 'bug', 'up:hood').dirt, 0.5);
});
test('every finish tool has a name, a time and a rule', () => {
  for (const [id, t] of Object.entries(FINISH_TOOLS)) { assert.ok(t.name && t.secs > 0 && typeof t.rule === 'function', id); assert.ok(isFinishTool(id)); }
});

import { isBodyPanelSlot, bodySeed, eligiblePanels, weatherHome, dirtyVehicle } from './finishJobs.js';
test('body panels are steel, start painted, rust only after grinding and waiting; driving makes them dirty', () => {
  assert.ok(isBodyPanelSlot('doorL') && isBodyPanelSlot('fenderRR') && !isBodyPanelSlot('engine') && !isBodyPanelSlot('windshield'));
  const painted = bodySeed('#729ba6'); assert.equal(stateName(painted), 'buffed' === stateName(painted) ? 'buffed' : 'painted');
  const ground = hold('grinder', painted, 5).panel; assert.equal(stateName(ground), 'ground');
  const home = { finish: { bug: { doorL: ground, hoodPanel: painted } } };
  const later = weatherHome(home, 20);
  assert.ok(later.finish.bug.doorL.rust > 0.2); assert.ok(later.finish.bug.hoodPanel.rust < later.finish.bug.doorL.rust / 4);
  assert.equal(weatherHome({}, 5).finish, undefined);
  const parts = { shell: { material: { unpainted: true } } };
  const el = eligiblePanels({ parts: { hood: 'shell' }, stripped: ['doorR'] }, parts, '#fff');
  assert.ok(el.some(([k]) => k === 'up:hood') && !el.some(([k]) => k === 'doorR') && el.some(([k]) => k === 'doorL'));
  const d = dirtyVehicle({}, 'bug', el, 0.2); assert.equal(d.finish.bug.doorL.dirt, 0.2); assert.equal(stepJob('hose', d.finish.bug.doorL, 0.1).ok, true);
});
import { canLeft, canTag, CAN_SECS } from './finishJobs.js';
test('a spray can runs out: new, part used, empty; other tools never do', () => {
  assert.equal(canLeft({ id: 'spray-red' }), CAN_SECS); assert.equal(canTag({ id: 'spray-red' }), '');
  assert.equal(canTag({ id: 'spray-red', paint: CAN_SECS / 4 }), ' · 25% left'); assert.equal(canTag({ id: 'spray-red', paint: 0 }), ' · empty');
  assert.equal(canLeft({ id: 'hose' }), Infinity); assert.equal(canTag({ id: 'grinder', paint: 0 }), '');
});
import { chipVehicle, hitPanels, hitHardness } from './finishJobs.js';
test('a hit chips the paint on the nose or tail, harder when faster, and not at a crawl', () => {
  assert.deepEqual(hitPanels(true, false), ['hoodPanel', 'nosePanel', 'fenderFL']); assert.deepEqual(hitPanels(false, true), ['engineLid', 'tailPanel', 'fenderRR']);
  assert.equal(hitHardness(2), 0); assert.equal(hitHardness(30), 1); assert.ok(hitHardness(9) > 0 && hitHardness(9) < 1);
  const elig = ['hoodPanel', 'nosePanel', 'fenderFL', 'engineLid'].map(k => [k, () => bodySeed('#336699')]), home = { finish: {} };
  assert.equal(chipVehicle(home, 'bug', ['hoodPanel'], 0, elig), home);
  const h = chipVehicle(home, 'bug', hitPanels(true, false), 0.5, elig);
  assert.ok(h.finish.bug.hoodPanel.coverage < 1 && h.finish.bug.fenderFL.coverage < 1 && !h.finish.bug.engineLid);
});

test('every palette colour has a can, and a can sprays rims and seats', () => {
  assert.equal(CAN_IDS.length, 12);
  for (const id of CAN_IDS) assert.match(CANS[id][1], /^#[0-9a-f]{6}$/);
  assert.equal(tintChannel('wheelFL'), 'rim'); assert.equal(tintChannel('wheelRR'), 'rim');
  assert.equal(tintChannel('seatDriver'), 'seats'); assert.equal(tintChannel('seatBack'), 'seats');
  assert.equal(tintChannel('doorL'), null); assert.equal(tintChannel(null), null);
});

test('a rim or seat tint blends to the can colour over one coat and is saved per vehicle', () => {
  assert.equal(tintStep('#000000', 'spray-white', 0), '#000000');
  assert.equal(tintStep('#000000', 'spray-teal', 1), CANS['spray-teal'][1]);
  assert.equal(tintStep('#000000', 'spray-teal', 5), CANS['spray-teal'][1]);
  const half = tintStep('#000000', 'spray-white', 0.5); assert.ok(half > '#700000' && half < '#7a7a7a', half);
  const h = setTint({ finish: { bug: {} } }, 'bug', 'rim', '#123456');
  assert.equal(getTint(h, 'bug', 'rim'), '#123456'); assert.equal(getTint(h, 'bug', 'seats'), null); assert.equal(getTint(h, 'p1', 'rim'), null);
  assert.deepEqual(h.finish, { bug: {} });   // tints never land among the weathering panels
});
