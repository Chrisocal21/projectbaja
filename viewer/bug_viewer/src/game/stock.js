// Walt's supply stands: one stand per thing the garage runs on, each holds up to STAND_CAP. Stock is a count you can walk past and read (game.home.stock).
// Pure data and rules (no world, no three.js). Canon: no magic stock, so a stand fills only from orders you paid for, or items you carry over and shelve.
export const STAND_CAP = 10;
/** the stands, along the garage's +x wall (local x, z from the garage centre). kind/id is the item you take off the stand and put back on it. */
export const STANDS = [
  { id: 'oil', name: 'Motor oil', kind: 'supply', item: 'oil', color: '#c9a227' },
  { id: 'bulb', name: 'Headlight bulbs', kind: 'supply', item: 'bulb', color: '#e8e2cc' },
  { id: 'plug', name: 'Tire plug kits', kind: 'supply', item: 'plug', color: '#b3402f' },
  { id: 'wipers', name: 'Wiper blades', kind: 'supply', item: 'wipers', color: '#2a2d30' },
  { id: 'belt', name: 'Fan belts', kind: 'supply', item: 'belt', color: '#3a3f44' },
  { id: 'battery', name: '12V batteries', kind: 'stock', item: 'battery', color: '#1f4e79' },
].map((s, i) => ({ ...s, lx: 6.55, lz: 0.9 + i * 0.85, ry: -Math.PI / 2 }));
export const standById = Object.fromEntries(STANDS.map(s => [s.id, s]));
/** which stand takes an item (kind + id), or null */
export const standFor = (kind, id) => STANDS.find(s => s.kind === kind && s.item === id) || null;
export const stockOf = (home, standId) => Math.max(0, Math.min(STAND_CAP, (home?.stock || {})[standId] | 0));
export const roomOn = (home, standId) => STAND_CAP - stockOf(home, standId);
/** a new home with n more on the stand (as many as fit); { home, added } */
export function addStock(home, standId, n = 1) {
  const added = Math.max(0, Math.min(n, roomOn(home, standId)));
  return { home: added ? { ...home, stock: { ...(home?.stock || {}), [standId]: stockOf(home, standId) + added } } : home, added };
}
/** one off the stand; { home, ok } */
export function takeStock(home, standId) {
  if (stockOf(home, standId) < 1) return { home, ok: false };
  return { home: { ...home, stock: { ...(home?.stock || {}), [standId]: stockOf(home, standId) - 1 } }, ok: true };
}
/** the line on the prompt for a stand, given what you are carrying (carried = true when you hold or pack that item) */
export function standPrompt(home, standId, carried) {
  const s = standById[standId], n = stockOf(home, standId);
  if (carried && n < STAND_CAP) return `Press E — Stock the ${s.name.toLowerCase()} (${n}/${STAND_CAP})`;
  if (n > 0) return `Press E — Take one: ${s.name.toLowerCase()} (${n}/${STAND_CAP} in stock)`;
  return `${s.name}: none in stock (0/${STAND_CAP}). Order more on the phone or at Dusty's.`;
}
