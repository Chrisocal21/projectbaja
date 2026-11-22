// Wear and failure, forgiving version. Every vehicle has four wear numbers (0 = fresh, 1 = worn out) that creep up with how it is driven:
//   shocks   hard landings and bottoming out: damping fades, the ride gets bouncy
//   tires    rough, fast driving: grip fades a little
//   align    big hits: the car pulls to one side
//   engine   running hot (overheating, or wading while hot): power fades
// Nothing here can strand you: worn-out costs at most ~a quarter of the grip/power, a soft ride and a mild pull. A service puts it all back.
// All rates are estimates to tune by feel. Pure functions (the game keeps the numbers in game.home.wear[vehicleId]).
/** everything wears slowly for now (a quarter of the base rates) until it is dialled in by feel */
export const WEAR_RATE = 0.25;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ONE = { shocks: 1, tires: 1, align: 1, engine: 1 };
/** how fitted parts change how fast things wear (multipliers on the wear rate; estimates). Part ids are catalog part ids, tire ids are wheel set ids. */
export const WEAR_PARTS_MODS = {
  SHOCK_001_Coilover: { shocks: 0.55 }, PART_006_TrailShockSet: { shocks: 0.65 },   // better dampers last longer under landings
  GUARD_SkidPlate: { align: 0.7, shocks: 0.9 },   // belly hits do less
  EMOD_Doghouse: { engine: 0.6 },   // the doghouse cooler: runs cooler, wears less when hot
  EXH_Megaphone: { engine: 1.1 },
  PART_011_RockerGuards: { align: 0.9 }, GUARD_MudFlaps: { tires: 0.95 },
};
export const WEAR_TIRE_MODS = { 'tire-tread': { tires: 0.7 }, 'tire-deep': { tires: 0.8 }, 'tire-beadlock': { tires: 0.85 }, 'tire-light': { tires: 1.2 } };
const modCache = new WeakMap();
export function wearMods(build) {
  if (build && modCache.has(build)) return modCache.get(build);
  const m = { ...ONE }, apply = o => { if (o) for (const k in o) m[k] *= o[k]; };
  for (const id of Object.values(build?.parts || {})) apply(WEAR_PARTS_MODS[id]);
  apply(WEAR_TIRE_MODS[build?.wheels]);
  if (build) modCache.set(build, m);
  return m;
}
export const CORNERS = ['FL', 'FR', 'RL', 'RR'];
export const CORNER_NAME = { FL: 'front-left', FR: 'front-right', RL: 'rear-left', RR: 'rear-right' };
/** shockC: wear 0..1 of the damper at each corner (a blown one); flat: the corners with a punctured tire */
export const FRESH = () => ({ shocks: 0, tires: 0, align: 0, engine: 0, side: 1, shockC: { FL: 0, FR: 0, RL: 0, RR: 0 }, flat: {} });
export const flatCorners = w => CORNERS.filter(c => w.flat?.[c]);
export const worstShock = w => Math.max(0, ...CORNERS.map(c => w.shockC?.[c] ?? 0));
/** a hard landing (imp m/s down) may blow the damper at the corner that took it (`corner`), and a hit on rock or a pinch at low pressure may puncture that tire. rng() -> [0,1). Returns a new wear. */
export function onHit(w, { imp = 0, corner, rock = false, pinch = false }, rng = Math.random) {
  if (!CORNERS.includes(corner)) return w;
  const o = { ...w, shockC: { ...(w.shockC || {}) }, flat: { ...(w.flat || {}) } };
  if (imp > 9 && rng() < Math.min(0.6, (imp - 9) * 0.12 + 0.15)) o.shockC[corner] = Math.min(1, (o.shockC[corner] ?? 0) + 0.5);
  if (!o.flat[corner] && ((pinch && imp > 3) || (rock && imp > 6 && rng() < 0.4) || (imp > 12 && rng() < 0.25))) o.flat[corner] = true;
  return o;
}
export const WEAR_PARTS = ['shocks', 'tires', 'align', 'engine'];

