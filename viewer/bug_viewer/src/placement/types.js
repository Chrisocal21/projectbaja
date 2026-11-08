// Data shapes for grid placement: surfaces (a bench top, a shelf, the shop floor), placeables (a tire, a toolbox) and placements (one item put down).
// PURE plain objects, no rendering. These factories fill defaults and throw on bad data, so a typo in a catalog fails loudly at load, not as a weird preview.
// Units are metres and radians everywhere. Grid sizes are DATA on the surface (gridSteps), never constants in the rules.
// Surface-local coords: origin at one corner of the surface, x across its width (x in [0, w]), z across its depth (z in [0, d]), y up from its top.

const num = v => typeof v === 'number' && Number.isFinite(v);
const pair = v => Array.isArray(v) && v.length === 2 && v.every(n => num(n) && n > 0);
const tagList = v => Array.isArray(v) && v.every(t => typeof t === 'string' && t);
function need(ok, what, id) { if (!ok) throw new Error(`placement: ${what}${id ? ` (${id})` : ''}`); }

const EDGES = ['x0', 'x1', 'z0', 'z1'];
/** a flat rect things go on. gridSteps coarsest first (e.g. [0.5, 0.25, 0.05]); accepts [] or ['*'] = takes anything. stackable false = nothing may be stacked here.
 *  clearance = headroom in metres above the top (a closed hood, a back window); nothing may stand taller. walls = edges a held item pulls flush
 *  against ('x0' | 'x1' | 'z0' | 'z1', see clipTo). blocks = fixed lumps on the surface, surface-local rects { x0, z0, x1, z1, top } (a pickup's
 *  wheel wells): nothing may overlap one below its top. */
export function surface({ id, size, gridSteps = [0.5], accepts = [], stackable = true, clearance = Infinity, walls = [], blocks = [] }) {
  need(typeof id === 'string' && id, 'surface needs an id');
  need(pair(size), 'surface size must be [w, d] metres > 0', id);
  need(Array.isArray(gridSteps) && gridSteps.length > 0 && gridSteps.every(s => num(s) && s > 0), 'gridSteps must be positive metres', id);
  need(gridSteps.every((s, i) => i === 0 || s < gridSteps[i - 1]), 'gridSteps must go coarsest first', id);
  need(tagList(accepts), 'accepts must be a list of tags', id);
  need(typeof clearance === 'number' && clearance > 0, 'clearance must be metres > 0', id);
  need(Array.isArray(walls) && walls.every(w => EDGES.includes(w)), "walls must be edges 'x0' | 'x1' | 'z0' | 'z1'", id);
  need(Array.isArray(blocks) && blocks.every(b => b && ['x0', 'z0', 'x1', 'z1', 'top'].every(k => num(b[k])) && b.x1 > b.x0 && b.z1 > b.z0 && b.top > 0), 'blocks must be { x0, z0, x1, z1, top } rects', id);
  return { id, size: [...size], gridSteps: [...gridSteps], accepts: [...accepts], stackable: !!stackable, clearance, walls: [...walls], blocks: blocks.map(b => ({ ...b })) };
}

/** a thing you can put down. footprint [w, d] metres at rot 0 (w along x), height metres. stackable = sits on other stackables (tires); stackOn = tags it may sit on.
 *  clip = snaps flush beside its own kind when put down near one (see clipTo in rules.js): false = never, true = with the same placeable id,
 *  a string = a clip group, so different items sharing the group clip to each other too (and to their own id). */
const POSE_KEYS = ['footprint', 'height', 'stackable', 'stackOn', 'clip'];
/** poses = other ways the same thing can be set down, e.g. a tire { upright: { footprint, height, stackable: false, clip: 'tireUpright' } }.
 *  Each pose overrides only the fields it names; the plain placeable is the default pose (see posed() in rules.js). */
export function placeable({ id, footprint, height, tags = [], stackable = false, stackOn = [], clip = false, poses = {} }) {
  need(typeof id === 'string' && id, 'placeable needs an id');
  need(pair(footprint), 'footprint must be [w, d] metres > 0', id);
  need(num(height) && height > 0, 'height must be metres > 0', id);
  need(tagList(tags) && tagList(stackOn), 'tags / stackOn must be lists of tags', id);
  need(typeof clip === 'boolean' || (typeof clip === 'string' && clip), 'clip must be true / false or a group name', id);
  need(poses && typeof poses === 'object' && Object.values(poses).every(p => p && Object.keys(p).every(k => POSE_KEYS.includes(k))
    && (p.footprint === undefined || pair(p.footprint)) && (p.height === undefined || (num(p.height) && p.height > 0))
    && (p.clip === undefined || typeof p.clip === 'boolean' || (typeof p.clip === 'string' && p.clip))), `poses may only set ${POSE_KEYS.join(', ')}`, id);
  return { id, footprint: [...footprint], height, tags: [...tags], stackable: !!stackable, stackOn: [...stackOn], clip, poses: { ...poses } };
}

let seq = 0;
/** one item put down: x, z = the item's CENTRE in surface-local metres, rot radians about y, y = height of its base above the surface (0 = on it),
 *  pose = which of the placeable's poses it is in (null = its default).
 *  id names this one placement (two tires are two placements); left out, a fresh one is made. A preview of a MOVE reuses the id of the
 *  placement being moved, so why() / restY() skip the original instead of colliding with it. */
export function placement({ id, item, surface, x, z, rot = 0, y = 0, free = false, pose = null }) {
  need(typeof item === 'string' && item && typeof surface === 'string' && surface, 'placement needs item and surface ids');
  need(pose === null || (typeof pose === 'string' && pose), 'placement pose must be a pose name or null', item);
  need(num(x) && num(z) && num(rot) && num(y) && y >= 0, 'placement x, z, rot, y must be numbers (y >= 0)', item);
  need(id === undefined || id === null || (typeof id === 'string' && id), 'placement id must be a non-empty string', item);
  return { id: id || `pl${++seq}`, item, surface, x, z, rot, y, free: !!free, pose };
}

/** index a catalog by id, refusing duplicates (two 'tire' entries would make why() answer for whichever came last) */
export function byId(list) {
  const out = {};
  for (const p of list) { need(!(p.id in out), 'duplicate id', p.id); out[p.id] = p; }
  return out;
}
