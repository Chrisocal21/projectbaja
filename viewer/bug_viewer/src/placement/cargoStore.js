// Game glue for vehicle cargo placement (Stage 3, behind ?placement=1): reads/writes game.items and keeps the shared aim + held-item state.
// A placed item is an ordinary car item: { loc: 'car', veh, spot: 'grid', surf: surface id, x, z (surface-local centre), y (base above the
// surface), ry (turn about y), pose }. It shows in the Tab inventory with Take like any car item, and is saved with game.items.
// The cab / roof unit storage (F) is untouched: grid items have spot 'grid', so used() never counts them and spotFor() never picks the grid.
import { game, save, say } from '../game/store.js';
import { held, itemSize, nameOfItem, takeFromCar, canCarry } from '../game/items.js';
import { placement } from './types.js';
import { posed, stackHeight, bounds, overlaps, EPS } from './rules.js';
import { GAME_PLACEABLES, placeableIdFor } from './gameItems.js';

/** what the player is aiming at right now, written every frame by the cargo controller (VehicleCargo.jsx):
 *  null, or { mode: 'place', veh, surface, cand, reason, clipped, name } with an item in hand, or { mode: 'take', veh, uid, surface, name } */
export const aim = { cur: null };
/** how the held item is turned while aiming; reset when a different item is in hand. (pose stays null: a tire stands up only by snapping into a mount) */
const hold = { uid: null, rot: 0, pose: null };
export function holdOf(it) { if (hold.uid !== it.uid) Object.assign(hold, { uid: it.uid, rot: 0, pose: null }); return hold; }
export const keys = { shift: false };

export const pidOf = it => placeableIdFor(it, itemSize(it));
export const gridItems = veh => game.items.filter(i => i.loc === 'car' && i.spot === 'grid' && (i.veh || 'bug') === veh);
/** a grid item as the rules see it */
export const toPl = it => placement({ id: 'u' + it.uid, item: pidOf(it), surface: it.surf, x: it.x, z: it.z, rot: it.ry || 0, y: it.y || 0, pose: it.pose || null });
export const uidOfPl = id => +String(id).slice(1);

/** put the item in your hands down on a vehicle surface at the (already checked) candidate spot */
export function placeHeld(veh, surface, cand) {
  const it = held(); if (!it) return false;
  Object.assign(it, { loc: 'car', veh, spot: 'grid', surf: cand.surface, x: cand.x, z: cand.z, y: cand.y || 0, ry: cand.rot || 0 });
  if (cand.pose) it.pose = cand.pose; else delete it.pose;
  game.items = [...game.items]; save(); say(`${nameOfItem(it)} → ${surface.name.toLowerCase()}`);
  return true;
}

/** take a grid item back out (into the pack if small, else your hands) — not from under something sitting on it */
export function takeFromGrid(uid) {
  const it = game.items.find(i => i.uid === uid); if (!it || it.spot !== 'grid') return false;
  const pl = toPl(it), me = posed(GAME_PLACEABLES[pl.item], pl.pose), top = stackHeight(pl, me), b = bounds(pl, me);
  const onTop = gridItems(it.veh || 'bug').some(o => { if (o === it || o.surf !== it.surf) return false; const op = toPl(o); return Math.abs((op.y || 0) - top) < EPS && overlaps(b, bounds(op, posed(GAME_PLACEABLES[op.item], op.pose))); });
  if (onTop) { say("Something's sitting on it: take that off first."); return true; }
  if (!canCarry(it.kind, it.id)) { say(itemSize(it) === 1 ? 'Pack is full and your hands are busy.' : 'Your hands are full — right-click to put that down.'); return true; }
  delete it.surf; delete it.pose;
  takeFromCar(uid);   // existing path: pack or hands, clears x / z / y / ry / spot / veh
  return true;
}

export const turnHeld = (it, f) => { const h = holdOf(it); h.rot = f(h.rot); };