/** a landing at `imp` m/s downward speed */
export function onLanding(w, imp, m = ONE) { if (imp <= 4.5) return w; return { ...w, shocks: clamp(w.shocks + (imp - 4.5) * 0.006 * WEAR_RATE * m.shocks, 0, 1), align: clamp(w.align + (imp > 8 ? (imp - 8) * 0.01 : 0) * WEAR_RATE * m.align, 0, 1), tires: clamp(w.tires + 0.002 * WEAR_RATE * m.tires, 0, 1) }; }
export const onBottomOut = (w, m = ONE) => ({ ...w, shocks: clamp(w.shocks + 0.006 * WEAR_RATE * m.shocks, 0, 1), align: clamp(w.align + 0.002 * WEAR_RATE * m.align, 0, 1) });
/** `dt` s of driving: speed (m/s), rough = surface roughness 0..1 (rr-like), hot = engine over its warn temp, wading depth (m) */
export function drive(w, dt, { speed = 0, rough = 0, hot = false, wading = 0 } = {}, m = ONE) {
  const sp = Math.abs(speed);
  w.tires = clamp(w.tires + dt * sp * (0.2 + rough) * 1.6e-5 * WEAR_RATE * m.tires, 0, 1);
  if (hot) w.engine = clamp(w.engine + dt * (wading > 0.05 ? 0.03 : 0.004) * WEAR_RATE * m.engine, 0, 1);   // cold water on a hot engine is harder on it than the heat alone
  return w;
}
/** what the numbers do to the car: multipliers for env (damp, grip, power) and a steering pull (rad) */
export function effects(w) {
  const dampC = {}, gripC = {}, rrC = {};
  for (const c of CORNERS) { const s = w.shockC?.[c] ?? 0; if (s > 0) dampC[c] = 1 - 0.7 * s; if (w.flat?.[c]) { gripC[c] = 0.55; rrC[c] = 4; } }   // per corner: a blown damper rebounds loose, a flat grips less and drags
  return { damp: 1 - 0.4 * w.shocks, grip: 1 - 0.18 * w.tires, power: 1 - 0.25 * w.engine, pull: (w.side || 1) * 0.02 * w.align, dampC, gripC, rrC };
}
const pct = v => Math.round(v * 100);
/** the clues, worst first: what the driver would notice (never a number you must read; the Admin / garage can show the numbers) */
export function clues(w, psi = 30) {
  const out = [];
  if (w.shocks > 0.25) out.push([w.shocks, (w.shocks > 0.6 ? 'The suspension is blown: the ride is floaty and bouncy.' : 'The shocks feel soft after those landings.') + (psi >= 28 ? ' (Or is the tire pressure just too high for dirt? Look it over: hold T with empty hands.)' : '')]);
  for (const c of flatCorners(w)) out.push([1, `The ${CORNER_NAME[c]} tire is flat: the car drags and pulls to that side.`]);
  for (const c of CORNERS) if ((w.shockC?.[c] ?? 0) >= 0.4) out.push([0.9, `The ${CORNER_NAME[c]} damper is blown: that corner bounces and will not settle.`]);
  if (w.align > 0.2) out.push([w.align, 'The car pulls to one side: something got knocked out of line.']);
  if (w.tires > 0.3) out.push([w.tires, 'The tires are getting slick and worn.']);
  if (w.engine > 0.2) out.push([w.engine, w.engine > 0.6 ? 'The engine is tired and short of power: it has been run hot.' : 'The engine feels a little flat after running hot.']);
  return out.sort((a, b) => b[0] - a[0]).map(c => c[1]);
}
/** a proper look over (empty hands, hold T): what is actually wrong, in a mechanic's words, and what is NOT a worn part (tire pressure) */
export function inspect(w, psi = 30) {
  const out = [];
  if (w.shocks > 0.05) out.push(w.shocks > 0.6 ? 'Shocks: leaking and tired, the rebound is gone. Replace or service.' : 'Shocks: a little soft. Service them.');
  for (const c of flatCorners(w)) out.push(`Tires: the ${CORNER_NAME[c]} tire has a hole. Patch it or replace it.`);
  for (const c of CORNERS) if ((w.shockC?.[c] ?? 0) >= 0.2) out.push(`Shocks: the ${CORNER_NAME[c]} damper is blown (no rebound control at that corner). Replace or service it.`);
  if (w.align > 0.05) out.push(w.align > 0.4 ? 'Alignment: toe is well out, one side drags.' : 'Alignment: slightly out.');
  if (w.tires > 0.1) out.push(w.tires > 0.6 ? 'Tires: worn smooth.' : 'Tires: wearing, tread getting thin.');
  if (w.engine > 0.05) out.push(w.engine > 0.5 ? 'Engine: heat-stressed, low compression feel. Tune it up.' : 'Engine: a little tired from running hot.');
  if (psi >= 28) out.push('Tire pressure is high (' + psi + ' psi): firm and skittish on dirt. Not a worn part: let some air out (Admin / pressure setting).');
  else if (psi <= 14) out.push('Tire pressure is very low (' + psi + ' psi): soft and squirmy on pavement. Fine for sand and rock.');
  return out.length ? out : ['Looks good: nothing worn that you can find.'];
}
export const summary = w => WEAR_PARTS.map(p => p + ' ' + pct(w[p]) + '%').join(' · ');
/** the price of servicing one part (cheap on purpose; nothing to pay when it is fresh) */
export const PART_NAME = { shocks: 'Shocks', tires: 'Tires', align: 'Alignment', engine: 'Engine tune-up' };
const eff = (w, p) => (p === 'shocks' ? Math.max(w.shocks, worstShock(w)) : p === 'tires' && flatCorners(w).length ? Math.max(w.tires, 0.4) : w[p]);   // a blown damper or a flat counts as that part being worn
export const partCost = (w, p) => (eff(w, p) < 0.02 ? 0 : Math.round(8 + 60 * eff(w, p)));
export const serviceCost = w => WEAR_PARTS.reduce((s, p) => s + partCost(w, p), 0);
export const serviced = (w, p) => ({ ...w, [p]: 0, ...(p === 'shocks' ? { shockC: { FL: 0, FR: 0, RL: 0, RR: 0 } } : p === 'tires' ? { flat: {} } : {}) });   // service puts it all back

