// The engine on the stand (PURE, loads under node). The Bug's engine is a flat-four: a core you put on an engine stand, and the
// outside pieces (Tier 0) that you take off and put back by hand. Pieces keep their own condition 0..100. PROPOSAL numbers.
// engine core item: { kind:'stock', id:'engine', parts?: { slotId: { c: condition } } }  (a slot that is missing from `parts` is off the engine)
// A piece lying loose: { kind:'epart', id: slotId, cond }.
export const ENGINE_SLOTS = [
  // id, name, blockedBy (must come off first), local offset from the stand [x, y, z] (metres, stand-local), colour
  { id: 'airCleaner', name: 'Air cleaner', blockedBy: [], at: [0, 1.28, 0], color: '#6b6f73' },
  { id: 'carb', name: 'Carburetor', blockedBy: ['airCleaner'], at: [0, 1.12, 0], color: '#a9a39a' },
  { id: 'coil', name: 'Ignition coil', blockedBy: [], at: [-0.22, 1.1, -0.2], color: '#2f3a45' },
  { id: 'distributor', name: 'Distributor', blockedBy: [], at: [0.22, 1.1, -0.2], color: '#4a4d52' },
  { id: 'plugs', name: 'Spark plugs', blockedBy: [], at: [0.0, 0.86, 0.34], color: '#d8d2c4' },
  { id: 'fanBelt', name: 'Fan belt', blockedBy: [], at: [0.4, 0.84, 0.22], color: '#1d1d1d' },
  { id: 'alternator', name: 'Alternator', blockedBy: ['fanBelt'], at: [0.4, 0.86, -0.06], color: '#55595e' },
  { id: 'starter', name: 'Starter motor', blockedBy: [], at: [-0.36, 0.7, 0.18], color: '#3b4046' },
  { id: 'exhaust', name: 'Exhaust', blockedBy: [], at: [-0.1, 0.62, -0.36], color: '#7b6a55' },
  // Tier 1 (standard workshop): the intake, the valve covers and the oil filter. Head gaskets and timing need the heads off: later.
  { id: 'intakeManifold', name: 'Intake manifold', blockedBy: ['carb'], at: [0, 0.98, 0], color: '#8a8f94', tier: 1 },
  { id: 'valveCoverL', name: 'Left valve cover', blockedBy: [], at: [-0.52, 0.8, -0.08], color: '#9a9488', tier: 1 },
  { id: 'valveCoverR', name: 'Right valve cover', blockedBy: [], at: [0.58, 0.68, 0.1], color: '#9a9488', tier: 1 },
  { id: 'oilFilter', name: 'Oil filter', blockedBy: [], at: [-0.3, 0.55, 0.3], color: '#2d5a8c', tier: 1 },
];
/** an engine from before Tier 1 has no parts.t1 flag: it counts as having them (nothing is missing) until it goes on the stand, which fits them */
export const hasT1 = parts => !!parts?.t1;
export const T1_IDS = ENGINE_SLOTS.filter(s => s.tier === 1).map(s => s.id);
export function upgradeParts(parts, rng = Math.random, base = 70) {
  if (hasT1(parts)) return parts;
  const o = { ...parts, t1: true };
  for (const id of T1_IDS) o[id] = { c: Math.round(clamp(base + (rng() - 0.5) * 40)), g: 1 };
  return o;
}
export const slotOf = id => ENGINE_SLOTS.find(s => s.id === id);
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** every piece on, each with a worn-in condition. rng() -> [0,1). An engine with no `parts` field is treated as complete. */
export function freshParts(rng = Math.random, base = 70) {
  const o = {};
  for (const s of ENGINE_SLOTS) o[s.id] = { c: Math.round(clamp(base + (rng() - 0.5) * 40)), g: 1 };   // g: grimy, its real condition can't be read until it is washed
  o.t1 = true;
  return o;
}
/** the pieces that are on the engine (an engine without a parts field is complete) */
export const partsOf = eng => eng?.parts || freshParts(() => 0.5);

