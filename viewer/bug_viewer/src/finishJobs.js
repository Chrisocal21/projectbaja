// Hold-click panel finishing: which tool does which rule, how long a whole job takes, and the saved per-panel state.
// Pure (no game store, no renderer) so it is testable; game/finishWork.js runs it on the held mouse button.
import { newPanel, grind, paint, buff, hose, look, weather, splash, chip } from './rules/finish.js';

/** secs = seconds of holding for one whole job (a full coat, all the rust off). PROPOSAL: tune by feel. */
export const FINISH_TOOLS = {
  grinder: { name: 'Angle grinder', size: 1, verb: 'Grinding', secs: 4, rule: grind },
  buffer: { name: 'Buffer', size: 1, verb: 'Buffing', secs: 4, rule: buff },
  hose: { name: 'Hose / power sprayer', size: 1, verb: 'Washing', secs: 3, rule: hose },
};
/** Spray cans: one tool per colour (the can you hold is how you choose; there is no picker). */
export const CANS = { 'spray-white': ['White spray paint', '#f2f2ee'], 'spray-red': ['Red spray paint', '#b3261e'], 'spray-blue': ['Blue spray paint', '#2a5d9f'], 'spray-black': ['Black spray paint', '#1b1c1e'], 'spray-yellow': ['Yellow spray paint', '#e0b21c'] };
for (const [id, [name, color]] of Object.entries(CANS)) FINISH_TOOLS[id] = { name, size: 1, verb: 'Spraying', secs: 3, color, rule: (p, w) => paint(p, w, color) };

export const isFinishTool = id => !!FINISH_TOOLS[id];
/** A spray can holds four full coats' worth of spraying (CAN_SECS seconds of holding); a new can has `paint` unset. PROPOSAL: tune by feel. */
export const CAN_SECS = FINISH_TOOLS['spray-white'].secs * 4;
export const isCan = id => !!CANS[id];
export const canLeft = it => (it && isCan(it.id) ? Math.max(0, it.paint ?? CAN_SECS) : Infinity);
/** how a can reads in a name: "" when new, " · 40% left", " · empty" */
export const canTag = it => { if (!it || !isCan(it.id) || it.paint === undefined) return ''; const l = canLeft(it); return l <= 0.001 ? ' · empty' : ` · ${Math.max(1, Math.round(l / CAN_SECS * 100))}% left`; };
/** TOOLS entries (name, size) for game/items.js */
export const FINISH_TOOL_ITEMS = Object.fromEntries(Object.entries(FINISH_TOOLS).map(([id, t]) => [id, { name: t.name, size: t.size }]));

/** One tick of holding: `dt` seconds with the tool on a panel (null = untouched fiberglass). */
export function stepJob(toolId, panel, dt, base = 'glass') {
  const t = FINISH_TOOLS[toolId], p = panel || newPanel(base);
  if (!t) return { ok: false, panel: p, why: 'That tool does not finish panels.' };
  const r = t.rule(p, dt / t.secs);
  return { ...r, verb: t.verb };
}

/** Saved state lives at home.finish[vehicleId][panelKey]. These never mutate what they are given. */
export const getFinish = (home, vehId, key) => home?.finish?.[vehId]?.[key] || null;
export const setFinish = (home, vehId, key, panel) => ({ ...home, finish: { ...(home?.finish || {}), [vehId]: { ...(home?.finish?.[vehId] || {}), [key]: panel } } });

const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const [x, y] = [p(a), p(b)]; return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const RUST = '#8a4a22', DIRT = '#6b5a43';

/** The material a panel should wear: paint colour, then rust showing through, then a layer of dirt. */
export function finishMaterial(panel) {
  const l = look(panel);
  let color = mix(l.color, RUST, Math.min(1, l.rust));
  color = mix(color, DIRT, Math.min(0.7, l.dirt * 0.7));
  return { color, roughness: Math.min(1, l.roughness + l.rust * 0.2 + l.dirt * 0.2), metalness: l.metalness * (1 - l.rust) };
}

/** Steel body panels you can finish: doors, hood, engine lid, fenders (slot ids from rules/vehicles.js). */
export const isBodyPanelSlot = id => /^(engineLid|hoodPanel|nosePanel|tailPanel|door[LR]|fender[FR][LR])$/.test(id || '');
/** A body panel nobody has touched: the car's paint, a little worn. Rust stays hidden under a full coat. */
export const bodySeed = colour => newPanel('steel', { coverage: 1, color: colour || '#729ba6', gloss: 0.45, bare: false });

/** The finish key and starting state for every panel on a build: body panels (steel, seeded) and unpainted fiberglass parts. */
export function eligiblePanels(build, partById, bodyColour) {
  const out = [];
  for (const slot of Object.keys(build?.parts || {})) if (partById[build.parts[slot]]?.material?.unpainted) out.push(['up:' + slot, () => newPanel('glass')]);
  for (const id of ['engineLid', 'hoodPanel', 'nosePanel', 'tailPanel', 'doorL', 'doorR', 'fenderFL', 'fenderFR', 'fenderRL', 'fenderRR']) if (!(build?.stripped || []).includes(id)) out.push([id, () => bodySeed(bodyColour)]);
  return out;
}

/** Time passes: every saved panel on every vehicle weathers (bare steel rusts, paint slows it). Returns the same home if nothing changed. */
export function weatherHome(home, hours, exposure = 1) {
  if (!home?.finish || hours <= 0) return home;
  const finish = {};
  for (const [v, panels] of Object.entries(home.finish)) { finish[v] = {}; for (const [k, p] of Object.entries(panels)) finish[v][k] = weather(p, hours, exposure); }
  return { ...home, finish };
}

/** Driving kicks dirt up on every panel of the vehicle (seeding untouched ones so there is something to wash). */
/** Which panels take a knock: the nose or the tail, on the left or the right (body panel slot ids, rules/vehicles.js). */
export const hitPanels = (front, right) => (front ? ['hoodPanel', 'nosePanel', right ? 'fenderFR' : 'fenderFL'] : ['engineLid', 'tailPanel', right ? 'fenderRR' : 'fenderRL']);
/** How hard a hit is, 0..1, from the speed you hit at (m/s): nothing under a walking-pace bump, a full hit at about 15 m/s (PROPOSAL). */
export const hitHardness = speed => Math.max(0, Math.min(1, (speed - 3) / 12));
/** A hit chips the paint on these panels (only those you still have on the car). Returns the same home if nothing changed. */
export function chipVehicle(home, vehId, keys, hardness, eligible) {
  if (!(hardness > 0)) return home;
  const have = home?.finish?.[vehId] || {}, next = { ...have }; let any = false;
  for (const [key, seed] of eligible) if (keys.includes(key)) { next[key] = chip(have[key] || seed(), hardness); any = true; }
  return any ? { ...home, finish: { ...(home?.finish || {}), [vehId]: next } } : home;
}
export function dirtyVehicle(home, vehId, eligible, amount) {
  const have = home?.finish?.[vehId] || {}, next = { ...have };
  for (const [key, seed] of eligible) next[key] = splash(have[key] || seed(), amount);
  return { ...home, finish: { ...(home?.finish || {}), [vehId]: next } };
}
