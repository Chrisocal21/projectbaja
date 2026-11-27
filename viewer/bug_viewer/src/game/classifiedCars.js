// Trucks private sellers post in the phone's Classifieds (pure data). Each is a Meshy model with its own four wheel meshes (VEH_M_*_Drive.glb,
// assets/pipeline/pilot_pickup_wheels.py): Wheel_FL/FR/RL/RR with the node origin at the hub, so the drive rig spins and steers them.
// Hubs and tire radius come from ChatGPT's table in docs/CHATGPT_HANDOFF.md. Names, prices, condition and handling are PROPOSAL; no real makes.
import { OFFROAD_TRUCK } from '../handlingProfiles.js';

/** file, hubs [FL, FR, RL, RR] as [x, z] in the GLB, tire radius, the model's size, and the truck's own numbers */
const RAW = [
  { id: 'cfBlueHalfton', file: 'VEH_M_BlueRustPickup_Drive', hubs: [[0.887, 1.881], [-0.887, 1.881], [0.887, -1.367], [-0.887, -1.367]], r: 0.392, size: [2.1, 5.3], eye: [1.62, 0.33],
    name: 'Blue half-ton pickup', price: 2600, topSpeed: 36, accelMul: 0.8, pitch: 'Long bed, rusty everywhere, starts every time. Bald tires.', condition: { Paint: 30, Interior: 45, Engine: 70, Frame: 66 } },
  { id: 'cfTwoTone', file: 'VEH_M_BlueTwoTone_Drive', hubs: [[0.913, 1.866], [-0.928, 1.866], [0.913, -1.329], [-0.928, -1.329]], r: 0.43, size: [2.2, 5.2], eye: [1.74, 0.32],
    name: 'Two-tone 4x4 pickup', price: 4200, topSpeed: 38, accelMul: 0.85, pitch: 'Lifted on big tires, straight body, two-tone paint. Owner kept it nice.', condition: { Paint: 68, Interior: 60, Engine: 78, Frame: 80 } },
  { id: 'cfBrownCrew', file: 'VEH_M_BrownRustPickup_Drive', hubs: [[0.918, 1.643], [-0.915, 1.643], [0.918, -1.506], [-0.915, -1.506]], r: 0.402, size: [2.2, 5.3], eye: [1.62, 0.2],
    name: 'Rusted crew-cab 4x4', price: 3300, topSpeed: 37, accelMul: 0.85, pitch: 'Crew cab with a bed cage and spare tires. Rust holes, strong motor.', condition: { Paint: 18, Interior: 40, Engine: 82, Frame: 58 } },
  { id: 'cfDarkExt', file: 'VEH_M_DarkRustPickup_Drive', hubs: [[1.116, 1.758], [-0.746, 1.758], [1.116, -1.391], [-0.746, -1.391]], r: 0.4, size: [2.2, 5.2], eye: [1.62, 0.3],
    name: 'Beat-up extended-cab pickup', price: 1500, topSpeed: 34, accelMul: 0.75, pitch: "Driver's door won't shut. Runs rough, light bar works. Cheap.", condition: { Paint: 15, Interior: 20, Engine: 55, Frame: 50 } },
];

/** the drive sim's dimensions, with the model centred between its hubs (shiftX moves the model so the hubs straddle x = 0) */
function truckOf(t) {
  const shiftX = -(t.hubs[0][0] + t.hubs[1][0]) / 2, half = (t.hubs[0][0] - t.hubs[1][0]) / 2, names = ['FL', 'FR', 'RL', 'RR'];
  const mounts = t.hubs.map(([x, z], i) => ({ name: names[i], radius: t.r, center: [x + shiftX, t.r, z], halfWidth: 0.14 }));
  return {
    id: t.id, name: t.name, price: t.price, kind: 'truck', classified: true, file: t.file, shiftX, length: t.size[1], width: t.size[0], pitch: t.pitch, condition: t.condition,
    storage: { cab: { cap: 16, max: 3, label: 'cab' }, bed: { cap: 80, max: 4, label: 'bed' } },   // same room as the '84 pickup (PROPOSAL)
    dims: { wheelbase: t.hubs[0][1] - t.hubs[2][1], track: half * 2, cabEye: [0.38, t.eye[0], t.eye[1]], lift: 0, bellyHeight: t.r - 0.03, offroad: true, handling: OFFROAD_TRUCK,
      topSpeed: t.topSpeed, accelMul: t.accelMul, tire: { mu: 1.0, rr: 1, surf: {} }, mounts },
  };
}
export const CLASSIFIED_CARS = Object.fromEntries(RAW.map(t => [t.id, truckOf(t)]));
