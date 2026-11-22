// Glue between the restoration rules (rules/restore.js) and the game: what E does at the car, fitting and detaching real items.
import { game, save, say } from './store.js';
import { held, packItems, itemSize, nameOfItem, inGarageZone } from './items.js';
import { BUG, VEHICLES, defOfBuild, UPGRADE_FIT, WHEEL_FIT, slotById } from '../rules/vehicles.js';
import { isFitted, checkFit, checkDetach, withSlot, zoneAt, isDriveable, missingToDrive, listNames, TOOL_WHY } from '../rules/restore.js';
import { partById, setPart, setWheels, setRim, partState, bodyById, wheelSetFits, wheelById } from '../build.js';
import { activeType } from './fleet.js';
import { hasInGarage } from './home.js';
import { projectOpen } from './projects.js';
import { checkRoll } from './wheelAssembly.js';
import { wheelOfItem } from './machineRules.js';
import { sizes as machineSizes } from './tireMachine.js';
import { engineStartCheck } from './engineRules.js';
import { batteryCheck } from './benchRules.js';

export const DEF = BUG;
export const STOCK_NAMES = Object.fromEntries(Object.values(VEHICLES).flatMap(d => d.slots).map(s => [s.id, s.name]));
export { defOfBuild };

/** tools you have right now: carried ones (wrench, jack in the pack/hands) + the garage's floor jack and engine hoist */
export function toolsHere() {
  const t = new Set(game.items.filter(i => i.kind === 'tool' && (i.loc === 'pack' || i.loc === 'hand')).map(i => i.id));
  if (inGarageZone(game.pos.x, game.pos.z)) { t.add('jack'); t.add('hoist'); }
  return t;
}
export const openCovers = () => (game.work?.uid != null ? projectOpen(game.work.uid) : game.open || (game.open = new Set()));   // each vehicle has its own open lids
const startWhy = b => engineStartCheck(b.engineParts).why || batteryCheck(b.batteryCharge).why;   // '' = the engine and the battery are fine
export const driveable = b => game.dev || (isDriveable(defOfBuild(b), b) && !startWhy(b));   // the engine's own pieces count too (engineRules.js)
export const whyNotDrive = b => { const e = startWhy(b); return isDriveable(defOfBuild(b), b) && e ? `Won't start. ${e}` : `Won't start — missing: ${listNames(missingToDrive(defOfBuild(b), b))}.`; };

/** the player's position in the car's own frame, and which zone that is */
export function carLocal() {
  const p = game.pose; if (!p) return null;
  const dx = game.pos.x - p.x, dz = game.pos.z - p.z, c = Math.cos(p.h), s = Math.sin(p.h);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  const t = activeType(), near = Math.abs(lx) < t.width / 2 + 1.5 && Math.abs(lz) < t.length / 2 + 1.5;
  return { lx, lz, near, zone: t.kind === 'build' ? zoneAt(DEF, lx, lz) : 'any' };
}

/**
 * How would this item go onto the car? → { ok, why, openCover, slotName, apply(build) → { build, drops:[[kind,id]] } }
 * zone: where the player stands (undefined = workshop panel, any side)
 */
