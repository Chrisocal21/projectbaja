// Pure map maths (no three.js, no browser). North is world -z (screen up), east is +x (screen right): a normal, non-mirrored compass.
// Facing north (-z), your right hand is +x. Heading: forward = (sin yaw, cos yaw).
/** world (x,z) -> map fraction [u,v], each 0..1, (0,0) = top-left */
export const worldToMap = (x, z, half) => [(x + half) / (2 * half), (z + half) / (2 * half)];
/** canvas rotation (radians, clockwise) that turns an up-pointing arrow to face a world heading */
export const arrowRot = yaw => Math.PI - yaw;
/** unit screen direction (right, down) the arrow points after rotating by arrowRot(yaw) */
export const arrowDir = yaw => { const r = arrowRot(yaw); return [Math.sin(r), -Math.cos(r)]; };
/** a site is cleared when nothing is left to take: every container searched and emptied, no loose part on its spots, scrap heaps taken.
 *  Computed from live item state: s = { boxes, items, heaps }, d = { containers, spots, heaps } */
export function siteCleared(site, s, d) {
  const cs = d.containers.filter(c => c.site === site), sp = d.spots.filter(c => c.site === site), hp = d.heaps.filter(h => h.site === site);
  if (!cs.length && !sp.length && !hp.length) return false;
  if (cs.some(c => !s.boxes[c.id]?.searched || s.items.some(i => i.loc === 'box' && i.box === c.id))) return false;
  if (sp.some(p => s.items.some(i => i.loc === 'world' && Math.hypot(i.x - p.x, i.z - p.z) < 1.2))) return false;
  return hp.every(h => s.heaps?.includes(h.id));
}
