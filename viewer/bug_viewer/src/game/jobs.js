// Odd jobs: now and then a local pulls into the yard with a small problem. Nothing big, no timer, no stress - just steady
// pocket money that keeps you chipping away at the garage. One customer at a time; the next one turns up a few minutes
// (of play, with the OPEN light on) after the last one leaves.
import { game, save, say, addCash } from './store.js';
import { SITES, toWorld } from '../worlds/county.js';
import { pickStall, stallsFor } from '../worlds/lot.js';
import { homeLocal, isOpen, hasInGarage } from './home.js';
import { spawnItem, nameOfItem } from './items.js';
import { makeOrder, addOrder } from './workRules.js';
import { custWheel, isCustWheel, custWheelReady } from './custJobs.js';
import { standingVehicles } from './fleet.js';
import { upgradeLevel } from './upgrades.js';
import { payFor, gapScale, afterJob } from './repRules.js';

import { SUPPLIES } from './garageSupplies.js';
import { standFor, stockOf, takeStock, standById } from './stock.js';
export { SUPPLIES };   // (the data lives in garageSupplies.js so ordering can share it)
/** Dusty's corner store, in shelf order: [what, name, price, note]. 'supply:*' rows come from SUPPLIES. */
export const STORE_ITEMS = [
  ['stock:battery', '12V car battery', 60, 'small · fits in your pack'],
  ['tool:wrench', 'Wrench', 15, 'small · bolts most things on and off'],
  ['tool:jack', 'Floor jack', 90, 'large · change tires anywhere'],
  ['tool:hose', 'Hose / power sprayer', 60, 'small · washes the dirt off'],
  ['tool:spray-white', 'White spray paint', 12, 'small · paints a panel'],
  ['tool:spray-black', 'Black spray paint', 12, 'small · paints a panel'],
  ...Object.entries(SUPPLIES).map(([id, s]) => ['supply:' + id, s.name, s.price, 'small · for customer jobs']),
  ['wash', 'Hand wash & wax', 120, 'cleans up the paint a bit'],
];
/** what a job needs: an item you carry (used up) or just a tool */
export const JOBS = [
  { id: 'battery', who: 'Rosa from the diner', car: ['#c9b48a', '#f0e8d4'], title: 'Won\'t start', ask: "Clicks and nothing. I think it's the battery, hon.", need: { kind: 'stock', id: 'battery' }, pay: 110 },
  { id: 'oil', who: 'Pastor Dale', car: ['#2f4a63', '#d8d4c8'], title: 'Oil change', ask: "Light came on Sunday. The Lord provides, but not motor oil.", need: { kind: 'supply', id: 'oil' }, pay: 55 },
  { id: 'bulb', who: 'Deputy Ruiz', car: ['#e8e6dc', '#1c2a34'], title: 'Headlight out', ask: "Can't exactly write tickets for a headlight out with one out myself.", need: { kind: 'supply', id: 'bulb' }, pay: 40 },
  { id: 'tire', who: 'a long-haul trucker', car: ['#7a2f26', '#cfc8b8'], title: 'Slow leak', ask: 'Picked up a nail on 9. Can you plug it so I make it to Yuma?', need: { kind: 'supply', id: 'plug' }, pay: 45 },
  { id: 'wipers', who: 'Mrs. Hollis', car: ['#5b6e4a', '#e8e2d2'], title: 'Wipers shot', ask: "It rains twice a year and I'd like to see both times.", need: { kind: 'supply', id: 'wipers' }, pay: 35 },
  { id: 'belt', who: 'Dusty', car: ['#c8372b', '#e8e6dc'], title: 'Squealing belt', ask: 'Sounds like a cat in a blender. Walt always fixed it with a belt.', need: { kind: 'supply', id: 'belt' }, pay: 60 },
  { id: 'flatwheel', who: 'a young mechanic', car: ['#3d5a7a', '#d8d4c8'], title: 'Flat, properly', ask: "Pulled a nail out of this one. The spare's worn out. Can you patch the wheel and air it back up?", need: { kind: 'custWheel' }, pay: 95, needsGarage: 'tireChanger' },
  { id: 'tune', who: 'Old Man Hollis', car: ['#6e5a3a', '#cfc4a4'], title: 'Rough idle', ask: "She coughs. Walt'd just twist something. You got his wrench?", need: { tool: 'wrench' }, pay: 70 },
];
const FIRST_AFTER = 75, GAP = [200, 380];
/** the world pose of a customer parked nose-in at a lot stall (see worlds/lot.js) */
const stallPose = st => { const [x, z] = toWorld(SITES.garage, st.lx, st.lz); return { x, z, h: SITES.garage.rot + Math.atan2(st.fx, st.fz) }; };
/** vehicles already in the lot, in garage-local metres: your parked cars plus the one you are driving */
const occupiedNow = () => [...standingVehicles().map(v => v.pose), game.pose].filter(Boolean).map(p => homeLocal(p.x, p.z));
export const jobById = Object.fromEntries(JOBS.map(j => [j.id, j]));

