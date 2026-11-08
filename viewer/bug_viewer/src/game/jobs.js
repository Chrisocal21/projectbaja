// Odd jobs: now and then a local pulls into the yard with a small problem. Nothing big, no timer, no stress - just steady
// pocket money that keeps you chipping away at the garage. One customer at a time; the next one turns up a few minutes
// (of play, with the OPEN light on) after the last one leaves.
import { game, save, say, addCash } from './store.js';
import { SITES, toWorld } from '../worlds/county.js';
import { pickStall } from '../worlds/lot.js';
import { homeLocal, isOpen } from './home.js';
import { standingVehicles } from './fleet.js';

export const SUPPLIES = {
  oil: { name: 'Motor oil (5 qt)', price: 12 }, bulb: { name: 'Headlight bulb', price: 6 },
  plug: { name: 'Tire plug kit', price: 10 }, wipers: { name: 'Wiper blades', price: 14 },
  belt: { name: 'Fan belt', price: 18 },
};
/** what a job needs: an item you carry (used up) or just a tool */
export const JOBS = [
  { id: 'battery', who: 'Rosa from the diner', car: ['#c9b48a', '#f0e8d4'], title: 'Won\'t start', ask: "Clicks and nothing. I think it's the battery, hon.", need: { kind: 'stock', id: 'battery' }, pay: 110 },
  { id: 'oil', who: 'Pastor Dale', car: ['#2f4a63', '#d8d4c8'], title: 'Oil change', ask: "Light came on Sunday. The Lord provides, but not motor oil.", need: { kind: 'supply', id: 'oil' }, pay: 55 },
  { id: 'bulb', who: 'Deputy Ruiz', car: ['#e8e6dc', '#1c2a34'], title: 'Headlight out', ask: "Can't exactly write tickets for a headlight out with one out myself.", need: { kind: 'supply', id: 'bulb' }, pay: 40 },
  { id: 'tire', who: 'a long-haul trucker', car: ['#7a2f26', '#cfc8b8'], title: 'Slow leak', ask: 'Picked up a nail on 9. Can you plug it so I make it to Yuma?', need: { kind: 'supply', id: 'plug' }, pay: 45 },
  { id: 'wipers', who: 'Mrs. Hollis', car: ['#5b6e4a', '#e8e2d2'], title: 'Wipers shot', ask: "It rains twice a year and I'd like to see both times.", need: { kind: 'supply', id: 'wipers' }, pay: 35 },
  { id: 'belt', who: 'Dusty', car: ['#c8372b', '#e8e6dc'], title: 'Squealing belt', ask: 'Sounds like a cat in a blender. Walt always fixed it with a belt.', need: { kind: 'supply', id: 'belt' }, pay: 60 },
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
  const stall = pickStall(occupiedNow()); if (!stall) return;   // lot full: the customer waits until a stall opens
  const last = h.lastJob, pool = JOBS.filter(j => j.id !== last);
  const j = pool[Math.floor(Math.random() * pool.length)];
  game.job = { id: j.id, stall: stall.id, ...stallPose(stall) };
  h.jobClock = 0; h.nextJobAt = GAP[0] + Math.random() * (GAP[1] - GAP[0]);
  save(); say(`A car just pulled into the lot — ${j.who} needs a hand.`);
}
/** can you do the job right now? → { ok, why, item } */
export function jobCheck(j) {
  if (j.need.tool) return game.items.some(i => i.kind === 'tool' && i.id === j.need.tool && (i.loc === 'pack' || i.loc === 'hand')) ? { ok: true } : { ok: false, why: `You need a ${j.need.tool}.` };
  const it = game.items.find(i => i.kind === j.need.kind && i.id === j.need.id && (i.loc === 'hand' || i.loc === 'pack'));
  const what = j.need.kind === 'supply' ? SUPPLIES[j.need.id].name : 'a car battery';
  return it ? { ok: true, item: it } : { ok: false, why: `You need ${what.toLowerCase().startsWith('a ') ? what : `a ${what.toLowerCase()}`} — Dusty's store has them.` };
}
export function doJob() {
  const j = game.job && jobById[game.job.id]; if (!j) return;
  const c = jobCheck(j); if (!c.ok) return say(c.why);
  if (c.item) game.items = game.items.filter(i => i !== c.item);
  addCash(j.pay);
  game.home = { ...game.home, jobsDone: (game.home.jobsDone || 0) + 1, lastJob: j.id };
  game.job = null; save(); say(`${j.who}: "You're a lifesaver." (+$${j.pay})`);
}
