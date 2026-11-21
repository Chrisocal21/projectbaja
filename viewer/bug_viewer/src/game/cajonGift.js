// Dusty's gift: the El Cajon shell, delivered to Walt's yard with a pile of parts (CANON? Chris proposed it Nov 21; he has not locked it into docs/CANON.md).
// He sees the Bug cannot haul much, so he gives you something to build out. It is a shell: you rebuild it from the pile, the phone and what you find.
import { game, save, say, transact } from './store.js';
import { newOrder } from './orderlogic.js';
import { isDriveable } from '../rules/restore.js';
import { BUG } from '../rules/vehicles.js';
import { SITES, toWorld } from '../worlds/county.js';
import { nextProjectUid, addProject } from './projects.js';
import { shellBuild, pileSpots, shouldOffer, GIFT_HOURS, YARD_SPOT } from './cajonParts.js';
import { spawnItem } from './items.js';

export const cajonState = () => game.home?.cajon || null;
/** the El Cajon project, once it has been delivered */
export const cajonProject = () => { const st = cajonState(); return st?.uid ? (game.projects || []).find(p => p.uid === st.uid) || null : null; };

/** called when you open Dusty's store: makes the offer the first time you arrive in a running Bug. Returns true if he just made it. */
export function dustyVisit() {
  const ctx = { dev: game.dev, state: cajonState(), ownsBug: game.owned.has('car:bug'), bugActive: game.active === 'bug' && !!game.build, bugRuns: !!game.build && isDriveable(BUG, game.build) };
  if (!shouldOffer(ctx)) return false;
  game.home = { ...game.home, cajon: { offered: true }, orders: [...(game.home.orders || []), newOrder('gift', 'cajon', GIFT_HOURS)] };
  save();
  say("Dusty: 'That Bug won't haul much. I've got a coupe-utility shell out back doing nothing — it's yours. I'll run it over to Walt's yard. Parts are in a pile; the rest you'll have to find.'");
  return true;
}

/** the order is due: the shell is set down in the yard with its pile of parts beside it */
export function giftArrives() {
  if (cajonProject()) return;
  const s = SITES.garage, [x, z] = toWorld(s, YARD_SPOT.lx, YARD_SPOT.lz), pose = { x, z, h: s.rot + YARD_SPOT.ry }, uid = nextProjectUid();
  transact(() => {   // the truck, its pile and the note that it came are ONE save write
    addProject({ uid, name: "'66 El Cajon", def: 'cajon', build: shellBuild(), pose });
    for (const p of pileSpots(pose)) spawnItem('stock', p.id, p.x, p.z, 0, p.ry);
    game.home = { ...game.home, cajon: { ...(game.home.cajon || {}), uid, delivered: true } };
  });
  say("Dusty dropped the El Cajon in Walt's yard — just a shell, with a pile of its parts beside it. The rest is on the phone's Parts online.");
}

// test hook (like window.__walk / __fleet): deliver the truck now, or see where the gift stands
if (typeof window !== 'undefined') window.__cajon = { deliver: giftArrives, offer: dustyVisit, state: cajonState, project: cajonProject };
