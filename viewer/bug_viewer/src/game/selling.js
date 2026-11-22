// What Dusty pays for things you found or no longer need. Pure rules (the caller supplies the shop price); every number is a PROPOSAL.
// Parts, wheels and rims fetch 40% of the catalogue price, supplies and tools about half, junk a flat few dollars. Keepsakes and shells are not for sale here.
export const PART_RATE = 0.4, SUPPLY_RATE = 0.5;
export const JUNK_VALUE = { drum: 15, jerrycan: 8, crate: 6, engineblock: 45 };
const round5 = n => Math.max(5, Math.round(n / 5) * 5);
/** dollars for an item, or 0 when Dusty will not buy it. basePrice = what it costs new (0 or undefined if unknown) */
export function sellValue(it, basePrice = 0) {
  switch (it?.kind) {
    case 'part': case 'wheel': case 'rim': case 'stock': return basePrice > 0 ? round5(basePrice * PART_RATE) : 0;
    case 'supply': return basePrice > 0 ? Math.max(1, Math.round(basePrice * SUPPLY_RATE)) : 0;
    case 'tool': return basePrice > 0 ? Math.max(1, Math.round(basePrice * PART_RATE)) : 0;
    case 'tire': return 20;
    case 'junk': return JUNK_VALUE[it.id] || 0;
    default: return 0;   // keepsakes (letter, photo), body shells, anything unknown
  }
}
