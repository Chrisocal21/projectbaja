// Vehicles as data (blueprint §2). A vehicle is a definition: zones you stand in, restoration slots, storage, camera.
// The driving physics still come from build.js resolve() + suspension.js; they move in here as more vehicles arrive.

/**
 * Restoration slot (blueprint §3.1)
 *   piece    - body piece id in bodies.json (show/hide by name) - omit for invisible parts (battery)
 *   catalog  - catalog slot whose upgrades also fill this slot (engine)
 *   after    - slots that must be fitted first        cover - panel that must be open to reach it
 *   tool     - wrench | jack | hoist                  size  - 1 pack ... 4 huge (hands)
 *   fn       - start | drive | steer | grip | cosmetic  zone - front | rear | driver | passenger | cabin
 */
const S = (id, name, o) => ({ id, name, after: [], tool: 'wrench', size: 2, fn: 'cosmetic', zone: 'cabin', ...o });

export const BUG = {
  id: 'bug', name: "'71 Classic Bug",
  // zones along the car, as a share of the half-length (+ = front). The Bug's engine is in the back.
  length: 4.1, width: 1.6,
  zones: { front: 0.45, rear: -0.45 },
  covers: {
    engineLid: { piece: 'engineLid', name: 'engine lid', zone: 'rear', hinge: 'front', angle: 1.15 },
    doorL: { piece: 'doorL', name: "driver's door", zone: 'driver', axis: 'y', side: 1, angle: -1.15 },
    doorR: { piece: 'doorR', name: 'passenger door', zone: 'passenger', axis: 'y', side: -1, angle: 1.15 },
    hoodPanel: { piece: 'hoodPanel', name: 'front hood', zone: 'front', hinge: 'rear', angle: -1.1, extra: ['B_HoodTrim', 'B_HoodLogo', 'B_HoodHandle'] },
  },
  slots: [
    S('engine', 'Engine', { catalog: 'engine', cover: 'engineLid', tool: 'hoist', size: 4, fn: 'start', zone: 'rear' }),
    S('battery', 'Battery', { after: ['engine'], cover: 'engineLid', size: 1, fn: 'start', zone: 'rear' }),
    S('engineLid', 'Engine lid', { piece: 'engineLid', size: 2, zone: 'rear' }),
    S('hoodPanel', 'Front hood', { piece: 'hoodPanel', size: 2, zone: 'front' }),
    S('dash', 'Dashboard', { piece: 'dash', size: 2 }),
    S('steering', 'Steering wheel', { piece: 'steering', after: ['dash'], cover: 'doorL', size: 1, fn: 'steer', zone: 'driver' }),
    S('seatDriver', "Driver's seat", { piece: 'seatDriver', cover: 'doorL', size: 2, fn: 'drive', zone: 'driver' }),
    S('seatPassenger', 'Passenger seat', { piece: 'seatPassenger', cover: 'doorR', size: 2, zone: 'passenger' }),
    S('doorL', "Driver's door", { piece: 'doorL', after: ['dash', 'seatDriver'], size: 3, zone: 'driver' }),
    S('doorR', 'Passenger door', { piece: 'doorR', after: ['dash', 'seatPassenger'], size: 3, zone: 'passenger' }),
    S('seatBack', 'Rear bench', { piece: 'seatBack', size: 3 }),
    S('windshield', 'Windshield', { piece: 'windshield', after: ['dash'], size: 3, zone: 'front' }),
    S('fenderFL', 'Front-left fender', { piece: 'fenderFL', size: 3, zone: 'front' }),
    S('fenderFR', 'Front-right fender', { piece: 'fenderFR', size: 3, zone: 'front' }),
    S('fenderRL', 'Rear-left fender', { piece: 'fenderRL', size: 3, zone: 'rear' }),
    S('fenderRR', 'Rear-right fender', { piece: 'fenderRR', size: 3, zone: 'rear' }),
    S('headlights', 'Headlights', { piece: 'headlights', after: ['fenderFL', 'fenderFR'], size: 1, zone: 'front' }),
    S('taillights', 'Taillights', { piece: 'taillights', after: ['fenderRL', 'fenderRR'], size: 1, zone: 'rear' }),
    S('frontBumper', 'Front bumper', { piece: 'frontBumperP', size: 3, zone: 'front' }),
    S('rearBumper', 'Rear bumper', { piece: 'rearBumperP', size: 3, zone: 'rear' }),
  ],
  storage: { cab: 4, roof: 6 },   // roof deck only with a roof rack fitted
  camera: { height: 1.3, dist: 9 },
  // Al sells it with a dead battery pulled out: your first job is getting it running
  soldStripped: ['battery'],
};

/** catalog upgrade slots → where/how they are fitted (blueprint §3.7: upgrades are alternatives for a slot) */
export const UPGRADE_FIT = {
  engine: { zone: 'rear', tool: 'hoist', cover: 'engineLid' },
  exhaust: { zone: 'rear' }, rearBumper: { zone: 'rear' }, rearCarrier: { zone: 'rear' }, rearLights: { zone: 'rear' }, rearDeck: { zone: 'rear' },
  frontBumper: { zone: 'front' }, hood: { zone: 'front' }, frontLights: { zone: 'front' }, fenders: { zone: 'any' },
  suspension: { tool: 'jack', zone: 'any' }, shocks: { tool: 'jack', zone: 'any' },
};
export const WHEEL_FIT = { tool: 'jack', zone: 'any' };

export const VEHICLES = { bug: BUG };
export const slotById = (def, id) => def.slots.find(s => s.id === id);
