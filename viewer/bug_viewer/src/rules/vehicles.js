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
    engineLid: { piece: 'engineLid', name: 'engine lid', zone: 'rear', hinge: 'front', angle: 1.4, extra: ['B_LicensePlate', 'B_BackHandle'] },   // plate + handle/plate light are bolted to the lid
    doorL: { piece: 'doorL', name: "driver's door", zone: 'driver', axis: 'y', side: 1, angle: -1.0 },
    doorR: { piece: 'doorR', name: 'passenger door', zone: 'passenger', axis: 'y', side: -1, angle: 1.0 },
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
    S('nosePanel', 'Front apron', { piece: 'nosePanel', after: ['frontBumper'], size: 2, zone: 'front' }),
    S('tailPanel', 'Rear apron', { piece: 'tailPanel', after: ['rearBumper'], size: 2, zone: 'rear' }),
    S('rearWindow', 'Rear window', { piece: 'rearWindow', size: 2, zone: 'rear' }),
    S('sideWindows', 'Rear quarter windows', { piece: 'sideWindows', size: 1 }),
    S('turnSignals', 'Turn signals', { piece: 'turnSignals', after: ['fenderFL', 'fenderFR'], size: 1, zone: 'front' }),
    S('sideTrim', 'Running boards & trim', { piece: 'sideTrim', size: 3 }),
    S('hoodTrim', 'Hood trim & badge', { piece: 'hoodTrim', after: ['hoodPanel'], size: 1, zone: 'front' }),
    S('handles', 'Engine lid handle', { piece: 'handles', after: ['engineLid'], size: 1, zone: 'rear' }),
    S('plate', 'License plate', { piece: 'plate', size: 1, zone: 'rear' }),
    S('pedals', 'Pedals', { piece: 'pedals', cover: 'doorL', size: 1, fn: 'drive', zone: 'driver' }),
    S('mats', 'Floor mats', { piece: 'mats', size: 1 }),
    S('wheelFL', 'Front-left wheel', { wheel: 'FL', tool: 'jack', size: 3, fn: 'grip', zone: 'front' }),
    S('wheelFR', 'Front-right wheel', { wheel: 'FR', tool: 'jack', size: 3, fn: 'grip', zone: 'front' }),
    S('wheelRL', 'Rear-left wheel', { wheel: 'RL', tool: 'jack', size: 3, fn: 'grip', zone: 'rear' }),
    S('wheelRR', 'Rear-right wheel', { wheel: 'RR', tool: 'jack', size: 3, fn: 'grip', zone: 'rear' }),
  ],
  storage: { cab: 30, roof: 30 },
  // the body shell: everything with a body piece mounts on it, so it only lifts off a stripped car (garage hoist)
  shell: { id: 'shell', name: 'Body shell', size: 9, tool: 'hoist' },   // roof deck only with a roof rack fitted
  camera: { height: 1.3, dist: 9 },
  // Al sells it with a dead battery pulled out: your first job is getting it running
  soldStripped: ['battery'],
};

/** catalog upgrade slots → where/how they are fitted (blueprint §3.7: upgrades are alternatives for a slot) */
export const UPGRADE_FIT = {
  engine: { zone: 'rear', tool: 'hoist', cover: 'engineLid' },
  engineCarb: { zone: 'rear', cover: 'engineLid', needsEngine: true }, engineIgnition: { zone: 'rear', cover: 'engineLid', needsEngine: true },
  engineCooling: { zone: 'rear', cover: 'engineLid', needsEngine: true }, engineBore: { zone: 'rear', cover: 'engineLid', tool: 'hoist', needsEngine: true },
  exhaust: { zone: 'rear' }, rearBumper: { zone: 'rear' }, rearCarrier: { zone: 'rear' }, rearLights: { zone: 'rear' }, rearDeck: { zone: 'rear' },
  frontBumper: { zone: 'front' }, hood: { zone: 'front' }, frontLights: { zone: 'front' }, fenders: { zone: 'any' },
  suspension: { tool: 'jack', zone: 'any' }, shocks: { tool: 'jack', zone: 'any' }, lift: { tool: 'jack', zone: 'any' },
};
export const WHEEL_FIT = { tool: 'jack', zone: 'any' };

BUG.slots.push(S('shell', 'Body shell', { tool: 'hoist', size: 9, zone: 'any' }));
for (const s of BUG.slots) if (s.piece) s.after = [...s.after, 'shell'];

/**
 * The El Cajon: a 1960s coupe utility (PROPOSAL: its parts list is Salvage Road's, src/rules/carParts.ts, with Baja's access rules on top).
 * Slot ids all start with "ec" so a loose part can never be mistaken for a Bug part (an El Cajon hood is not the Bug's hoodPanel).
 * `piece` is the name of the part's group in cajon/model.js. Its builds carry `def: 'cajon'` (see defOfBuild).
 * The body shell is not a slot: the field shell cannot be lifted off (Bug-only for now).
 */
