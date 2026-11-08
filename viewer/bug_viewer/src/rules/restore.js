// Restoration rules (blueprint §3): plain functions over plain data, no React, no three.js.
//
// A vehicle's restoration state is read from its build:
//   - slots with a body `piece` are fitted unless that piece is in build.hidden
//   - other slots (engine, battery) are fitted unless listed in build.stripped
//   - covers (engine lid, hood) are open when listed in `open` (not saved: lids shut when you leave)

export const DRIVE_FNS = ['start', 'drive', 'steer', 'grip'];

export function isFitted(def, build, slotId) {
  const s = def.slots.find(x => x.id === slotId); if (!s) return false;
  if (s.piece) return !(build.hidden || []).includes(s.piece);
  return !(build.stripped || []).includes(slotId);
}
export const missing = (def, build) => def.slots.filter(s => !isFitted(def, build, s.id));
/** blueprint §3.1: driveable when every start/drive/steer/grip slot is filled. Body panels are optional - a rough shell drives. */
export const missingToDrive = (def, build) => def.slots.filter(s => DRIVE_FNS.includes(s.fn) && !isFitted(def, build, s.id));
export const isDriveable = (def, build) => missingToDrive(def, build).length === 0;
export const listNames = list => { const n = list.map(s => s.name.toLowerCase()); return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1]; };

/** which zone of the vehicle a point is in. local = point in vehicle space (x right/left, z forward) */
export function zoneAt(def, lx, lz) {
  const f = lz / (def.length / 2);
  if (f >= def.zones.front) return 'front';
  if (f <= def.zones.rear) return 'rear';
  return lx > 0 ? 'driver' : 'passenger';   // +x is the car's left = driver's side
}
const zoneOk = (want, at) => !want || want === 'any' || want === at || (want === 'cabin' && (at === 'driver' || at === 'passenger'));

/**
 * Can this slot be fitted now? (blueprint §3.4, first failure wins). Returns { ok, code } or { ok:false, code, why, openCover, blockers }.
 * code: ok | full | blocked | zone | cover_shut | no_tool. blockers: slot ids that must change first (assembly guide §9.3: they glow amber).
 * ctx: { zone, tools:Set, open:Set }
 */
export function checkFit(def, build, slot, ctx) {
  if (isFitted(def, build, slot.id)) return { ok: false, code: 'full', why: `Already has its ${slot.name.toLowerCase()}.` };
  const need = slot.after.filter(a => !isFitted(def, build, a));
  if (need.length) return { ok: false, code: 'blocked', blockers: need, why: `The ${listNames(need.map(a => def.slots.find(s => s.id === a)))} must go on before the ${slot.name.toLowerCase()}.` };
  return checkAccess(def, build, slot, ctx, 'fit');
}
/** blueprint §3.6: same rules in reverse - nothing that depends on it may still be on */
export function checkDetach(def, build, slot, ctx) {
  if (!isFitted(def, build, slot.id)) return { ok: false, code: 'no_part', why: `There is no ${slot.name.toLowerCase()} to take off.` };
  const deps = def.slots.filter(s => s.after.includes(slot.id) && isFitted(def, build, s.id));
  if (deps.length) return { ok: false, code: 'blocked', blockers: deps.map(d => d.id), why: `Take off the ${listNames(deps)} first.` };
  return checkAccess(def, build, slot, ctx, 'detach');
}
function checkAccess(def, build, slot, ctx, verb) {
  if (ctx.zone && !zoneOk(slot.zone, ctx.zone)) return { ok: false, code: 'zone', why: `Go round to the ${slot.zone === 'cabin' ? 'door' : slot.zone === 'driver' ? "driver's door" : slot.zone === 'passenger' ? 'passenger door' : slot.zone} of the car for the ${slot.name.toLowerCase()}.` };
  if (slot.cover && isFitted(def, build, slot.cover) && !ctx.open?.has(slot.cover)) return { ok: false, code: 'cover_shut', why: `Open the ${def.covers[slot.cover].name} first.`, openCover: slot.cover, blockers: [slot.cover] };
  if (slot.tool && !ctx.tools?.has(slot.tool)) return { ok: false, code: 'no_tool', why: TOOL_WHY[slot.tool](verb, slot.name.toLowerCase()) };
  return { ok: true, code: 'ok' };
}
export const TOOL_WHY = {
  wrench: (v, n) => `You need a wrench to ${v === 'fit' ? 'bolt on' : 'unbolt'} the ${n}.`,
  jack: (v, n) => `You need a jack to ${v === 'fit' ? 'fit' : 'take off'} the ${n} — there's a floor jack in your garage.`,
  hoist: (v, n) => `The ${n} needs an engine hoist — that means your garage.`,
};

/** apply a fit / detach to a build (returns a new build; never mutates) */
export function withSlot(def, build, slotId, fitted) {
  const s = def.slots.find(x => x.id === slotId);
  if (s.piece) { const h = new Set(build.hidden || []); fitted ? h.delete(s.piece) : h.add(s.piece); return { ...build, hidden: [...h] }; }
  const st = new Set(build.stripped || []); fitted ? st.delete(slotId) : st.add(slotId); return { ...build, stripped: [...st] };
}
