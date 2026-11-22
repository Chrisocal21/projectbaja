// Storage bins (PURE, loads under node): a bin, tool chest or rack holds items by size up to a capacity, and remembers them (items keep
// loc 'bin' and bin: <prop uid>, so they save with the game). PROPOSAL numbers.
export const BINS = {
  partsBin: { name: 'Parts bin', cap: 12 },
  toolChest: { name: 'Tool chest', cap: 10 },
  yardRack: { name: 'Steel parts rack', cap: 24 },
};
export const isBin = id => !!BINS[id];
export const inBin = (items, uid) => items.filter(i => i.loc === 'bin' && i.bin === uid);
export const usedOf = (items, uid, sizeFn) => inBin(items, uid).reduce((n, i) => n + sizeFn(i), 0);
/** may this item go in? -> '' or the reason */
export function stowBlock(propId, items, uid, it, sizeFn) {
  const b = BINS[propId]; if (!b) return 'That is not a bin.';
  const size = sizeFn(it), used = usedOf(items, uid, sizeFn);
  return used + size > b.cap ? `The ${b.name.toLowerCase()} is full (${used}/${b.cap}).` : '';
}
/** the prompt: what is in it, and what E does */
export function binPrompt(propId, items, uid, sizeFn, nameFn, carrying) {
  const b = BINS[propId], inside = inBin(items, uid), used = usedOf(items, uid, sizeFn);
  const names = inside.slice(-3).reverse().map(nameFn), more = inside.length - names.length;
  const what = inside.length ? `${names.join(', ')}${more > 0 ? ` +${more} more` : ''}` : 'empty';
  return `${b.name} ${used}/${b.cap}: ${what}  ·  ${carrying ? 'E puts it in' : 'nothing to put in'}${inside.length ? '  ·  Click takes the last thing out' : ''}`;
}
