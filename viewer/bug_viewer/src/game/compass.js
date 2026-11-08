// Pure compass maths. North is world -z, east is +x; forward = (sin yaw, cos yaw), so bearing = PI - yaw. Degrees 0..360 clockwise from north.
const D = 180 / Math.PI;
export const norm = d => ((d % 360) + 360) % 360;
/** bearing (deg) from a facing vector (x, z) */
export const bearingOf = (fx, fz) => norm(Math.atan2(fx, -fz) * D);
/** bearing (deg) from a vehicle yaw */
export const bearingFromYaw = yaw => norm((Math.PI - yaw) * D);
const PTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const compassPoint = deg => PTS[Math.round(norm(deg) / 45) % 8];
/** bearing (deg) from (x,z) to (tx,tz) */
export const bearingTo = (x, z, tx, tz) => bearingOf(tx - x, tz - z);
/** signed angle (-180..180) from the heading to a bearing; + means to the right */
export const relative = (heading, bearing) => norm(bearing - heading + 180) - 180;
// PROPOSAL: a place is discovered when you are on its pad or on the road/driveway right in front of it: within the site's pad radius
// (SITES[id].r: garage 30, lot 38, gas 21, shop 14, barn 22, warehouse 22, proving 30) plus EDGE_MARGIN metres. Measured from county.js, the
// serving road passes 16-48 m from each centre (garage 16 dirt drive, lot 48, gas 30, shop 32 street, barn 26, warehouse 21, proving 29), while the
// next road over is 60+ m away (warehouse's highway 60; garage's gravel 125; the rest 440+), so r + 25 catches the road in front and nothing else.
// Walt's Garage is known from the start. DISCOVER_R is only the fallback when a place has no pad radius.
export const EDGE_MARGIN = 25, DISCOVER_R = 50, START_KNOWN = ['garage'];
/** set of discovered place ids (state = game.home; the field is additive, absent in old saves) */
export const discovered = home => new Set([...START_KNOWN, ...(home?.discovered || [])]);
/** ids newly within range of (x,z). places = [{ id, x, z, r? }] (r = pad radius) */
export const newlyDiscovered = (home, x, z, places) => { const k = discovered(home); return places.filter(p => !k.has(p.id) && Math.hypot(p.x - x, p.z - z) <= (p.r == null ? DISCOVER_R : p.r + EDGE_MARGIN)).map(p => p.id); };
