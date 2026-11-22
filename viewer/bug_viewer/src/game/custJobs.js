// Customer jobs that need real hands-on work (pure rules; jobs.js wires them in). PROPOSAL numbers.
// The flat-wheel job: a customer leaves a punctured wheel on the lot. You carry it to the tire machine, patch it (plug kit)
// and inflate it (compressor), then hand it back. The item is a normal wheel plus `cust: true`, so the tire machine treats it like any other.
export const CUST_WHEEL_TREAD = [0.35, 0.7];
/** the customer's wheel: punctured and flat. rng() -> [0,1) */
export const custWheel = (rng = Math.random) => ({ kind: 'stock', id: 'wheel', set: 'stock', tread: +(CUST_WHEEL_TREAD[0] + rng() * (CUST_WHEEL_TREAD[1] - CUST_WHEEL_TREAD[0])).toFixed(2), hole: true, air: 0.05, cust: true });
export const isCustWheel = it => !!it && it.kind === 'stock' && it.id === 'wheel' && !!it.cust;
/** is a customer's wheel ready to hand back? */
export function custWheelReady(it) {
  if (!it) return { ok: false, why: "Their wheel is the one on the lot floor: pick it up, fix it on the tire machine, bring it back." };
  if (it.hole) return { ok: false, why: 'Their wheel still has a hole: patch it on the tire machine (you need a plug kit).' };
  if (!(it.air >= 0.9)) return { ok: false, why: 'Their wheel is still flat: inflate it at the tire machine (you need the air compressor).' };
  return { ok: true };
}
