// The El Cajon's parts as game data (PURE: no game state, loads under node). What it arrives as, what Dusty brings with it, what the rest costs.
// All numbers are PROPOSALs (prices, the pile); only "Dusty gifts the shell, it arrives in pieces, you rebuild it" is Chris's story (CANON? until he locks it).
import { CAJON } from '../rules/vehicles.js';

/** the price of buying each part new from the phone's Parts online (PROPOSAL). 'wheel' is the plain stock wheel, which fits the Bug as well. */
export const CAJON_PRICE = {
  ecEngine: 420, ecBattery: 85, ecHood: 110, ecGrille: 60, ecHeadlights: 70, ecFrontBumper: 90, ecRearBumper: 90, ecTailgate: 120,
  ecSeat: 100, ecDash: 90, ecSteering: 45, ecWindshield: 150, ecDoorL: 130, ecDoorR: 130, wheel: 55,
};
/** what Dusty's shell comes with: everything that is not in the pile, the engine and the wheels are still to find (PROPOSAL) */
export const GIFT_PILE = ['ecSeat', 'ecDash', 'ecSteering', 'ecHood', 'ecDoorL', 'ecDoorR'];

/** the parts you can order for it: [{ id, name, price }] in the order a mechanic would think of them (the four wheels are one entry: the stock wheel) */
export function cajonCatalog() {
  const parts = CAJON.slots.filter(s => !s.wheel).map(s => ({ id: s.id, name: `El Cajon ${s.name.toLowerCase()}`, price: CAJON_PRICE[s.id] }));
  return [...parts, { id: 'wheel', name: 'Stock wheel', price: CAJON_PRICE.wheel }];
}
export const cajonPriceOf = id => CAJON_PRICE[id] ?? 100;

/** the El Cajon as Dusty delivers it: a bare shell on blocks (every part off, no engine, no battery, no wheels) */
export const shellBuild = () => ({
  def: 'cajon', wheels: 'stock', rim: 'steel', colors: {}, parts: {},
  hidden: CAJON.slots.filter(s => s.piece).map(s => s.piece),
  stripped: CAJON.slots.filter(s => !s.piece).map(s => s.id),
});

/** where a point in the truck's own frame (lx + = its left, lz + = forward) is in the world */
export function toWorldFrame(pose, lx, lz) {
  const c = Math.cos(pose.h), s = Math.sin(pose.h);
  return { x: pose.x + lx * c + lz * s, z: pose.z - lx * s + lz * c };
}
/** where the pile of parts is set down: a row along the truck's left side, 1.7 m out, so the driver's door and the bed stay clear. -> [{ id, x, z, ry }] */
export function pileSpots(pose, ids = GIFT_PILE) {
  const n = ids.length;
  return ids.map((id, i) => { const p = toWorldFrame(pose, 2.9, (i - (n - 1) / 2) * 1.0); return { id, x: p.x, z: p.z, ry: pose.h + (i % 2 ? 0.5 : -0.4) }; });
}

/** when does Dusty make the offer? The first time you open his store once your Bug runs (he has seen you cramming parts into it) and he has not offered before.
 *  ctx: { dev, state (game.home.cajon), ownsBug, bugActive, bugRuns } */
export const shouldOffer = ctx => !ctx.dev && !ctx.state && !!ctx.ownsBug && !!ctx.bugActive && !!ctx.bugRuns;
export const GIFT_HOURS = 4;   // in-game hours from the offer to the truck turning up (PROPOSAL)
/** where in Walt's yard it is set down: garage-local metres, nose toward the garage (turned about half a turn) so the hood and engine are the part nearest the hoist.
 *  The garage's hoist and jack only reach 20 m from the garage (items.js inGarageZone), so the whole truck has to be well inside that. The dead fridge is at (9, 15), the shell spots at (-4..5, 13). */
export const YARD_SPOT = { lx: -7, lz: 12.5, ry: Math.PI + 0.3 };
export const HOIST_REACH = 20;   // same number as inGarageZone in items.js
