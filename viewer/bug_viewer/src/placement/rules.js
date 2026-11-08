// Placement rules: snapping, rotation, footprints, collision, stacking and the one-line "why not" that tints the preview red.
// PURE functions over the plain objects in types.js: no rendering, no game state, no three.js.
// Coords are surface-local metres (see types.js): x in [0, w], z in [0, d], grid lines at every multiple of the step from the corner.
// KNOWN SIMPLIFICATION: every footprint is treated as its axis-aligned bounding box. At 90-degree turns that is exact; a free-rotated item
// claims the AABB of its rotated rect, which is bigger than the item (conservative: it may refuse a spot that would really fit, never the reverse).

export const EPS = 1e-6;          // touching edges / equal heights within this count as touching, not overlapping
const TAU = Math.PI * 2, QUARTER = Math.PI / 2;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** nearest multiple of step (step <= 0 = no snap) */
export const snap = (value, step) => (step > 0 ? Math.round(value / step) * step : value);

/** rotation into [0, 2pi) */
export function normRot(rot) {
  const r = ((rot % TAU) + TAU) % TAU;
  return TAU - r < EPS ? 0 : r;   // 2pi - tiny would read as a full turn; call it 0
}
/** mode '90' = nearest quarter turn, 'free' = as-is. Both normalised to [0, 2pi). */
export function snapRot(rot, mode = '90') {
  if (mode === 'free') return normRot(rot);
  if (mode === '90') return normRot(Math.round(rot / QUARTER) * QUARTER);
  throw new Error(`snapRot: unknown mode ${mode}`);
}

/** axis-aligned [w, d] of a footprint turned by rot. Quarter turns are exact (cos/sin give 6e-17 noise); anything else is the AABB of the turned rect. */
export function rotatedFootprint([w, d], rot = 0) {
  const q = rot / QUARTER;
  if (Math.abs(q - Math.round(q)) < EPS) return Math.round(q) % 2 === 0 ? [w, d] : [d, w];
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  return [w * c + d * s, w * s + d * c];
}

/** snap one axis: put the item's LOW edge on a grid line (so its far edge lands on one too when the size is a whole number of steps),
 *  then keep it on the surface. This is what makes odd/even sizes behave: a 0.5 m item on a 0.5 grid sits in a cell (centre 0.25, 0.75...)
 *  and a 1.0 m item spans two (centre 0.5, 1.0...). A size that isn't a whole number of steps keeps its low edge on the grid. */
function snapAxis(c, size, span, step) {
  if (size > span) return span / 2;   // can't fit: centre it and let why() say "off the surface"
  const lo = step > 0 ? snap(c - size / 2, step) : c - size / 2;
  return clamp(lo, 0, span - size) + size / 2;   // clamping may land flush to the far edge off-grid when span isn't a whole number of steps; flush wins
}
/** snap an item centre for a footprint at rot onto the surface's grid. stepIndex picks from surface.gridSteps; null or 'free' = no snap, still clamped inside. */
export function snapPoint(surface, x, z, stepIndex, footprint, rot = 0) {
  const step = stepIndex === null || stepIndex === 'free' ? 0 : surface.gridSteps[clamp(stepIndex | 0, 0, surface.gridSteps.length - 1)];
  const [fw, fd] = rotatedFootprint(footprint, rot), [w, d] = surface.size;
  return { x: snapAxis(x, fw, w, step), z: snapAxis(z, fd, d, step) };
}

/** the AABB a placed item covers, surface-local */
export function bounds(pl, item) {
  const [fw, fd] = rotatedFootprint(item.footprint, pl.rot || 0);
  return { x0: pl.x - fw / 2, x1: pl.x + fw / 2, z0: pl.z - fd / 2, z1: pl.z + fd / 2 };
}
/** footprint fully on the surface: edges may sit exactly on the surface's edge */
export function insideSurface(surface, pl, item) {
  const b = bounds(pl, item), [w, d] = surface.size;
  return b.x0 >= -EPS && b.z0 >= -EPS && b.x1 <= w + EPS && b.z1 <= d + EPS;
}
/** do two AABBs share area? Shared edges/corners do NOT count, so things can sit flush side by side. */
export const overlaps = (a, b) => a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.z0 < b.z1 - EPS && b.z0 < a.z1 - EPS;

const wild = tags => tags.length === 0 || tags.includes('*');
/** does the surface take this item? [] or ['*'] takes anything; otherwise any shared tag */
export const accepts = (surface, item) => wild(surface.accepts) || item.tags.some(t => surface.accepts.includes(t));

/** may top sit on bottom? both stackable (tire on tire), or top.stackOn names one of bottom's tags ('*' = anything) */
export const canStackOn = (top, bottom) => (top.stackable && bottom.stackable) || top.stackOn.includes('*') || top.stackOn.some(t => bottom.tags.includes(t));
/** the y an item sits at when put on top of a placed one */
export const stackHeight = (bottomPl, bottomItem) => (bottomPl.y || 0) + bottomItem.height;

/** is e the placement being checked? Same id (a moved item's preview vs its old spot), else the very same object (placements without ids). */
const isSelf = (e, pl) => e === pl || (pl.id != null && e.id === pl.id);
const sameSurface = (pl, existing) => existing.filter(e => !isSelf(e, pl) && e.surface === pl.surface);
/** where an item would rest if dropped here: the highest top it can stack on under its footprint, else 0 (the surface). For the preview, before why(). */
export function restY(pl, item, existing, items) {
  let y = 0;
  for (const e of sameSurface(pl, existing)) {
    const it = items[e.item];
    if (it && overlaps(bounds(pl, item), bounds(e, it)) && canStackOn(item, it)) y = Math.max(y, stackHeight(e, it));
  }
  return y;
}

