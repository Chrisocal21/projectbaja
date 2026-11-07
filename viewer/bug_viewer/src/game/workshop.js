// Glue between the restoration rules (rules/restore.js) and the game: what E does at the car, fitting and detaching real items.
import { game, save, say } from './store.js';
import { held, packItems, itemSize, nameOfItem, inGarageZone } from './items.js';
import { BUG, UPGRADE_FIT, WHEEL_FIT, slotById } from '../rules/vehicles.js';
import { isFitted, checkFit, checkDetach, withSlot, zoneAt, isDriveable, missingToDrive, listNames, TOOL_WHY } from '../rules/restore.js';
import { partById, setPart, setWheels, setRim, partState, bodyById, wheelSetFits, wheelById } from '../build.js';

export const DEF = BUG;
export const STOCK_NAMES = Object.fromEntries(BUG.slots.map(s => [s.id, s.name]));

/** tools you have right now: carried ones (wrench, jack in the pack/hands) + the garage's floor jack and engine hoist */
export function toolsHere() {
  const t = new Set(game.items.filter(i => i.kind === 'tool' && (i.loc === 'pack' || i.loc === 'hand')).map(i => i.id));
  if (inGarageZone(game.pos.x, game.pos.z)) { t.add('jack'); t.add('hoist'); }
  return t;
}
export const openCovers = () => game.open || (game.open = new Set());
export const driveable = b => game.dev || isDriveable(DEF, b);
export const whyNotDrive = b => `Won't start — missing: ${listNames(missingToDrive(DEF, b))}.`;

/** the player's position in the car's own frame, and which zone that is */
export function carLocal() {
  const p = game.pose; if (!p) return null;
  const dx = game.pos.x - p.x, dz = game.pos.z - p.z, c = Math.cos(p.h), s = Math.sin(p.h);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  const near = Math.abs(lx) < DEF.width / 2 + 1.5 && Math.abs(lz) < DEF.length / 2 + 1.5;
  return { lx, lz, near, zone: zoneAt(DEF, lx, lz) };
}

/**
 * How would this item go onto the car? → { ok, why, openCover, slotName, apply(build) → { build, drops:[[kind,id]] } }
 * zone: where the player stands (undefined = workshop panel, any side)
 */
export function planFit(it, b, zone) {
  const ctx = { zone, tools: toolsHere(), open: openCovers() };
  const body = bodyById[b.body];
  if (it.kind === 'shell') {
    const slot = slotById(DEF, 'shell'), r = checkFit(DEF, b, slot, { ...ctx, zone: undefined });
    const pose = game.pose, far = pose && Math.hypot(it.x - pose.x, it.z - pose.z) > 16;
    if (r.ok && far) return { ok: false, why: 'The shell has to be next to the chassis (within 16 m) to lower it back on.' };
    return { ...r, slotName: 'body shell', apply: bb => ({ build: withSlot(DEF, bb, 'shell', true), drops: [] }) };
  }
  if (it.kind === 'stock' && it.id === 'wheel') {   // a loose wheel goes on the nearest bare hub (blueprint §3.4)
    const bare = DEF.slots.filter(s => s.wheel && !isFitted(DEF, b, s.id)); if (!bare.length) return { ok: false, why: 'All four wheels are on.' };
    if ((it.set || 'stock') !== b.wheels) return { ok: false, why: `That wheel doesn't match the other tires on the car.` };
    const cl = carLocal(), mounts = bodyById[b.body].wheels;
    const slot = bare.slice().sort((a, c) => { const d = s => { const m = mounts[s.wheel].center; return cl ? Math.hypot(m[0] - cl.lx, m[2] - cl.lz) : 0; }; return d(a) - d(c); })[0];
    const r = checkFit(DEF, b, slot, { ...ctx, zone: undefined });
    return { ...r, slotName: slot.name, apply: bb => ({ build: withSlot(DEF, bb, slot.id, true), drops: [] }) };
  }
  if (it.kind === 'stock') {
    const slot = slotById(DEF, it.id); if (!slot) return { ok: false, why: "That doesn't belong on this car." };
    const r = checkFit(DEF, b, slot, ctx);
    return { ...r, slotName: slot.name, apply: bb => ({ build: slot.id === 'engine' ? (() => { const n = withSlot(DEF, bb, 'engine', true); const p = { ...n.parts }; delete p.engine; return { ...n, parts: p }; })() : withSlot(DEF, bb, slot.id, true), drops: [] }) };
  }
  if (it.kind === 'part') {
    const p = partById[it.id]; if (!p || partState(p, body) !== 'ok') return { ok: false, why: "That doesn't fit this car." };
    const fit = UPGRADE_FIT[p.slot] || { zone: 'any' }, tool = fit.tool || 'wrench';
    if (p.slot === 'engine') {
      const slot = slotById(DEF, 'engine'), stripped = !isFitted(DEF, b, 'engine');
      const r = stripped ? checkFit(DEF, b, slot, ctx) : checkFit(DEF, withSlot(DEF, b, 'engine', false), slot, ctx);   // swapping engines: same access rules as fitting one
      return { ...r, slotName: p.label, apply: bb => { const drops = []; if (!stripped) drops.push(bb.parts.engine ? ['part', bb.parts.engine] : ['stock', 'engine']); return { build: setPart(withSlot(DEF, bb, 'engine', true), 'engine', p.id), drops }; } };
    }
    if (fit.needsEngine && !isFitted(DEF, b, 'engine')) return { ok: false, why: 'There is no engine to bolt that onto.' };
    if (zone && fit.zone !== 'any' && fit.zone !== zone) return { ok: false, why: `Go to the ${fit.zone} of the car for the ${p.label.toLowerCase()}.` };
    if (fit.cover && isFitted(DEF, b, fit.cover) && !ctx.open.has(fit.cover)) return { ok: false, why: `Open the ${DEF.covers[fit.cover].name} first.`, openCover: fit.cover };
    if (!ctx.tools.has(tool)) return { ok: false, why: TOOL_WHY[tool]('fit', p.label.toLowerCase()) };
    return { ok: true, slotName: p.label, apply: bb => ({ build: setPart(bb, p.slot, p.id), drops: bb.parts[p.slot] ? [['part', bb.parts[p.slot]]] : [] }) };
  }
  if (it.kind === 'wheel' || it.kind === 'rim') {
    if (it.kind === 'wheel' && !wheelSetFits(wheelById[it.id], b.body)) return { ok: false, why: "Those don't fit this car." };
    if (!ctx.tools.has(WHEEL_FIT.tool)) return { ok: false, why: TOOL_WHY.jack('fit', it.kind === 'wheel' ? 'tires' : 'rims') };
    return { ok: true, slotName: nameOfItem(it), apply: bb => it.kind === 'wheel' ? { build: setWheels(bb, it.id), drops: bb.wheels !== 'stock' ? [['wheel', bb.wheels]] : [] } : { build: setRim(bb, it.id), drops: bb.rim !== 'steel' ? [['rim', bb.rim]] : [] } };
  }
  return { ok: false, why: "That isn't a car part." };
}

