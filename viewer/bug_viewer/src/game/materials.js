// The shop's four materials (docs/CRAFTING_PLAN.md, Phase 2): wood, scrap metal, steel and fasteners. Pure rules, no game state.
// game.mats is the tally: { wood, scrap, steel, bolts } (physical stacks come in Phase 4). Every amount and time here is a PROPOSAL to tune by feel.

export const MAT_ORDER = ['wood', 'scrap', 'steel', 'bolts'];
const MAT_WORD = { wood: 'wood', scrap: 'scrap metal', steel: 'steel', bolts: 'fasteners' };
export const matWord = m => MAT_WORD[m] || m;
/** "3 wood + 4 scrap metal" (only what is there, in a fixed order) */
export const matsText = m => MAT_ORDER.filter(k => m?.[k] > 0).map(k => `${m[k]} ${matWord(k)}`).join(' + ');
/** the whole tally on one line, zeros too: "wood 0 · scrap metal 3 · steel 1 · fasteners 4" */
export const tallyText = m => MAT_ORDER.map(k => `${matWord(k)} ${m?.[k] || 0}`).join(' · ');
/** a new tally with these added (sign -1 takes them away; never below zero) */
export function addMats(stock, add, sign = 1) {
  const out = { ...(stock || {}) }; for (const [m, n] of Object.entries(add || {})) out[m] = Math.max(0, (out[m] || 0) + sign * n); return out;
}
/** what is short of a cost: { mat: n } (empty = you have enough) */
export function shortOf(stock, cost) {
  const out = {}; for (const m of MAT_ORDER) { const n = (cost?.[m] || 0) - (stock?.[m] || 0); if (n > 0) out[m] = n; } return out;
}

/** a pack of one material bought over a counter: { n pieces, name } (Dusty's; the phone's bundles are in web.js) */
export const MAT_PACKS = { wood: { n: 2, name: 'lumber' }, steel: { n: 2, name: 'steel offcuts' }, bolts: { n: 4, name: 'a box of bolts' } };

/** cutting scrap into steel with the angle grinder (the one "refining" step). At Walt's workbench for now; the grinder station takes it over in Phase 3 */
export const CUT = { tool: 'grinder', take: { scrap: 2 }, give: { steel: 1 }, secs: 3 };
/** why you cannot cut right now ('' = you can). has: { tool: id in your hands, power: the garage lights are on, mats } */
export function cutWhy({ tool, power, mats } = {}) {
  if (tool !== CUT.tool) return 'Hold the angle grinder to cut scrap into steel.';
  if (!power) return 'The grinder needs power: flip the main breaker.';
  const short = shortOf(mats, CUT.take); if (Object.keys(short).length) return `Not enough scrap metal to cut: ${mats?.scrap || 0}/${CUT.take.scrap}.`;
  return '';
}

/** loose junk (items of kind 'junk') you can take apart: hold left click with the tool. power: the tool plugs in, so only inside the garage's reach */
export const SALVAGE = {
  crate: { tool: 'wrench', secs: 3, give: { wood: 3, bolts: 2 }, verb: 'Pulling the crate apart' },
  drum: { tool: 'grinder', secs: 4, give: { scrap: 3 }, verb: 'Cutting up the drum' },
};
