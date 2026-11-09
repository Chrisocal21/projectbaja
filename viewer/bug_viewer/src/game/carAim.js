// Precise car interaction (Controls C, PROPOSAL): which part of the car the crosshair is on.
// Pure maths, no game state. A door only opens when you look at its handle, the hood or engine lid only when you look at that panel,
// and you only sit when you look at a seat (through the window). Looking at the body anywhere else does nothing.
import { aimsAtBox } from './aim.js';

// Boxes in car space: lx across (+ = the car's left = driver's side), lz along (+ = forward), y above the floor. Sizes are guesses (PROPOSAL).
const PARTS = [
  { id: 'doorL',  lx: 0.8,  lz: 0.0,  hx: 0.3,  hz: 0.3,  y: 0.7,  h: 0.4 },    // driver door handle
  { id: 'doorR',  lx: -0.8, lz: 0.0,  hx: 0.3,  hz: 0.3,  y: 0.7,  h: 0.4 },    // passenger door handle
  { id: 'hood',   lx: 0,    lz: 1.5,  hx: 0.75, hz: 0.55, y: 0.3,  h: 0.6 },    // front hood panel
  { id: 'lid',    lx: 0,    lz: -1.5, hx: 0.75, hz: 0.55, y: 0.3,  h: 0.8 },    // rear engine lid
  { id: 'seatL',  lx: 0.4,  lz: -0.1, hx: 0.4,  hz: 0.5,  y: 0.35, h: 0.8 },    // driver seat
  { id: 'seatR',  lx: -0.4, lz: -0.1, hx: 0.4,  hz: 0.5,  y: 0.35, h: 0.8 },    // passenger seat
];

/** the part of the car the view ray is on, or null. eye/look as in game/aim.js; pose = { x, z, h } of the car; floorY = the floor you stand on. First match wins (handles before panels before seats). */
export function carPartAim(eye, look, pose, floorY = 0, reach = 4.5) {
  const c = Math.cos(pose.h), s = Math.sin(pose.h);
  for (const p of PARTS) {
    const x = pose.x + c * p.lx + s * p.lz, z = pose.z - s * p.lx + c * p.lz;
    if (aimsAtBox(eye, look, { x, z, y: floorY + p.y, hx: p.hx, hz: p.hz, h: p.h, yaw: pose.h }, reach)) return p.id;
  }
  return null;
}
