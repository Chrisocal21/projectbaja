// Pure helpers for selling / storing garage props (Stage 4a). home.js wraps these with game state, cash and placement rules.
export const storedOf = home => home?.stored || [];
/** 100% back (canon #024); props built in creative mode (free:true) refund nothing */
export const refundOf = (p, price) => (p.free ? 0 : Math.round(price));
/** which starter-fixture version is already seeded: sold fixtures are never re-seeded because fixturesV stays at 2 */
export const seededV = home => home.fixturesV ?? (home.fixtures ? 1 : 0);
export function storeMove(props, stored, uid) {
  const p = props.find(q => q.uid === uid); if (!p) return null;
  return { props: props.filter(q => q.uid !== uid), stored: [...stored, p] };
}
export function unstoreMove(props, stored, uid, x, z, ry) {
  const p = stored.find(q => q.uid === uid); if (!p) return null;
  const taken = props.some(q => q.uid === uid) ? Math.max(0, ...props.map(q => q.uid), ...stored.map(q => q.uid)) + 1 : uid;
  return { props: [...props, { ...p, uid: taken, x, z, ry }], stored: stored.filter(q => q.uid !== uid) };
}