/** called every frame while playing: counts play time with the power on, and sends the next customer when it's due */
export function tickJobs(dt) {
  if (game.dev || game.paused || game.job || !isOpen()) return;
  const h = game.home;
  h.jobClock = (h.jobClock || 0) + dt;
  const due = h.jobsDone ? h.nextJobAt || GAP[0] : FIRST_AFTER;
  if (h.jobClock < due) return;
  const stall = pickStall(occupiedNow(), Math.random, stallsFor(upgradeLevel('parking'))); if (!stall) return;   // lot full: the customer waits until a stall opens
  const last = h.lastJob, pool = JOBS.filter(j => j.id !== last && (!j.needsGarage || hasInGarage(j.needsGarage)));
  const j = pool[Math.floor(Math.random() * pool.length)];
  const pose = stallPose(stall);
  game.job = { id: j.id, stall: stall.id, ...pose };
  if (j.need.kind === 'custWheel') {   // the customer leaves their wheel on the ground beside the car
    spawnItem('stock', 'wheel', pose.x + Math.cos(pose.h) * 2.2, pose.z - Math.sin(pose.h) * 2.2);
    Object.assign(game.items[game.items.length - 1], custWheel());
  }
  h.jobClock = 0; h.nextJobAt = (GAP[0] + Math.random() * (GAP[1] - GAP[0])) * gapScale(h);
  save(); say(`A car just pulled into the lot — ${j.who} needs a hand.`);
}
/** can you do the job right now? → { ok, why, item } */
export function jobCheck(j) {
  if (j.need.kind === 'custWheel') { const it = game.items.find(isCustWheel); const r = custWheelReady(it); return r.ok && it.loc === 'world' ? { ok: false, why: 'Pick their wheel up first.' } : r.ok ? { ok: true, item: it } : r; }
  if (j.need.tool) return game.items.some(i => i.kind === 'tool' && i.id === j.need.tool && (i.loc === 'pack' || i.loc === 'hand')) ? { ok: true } : { ok: false, why: `You need a ${j.need.tool}.` };
  const it = game.items.find(i => i.kind === j.need.kind && i.id === j.need.id && (i.loc === 'hand' || i.loc === 'pack'));
  const st = standFor(j.need.kind, j.need.id);   // Walt's stand has one too: no need to carry it
  if (!it && st && stockOf(game.home, st.id) > 0) return { ok: true, stand: st.id };
  const what = j.need.kind === 'supply' ? SUPPLIES[j.need.id].name : 'a car battery';
  return it ? { ok: true, item: it } : { ok: false, why: `You need ${what.toLowerCase().startsWith('a ') ? what : `a ${what.toLowerCase()}`} — Dusty's store has them.` };
}
export function doJob() {
  const j = game.job && jobById[game.job.id]; if (!j) return;
  const c = jobCheck(j); if (!c.ok) return say(c.why);
  if (c.item) game.items = game.items.filter(i => i !== c.item);
  else if (c.stand) game.home = takeStock(game.home, c.stand).home;
  const pay = payFor(j.pay, game.home, j.who), a = afterJob(game.home, j.who);
  const used = c.item ? nameOfItem(c.item) : c.stand ? standById[c.stand]?.name : j.need.tool ? `your ${j.need.tool}` : '';   // for the work order
  addCash(pay, `Job: ${j.who}`);
  game.home = { ...game.home, jobsDone: (game.home.jobsDone || 0) + 1, lastJob: j.id, rep: a.rep, regulars: a.regulars, workLog: addOrder(game.home.workLog, makeOrder(j, used, pay, game.clock)) };
  game.job = null; save(); say(`${j.who}: "You're a lifesaver." (+$${pay})${pay > j.pay ? ' Good word gets around: a little extra.' : ''}${a.note ? ' ' + a.note : ''}`);
}
