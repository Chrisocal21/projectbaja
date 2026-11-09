// Real tires (PURE: loads under node). Every tire in the shop is an ordinary item you can pick up, rack and fit:
//   { kind: 'stock', id: 'wheel', set: 'stock', tread } (one loose wheel) or { kind: 'wheel', id: <set> } (a set).
// `tread` is the rubber left, 0..1. An item with no `tread` (every tire from before this existed) counts as full tread.
// PROPOSAL: the labels' cut-offs, and that tread is only shown for now (no grip penalty yet; the fitted car does not remember it).
export const BALD = 0.15;
export const treadOf = it => (Number.isFinite(it?.tread) ? Math.max(0, Math.min(1, it.tread)) : 1);
export const treadLabel = t => (t < BALD ? 'bald' : t < 0.4 ? 'worn' : t < 0.75 ? 'half-worn' : 'good tread');
/** "name" with the tread appended when the item tracks it */
export const withTread = (name, it) => (Number.isFinite(it?.tread) ? `${name} (${treadLabel(treadOf(it))}, ${Math.round(treadOf(it) * 100)}% tread)` : name);

/** tire size { dia, width } in metres from a catalog wheel set (tire sets: baseRadius + halfWidth; stock / prebuilt: the first mount), or null when it has none */
export function tireSizeOf(def) {
  if (!def) return null;
  let r = def.baseRadius, hw = def.halfWidth;
  if (!(r > 0)) {
    const m = def.mounts && (def.mounts['*'] || Object.values(def.mounts)[0]), w = m && (m.FL || Object.values(m)[0]);
    r = w?.radius; hw = w?.halfWidth;
  }
  return r > 0 && hw > 0 ? { dia: +(2 * r).toFixed(3), width: +(2 * hw).toFixed(3) } : null;
}

/** The worn tires lying around Walt's garage (where the decorative tire stacks and the pile of bald tires used to be). Garage-local floor spots around
 *  (cx, cz). PROPOSAL: four loose stock wheels, 8-32% tread. rng() -> [0,1). */
export function wornTires(rng = Math.random, cx = -5.2, cz = 4.6) {
  const base = [0.08, 0.12, 0.22, 0.3];
  return base.map((t, i) => {
    const a = i * Math.PI / 2 + 0.5;
    return { kind: 'stock', id: 'wheel', set: 'stock', tread: +Math.min(1, t + (rng() - 0.5) * 0.04).toFixed(2), lx: cx + Math.cos(a) * 0.9, lz: cz + Math.sin(a) * 0.9, ry: rng() * 6 };
  });
}
