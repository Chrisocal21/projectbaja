// Data shapes for grid placement: surfaces (a bench top, a shelf, the shop floor), placeables (a tire, a toolbox) and placements (one item put down).
// PURE plain objects, no rendering. These factories fill defaults and throw on bad data, so a typo in a catalog fails loudly at load, not as a weird preview.
// Units are metres and radians everywhere. Grid sizes are DATA on the surface (gridSteps), never constants in the rules.
// Surface-local coords: origin at one corner of the surface, x across its width (x in [0, w]), z across its depth (z in [0, d]), y up from its top.

const num = v => typeof v === 'number' && Number.isFinite(v);
const pair = v => Array.isArray(v) && v.length === 2 && v.every(n => num(n) && n > 0);
const tagList = v => Array.isArray(v) && v.every(t => typeof t === 'string' && t);
function need(ok, what, id) { if (!ok) throw new Error(`placement: ${what}${id ? ` (${id})` : ''}`); }

/** a flat rect things go on. gridSteps coarsest first (e.g. [0.5, 0.25, 0.05]); accepts [] or ['*'] = takes anything. stackable false = nothing may be stacked here. */
export function surface({ id, size, gridSteps = [0.5], accepts = [], stackable = true }) {
  need(typeof id === 'string' && id, 'surface needs an id');
  need(pair(size), 'surface size must be [w, d] metres > 0', id);
  need(Array.isArray(gridSteps) && gridSteps.length > 0 && gridSteps.every(s => num(s) && s > 0), 'gridSteps must be positive metres', id);
  need(gridSteps.every((s, i) => i === 0 || s < gridSteps[i - 1]), 'gridSteps must go coarsest first', id);
  need(tagList(accepts), 'accepts must be a list of tags', id);
  return { id, size: [...size], gridSteps: [...gridSteps], accepts: [...accepts], stackable: !!stackable };
}

/** a thing you can put down. footprint [w, d] metres at rot 0 (w along x), height metres. stackable = sits on other stackables (tires); stackOn = tags it may sit on. */
export function placeable({ id, footprint, height, tags = [], stackable = false, stackOn = [] }) {
  need(typeof id === 'string' && id, 'placeable needs an id');
  need(pair(footprint), 'footprint must be [w, d] metres > 0', id);
  need(num(height) && height > 0, 'height must be metres > 0', id);
  need(tagList(tags) && tagList(stackOn), 'tags / stackOn must be lists of tags', id);
  return { id, footprint: [...footprint], height, tags: [...tags], stackable: !!stackable, stackOn: [...stackOn] };
}

/** one item put down: x, z = the item's CENTRE in surface-local metres, rot radians about y, y = height of its base above the surface (0 = on it). */
export function placement({ item, surface, x, z, rot = 0, y = 0, free = false }) {
  need(typeof item === 'string' && item && typeof surface === 'string' && surface, 'placement needs item and surface ids');
  need(num(x) && num(z) && num(rot) && num(y) && y >= 0, 'placement x, z, rot, y must be numbers (y >= 0)', item);
  return { item, surface, x, z, rot, y, free: !!free };
}

/** index a catalog by id, refusing duplicates (two 'tire' entries would make why() answer for whichever came last) */
export function byId(list) {
  const out = {};
  for (const p of list) { need(!(p.id in out), 'duplicate id', p.id); out[p.id] = p; }
  return out;
}
