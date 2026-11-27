// What each shop on the map sells (pure: no game state, loads under node). Every barn, junkyard, off-road store and gas-station mart has its own shelf:
// a fixed pick from its kind's pool, decided by where it stands, so the same shop always sells the same things and no two shops match. What you buy leaves
// the shelf until RESTOCK_HOURS of game time pass (game.home.shopSold, shopSoldAt). Prices are PROPOSALs.
//   off-road store: new parts, each store leaning one way (suspension, engine, body, lights, gear), plus wheels, rims, a tool and a supply or two
//   junkyard:       used parts at about half price, old wheels and rims, junk, now and then an El Cajon part
//   barn:           supplies and tools cheap, a "barn find" or two, an old battery, a drum or a crate
//   mart:           a handful of what Dusty sells, at gas-station prices
import { CAN_IDS } from '../finishJobs.js';
import { shopKey } from '../worlds/shopSites.js';

const hash = (a, b, k = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };
/** a small seeded random stream from a place */
const rngOf = site => { let t = Math.floor(hash(Math.round(site.x), Math.round(site.z), 5) * 4294967296) >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
const shuffle = (list, rnd) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const take = (list, n, rnd) => shuffle(list, rnd).slice(0, n);

/** the groups an off-road store can lean toward (part slots, see catalog/parts.json) */
export const SPECIALTY = {
  suspension: { name: 'suspension', slots: ['suspension', 'shocks', 'lift'] },
  engine: { name: 'engine', slots: ['engineCarb', 'engineBore', 'engineIgnition', 'engineCooling', 'exhaust'] },
  body: { name: 'body & armor', slots: ['fenders', 'hood', 'rearDeck', 'frontBumper', 'rearBumper', 'rockers', 'skid', 'mudFlaps', 'fenderTubes', 'rollCage'] },
  lights: { name: 'lights', slots: ['frontLights', 'rearLights', 'lightBar', 'roofLights'] },
  gear: { name: 'rack & gear', slots: ['roofRack', 'roofGear', 'antenna', 'rearCarrier'] },
};
const JUNK_PRICE = { drum: 18, jerrycan: 10, crate: 8, engineblock: 60 };
const SUPPLY_IDS = ['oil', 'bulb', 'plug', 'wipers', 'belt'];
/** the finishing tools (finishJobs.js): the off-road stores carry them new, junkyards and barns now and then used */
const FINISH_IDS = ['grinder', 'buffer', 'hose', ...CAN_IDS];

/**
 * site: { type, x, z }; ctx: { cat: { part: [{id, slot}], wheel: [{id}], rim: [{id}], stock?: [{id}] }, price(kind, id), supplyPrice(id), martItems?: [{id, kind, itemId, price, note}] }
 * -> { rows: [{ id: 'part:FENDER_X', kind, itemId, price, note }], theme } in shelf order. Not yet minus what was sold: see shelf().
 */
export function shopRows(site, ctx) {
  const rnd = rngOf(site), { cat, price } = ctx, rows = [], add = (kind, itemId, factor, note) => rows.push({ id: kind + ':' + itemId, kind, itemId, price: Math.max(1, Math.round(price(kind, itemId) * factor)), note });
  const jit = (lo, hi) => lo + rnd() * (hi - lo), sup = (s, f) => rows.push({ id: 'supply:' + s, kind: 'supply', itemId: s, price: Math.max(1, Math.round(ctx.supplyPrice('supply:' + s) * f)), note: 'supply' });
  const fin = (id, f, note) => rows.push({ id: 'tool:' + id, kind: 'tool', itemId: id, price: Math.max(1, Math.round(ctx.supplyPrice('tool:' + id) * f)), note });
  if (site.type === 'offroad') {
    const keys = Object.keys(SPECIALTY), spec = SPECIALTY[keys[Math.floor(rnd() * keys.length)]];
    const pool = cat.part.filter(p => spec.slots.includes(p.slot)), other = cat.part.filter(p => !spec.slots.includes(p.slot));
    for (const p of take(pool, 6, rnd)) add('part', p.id, jit(1, 1.15), `new · ${spec.name}`);
    for (const p of take(other, 1, rnd)) add('part', p.id, jit(1.15, 1.35), 'new · special order');
    for (const w of take(cat.wheel, 2, rnd)) add('wheel', w.id, jit(0.95, 1.1), 'new wheel set');
    for (const r of take(cat.rim, 2, rnd)) add('rim', r.id, jit(0.95, 1.1), 'new rim');
    rows.push({ id: 'tool:wrench', kind: 'tool', itemId: 'wrench', price: Math.round(ctx.supplyPrice('tool:wrench') * 1.2), note: 'tool' });
    for (const s of take(SUPPLY_IDS, 2, rnd)) sup(s, 1.15);
    for (const t of take(FINISH_IDS, 2, rnd)) fin(t, jit(1.05, 1.2), 'tool · new');
    fin('pump', jit(1.05, 1.2), 'tool · new');
    fin('shovel', jit(1.05, 1.2), 'tool · new'); fin('boards', jit(1.05, 1.2), 'tool · new');   // recovery gear (bogDown.js)
    return { rows, theme: spec.name };
  }
  if (site.type === 'junk') {
    for (const p of take(cat.part, 7, rnd)) add('part', p.id, jit(0.38, 0.62), 'used · pulled off a wreck');
    for (const w of take(cat.wheel, 1, rnd)) add('wheel', w.id, jit(0.35, 0.5), 'used wheel set');
    for (const r of take(cat.rim, 2, rnd)) add('rim', r.id, jit(0.3, 0.5), 'used rim');
    for (const id of take(Object.keys(JUNK_PRICE), 3, rnd)) rows.push({ id: 'junk:' + id, kind: 'junk', itemId: id, price: Math.round(JUNK_PRICE[id] * jit(0.9, 1.4)), note: 'junk' });
    if (rnd() < 0.45) fin(take(FINISH_IDS.slice(0, 3), 1, rnd)[0], jit(0.35, 0.55), 'tool · used, works');
    if (cat.stock?.length && rnd() < 0.7) for (const c of take(cat.stock, 2, rnd)) add('stock', c.id, jit(0.45, 0.65), 'used · El Cajon');
    return { rows, theme: 'used parts' };
  }
  if (site.type === 'barn') {
    for (const s of take(SUPPLY_IDS, 3, rnd)) sup(s, jit(0.6, 0.85));
    if (rnd() < 0.7) rows.push({ id: 'tool:wrench', kind: 'tool', itemId: 'wrench', price: Math.round(ctx.supplyPrice('tool:wrench') * jit(0.5, 0.8)), note: 'tool · well worn' });
    if (rnd() < 0.4) rows.push({ id: 'tool:jack', kind: 'tool', itemId: 'jack', price: Math.round(ctx.supplyPrice('tool:jack') * jit(0.5, 0.75)), note: 'tool · heavy, old' });
    if (rnd() < 0.6) rows.push({ id: 'stock:battery', kind: 'stock', itemId: 'battery', price: Math.round(60 * jit(0.45, 0.7)), note: 'old battery, holds a charge' });
    for (const id of take(Object.keys(JUNK_PRICE), 2, rnd)) rows.push({ id: 'junk:' + id, kind: 'junk', itemId: id, price: Math.round(JUNK_PRICE[id] * jit(0.5, 0.9)), note: 'junk' });
    if (rnd() < 0.4) fin(take(FINISH_IDS, 1, rnd)[0], jit(0.4, 0.65), 'tool · well worn');
    for (const p of take(cat.part, 1 + Math.floor(rnd() * 2), rnd)) add('part', p.id, jit(0.6, 0.85), 'barn find');
    if (rnd() < 0.35) for (const w of take(cat.wheel, 1, rnd)) add('wheel', w.id, jit(0.5, 0.7), 'barn find · wheel set');
    return { rows, theme: 'barn finds' };
  }
  // a gas-station mart: a handful of Dusty's shelf at gas-station prices
  for (const r of take(ctx.martItems || [], 4 + Math.floor(rnd() * 3), rnd)) rows.push({ id: r.id, kind: r.kind, itemId: r.itemId, price: Math.round(r.price * jit(1.1, 1.35)), note: r.note });
  return { rows, theme: 'convenience' };
}
/** game hours until something you bought is back on a shop's shelf (three days; PROPOSAL) */
export const RESTOCK_HOURS = 72;
/** the shelf now: the rows minus what has been bought and not yet restocked, with the shop's key.
 * sold = game.home.shopSold ({ [key]: [row id] }); soldAt = game.home.shopSoldAt ({ [key]: { [row id]: game hour bought } }); now = game hours played so far */
export function shelf(site, ctx, sold = {}, now = 0, soldAt = {}) {
  const key = shopKey(site), gone = new Set((sold[key] || []).filter(id => now - (soldAt[key]?.[id] ?? 0) < RESTOCK_HOURS)), { rows, theme } = shopRows(site, ctx);
  return { key, theme, rows: rows.filter(r => !gone.has(r.id)), soldCount: gone.size };
}