/** hand service: the wrench does shocks, alignment and engine tune-ups; the jack does the tires. Returns the worst worn part that tool can fix, or null */
export const TOOL_JOBS = { wrench: ['shocks', 'align', 'engine'], jack: ['tires'] };
export const SERVICE_VERB = { shocks: 'Re-seat and re-torque the shocks', align: 'Set the alignment', engine: 'Tune the engine', tires: 'Rotate and re-seat the tires' };
export const serviceJob = (w, toolId) => { const c = (TOOL_JOBS[toolId] || []).filter(p => partCost(w, p) > 0).sort((a, b) => eff(w, b) - eff(w, a)); return c[0] || null; };

const WEAR_WORD = { shocks: 'shock', tires: 'tire', align: 'alignment', engine: 'engine' };
/** a short line for the part lists: what a part does to wear ('' when nothing), kind = 'part' | 'wheel' */
export function wearNote(kind, id) {
  const o = kind === 'wheel' ? WEAR_TIRE_MODS[id] : WEAR_PARTS_MODS[id]; if (!o) return '';
  return Object.entries(o).filter(([, v]) => v !== 1).map(([k, v]) => (v < 1 ? 'slows ' : 'speeds up ') + WEAR_WORD[k] + ' wear ' + Math.round(Math.abs(1 - v) * 100) + '%').join(', ');
}
