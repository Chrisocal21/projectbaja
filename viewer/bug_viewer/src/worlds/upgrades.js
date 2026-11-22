// The upgrade track: Walt's place gets better in STAGES, in four tracks (Garage, Office, Camper, Property). Bought with cash, never taken down,
// separate from the building kit (build mode is decorations only). PURE data + the stage maths: no game state, no imports but lot.js, so it
// tests like structures.js and lot.js do. game/upgrades.js adds the stateful half (buy, what you own).
//
// A stage has an id, a name, a price, a note and `needs` (stage ids that must be owned before it can be bought). Some stages are older than this
// catalog and keep their old save keys (`store`), so saves from before the staged track still read correctly:
//   home.upgrades.lift2 / .parking (levels) / .office,  home.trailer (list of ids),  and for new stages  home.stages (list of ids).
// Effects (PROPOSAL numbers) come from `effectsOf(owned)`: faster hold-to-fit, faster order delivery, a bigger pack.
import { PARKING_LEVELS, rowsAtLevel } from './lot.js';

export const TRACKS = [
  { id: 'garage', name: 'Garage', blurb: 'The workshop: better tools and more bays.' },
  { id: 'office', name: 'Office', blurb: 'The front office: suppliers answer faster and there is more floor.' },
  { id: 'camper', name: 'Camper', blurb: "Grandpa's 1966 trailer: fix it up to live in." },
  { id: 'property', name: 'Property', blurb: 'The yard and the customer lot.' },
];

const L = (track, id, name, price, note, extra = {}) => ({ track, id, name, price, note, needs: [], ...extra });
export const STAGES = [
  // Garage
  L('garage', 'airTools', 'Air tools', 900, 'An air line and impact wrenches: parts come off and go on 30% faster.', { effect: 'holdScale' }),
  L('garage', 'lift2', 'Second car lift', 2200, 'A second two-post lift, bolted down beside the first: two cars up at once.', { store: { key: 'upgrades', name: 'lift2', level: 1 } }),
  L('garage', 'proTools', 'Pro tool wall', 2400, 'A full set of pro tools: half the time at the car.', { needs: ['airTools', 'lift2'], effect: 'holdScale' }),
  // the garage itself grows backward (worlds/garageLevels.js); prices are PROPOSAL
  L('garage', 'garage1', 'Working shop (level 1)', 6000, 'The back wall comes down: a steel-framed extension with 4 bays and a bench wall.', { needs: ['lift2'] }),
  L('garage', 'garage2', 'Pro shop (level 2)', 15000, 'Epoxy floor, bright light rows, 6 bays.', { needs: ['garage1', 'proTools'] }),
  L('garage', 'garage3', 'Race warehouse (level 3)', 38000, 'The full race-team floor: 10 bays and wall racks for whole cars.', { needs: ['garage2'] }),
  // Office
  L('office', 'phoneLine', 'Business phone line', 500, 'A real line and a supplier contact: orders arrive in 2 hours, not 3.', { effect: 'orderHours' }),
  L('office', 'annex', 'Office back room', 1600, 'A back room off the office, through a cut doorway in its west wall: more floor to work with.', { needs: ['phoneLine'], store: { key: 'upgrades', name: 'office', level: 1 } }),
  L('office', 'supplierAccount', 'Supplier account', 1500, 'A standing account with the suppliers: orders arrive in 1 hour.', { needs: ['annex'], effect: 'orderHours' }),
  // the office grows into a wing west of the old office (worlds/office.js WING; docs/EXPANSION_PLAN.md); price is PROPOSAL
  L('office', 'office1', 'Customer office (level 1)', 3500, 'A new wing: customer door, waiting seats, a service counter in a widened doorway, and the back room.', { needs: ['supplierAccount'] }),
  // Camper (older stages keep home.trailer; they unlock in the order you would fix a trailer up)
  L('camper', 'camper-roof', 'Patch the roof', 250, 'Stops the leaks. Then you can sleep here (skips ahead to the next customer).', { store: { key: 'trailer', name: 'roof' } }),
  L('camper', 'camper-porch', 'Build a porch', 220, 'Wooden deck and steps.', { needs: ['camper-roof'], store: { key: 'trailer', name: 'porch' } }),
  L('camper', 'camper-paint', 'Fresh paint', 180, 'Cream and turquoise, like it was in 1966.', { needs: ['camper-roof'], store: { key: 'trailer', name: 'paint' } }),
  L('camper', 'camper-ac', 'Window A/C unit', 380, 'It is the desert.', { needs: ['camper-roof'], store: { key: 'trailer', name: 'ac' } }),
  L('camper', 'camper-lights', 'String lights', 60, 'For the porch. Purely morale.', { needs: ['camper-porch'], store: { key: 'trailer', name: 'lights' } }),
  L('camper', 'camper-locker', 'Gear locker', 300, 'A steel locker by the door: two more slots in your pack.', { needs: ['camper-roof'], effect: 'packBonus', store: { key: 'trailer', name: 'locker' } }),
  // Property
  L('property', 'parking1', 'Customer lot, first expansion', 650, `+2 bays (${rowsAtLevel(1) * 2} total)`, { store: { key: 'upgrades', name: 'parking', level: 1 } }),
  L('property', 'parking2', 'Customer lot, second expansion', 950, `+2 bays (${rowsAtLevel(2) * 2} total)`, { needs: ['parking1'], store: { key: 'upgrades', name: 'parking', level: 2 } }),
];
if (PARKING_LEVELS !== 2) throw new Error('upgrades.js: the property stages assume 2 parking levels');
export const stageById = Object.fromEntries(STAGES.map(s => [s.id, s]));
export const stagesOf = track => STAGES.filter(s => s.track === track);

/** the set of stage ids a save owns: new stages from home.stages, older ones from their old keys */
export function ownedStages(home = {}) {
  const out = new Set(home.stages || []), u = home.upgrades || {}, trailer = home.trailer || [];
  for (const s of STAGES) {
    const st = s.store; if (!st) continue;
    if (st.key === 'upgrades' && (u[st.name] || 0) >= st.level) out.add(s.id);
    if (st.key === 'trailer' && trailer.includes(st.name)) out.add(s.id);
  }
  return out;
}
/** why a stage cannot be bought right now ('' = it can). owned: Set of stage ids. */
export function whyNot(id, owned, cash, free = false) {
  const s = stageById[id]; if (!s) return 'Unknown upgrade.';
  if (owned.has(id)) return 'Already built.';
  const need = s.needs.filter(n => !owned.has(n));
  if (need.length) return `First: ${need.map(n => stageById[n].name).join(' and ')}.`;
  if (!free && cash < s.price) return `Not enough cash ($${s.price}).`;
  return '';
}
/** the next stage in a track that can be bought (or the first not yet owned), or null when the track is done */
export const nextStage = (track, owned) => stagesOf(track).find(s => !owned.has(s.id) && s.needs.every(n => owned.has(n))) || stagesOf(track).find(s => !owned.has(s.id)) || null;

export const ORDER_HOURS_BASE = 3;
/** what the owned stages do (PROPOSAL numbers) */
export function effectsOf(owned) {
  return {
    orderHours: owned.has('supplierAccount') ? 1 : owned.has('phoneLine') ? 2 : ORDER_HOURS_BASE,
    holdScale: owned.has('proTools') ? 0.5 : owned.has('airTools') ? 0.7 : 1,   // multiplies how long the hold bar takes
    packBonus: owned.has('camper-locker') ? 2 : 0,
  };
}