/** null if this placement is fine, else a short reason for the preview. Checks in the order a player would want to hear them. */
export function why(surface, item, pl, existing = [], items = {}) {
  if (!accepts(surface, item)) return "this surface doesn't take that";
  if (!insideSurface(surface, pl, item)) return 'off the surface';
  const y = pl.y || 0, top = y + item.height, b = bounds(pl, item);
  let support = null;
  for (const e of sameSurface(pl, existing)) {
    const it = items[e.item];
    if (!it) return 'unknown item in the way';            // bad save data: refuse rather than guess its size
    const eb = bounds(e, it);
    if (!overlaps(b, eb)) continue;
    const ey = e.y || 0, etop = ey + it.height;
    if (top <= ey + EPS) continue;                          // it's above us (we'd be under a stack): not our problem here
    if (y >= etop - EPS) {                                  // we're above it: only matters if we sit right on it
      if (Math.abs(y - etop) < EPS) {
        if (!surface.stackable) return "can't stack here";
        if (!canStackOn(item, it)) return "can't stack on that";
        // PROPOSAL: the centre must be over the thing below, so a stack can't hang mostly off its support
        if (pl.x < eb.x0 - EPS || pl.x > eb.x1 + EPS || pl.z < eb.z0 - EPS || pl.z > eb.z1 + EPS) return 'it would tip off';
        support = e;
      }
      continue;
    }
    return "something's in the way";                       // our height ranges cross: a real collision
  }
  if (y > EPS && !support) return 'nothing to sit on';
  return null;
}

// ---- clip together: put a can down next to a can and it lines up flush beside it, if there's room ----
export const CLIP_MAGNET = 0.12;   // PROPOSAL: edge-to-edge gap (metres) inside which a held item pulls flush to its own kind. Data: callers may pass their own.

/** do these two clip together? both opt in, and the same placeable or the same clip group */
export const clipsWith = (a, b) => !!a.clip && !!b.clip && (a.id === b.id || (typeof a.clip === 'string' && a.clip === b.clip));

/**
 * the spot to clip pl to, or pl itself (the SAME object) when nothing clips. PURE.
 * Looks at items of its own kind (clipsWith) on the same surface at the same height whose nearest side is within opts.magnet (edge to edge; a
 * small overlap counts too). The clipped spot copies that neighbour's rotation, sits flush against that side and lines up along it (centres,
 * or either end edge, whichever is nearest), and is only taken if why() passes there (there's room). Closest neighbour first; the first that
 * fits wins. Free placement only: with Shift held the grid wins, so callers don't call this then. Stacked tires etc. are untouched (they
 * don't opt in, and a different height never clips).
 * Works in the neighbour's own frame, so a neighbour turned by any angle gives a flush spot along ITS sides. (why() still checks AABBs, see the
 * note at the top: beside a neighbour at a non-quarter turn the AABBs overlap and the clip is refused. PROPOSAL: exact rect overlap later.)
 */
export function clipTo(surface, item, pl, existing = [], items = {}, opts = {}) {
  const magnet = opts.magnet ?? CLIP_MAGNET, y = pl.y || 0;
  if (!item.clip || !(magnet > 0)) return pl;
  const [hw2, hd2] = [item.footprint[0] / 2, item.footprint[1] / 2];
  const tries = [];
  for (const e of sameSurface(pl, existing)) {
    const it = items[e.item];
    if (!it || !clipsWith(item, it) || Math.abs((e.y || 0) - y) > EPS) continue;
    const r = e.rot || 0, c = Math.cos(r), s = Math.sin(r), dx = pl.x - e.x, dz = pl.z - e.z;
    // pl's centre in e's frame (three.js rotation.y: local (u, v) -> (u c + v s, -u s + v c), so the inverse is below)
    const u = dx * c - dz * s, v = dx * s + dz * c, hw = it.footprint[0] / 2, hd = it.footprint[1] / 2;
    // lining up along a side: centres, or the low ends, or the high ends level, whichever is closest to where it is now
    const line = (at, half, half2) => [0, half - half2, half2 - half].reduce((b, o) => (Math.abs(o - at) < Math.abs(b - at) ? o : b));
    const sides = [
      { gap: Math.abs(u) - (hw + hw2), across: Math.abs(v) < hd + hd2, u: Math.sign(u || 1) * (hw + hw2), v: line(v, hd, hd2) },   // beside its +-u side
      { gap: Math.abs(v) - (hd + hd2), across: Math.abs(u) < hw + hw2, u: line(u, hw, hw2), v: Math.sign(v || 1) * (hd + hd2) },   // beside its +-v side
    ];
    for (const sd of sides) {
      if (!sd.across || sd.gap > magnet || sd.gap < -magnet) continue;
      tries.push({ gap: Math.abs(sd.gap), x: e.x + sd.u * c + sd.v * s, z: e.z - sd.u * s + sd.v * c, rot: normRot(r), y: e.y || 0 });
    }
  }
  tries.sort((a, b) => a.gap - b.gap);
  for (const t of tries) {
    const cand = { ...pl, x: t.x, z: t.z, rot: t.rot, y: t.y };
    if (why(surface, item, cand, existing, items) === null) return cand;
  }
  return pl;
}