export function planFit(it, b, zone) {
  const DEF = defOfBuild(b), ctx = { zone, tools: toolsHere(), open: openCovers() };   // the vehicle's own definition: the Bug, or the El Cajon (a build carries `def`)
  const body = bodyById[b.body];
  if (DEF !== BUG && !['stock', 'shell'].includes(it.kind)) return { ok: false, why: it.kind === 'fab' ? "That doesn't go on this truck." : "That doesn't fit this truck." };   // catalogue upgrades are Bug parts for now
  if (it.kind === 'shell') {
    const slot = slotById(DEF, 'shell'); if (!slot) return { ok: false, why: "That shell doesn't fit this truck." };
    const r = checkFit(DEF, b, slot, { ...ctx, zone: undefined });
    const pose = game.pose, far = pose && Math.hypot(it.x - pose.x, it.z - pose.z) > 16;
    if (r.ok && far) return { ok: false, why: 'The shell has to be next to the chassis (within 16 m) to lower it back on.' };
    return { ...r, slotName: 'body shell', apply: bb => ({ build: withSlot(DEF, bb, 'shell', true), drops: [] }) };
  }
  if (it.kind === 'stock' && it.id === 'wheel') {   // a loose wheel goes on the nearest bare hub (blueprint §3.4)
    const bare = DEF.slots.filter(s => s.wheel && !isFitted(DEF, b, s.id)); if (!bare.length) return { ok: false, why: 'All four wheels are on.' };
    if ((it.set || 'stock') !== b.wheels) return { ok: false, why: `That wheel doesn't match the other tires on the car.` };
    const rl = checkRoll(wheelOfItem(it, machineSizes)); if (!rl.ok) return { ok: false, why: rl.why, slotName: 'wheel' };   // flat or punctured: fix it at the tire machine first
    const cl = game.work ? { lx: game.work.lx, lz: game.work.lz } : carLocal(), mounts = DEF.mounts || bodyById[b.body].wheels;
    const slot = bare.slice().sort((a, c) => { const d = s => { const m = mounts[s.wheel].center; return cl ? Math.hypot(m[0] - cl.lx, m[2] - cl.lz) : 0; }; return d(a) - d(c); })[0];
    const r = checkFit(DEF, b, slot, { ...ctx, zone: undefined });
    return { ...r, slotName: slot.name, apply: bb => ({ build: withSlot(DEF, bb, slot.id, true), drops: [] }) };
  }
  if (it.kind === 'stock') {
    const slot = slotById(DEF, it.id); if (!slot) return { ok: false, why: "That doesn't belong on this car." };
    const r = checkFit(DEF, b, slot, ctx);
    return { ...r, slotName: slot.name, apply: bb => ({ build: slot.id === 'engine' ? (() => { const n = withSlot(DEF, bb, 'engine', true); const p = { ...n.parts }; delete p.engine; const o = { ...n, parts: p }; if (it.parts) o.engineParts = it.parts; else delete o.engineParts; return o; })() : slot.id === 'battery' ? (() => { const o = { ...withSlot(DEF, bb, 'battery', true) }; if (typeof it.charge === 'number') o.batteryCharge = it.charge; else delete o.batteryCharge; return o; })() : withSlot(DEF, bb, slot.id, true), drops: [] }) };   // a battery brings its charge   // the engine's pieces ride in with it (engineParts)
  }
  if (it.kind === 'fab' && it.id === 'shockHoops') {
    if (b.fab?.hoops) return { ok: false, why: 'The hoops are already welded in.' };
    if (!inGarageZone(game.pos.x, game.pos.z) || !hasInGarage('welder')) return { ok: false, why: 'Welding them in needs the welder — in your garage.' };
    return { ok: true, slotName: 'shock hoops', apply: bb => ({ build: { ...bb, fab: { ...(bb.fab || {}), hoops: true } }, drops: [] }) };
  }
  const HOOPS_WHY = "Those need shock hoops welded in first — scrap metal, a welder and a tube bender (workbench).";
  if (it.kind === 'part' && ['shocks', 'suspension'].includes(partById[it.id]?.slot) && !b.fab?.hoops) return { ok: false, why: HOOPS_WHY };
  if (it.kind === 'wheel' && it.id !== 'stock' && !b.fab?.hoops) return { ok: false, why: "Those tires won't clear the stock body. " + HOOPS_WHY };
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
    if (fit.cover && isFitted(DEF, b, fit.cover) && !ctx.open.has(fit.cover)) return { ok: false, code: 'cover_shut', why: `Open the ${DEF.covers[fit.cover].name} first.`, openCover: fit.cover, blockers: [fit.cover] };
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
  const DEF = defOfBuild(b), slot = slotById(DEF, slotId), ctx = { zone, tools: toolsHere(), open: openCovers() };
  if (!slot) return { ok: false, why: "There's nothing like that on this vehicle.", item: ['stock', slotId] };
  let r = checkDetach(DEF, b, slot, ctx);
  const mods = slotId === 'engine' ? Object.entries(b.parts).filter(([s]) => UPGRADE_FIT[s]?.needsEngine) : [];
  if (r.ok && mods.length) r = { ok: false, why: `Take the ${mods.map(([, id]) => partById[id].label.toLowerCase()).join(', ')} off the engine first.` };
  if (slotId === 'shell') return { ...r, item: ['shell', b.body], toYard: true, apply: bb => withSlot(DEF, bb, 'shell', false) };
  const item = slotId === 'engine' && b.parts.engine ? ['part', b.parts.engine] : slot.wheel ? ['stock', 'wheel', { set: b.wheels, ...(DEF === BUG ? {} : { from: DEF.id }) }] : slotId === 'engine' && b.engineParts ? ['stock', 'engine', { parts: b.engineParts }] : slotId === 'battery' && typeof b.batteryCharge === 'number' ? ['stock', 'battery', { charge: b.batteryCharge }] : ['stock', slotId];   // `from`: a wheel off the El Cajon is drawn with its own wheel model; an engine keeps its pieces' condition
  return { ...r, item, apply: bb => { let n = withSlot(DEF, bb, slotId, false); if (slotId === 'engine') { const p = { ...n.parts }; delete p.engine; n = { ...n, parts: p }; delete n.engineParts; } if (slotId === 'battery') { n = { ...n }; delete n.batteryCharge; } return n; } };
}
/** detaching a bolt-on upgrade (lights, racks, bumpers...) that has no restoration slot */
export function planDetachUpgrade(catSlot, b) {
  if (defOfBuild(b) !== BUG) return { ok: false, why: 'Nothing like that on this truck.', item: ['part', catSlot] };
  const p = partById[b.parts[catSlot]], fit = UPGRADE_FIT[catSlot] || {}, tool = fit.tool || 'wrench', tools = toolsHere();
  if (!tools.has(tool)) return { ok: false, why: TOOL_WHY[tool]('detach', p.label.toLowerCase()), item: ['part', p.id] };
  return { ok: true, item: ['part', p.id], apply: bb => setPart(bb, catSlot, null) };
}

/** removing what the crosshair is on (game.aim): a restoration slot, or 'up:<catalog slot>' for a bolt-on upgrade. -> { ok, why, openCover, blockers, name } */
export function planRemove(id, b, zone) {
  if (id.startsWith('up:')) {
    const cs = id.slice(3), p = partById[b.parts[cs]]; if (!p) return { ok: false, why: 'Nothing there to take off.', name: '' };
    return { ...planDetachUpgrade(cs, b), name: p.label.toLowerCase() };
  }
  return { ...planDetach(id, b, zone), name: (slotById(defOfBuild(b), id)?.name || id).toLowerCase() };
}
export function toggleCover(id) {
  const o = openCovers(); if (o.has(id)) o.delete(id); else o.add(id);
  if (game.work?.uid != null) game.projectOpen = { ...game.projectOpen, [game.work.uid]: new Set(o) }; else game.open = new Set(o);
  save();
}

/** which item would E use right now: what's in your hands, else the first pack item that belongs on the car */
export function fitCandidate(b, zone) {
  const h = held(); if (h && h.kind !== 'tool') return { it: h, plan: planFit(h, b, zone) };   // a tool in your hands is not the part: fit from the pack
  for (const it of packItems()) { const plan = planFit(it, b, zone); if (plan.ok || plan.openCover) return { it, plan }; }
  return null;
}
export { itemSize };
