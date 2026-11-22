// DEV STAND-IN (the game is simulation-forward: players will sand, paint and buff panels by hand, see rules/finish.js).
import { finishMaterial } from './finishJobs.js';
const byPanel = new WeakMap();   // a panel state object -> its material (same object back until the panel changes)
export const panelMaterial = panel => finishOf({}, panel);
const finishOf = (m, panel) => { let out = byPanel.get(panel); if (!out) byPanel.set(panel, out = { ...m, ...finishMaterial(panel) }); return out; };
// Paint on parts. Bare fiberglass (material.unpainted) stays flat white until the player picks a body paint.
const cache = new WeakMap();   // part material -> { colour -> painted material }, so the same object comes back (no needless re-render)

/** The material a part is drawn with: bare fiberglass takes the player's body paint (glossy) once one is chosen. */
export function partMaterial(p, build, panel = null) {
  const m = p.material;
  if (!m?.unpainted) return m;
  if (panel) return finishOf(m, panel);
  const paint = build?.colors?.[p.paintAs || 'paint'];
  if (!paint) return m;
  let byColour = cache.get(m);
  if (!byColour) cache.set(m, byColour = new Map());
  let out = byColour.get(paint);
  if (!out) byColour.set(paint, out = { ...m, color: paint, metalness: 0.25, roughness: 0.38 });
  return out;
}
