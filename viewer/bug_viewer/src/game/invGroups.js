// One inventory line per kind of thing (pure). Things share a line only when they read the same and sit in the same
// place; nameOfItem already spells out condition, tread, fuel and "not paid". -> [{ key, it (the one the buttons act on), n }]
export function groupItems(list, nameOf) {
  const groups = new Map();
  for (const it of list) {
    const key = [it.kind, it.id, it.spot || '', it.cust ? 'cust' : '', nameOf(it)].join('|');
    const g = groups.get(key);
    if (g) g.n++; else groups.set(key, { key, it, n: 1 });
  }
  return [...groups.values()];
}
