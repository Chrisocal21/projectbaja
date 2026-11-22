// DEV STAND-IN (the game is simulation-forward: players will sand, paint and buff panels by hand, see rules/finish.js).
// Paint on parts. Bare fiberglass (material.unpainted) stays flat white until the player picks a body paint.
const cache = new WeakMap();   // part material -> { colour -> painted material }, so the same object comes back (no needless re-render)

/** The material a part is drawn with: bare fiberglass takes the player's body paint (glossy) once one is chosen. */
export function partMaterial(p, build) {
  const m = p.material;
  if (!m?.unpainted) return m;
  const paint = build?.colors?.[p.paintAs || 'paint'];
  if (!paint) return m;
  let byColour = cache.get(m);
  if (!byColour) cache.set(m, byColour = new Map());
  let out = byColour.get(paint);
  if (!out) byColour.set(paint, out = { ...m, color: paint, metalness: 0.25, roughness: 0.38 });
  return out;
}
