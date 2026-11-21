// A wheel is a RIM with a TIRE on it (PURE: no React, no game state, loads under node). Repair loop at the tire machine:
//   dismount: tire off the rim -> two things in your hands   mount: a rim and a tire -> one wheel
//   patch a punctured tire, inflate a wheel with the compressor.
// PROPOSAL (design guesses): size classes, hold times and the air thresholds. Not saved anywhere yet.
// A wheel:  { rim: { id, size }, tire: { id, size, tread, hole } | null, air }   size = rim diameter class in inches (15, 16, 17)
export const SIZES = [15, 16, 17];
export const FLAT = 0.3;   // air below this and the wheel counts as flat: it will not roll right
/** hold-bar seconds for each job at the machine (PROPOSAL) */
export const HOLD = { dismount: 2.0, mount: 2.5, patch: 1.5, inflate: 2.0 };

export const makeWheel = ({ rim, tire = null, air = tire ? 1 : 0 }) => ({ rim: { ...rim }, tire: tire ? { tread: 1, hole: false, ...tire } : null, air });
export const isFlat = w => !!w.tire && (w.tire.hole || w.air < FLAT);
export const label = w => `${w.tire ? `${w.tire.id} on ` : 'bare '}${w.rim.id} rim (${w.rim.size}")`;

/** can this tire go on this rim? */
export function checkMount(rim, tire) {
  if (!rim) return { ok: false, why: 'You need a rim to mount a tire on.' };
  if (!tire) return { ok: false, why: 'You need a tire to mount.' };
  if (rim.size !== tire.size) return { ok: false, why: `That tire is for a ${tire.size}" rim; this rim is ${rim.size}".` };
  return { ok: true };
}
/** mount a tire on a bare rim -> a new wheel (air starts at 0: you still have to inflate it) */
export function mount(rim, tire) {
  const c = checkMount(rim, tire); if (!c.ok) return c;
  return { ok: true, wheel: makeWheel({ rim, tire, air: 0 }), seconds: HOLD.mount };
}
/** take the tire off a wheel -> { rim (bare), tire } */
export function dismount(w) {
  if (!w.tire) return { ok: false, why: 'There is no tire on this rim.' };
  return { ok: true, rim: { ...w.rim }, tire: { ...w.tire }, seconds: HOLD.dismount };
}
/** patch a hole (needs a patch kit) */
export function patch(tire, hasKit) {
  if (!tire.hole) return { ok: false, why: 'There is no hole to patch.' };
  if (!hasKit) return { ok: false, why: 'You need a tire plug kit.' };
  return { ok: true, tire: { ...tire, hole: false }, seconds: HOLD.patch };
}
/** inflate to full (needs the compressor). A punctured tire will not hold air: patch it first. */
export function inflate(w, hasCompressor) {
  if (!w.tire) return { ok: false, why: 'There is no tire to inflate.' };
  if (w.tire.hole) return { ok: false, why: 'It has a hole in it: patch it first.' };
  if (!hasCompressor) return { ok: false, why: 'You need the air compressor.' };
  return { ok: true, wheel: { ...w, air: 1 }, seconds: HOLD.inflate };
}
/** can the car roll on it? (what fitting a wheel to the car should check) */
export function checkRoll(w) {
  if (!w.tire) return { ok: false, why: 'A bare rim has no tire.' };
  if (w.tire.hole) return { ok: false, why: 'The tire is punctured.' };
  if (w.air < FLAT) return { ok: false, why: 'The tire is flat: inflate it first.' };
  return { ok: true };
}
/** the rim size class a catalog tire set takes, from its diameter in metres (PROPOSAL: bigger tire, bigger rim) */
export const sizeFromDia = dia => (dia < 0.7 ? 15 : dia < 0.9 ? 16 : 17);

/** rim size class by style (PROPOSAL: steel and retro rims are 15 inch like the Bug; trophy, beadlock and crawler are the big 17 inch off-road ones; the rest are 16) */
const BIG = new Set(['beadlock', 'crawler', 'trophy']), SMALL = new Set(['steel', 'retro']);
export const rimSizeOf = id => (SMALL.has(id) ? 15 : BIG.has(id) ? 17 : 16);
