// Blueprints (docs/CRAFTING_PLAN.md, Phase 1): shop furniture you build by hand where it stands. Pure rules, no game state.
// You put a blueprint down (build mode), bring the materials to it (E puts in what you have), then hold left click with the right tool
// to work through its stages. Work can only go as far as the materials put in. Taking it down gives every piece back (canon #024).
// Amounts, times and stage names are PROPOSALs to tune by feel.

export const BLUEPRINTS = {
  shelfTires: { mats: { scrap: 4, wood: 3 }, tool: 'wrench', secs: 12, stages: ['Standing the uprights', 'Bolting on the angle iron', 'Laying the boards'] },
  shelfSupplies: { mats: { scrap: 3, wood: 4 }, tool: 'wrench', secs: 12, stages: ['Standing the uprights', 'Bolting on the angle iron', 'Laying the shelves'] },
  partsRack: { mats: { scrap: 3, wood: 3 }, tool: 'wrench', secs: 10, stages: ['Standing the frame', 'Bolting it square', 'Laying the boards'] },
};
export const MAT_ORDER = ['wood', 'scrap'];
const MAT_WORD = { wood: 'wood', scrap: 'scrap metal' };
export const matWord = m => MAT_WORD[m] || m;

export const isBlueprintable = id => !!BLUEPRINTS[id];
export const newBp = () => ({ got: {}, work: 0 });
const mats = id => BLUEPRINTS[id]?.mats || {};
const keys = id => MAT_ORDER.filter(m => mats(id)[m] > 0);

/** what is still to be put in: { mat: n } (only the ones short) */
export function missing(bp, id) {
  const out = {}; for (const m of keys(id)) { const n = mats(id)[m] - (bp?.got?.[m] || 0); if (n > 0) out[m] = n; } return out;
}
/** how far the work can go with what is in: 0..1, the share of all the pieces needed */
export function fedFrac(bp, id) {
  const all = keys(id).reduce((s, m) => s + mats(id)[m], 0); if (!all) return 1;
  return keys(id).reduce((s, m) => s + Math.min(mats(id)[m], bp?.got?.[m] || 0), 0) / all;
}
/** put in what you have toward what is missing → { bp, used: { mat: n }, n } (stock = your materials, e.g. game.mats) */
export function feed(bp, id, stock) {
  const miss = missing(bp, id), used = {}, got = { ...(bp?.got || {}) }; let n = 0;
  for (const m of Object.keys(miss)) { const k = Math.min(miss[m], Math.max(0, stock?.[m] || 0)); if (k > 0) { used[m] = k; got[m] = (got[m] || 0) + k; n += k; } }
  return { bp: { ...bp, got }, used, n };
}
/** "wood 1/3 · scrap metal 0/4" */
export const needText = (bp, id) => keys(id).map(m => `${matWord(m)} ${Math.min(mats(id)[m], bp?.got?.[m] || 0)}/${mats(id)[m]}`).join(' · ');
/** the full list of what it takes: "3 wood + 4 scrap metal" */
export const costText = id => keys(id).map(m => `${mats(id)[m]} ${matWord(m)}`).join(' + ');
/** the stage being worked on now */
export function stageOf(bp, id) {
  const s = BLUEPRINTS[id]?.stages || ['Building']; return s[Math.min(s.length - 1, Math.floor((bp?.work || 0) * s.length))];
}
/** dt seconds of work → { ok, bp, done, why } */
export function work(bp, id, dt) {
  const b = BLUEPRINTS[id]; if (!b) return { ok: false, why: 'Nothing to build here.' };
  const cap = fedFrac(bp, id), w = bp?.work || 0;
  if (w >= cap - 1e-6) return { ok: false, bp, why: cap <= 0 ? `Put the materials in first (E): ${needText(bp, id)}.` : `Out of materials for now: ${needText(bp, id)}. Press E to put more in.` };
  let next = Math.min(cap, w + dt / b.secs); if (cap - next < 1e-6) next = cap;   // (no float crumbs left below what is in)
  const done = next >= 1 - 1e-6;
  return { ok: true, done, bp: { ...bp, work: done ? 1 : next } };
}
/** what comes back when it is taken down: a blueprint gives back what was put in; a finished one (made = its materials) gives back all of it */
export const refundMats = p => (p?.bp ? { ...(p.bp.got || {}) } : p?.made && typeof p.made === 'object' ? { ...p.made } : {});
export const matsText = m => MAT_ORDER.filter(k => m?.[k] > 0).map(k => `${m[k]} ${matWord(k)}`).join(' + ');
