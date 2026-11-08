// The sandbox's build catalogue = the game's own (game/home.js BUILD_ITEMS / buildById / BUILD_CATS / hotbar), trimmed to what the
// .baja-build.json format can hold: the building pieces (Structure), plus the whole garage as one more placeable item.
// Fences, props, tools and decor aren't in the format yet, so they are taken out of the shared arrays IN MEMORY on this page only
// (home.js itself is untouched; this page never saves). Import this before anything renders the build menu.
import { BUILD_ITEMS, BUILD_CATS, buildById } from '../game/home.js';
import { game } from '../game/store.js';
import { GARAGE_ID, GARAGE_NAME } from './garage.js';

const GARAGE_ITEM = { id: GARAGE_ID, name: GARAGE_NAME, price: 0, zone: 'yard', r: 0, cat: 'Structure', garage: true, note: "The whole original building, as in the game. Snaps so its walls sit on the building grid. R turns it 90°. Build onto it, or away from it." };
const kept = BUILD_ITEMS.filter(b => b.struct);
BUILD_ITEMS.splice(0, BUILD_ITEMS.length, GARAGE_ITEM, ...kept);
BUILD_CATS.splice(0, BUILD_CATS.length, 'Structure');
buildById[GARAGE_ID] = GARAGE_ITEM;

// the shared game store: a fresh, never-saved session. dev = true makes store.js skip its save write; storageGuard.js drops it anyway.
game.dev = true; game.cash = 999999; game.onFoot = true; game.paused = false; game.buildMode = null; game.props = [];
game.settings = { ...game.settings, creative: false, crosshair: true, keyHints: true };
export const ITEM_IDS = BUILD_ITEMS.map(b => b.id);