/** detaching a restoration slot (stock part or fitted upgrade) */
export function planDetach(slotId, b, zone) {
  const slot = slotById(DEF, slotId), ctx = { zone, tools: toolsHere(), open: openCovers() };
  let r = checkDetach(DEF, b, slot, ctx);
  const mods = slotId === 'engine' ? Object.entries(b.parts).filter(([s]) => UPGRADE_FIT[s]?.needsEngine) : [];
  if (r.ok && mods.length) r = { ok: false, why: `Take the ${mods.map(([, id]) => partById[id].label.toLowerCase()).join(', ')} off the engine first.` };
  if (slotId === 'shell') return { ...r, item: ['shell', b.body], toYard: true, apply: bb => withSlot(DEF, bb, 'shell', false) };
  const item = slotId === 'engine' && b.parts.engine ? ['part', b.parts.engine] : slot.wheel ? ['stock', 'wheel', { set: b.wheels }] : ['stock', slotId];
  return { ...r, item, apply: bb => { let n = withSlot(DEF, bb, slotId, false); if (slotId === 'engine') { const p = { ...n.parts }; delete p.engine; n = { ...n, parts: p }; } return n; } };
}
/** detaching a bolt-on upgrade (lights, racks, bumpers...) that has no restoration slot */
export function planDetachUpgrade(catSlot, b) {
  const p = partById[b.parts[catSlot]], fit = UPGRADE_FIT[catSlot] || {}, tool = fit.tool || 'wrench', tools = toolsHere();
  if (!tools.has(tool)) return { ok: false, why: TOOL_WHY[tool]('detach', p.label.toLowerCase()), item: ['part', p.id] };
  return { ok: true, item: ['part', p.id], apply: bb => setPart(bb, catSlot, null) };
}

export function toggleCover(id) {
  const o = openCovers(); if (o.has(id)) o.delete(id); else o.add(id); game.open = new Set(o); save();
}

/** which item would E use right now: what's in your hands, else the first pack item that belongs on the car */
export function fitCandidate(b, zone) {
  const h = held(); if (h) return { it: h, plan: planFit(h, b, zone) };
  for (const it of packItems()) { const plan = planFit(it, b, zone); if (plan.ok || plan.openCover) return { it, plan }; }
  return null;
}
export { itemSize };
