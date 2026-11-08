// The upgrade track's catalog: levelled garage and yard upgrades, bought with cash, separate from the building kit
// (structures.js). A build piece is placed by hand on the grid; an upgrade is a level bought once that changes the
// property itself (more lift bays, more parking). PURE data + price/level math — no game state, no imports — so it
// tests the same way structures.js and lot.js do. game/upgrades.js adds the stateful half (buy, current level).
import { PARKING_LEVELS, rowsAtLevel } from './lot.js';

export const UPGRADES = [
  { id: 'lift2', name: 'Second car lift', zone: 'garage', levels: 1, prices: [2200],
    notes: ['A second two-post lift, bolted down beside the first — two cars up at once.'] },
  { id: 'parking', name: 'Parking lot expansion', zone: 'yard', levels: PARKING_LEVELS, prices: [650, 950],
    notes: Array.from({ length: PARKING_LEVELS }, (_, i) => `+2 bays (${rowsAtLevel(i + 1) * 2} total)`) },
  { id: 'office', name: 'Office expansion', zone: 'garage', levels: 1, prices: [1600],
    notes: ['A back room off the office, through a cut doorway in its west wall — more floor to work with.'] },
];
export const upgradeById = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
export const isMaxed = (id, level) => level >= upgradeById[id].levels;
/** the price of the next level, or null when it's already maxed */
export const nextPrice = (id, level) => (isMaxed(id, level) ? null : upgradeById[id].prices[level]);
/** what the next level does, or null when it's already maxed */
export const nextNote = (id, level) => (isMaxed(id, level) ? null : upgradeById[id].notes[level]);
