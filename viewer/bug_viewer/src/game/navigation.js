// The map waypoint and the route to it (game glue over routing.js). One waypoint at a time, saved with the game (game.home.waypoint).
// The route follows the real road network (worlds/county.js) and is worked out again when you leave it. Roads only: no road near either end = a straight dashed line.
import { game, save, say } from './store.js';
import { highways, ROADS } from '../worlds/county.js';
import { buildGraph, findRoute, remaining, offRoute } from './routing.js';

let graph = null;
const graphOf = () => graph || (graph = buildGraph([...(highways()?.roads || []).map(r => r.pts), ...ROADS.map(r => r.path?.pts)].filter(p => p && p.length > 1)));
const nav = { key: '', route: null, t: -99, straight: true };
export const waypoint = () => game.home?.waypoint || null;
export function setWaypoint(x, z, label) {
  game.home = { ...game.home, waypoint: { x, z, label: label || 'Waypoint' } }; nav.key = ''; save(); say(`Waypoint set: ${label || 'Waypoint'}. The route shows on your minimap.`);
}
export function clearWaypoint(quiet) { if (!waypoint()) return; game.home = { ...game.home, waypoint: null }; nav.key = ''; nav.route = null; save(); if (!quiet) say('Waypoint cleared.'); }
/** -> { pts: [{x,z}], straight, left (metres), wp } | null. Cheap to call every frame: it only recomputes when it must. */
export function routeNow(px, pz, now) {
  const wp = waypoint(); if (!wp) return null;
  if (Math.hypot(wp.x - px, wp.z - pz) < 35) { clearWaypoint(true); say(`You have arrived: ${wp.label}.`); return null; }
  const key = wp.x + ',' + wp.z, stale = !nav.route || nav.key !== key || (now - nav.t > 2000 && !nav.straight && offRoute(nav.route, px, pz) > 120) || (now - nav.t > 6000 && nav.straight);
  if (stale) {
    nav.key = key; nav.t = now;
    let path = null; try { path = findRoute(graphOf(), px, pz, wp.x, wp.z, 900); } catch { path = null; }
    nav.straight = !path; nav.route = [{ x: px, z: pz }, ...(path || []), { x: wp.x, z: wp.z }];
  }
  return { pts: nav.route, straight: nav.straight, left: remaining(nav.route, px, pz), wp };
}
