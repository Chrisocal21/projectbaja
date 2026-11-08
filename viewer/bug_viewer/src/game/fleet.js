// The player's vehicles. Exactly one is "active" (the physics car you drive / work on); every other owned vehicle sits parked
// where you left it. Walk up to a parked one and press E to take it. Vehicles for sale wait on Honest Al's lot.
import { game, save, say, addCash } from './store.js';
import { SITES, toWorld } from '../worlds/county.js';
import { LOT_SPOTS } from '../lot/CarLot.jsx';

export const TRUCK_DIMS = {
  wheelbase: 3.22, track: 1.92, cabEye: [0.4, 1.68, -0.12], lift: 0, bellyHeight: 0.36, offroad: true,
  topSpeed: 38, accelMul: 0.85, tire: { mu: 1.05, rr: 1, surf: {} },
  mounts: [['FL', 0.96, 1.61], ['FR', -0.96, 1.61], ['RL', 0.94, -1.61], ['RR', -0.94, -1.61]].map(([name, x, z]) => ({ name, radius: 0.51, center: [x, 0.513, z], halfWidth: 0.14 })),
};

/** every vehicle in the game. `storage`: what fits where (sizes add up; `max` = biggest single item) */
export const VEHICLE_TYPES = {
  bug: { id: 'bug', name: "'71 Bug", length: 4.1, width: 1.6, kind: 'build' },
  pickup84: { id: 'pickup84', name: "'84 4x4 Pickup", length: 5.4, width: 2.0, price: 4800, kind: 'truck', dims: TRUCK_DIMS,
    storage: { cab: { cap: 3, max: 2, label: 'cab' }, bed: { cap: 16, max: 4, label: 'bed' } },
    pitch: "Runs, drives, hauls an engine in the bed. Bald tires, no radio.", condition: { Paint: 44, Interior: 52, Engine: 81, Frame: 77 } },
  pickup78: { id: 'pickup78', name: "'78 Half-ton", length: 5.1, width: 1.95, price: 2300, kind: 'project', dims: null,
    pitch: 'Good bones, no motor. A project for later.', condition: { Paint: 22, Interior: 30, Engine: 0, Frame: 64 } },
};
export const vehicleType = id => VEHICLE_TYPES[id] || VEHICLE_TYPES.bug;
export const activeType = () => vehicleType(game.active);

/** where a vehicle on Al's lot stands, in world coordinates */
export function lotPose(spot) {
  const s = SITES.lot, l = LOT_SPOTS[spot], [x, z] = toWorld(s, l.x, l.z);
  return { x, z, h: s.rot + l.r };
}
export const FOR_SALE = [{ id: 'pickup84', spot: 'bug' }, { id: 'pickup78', spot: 'tarp' }];
export const owned = id => !!game.fleet[id];

/** parked vehicles: every owned vehicle except the active one */
export const parked = () => Object.entries(game.fleet).filter(([id, v]) => id !== game.active && v.pose).map(([id, v]) => ({ id, ...v }));

/** every vehicle standing in the world that you are not using: your parked ones + the ones for sale on Al's lot */
export const standingVehicles = () => [...parked().map(v => ({ id: v.id, pose: v.pose })), ...FOR_SALE.filter(f => !owned(f.id) && vehicleType(f.id).dims).map(f => ({ id: f.id, pose: lotPose(f.spot), forSale: true }))];

export function buyVehicle(id) {
  const t = VEHICLE_TYPES[id]; if (!t || owned(id)) return false;
  if (game.cash < t.price) { say('Not enough cash.'); return false; }
  addCash(-t.price);
  const spot = FOR_SALE.find(f => f.id === id)?.spot;
  game.fleet = { ...game.fleet, [id]: { pose: spot ? lotPose(spot) : null } };
  save(); say(`Al: 'Pleasure doing business. Keys are in it.'`); return true;
}

/**
 * Make another owned vehicle the active one. The one you were using is parked where it stands.
 * The scene rebuilds around the new vehicle; you stay on foot unless `enter`.
 */
export function switchTo(id, enter = false) {
  if (!owned(id) || id === game.active) return false;
  const now = game.pose ? { x: game.pose.x, z: game.pose.z, h: game.pose.h } : null;
  const next = game.fleet[id].pose;
  game.fleet = { ...game.fleet, [game.active]: { ...game.fleet[game.active], pose: now }, [id]: { ...game.fleet[id], pose: null } };
  game.active = id;
  game.pose = next; game.keepPose = true;
  if (game.onFoot && game.walkPose) game.walkStart = { ...game.walkPose };
  game.open = new Set();
  game.pendingEnter = enter;
  save(); return true;
}

/** a parked vehicle's footprint in its own frame (for walking into it / standing next to it) */
export function localTo(pose, x, z) {
  const dx = x - pose.x, dz = z - pose.z, c = Math.cos(pose.h), s = Math.sin(pose.h);
  return { lx: dx * c - dz * s, lz: dx * s + dz * c };
}

if (typeof window !== 'undefined') window.__fleet = { standingVehicles, lotPose, localTo };   // test hook
