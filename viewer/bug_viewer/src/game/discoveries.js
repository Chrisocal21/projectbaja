// Discoveries (the phone's Explorer app): places worth finding on the map, found by getting close. No story is invented here: every entry is a real
// place name (towns), a stop, wreck or course that exists in the world, or one of the places already named in the game. Pure data, so it can be tested.
// Saved as game.home.found = { [id]: true }.
export const KINDS = [['place', "Walt's county"], ['town', 'Towns and cities'], ['stop', 'Roadside stops'], ['wreck', 'Wrecks'], ['race', 'Race courses']];
export const REACH = { place: 45, town: 450, stop: 55, wreck: 30, race: 80 };

const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
/** which way (x east, z south: the map's north is -z) a point is from another, as a word */
export function compass(fromX, fromZ, toX, toZ) {
  const a = Math.atan2(toX - fromX, -(toZ - fromZ));   // 0 = north, clockwise
  return DIRS[Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
}
export function nearest(list, x, z) {
  let best = null, bd = Infinity;
  for (const p of list) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
  return best && { ...best, dist: bd };
}
/** "north-east of Ensenada" for anything not found yet: a hint, never a map pin */
export function hintFor(item, towns) {
  const t = nearest(towns, item.x, item.z); if (!t) return '';
  return item.dist === undefined && Math.hypot(t.x - item.x, t.z - item.z) < 600 ? `in ${t.name}` : `${compass(t.x, t.z, item.x, item.z)} of ${t.name}`;
}

/**
 * towns: [{ name, x, z }]; places: [{ id, name, x, z }]; stops: [{ type: 'gas' | 'rest', x, z }]; wrecks: [{ id, name, x, z }]; courses: [{ id, name, start: { x, z } }]
 * Ids are stable for a given world: towns by name, stops by their index, wrecks by their project, courses by their id.
 */
export function buildDiscoverables({ towns = [], places = [], stops = [], wrecks = [], courses = [] }) {
  const list = [];
  for (const p of places) list.push({ id: 'place-' + p.id, kind: 'place', name: p.name, x: p.x, z: p.z });
  for (const t of towns) list.push({ id: 'town-' + t.name, kind: 'town', name: t.name, x: t.x, z: t.z });
  stops.forEach((s, i) => list.push({ id: 'stop-' + i, kind: 'stop', name: s.type === 'gas' ? 'Gas station' : 'Rest area', x: s.x, z: s.z }));
  for (const w of wrecks) list.push({ id: 'wreck-' + w.id, kind: 'wreck', name: w.name, x: w.x, z: w.z });
  for (const c of courses) list.push({ id: 'race-' + c.id, kind: 'race', name: `${c.name} start`, x: c.start.x, z: c.start.z });
  const near = list.filter(d => d.kind === 'stop' || d.kind === 'wreck' || d.kind === 'race');
  for (const d of near) d.hint = hintFor(d, towns);
  return list.map(d => ({ ...d, reach: REACH[d.kind] }));
}
/** the ones you are standing in the reach of and have not found yet */
export function foundNow(list, found, x, z) {
  return list.filter(d => !found[d.id] && (d.x - x) ** 2 + (d.z - z) ** 2 <= d.reach * d.reach);
}
/** { total, found, byKind: { kind: { total, found } } } */
export function progress(list, found) {
  const byKind = {}; let n = 0;
  for (const d of list) { const k = byKind[d.kind] || (byKind[d.kind] = { total: 0, found: 0 }); k.total++; if (found[d.id]) { k.found++; n++; } }
  return { total: list.length, found: n, byKind };
}