/** why a piece cannot come off yet ('' = it can): what is still in the way */
export function removeBlock(parts, slotId) {
  const s = slotOf(slotId); if (!s || !parts?.[slotId]) return 'It is not on the engine.';
  const b = s.blockedBy.find(x => parts[x]);
  return b ? `The ${slotOf(b).name.toLowerCase()} is in the way: take it off first.` : '';
}
/** may this loose piece go on? ('' = yes) */
export function fitBlock(parts, slotId) {
  if (!slotOf(slotId)) return 'That is not an engine part.';
  if (parts?.[slotId]) return 'The engine already has one.';
  const under = ENGINE_SLOTS.find(t => t.blockedBy.includes(slotId) && !parts?.[t.id]);   // it covers something that is not on yet
  if (under) return `Fit the ${under.name.toLowerCase()} first: it goes underneath.`;
  const b = slotOf(slotId).blockedBy.find(x => parts?.[x]);   // something sits on top of where it goes
  return b ? `The ${slotOf(b).name.toLowerCase()} is in the way: take it off first.` : '';
}
/** the pieces still missing, as names */
export const missingOf = parts => ENGINE_SLOTS.filter(s => !parts?.[s.id] && !(s.tier === 1 && !hasT1(parts))).map(s => s.name);
/** worst piece first: what to look at when it will not run. -> { id, name, c } | null */
export function weakest(parts) {
  const on = ENGINE_SLOTS.filter(s => parts?.[s.id]).map(s => ({ id: s.id, name: s.name, c: parts[s.id].c }));
  return on.length ? on.sort((a, b) => a.c - b.c)[0] : null;
}
/** pieces the engine cannot start without, and what each one does (the why names the piece). DEAD: below this condition the piece is shot. PROPOSAL numbers. */
export const DEAD = 15;
const NEEDS = [
  ['starter', 'There is no starter motor on the engine: nothing turns it over.', 'The starter motor is shot (%): it only clicks.'],
  ['carb', 'There is no carburetor on the engine: no fuel gets in.', 'The carburetor is shot (%): it floods and will not draw fuel.'],
  ['coil', 'There is no ignition coil on the engine: no spark.', 'The ignition coil is shot (%): no spark.'],
  ['distributor', 'There is no distributor on the engine: no spark gets to the plugs.', 'The distributor is shot (%): the spark goes nowhere.'],
  ['plugs', 'There are no spark plugs in the engine: no spark. A new set can be ordered on the phone (Internet, Supplies).', 'The spark plugs are fouled (%): they will not fire. A new set can be ordered on the phone (Internet, Supplies).'],
  ['intakeManifold', 'There is no intake manifold: the carburetor has nothing to sit on and no air gets in.', 'The intake manifold is cracked (%): it sucks air and will not idle.', 1],
  ['oilFilter', 'There is no oil filter: the oil would pump straight onto the floor.', 'The oil filter is clogged (%): the engine would starve for oil.', 1],
  ['valveCoverL', 'The left valve cover is off: oil would spray everywhere.', 'The left valve cover is cracked (%): it pours oil.', 1],
  ['valveCoverR', 'The right valve cover is off: oil would spray everywhere.', 'The right valve cover is cracked (%): it pours oil.', 1],
];
/** can this engine start? parts: the engine's pieces (undefined = a complete engine). -> { ok, why } and the why names the piece */
export function engineStartCheck(parts) {
  if (!parts) return { ok: true, why: '' };
  for (const [id, missing, shot, tier] of NEEDS) {
    if (tier === 1 && !hasT1(parts)) continue;   // an engine from before Tier 1: its pieces get fitted when it goes on the stand
    if (!parts[id]) return { ok: false, why: missing };
    if (parts[id].c < DEAD) return { ok: false, why: shot.replace('%', Math.round(parts[id].c) + '%') };
  }
  return { ok: true, why: '' };
}
/** worn pieces that still let her start cost power: below WORN each one loses up to its share, in a straight line down to DEAD. A missing air cleaner or exhaust
 *  (she runs without them) counts as dead. The total never drops below MIN_POWER. PROPOSAL numbers. */
export const WORN = 60, MIN_POWER = 0.5;
export const POWER_SHARE = { carb: 0.2, plugs: 0.15, distributor: 0.12, coil: 0.1, intakeManifold: 0.1, airCleaner: 0.06, exhaust: 0.06 };
const lossOf = (parts, id) => { const c = parts[id] ? parts[id].c : DEAD; return POWER_SHARE[id] * Math.max(0, Math.min(1, (WORN - c) / (WORN - DEAD))); };
/** 0.5..1: the share of full power the engine's own pieces allow (undefined parts = a complete engine = 1) */
export function piecePower(parts) {
  if (!parts) return 1;
  const loss = Object.keys(POWER_SHARE).filter(id => !(id === 'intakeManifold' && !hasT1(parts))).reduce((n, id) => n + lossOf(parts, id), 0);
  return Math.max(MIN_POWER, Math.round((1 - loss) * 100) / 100);
}
const FEEL = { carb: 'stumbles when you open the throttle: the carburetor is worn', plugs: 'misfires under load: the spark plugs are tired', distributor: 'runs rough and down on power: the distributor is worn', coil: 'has a weak spark and feels flat: the ignition coil is tired', intakeManifold: 'hisses and hunts at idle: the intake manifold leaks', airCleaner: 'sucks dirt with no air cleaner and feels down on power', exhaust: 'is loud and flat without a good exhaust' };
/** what you hear and feel when she runs, for the piece costing the most power ('' = she runs clean) */
export function pieceClue(parts) {
  if (!parts || piecePower(parts) >= 0.95) return '';
  const worst = Object.keys(POWER_SHARE).filter(id => !(id === 'intakeManifold' && !hasT1(parts))).sort((a, b) => lossOf(parts, b) - lossOf(parts, a))[0];
  return `She ${FEEL[worst]} (about ${Math.round(piecePower(parts) * 100)}% power).`;
}
/** a short line for the engine's name tag */
export function engineTag(eng) {
  const m = missingOf(partsOf(eng));
  return m.length ? ` · ${m.length} part${m.length > 1 ? 's' : ''} off` : '';
}
