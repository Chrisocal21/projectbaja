// Gas station brands on the real highways. There is exactly one Dusty's Fuel (the corner store near Walt's); every other station is one of two knock-off
// brands, alternating along the road (pure data, so the sign, the map and the Explorer agree). Change the names here and everywhere follows.
export const GAS_BRANDS = [
  { id: 'pemax', name: 'PEMAX', sub: 'gasolina · diesel', bg: '#145c3a', fg: '#ffffff', accent: '#ffd23f' },
  { id: 'exxan', name: 'EXXAN', sub: 'regular · premium', bg: '#b02f26', fg: '#ffffff', accent: '#9ec5ff' },
];
/** the brand of the n-th gas station along the highways (n counts gas stations only, in the order the road builder lists them) */
export const gasBrand = n => GAS_BRANDS[((n % GAS_BRANDS.length) + GAS_BRANDS.length) % GAS_BRANDS.length];
/** station index among the roadside sites of kind 'gas' for every site: sites = [{ type }] -> same-length array of n (or -1 for a rest area) */
export function gasIndexes(sites) { let n = 0; return sites.map(s => (s.type === 'gas' ? n++ : -1)); }
