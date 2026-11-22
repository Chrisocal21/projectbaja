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
];
export const slotOf = id => ENGINE_SLOTS.find(s => s.id === id);
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** every piece on, each with a worn-in condition. rng() -> [0,1). An engine with no `parts` field is treated as complete. */
export function freshParts(rng = Math.random, base = 70) {
  const o = {};
  for (const s of ENGINE_SLOTS) o[s.id] = { c: Math.round(clamp(base + (rng() - 0.5) * 40)) };
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
export const missingOf = parts => ENGINE_SLOTS.filter(s => !parts?.[s.id]).map(s => s.name);
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
  ['plugs', 'There are no spark plugs in the engine: no spark.', 'The spark plugs are fouled (%): they will not fire.'],
];
/** can this engine start? parts: the engine's pieces (undefined = a complete engine). -> { ok, why } and the why names the piece */
export function engineStartCheck(parts) {
  if (!parts) return { ok: true, why: '' };
  for (const [id, missing, shot] of NEEDS) {
    if (!parts[id]) return { ok: false, why: missing };
    if (parts[id].c < DEAD) return { ok: false, why: shot.replace('%', Math.round(parts[id].c) + '%') };
  }
  return { ok: true, why: '' };
}
/** a short line for the engine's name tag */
export function engineTag(eng) {
  const m = missingOf(partsOf(eng));
  return m.length ? ` · ${m.length} part${m.length > 1 ? 's' : ''} off` : '';
}
