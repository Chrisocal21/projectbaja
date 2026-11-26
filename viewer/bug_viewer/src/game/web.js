// The phone's Internet as a browser (Chris, Nov 27: "think GTA phone"): a home page of sites, each its own store with its own sellers.
// Pure data and rules (no game state, no React) so it can be tested; BrowserApp.jsx draws it and webShop.js buys from it.
// Every site name, address and price here is a PROPOSAL until Chris names them. No invented people: private sellers are "a seller in <real town>".
//
//   parts      Parts Online: new parts, tires, rims, supplies and tools (the store the phone already had), boxed at the pickup area
//   supply     Building & Steel Supply: lumber and steel in bundles, delivered to Walt's garage door (materials are scarce: this is the dear way)
//   classified Classifieds: private sellers around the real towns sell junk lots (scrap, old lumber) and used parts. The board changes every game day.
//   als        Honest Al's Used Cars: Al's lot (canon), the cars you can buy

export const WEB_SITES = [
  { id: 'parts', name: 'Parts Online', url: 'partsonline.shop', color: '#d2502e', blurb: 'New parts, tires, rims, supplies and tools' },
  { id: 'supply', name: 'Building & Steel Supply', url: 'buildingsteel.supply', color: '#3f7f5a', blurb: 'Lumber and steel by the bundle, delivered' },
  { id: 'classified', name: 'Classifieds', url: 'classifieds.local', color: '#6a55b8', blurb: 'Junk, scrap and used parts from sellers near you' },
  { id: 'als', name: "Honest Al's Used Cars", url: 'honestals.cars', color: '#c99a2a', blurb: 'Cars on Al\'s lot' },
];
export const siteById = Object.fromEntries(WEB_SITES.map(s => [s.id, s]));

/** the supply yard's bundles: { id, name, mat, n, price, note }. Dearer per piece than Dusty's two-piece packs, but delivered (PROPOSAL prices) */
export const SUPPLY_BUNDLES = [
  { id: 'lumber5', name: 'Lumber bundle (5 planks)', mat: 'wood', n: 5, price: 34, note: 'for shelving and racks' },
  { id: 'lumber12', name: 'Lumber pallet (12 planks)', mat: 'wood', n: 12, price: 76, note: 'a contractor pallet' },
  { id: 'steel5', name: 'Steel bundle (5 pieces)', mat: 'scrap', n: 5, price: 55, note: 'angle iron and flat bar' },
  { id: 'steel12', name: 'Steel rack (12 pieces)', mat: 'scrap', n: 12, price: 125, note: 'angle, tube and plate' },
];
/** delivery to Walt's garage door, on top of the price (PROPOSAL) */
export const SUPPLY_DELIVERY = 10;

/** the towns private sellers live in: real places around the Imperial Valley and over the border (real geography is fine, canon) */
export const TOWNS = ['El Centro', 'Brawley', 'Calexico', 'Imperial', 'Holtville', 'Westmorland', 'Niland', 'Calipatria', 'Seeley', 'Ocotillo', 'Yuma', 'Mexicali'];

/** junk lots a seller might post: [id, title, mat, n range, $ per piece range, what they say]. Cheaper per piece than the supply yard, but you take what is posted */
export const JUNK_LOTS = [
  ['scrapPile', 'Scrap metal pile', 'scrap', [4, 9], [5, 8], 'Cleaning out the yard. You haul, or I drop it off for gas money.'],
  ['oldFence', 'Old fence boards', 'wood', [4, 8], [3, 5], 'Took the old fence down. Some nails still in.'],
  ['barnWood', 'Barn wood', 'wood', [6, 10], [3, 5], 'Weathered but straight. Must go this week.'],
  ['bedFrame', 'Steel bed frame and angle iron', 'scrap', [3, 6], [5, 8], 'Angle iron, cut it up for whatever.'],
  ['pallets', 'Pallets, free-ish', 'wood', [3, 6], [2, 3], 'Stack of pallets behind the shop.'],
  ['trailerParts', 'Trailer frame pieces', 'scrap', [5, 10], [5, 7], 'Old utility trailer, already cut up.'],
];
/** what a private seller charges for a used part: this share of the new price (PROPOSAL) */
export const USED_SHARE = [0.45, 0.7];
/** the delivery fee a private seller asks to drop a lot at Walt's (PROPOSAL) */
export const SELLER_DROP = 15;

const hash = (a, b, k = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };
const between = ([a, b], t) => a + Math.floor(t * (b - a + 1));
const roundTo = (v, step) => Math.max(step, Math.round(v / step) * step);

/** the game day for the board: it changes every 24 game hours */
export const boardDay = hoursTotal => Math.floor(Math.max(0, hoursTotal || 0) / 24);

/**
 * The classifieds board for one game day. parts: [{ kind, id, name, price }] (new parts you could be offered used). seed: a number for the save (so two
 * saves see different boards). Returns [{ id, type: 'junk' | 'part', title, town, price, ... }]: 3-4 junk lots and 3-4 used parts, the same all day.
 */
export function classifieds(day, parts = [], seed = 0) {
  const out = [], nJunk = 3 + (hash(day, seed, 1) < 0.5 ? 1 : 0), nPart = parts.length ? 3 + (hash(day, seed, 2) < 0.5 ? 1 : 0) : 0;
  const usedLots = new Set(), usedParts = new Set();
  for (let i = 0; i < nJunk; i++) {
    let li = Math.floor(hash(day, seed + i, 3) * JUNK_LOTS.length); while (usedLots.has(li)) li = (li + 1) % JUNK_LOTS.length; usedLots.add(li);
    const [lot, title, mat, nr, per, say] = JUNK_LOTS[li], n = between(nr, hash(day, seed + i, 4)), each = per[0] + hash(day, seed + i, 5) * (per[1] - per[0]);
    out.push({ id: `d${day}-j${i}`, type: 'junk', lot, title: `${title} (${n})`, mat, n, price: roundTo(n * each, 5), town: TOWNS[Math.floor(hash(day, seed + i, 6) * TOWNS.length)], say, hoursAgo: 1 + Math.floor(hash(day, seed + i, 7) * 20) });
  }
  for (let i = 0; i < nPart; i++) {
    let pi = Math.floor(hash(day, seed + i, 8) * parts.length), guard = 0; while (usedParts.has(pi) && guard++ < parts.length) pi = (pi + 1) % parts.length; usedParts.add(pi);
    const p = parts[pi], share = USED_SHARE[0] + hash(day, seed + i, 9) * (USED_SHARE[1] - USED_SHARE[0]);
    out.push({ id: `d${day}-p${i}`, type: 'part', kind: p.kind, partId: p.id, title: `Used: ${p.name}`, price: roundTo(p.price * share, 5), newPrice: p.price, town: TOWNS[Math.floor(hash(day, seed + i, 10) * TOWNS.length)], say: hash(day, seed + i, 11) < 0.5 ? 'Came off a running car. Works fine.' : 'Had it in the garage for years. Make an offer (I will not take it).', hoursAgo: 1 + Math.floor(hash(day, seed + i, 12) * 20) });
  }
  return out.sort((a, b) => a.hoursAgo - b.hoursAgo);
}
/** a listing is gone once bought (sold: { [listingId]: true }) */
export const openListings = (list, sold = {}) => list.filter(l => !sold[l.id]);
/** what you pay for a listing, delivery included */
export const listingTotal = l => l.price + (l.type === 'junk' ? SELLER_DROP : 0);
