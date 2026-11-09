// Game glue for tires on garage surfaces (Stage 4c): reads / writes game.items and holds the garage's own aim state. No React.
// A tire set down in the garage is an ordinary item: { loc: 'garage', spot: 'grid', surf: 'floor' | 'rack:<propUid>:<level>', x, z (surface-local centre),
// y (base above the surface), ry }. PROPOSAL: loc 'garage' (the same bucket as the shelf storage list) with spot 'grid', as vehicle cargo uses loc 'car' + spot 'grid'.
// Old saves have none of these fields, so nothing changes for them. items.js garageItems() leaves grid items out of the shelf list.
import { game, save, say } from '../game/store.js';
import { held, nameOfItem, canCarry, takeFromGarage } from '../game/items.js';
import { GAME_PLACEABLES } from './gameItems.js';
import { posed, stackHeight, bounds, overlaps, EPS } from './rules.js';
import { garageSurfaces, garagePl, gridOnly, dropRackItems } from './garageSurfaces.js';

/** what the player is aiming at in the garage right now (written every frame by GarageCargo.jsx): null, { mode: 'place', veh: 'garage', surface, cand, reason, ... } or { mode: 'take', uid, ... } */
export const garageAim = { cur: null };
export const garageGrid = () => gridOnly(game.items);

export function placeHeldGarage(surface, cand) {
  const it = held(); if (!it) return false;
  Object.assign(it, { loc: 'garage', spot: 'grid', surf: cand.surface, x: cand.x, z: cand.z, y: cand.y || 0, ry: cand.rot || 0 });
  delete it.pose; game.items = [...game.items]; save(); say(`${nameOfItem(it)} → ${surface.name.toLowerCase()}`);
  return true;
}

/** take a tire back off the floor / rack (into the pack if it fits, else your hands); not from under another tire */
export function takeFromGarageGrid(uid) {
  const it = game.items.find(i => i.uid === uid); if (!it || it.spot !== 'grid' || it.loc !== 'garage') return false;
  const T = GAME_PLACEABLES[garagePl(it).item], pl = garagePl(it), top = stackHeight(pl, T), b = bounds(pl, T);
  if (garageGrid().some(o => o !== it && o.surf === it.surf && Math.abs((o.y || 0) - top) < EPS && overlaps(b, bounds(garagePl(o), GAME_PLACEABLES[garagePl(o).item])))) { say("Something's sitting on it: take that off first."); return true; }
  if (!canCarry(it.kind, it.id)) { say('Your hands are full — right-click to put that down.'); return true; }
  delete it.surf; delete it.pose;
  takeFromGarage(uid);   // existing path: pack or hands, clears x / z / y / ry / spot
  return true;
}

/** a rack is about to be sold or stored: its tires fall to the floor (PROPOSAL, see dropRackItems). Call BEFORE the prop is removed from game.props. */
export function dropRackTires(propUid, props, defs, G, groundY) {
  const surfaces = garageSurfaces(props, defs, G, groundY), moves = dropRackItems(game.items, propUid, surfaces, G, groundY);
  if (!moves.length) return 0;
  const by = new Map(moves.map(m => [m.uid, m.patch]));
  game.items = game.items.map(i => { const p = by.get(i.uid); if (!p) return i; const n = { ...i, ...p }; delete n.spot; if (!p.surf) delete n.surf; if (p.surf) n.spot = 'grid'; delete n.pose; return n; });
  save(); say(`${moves.length === 1 ? 'A tire fell' : `${moves.length} tires fell`} to the floor`);
  return moves.length;
}
