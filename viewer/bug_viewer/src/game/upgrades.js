// Stateful half of the staged upgrade track (worlds/upgrades.js has the catalog and the maths, tested there).
// Older stages keep their old save keys so saves from before the staged track still work: home.upgrades.{lift2,parking,office}, home.trailer.
import { game, addCash, save, say } from './store.js';
import { creative } from './settings.js';
import { WING } from '../worlds/office.js';
import { TRACKS, STAGES, stageById, stagesOf, ownedStages, whyNot, nextStage as nextStageIn, effectsOf } from '../worlds/upgrades.js';

export { TRACKS, STAGES, stageById, stagesOf };
/** the old level for the keys the world code reads (lot size, lift, office annex): unchanged */
export const upgradeLevel = id => game.home?.upgrades?.[id] || 0;
export const owned = () => ownedStages(game.home);
export const hasStage = id => owned().has(id);
export const stageWhy = id => whyNot(id, owned(), game.cash, creative());
export const nextStage = track => nextStageIn(track, owned());
/** what the owned stages do right now: { orderHours, holdScale, packBonus } */
export const effects = () => effectsOf(owned());

const ANNEX_DOOR = 'OW3';   // openings.js segment for the office annex's doorway (worlds/office.js ANNEX)
export function buyStage(id) {
  const s = stageById[id], why = stageWhy(id); if (!s) return false; if (why) { say(why); return false; }
  const free = creative(); if (!free) addCash(-s.price, `Upgrade: ${s.name}`);
  const st = s.store, home = { ...game.home };
  if (st?.key === 'upgrades') home.upgrades = { ...(home.upgrades || {}), [st.name]: Math.max(st.level, (home.upgrades || {})[st.name] || 0) };
  else if (st?.key === 'trailer') home.trailer = [...(home.trailer || []), st.name];
  else home.stages = [...(home.stages || []), id];
  if (id === 'annex') home.openings = [...new Set([...(home.openings || []), ANNEX_DOOR])];
  if (id === 'office1') home.openings = [...new Set([...(home.openings || []), ...WING.openings])];   // the doorway widens to 4 m
  game.home = home;
  if (id === 'annex' || id === 'office1' || id === 'office2' || id === 'office3' || /^garage[123]$/.test(id)) game.propsV = (game.propsV || 0) + 1;   // the annex changes wall collision (propObstacles' cache, and DriveWorld's obstacle-cache key, both key off propsV)
  if (/^garage[123]$/.test(id)) import('./home.js').then(m => m.ensureWallItemsOnWalls());   // the old back wall opens: its pegboard moves to the bench wall
  save(); say(`Upgrade: ${s.name}${free ? ' (creative: free)' : ` (−$${s.price})`}`);
  return true;
}
