// Photos for the phone's Camera / Feed (PROPOSAL, first slice). Pure helpers, no game state. A photo carries where it was taken so you can find the spot again.
export const MAX_PHOTOS = 30;   // PROPOSAL: thumbnails live in the save, so the feed is capped (oldest unposted go first)

/** nearest named area: inside one -> its name, else "Open country near <closest>" */
export function placeName(x, z, areas) {
  let best = null, bd = Infinity;
  for (const a of Object.values(areas || {})) {
    const rx = a.rx ?? a.r ?? 100, rz = a.rz ?? a.r ?? 100, d = Math.hypot((x - a.x) / rx, (z - a.z) / rz);
    if (d < bd) { bd = d; best = a; }
  }
  if (!best) return 'Open country';
  return bd <= 1 ? best.name : `Open country near ${best.name}`;
}

export const coordText = (x, z) => `${Math.round(x)}, ${Math.round(z)}`;

export function newPhoto({ id, x, z, bearing, clock, where, img, what }) {
  return { id, x: Math.round(x), z: Math.round(z), bearing: Math.round(bearing || 0), clock: clock ?? 9, where: where || '', img: img || '', what: what || 'View', caption: '', posted: false };
}

/** add a photo; keeps at most `max`, dropping the oldest ones that were never posted first */
export function addPhoto(list, photo, max = MAX_PHOTOS) {
  const out = [...(list || []), photo];
  while (out.length > max) {
    const i = out.findIndex(p => !p.posted);
    out.splice(i < 0 ? 0 : i, 1);
  }
  return out;
}

export const postedFeed = list => (list || []).filter(p => p.posted).slice().reverse();   // newest first
