// The tire machine (PURE, loads under node): what happens when you hold a wheel, a rim or a tire up to it and hold-click.
//   a wheel:  punctured -> patch it (uses a plug kit) | flat -> inflate it (needs the air compressor) | good -> take the tire off the rim
//   a rim:    mounts the matching tire lying on the floor beside the machine
//   a tire:   mounts onto the matching rim lying on the floor beside the machine
// Items: wheel { kind:'stock', id:'wheel', set, tread, rim?, hole?, air? }  rim { kind:'rim', id }  tire { kind:'tire', id (the tire set), tread, hole? }.
// Older wheels have no rim/hole/air: they count as a steel rim, no hole, full air, so old saves behave exactly as before.
import { makeWheel, mount, dismount, patch, inflate, checkMount, FLAT, HOLD } from './wheelAssembly.js';

export const isWheelItem = it => it?.kind === 'stock' && it.id === 'wheel';
const num = (v, d) => (Number.isFinite(v) ? v : d);

/** the wheel assembly an item stands for. sizes = { tireSize(set) -> inches, rimSize(rimId) -> inches } */
export function wheelOfItem(it, sizes) {
  const rimId = it.rim || 'steel', set = it.set || 'stock';
  return makeWheel({ rim: { id: rimId, size: sizes.rimSize(rimId) }, tire: { id: set, size: sizes.tireSize(set), tread: num(it.tread, 1), hole: !!it.hole }, air: num(it.air, 1) });
}
const tireOfItem = (it, sizes) => ({ id: it.id, size: sizes.tireSize(it.id), tread: num(it.tread, 1), hole: !!it.hole });
const rimOfItem = (it, sizes) => ({ id: it.id, size: sizes.rimSize(it.id) });
const wheelItemOf = (rimId, tire, air = 0) => ({ kind: 'stock', id: 'wheel', set: tire.id, tread: tire.tread, rim: rimId, hole: !!tire.hole, air });

/**
 * ctx { held, nearby (loose tires and rims on the floor by the machine, with uid), hasKit, hasAir, sizes }
 * -> { na:true } when the held thing is not for this machine
 *    { ok, why?, verb, seconds, apply: { held: item that replaces the held one | null, spawn: [items], consume: [uids], useKit } }
 */
export function planMachine({ held, nearby = [], hasKit = false, hasAir = false, sizes }) {
  if (!held) return { na: true };
  if (isWheelItem(held)) {
    const w = wheelOfItem(held, sizes);
    if (w.tire.hole) {
      const r = patch(w.tire, hasKit), verb = 'Patch the tire';
      return r.ok ? { ok: true, verb, seconds: r.seconds, apply: { held: { ...held, hole: false }, spawn: [], consume: [], useKit: true } } : { ok: false, verb, why: r.why };
    }
    if (w.air < FLAT) {
      const r = inflate(w, hasAir), verb = 'Inflate the tire';
      return r.ok ? { ok: true, verb, seconds: r.seconds, apply: { held: { ...held, air: 1 }, spawn: [], consume: [], useKit: false } } : { ok: false, verb, why: r.why };
    }
    const r = dismount(w), verb = 'Take the tire off the rim';
    return { ok: true, verb, seconds: r.seconds, apply: { held: { kind: 'rim', id: r.rim.id }, spawn: [{ kind: 'tire', id: r.tire.id, tread: r.tire.tread, hole: !!r.tire.hole }], consume: [], useKit: false } };
  }
  const isRim = held.kind === 'rim', isTire = held.kind === 'tire';
  if (!isRim && !isTire) return { na: true };
  const pool = nearby.filter(i => i.kind === (isRim ? 'tire' : 'rim'));
  const verb = 'Mount the tire on the rim';
  if (!pool.length) return { ok: false, verb, why: isRim ? 'Put a tire on the floor beside the machine.' : 'Put a rim on the floor beside the machine.' };
  const rimOf = o => rimOfItem(o, sizes), tireOf = o => tireOfItem(o, sizes);
  const pairs = pool.map(o => ({ o, c: isRim ? checkMount(rimOf(held), tireOf(o)) : checkMount(rimOf(o), tireOf(held)) }));
  const good = pairs.find(x => x.c.ok);
  if (!good) return { ok: false, verb, why: pairs[0].c.why };
  const tire = isRim ? tireOf(good.o) : tireOf(held), rimId = isRim ? held.id : good.o.id, m = mount(rimOf(isRim ? held : good.o), tire);
  return { ok: true, verb, seconds: m.seconds, apply: { held: wheelItemOf(rimId, tire, 0), spawn: [], consume: [good.o.uid], useKit: false } };
}
export { HOLD };
