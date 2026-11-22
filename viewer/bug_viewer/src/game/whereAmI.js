// "Where am I" for the HUD under the compass: the nearest city or town, and the road you're on (real map), or the named area (classic map).
import { REAL_PLACES, projectPlace } from './realPlaces.js';
import { highways, areaAt } from '../worlds/county.js';
import { border } from '../worlds/border.js';
import { REAL } from '../worlds/world.js';

let placed = null;
const places = () => placed || (placed = (() => { const land = border(); return land ? REAL_PLACES.map(p => ({ name: p.name, ...projectPlace(p.lat, p.lon, land.meta) })) : []; })());
const NEAR_TOWN = 4000, FAR_TOWN = 60000;

/** { place, road } for a world position; either can be '' */
export function whereAmI(x, z) {
  if (!REAL) return { place: areaAt(x, z), road: '' };
  let road = '';
  const q = highways()?.near(x, z); if (q && q.d < 30 && q.road?.name) road = q.road.name;
  let best = null, bd = Infinity;
  for (const p of places()) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
  const place = best && bd < FAR_TOWN ? (bd < NEAR_TOWN ? best.name : `near ${best.name}`) : areaAt(x, z);
  return { place, road };
}
