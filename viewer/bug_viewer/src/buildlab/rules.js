// Build Sandbox placement rules. PURE (no React, no three, no game state).
// The grid rules themselves are the game's own (worlds/structures.js). What lives here is the thin wrapper the game keeps in
// game/home.js (structWhy / removeProp), re-implemented because home.js is stateful game code (it reads the live save):
//   - same order and wording as home.js structWhy: inBuilding (per placed garage, in that garage's own frame) -> conflicts -> supported
//   - same pick-up/remove rule as home.js removeProp: a foundation with things standing only on it can't come off
// Left out on purpose (they only exist on the real property): property line, camper, customer lot, driveway, cash.
// The garage itself is one placeable item here (garage.js); in the game it is fixed and the grid is built around it.
import { PIECES, snap, supported, conflicts, dependents } from '../worlds/structures.js';
import { normRy } from './format.js';
import { isGarage, inAnyGarage, garageWhy, snapGarage } from './garage.js';

export const WHY = {
  garage: "That's where the garage already is.",
  taken: 'Something is already built there.',
  support: 'Build a foundation slab there first.',
  dependents: 'Take the walls, floor and roof off that foundation first.',
};

/** snap a free point for a piece; `flip` turns an edge piece to face the other way (ry + 180 deg, same grid slot).
 *  For the garage, `flip` is the number of quarter turns. */
export function snapPiece(id, x, z, flip = false) {
  if (id === 'garage') return snapGarage(x, z, +flip || 0);
  const s = snap(id, x, z);
  return { x: s.x, z: s.z, ry: PIECES[id].kind === 'edge' && flip ? normRy(s.ry + Math.PI) : s.ry };
}

/** '' = can go here, else why not (game wording). `existing` may hold garages. */
export function placeWhy(id, x, z, ry, existing) {
  if (id === 'garage') return garageWhy({ id, x, z, ry }, existing);
  if (inAnyGarage(id, x, z, existing)) return WHY.garage;
  if (conflicts(id, x, z, ry, existing)) return WHY.taken;
  if (!supported(id, x, z, ry, existing)) return WHY.support;
  return '';
}

/** '' = this piece can be picked up / removed, else why not (nothing stands on a garage: only foundations hold pieces up) */
export function removeWhy(target, pieces) {
  if (isGarage(target)) return '';
  return dependents(target, pieces).length ? WHY.dependents : '';
}

/** a whole blueprint stamped at once: every piece checked against what is already built (support may also come from the stamp itself).
 *  → { why: '' | first reason, bad: [index into stamp] } */
export function stampWhy(stamp, existing) {
  const all = [...existing, ...stamp], bad = [];
  let why = '';
  stamp.forEach((p, i) => {
    let w = '';
    if (isGarage(p)) w = garageWhy(p, existing);
    else if (inAnyGarage(p.id, p.x, p.z, existing)) w = WHY.garage;
    else if (conflicts(p.id, p.x, p.z, p.ry, existing)) w = WHY.taken;
    else if (!supported(p.id, p.x, p.z, p.ry, all)) w = WHY.support;
    if (w) { bad.push(i); if (!why) why = `${isGarage(p) ? 'Garage' : PIECES[p.id].name}: ${w}`; }
  });
  if (!stamp.length) why = 'That blueprint is empty.';
  return { why, bad };
}