export const CAJON = {
  id: 'cajon', name: "'66 El Cajon",
  length: 5.5, width: 2.0,   // the model is 5.54 m bumper to bumper and 1.98 m across the bumpers (cajon/model.js)
  zones: { front: 0.3, rear: -0.4 },   // the cab is short and the bed is long: the front zone starts at the windshield, the rear zone at the bed
  covers: {
    ecHood: { piece: 'hood', name: 'hood', zone: 'front' },
    ecDoorL: { piece: 'driver_door', name: "driver's door", zone: 'driver', side: 1 },
    ecDoorR: { piece: 'passenger_door', name: 'passenger door', zone: 'passenger', side: -1 },
    ecTailgate: { piece: 'tailgate', name: 'tailgate', zone: 'rear' },
  },
  // hub centres in the car's frame (x + = left, z + = forward, y up): the model's axles are at +1.8 and -1.3, the track is 1.8 m
  mounts: { FL: { center: [0.9, 0.38, 1.8], radius: 0.38 }, FR: { center: [-0.9, 0.38, 1.8], radius: 0.38 }, RL: { center: [0.9, 0.38, -1.3], radius: 0.38 }, RR: { center: [-0.9, 0.38, -1.3], radius: 0.38 } },
  slots: [
    S('ecEngine', 'Engine', { part: 'engine', cover: 'ecHood', tool: 'hoist', size: 4, fn: 'start', zone: 'front' }),   // part = the model's group for a slot that has no body `piece` (it is stripped, not hidden)
    S('ecBattery', 'Battery', { part: 'battery', after: ['ecEngine'], cover: 'ecHood', size: 1, fn: 'start', zone: 'front' }),
    S('ecHood', 'Hood', { piece: 'hood', size: 3, zone: 'front' }),
    S('ecGrille', 'Grille', { piece: 'grille', after: ['ecEngine'], size: 2, zone: 'front' }),
    S('ecHeadlights', 'Headlights', { piece: 'headlights', after: ['ecGrille'], size: 1, zone: 'front' }),
    S('ecFrontBumper', 'Front bumper', { piece: 'front_bumper', size: 3, zone: 'front' }),
    S('ecRearBumper', 'Rear bumper', { piece: 'rear_bumper', size: 3, zone: 'rear' }),
    S('ecTailgate', 'Tailgate', { piece: 'tailgate', size: 3, zone: 'rear' }),
    S('ecSeat', 'Bench seat', { piece: 'seat', cover: 'ecDoorL', size: 3, fn: 'drive', zone: 'cabin' }),
    S('ecDash', 'Dashboard', { piece: 'dash', cover: 'ecDoorL', size: 2, zone: 'cabin' }),
    S('ecSteering', 'Steering wheel', { piece: 'steering_wheel', after: ['ecDash'], cover: 'ecDoorL', size: 1, fn: 'steer', zone: 'driver' }),
    S('ecWindshield', 'Windshield', { piece: 'windshield', after: ['ecDash'], size: 3, zone: 'front' }),
    S('ecDoorL', "Driver's door", { piece: 'driver_door', after: ['ecDash', 'ecSeat'], size: 3, zone: 'driver' }),
    S('ecDoorR', 'Passenger door', { piece: 'passenger_door', after: ['ecDash', 'ecSeat'], size: 3, zone: 'passenger' }),
    S('ecWheelFL', 'Front-left wheel', { wheel: 'FL', tool: 'jack', size: 3, fn: 'grip', zone: 'front' }),
    S('ecWheelFR', 'Front-right wheel', { wheel: 'FR', tool: 'jack', size: 3, fn: 'grip', zone: 'front' }),
    S('ecWheelRL', 'Rear-left wheel', { wheel: 'RL', tool: 'jack', size: 3, fn: 'grip', zone: 'rear' }),
    S('ecWheelRR', 'Rear-right wheel', { wheel: 'RR', tool: 'jack', size: 3, fn: 'grip', zone: 'rear' }),
  ],
  storage: { cab: 16, bed: 80 },
};

export const VEHICLES = { bug: BUG, cajon: CAJON };
/** the name of a slot's group in an El Cajon model: its body piece, or `part` for the engine and battery (which are stripped, not hidden) */
export const groupOf = slot => slot.piece || slot.part || null;
/** a build knows which vehicle it belongs to: Cajon builds say def: 'cajon'; everything else is the Bug (old saves have no def) */
export const defOfBuild = b => VEHICLES[b?.def] || BUG;
export const slotById = (def, id) => def.slots.find(s => s.id === id);
