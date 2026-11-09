// Game items -> placeables (PURE). A game item is { kind, id, ... } (game/items.js); the rules only know footprints, so every item maps onto
// one of a few placeables: a loose tire, or a crate of its size tier. PROPOSALS: the crate sizes are the cardboard crates the game already
// draws for each size tier (game/Items.jsx DIM, copied here so this stays pure); the tire is the Bug's own (VEH_001 B_FLWheel: 0.69 m across,
// 0.27 m wide), used for every loose tire until tires carry their own sizes.
import { placeable, byId } from './types.js';

/** [w, h, d] per size tier, = game/Items.jsx DIM */
export const CRATE_DIM = { 1: [0.34, 0.3, 0.4], 2: [0.5, 0.4, 0.62], 3: [0.72, 0.5, 0.86], 4: [0.9, 0.62, 1.05] };
export const TIRE_SIZE = { dia: 0.69, width: 0.27 };

/** a tire lies flat (and stacks), or stands upright: thin across x, rolling along z, as tall as it is round; upright tires clip side by side */
const tireOf = (id, { dia, width }) => placeable({
  id, footprint: [dia, dia], height: width, tags: ['tire'], stackable: true,
  poses: { upright: { footprint: [width, dia], height: dia, stackable: false, clip: 'tireUpright' } },
});
export const TIRE = tireOf('tire', TIRE_SIZE);
export const CRATES = [1, 2, 3, 4].map(n => placeable({ id: `crate${n}`, footprint: [CRATE_DIM[n][0], CRATE_DIM[n][2]], height: CRATE_DIM[n][1], tags: [`size${n}`], clip: 'crate' }));
export const GAME_PLACEABLES = byId([TIRE, ...CRATES]);
export const isTirePid = id => typeof id === 'string' && (id === 'tire' || id.startsWith('tire:'));
/** tires carry their own size: { <wheel set id>: { dia, width } } (from the catalog, see game/tires.js tireSizeOf) becomes the placeable 'tire:<set>'. Sets without data use 'tire'. */
export function registerTireSizes(sizes) { for (const [set, sz] of Object.entries(sizes)) if (sz) GAME_PLACEABLES[`tire:${set}`] = tireOf(`tire:${set}`, sz); }

export const isTire = it => it.kind === 'wheel' || (it.kind === 'stock' && it.id === 'wheel');
/** which placeable a game item is, or null if it can't be set down on a cargo surface (a body shell). size = items.js itemSize(it). */
export function placeableIdFor(it, size) {
  if (isTire(it)) { const id = `tire:${it.kind === 'wheel' ? it.id : it.set || 'stock'}`; return GAME_PLACEABLES[id] ? id : 'tire'; }
  return size >= 1 && size <= 4 ? `crate${size}` : null;
}
/** the poses a held item can cycle through (T): tires lie flat or stand up; crates have one */
export const posesOf = id => [null, ...Object.keys(GAME_PLACEABLES[id]?.poses || {})];
