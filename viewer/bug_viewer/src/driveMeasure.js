// Headless driving measurements (PURE): the same car, same input, on each surface. Answers "how far to stop" and "how long to 20 m/s" as numbers,
// so a tire swap or a surface change is measured, not felt. Research test ids: DRV-002 / 003 (stopping), DRV-004 (tire swap), DRV-001 (acceleration).
import { createBody, stepBody, readBody } from './rigid.js';
import { SURFACE_DATA, STD_ROLL } from './vehiclePhysics.js';
import wheels from './catalog/wheels.json' with { type: 'json' };

const STEP = 1 / 120;
/** a plain Bug-sized test car on four 0.38 m wheels (the same shape rigid.test.js uses) */
export const TEST_DIMS = {
  wheelbase: 2.38, track: 1.5, offroad: true, lift: 0, bellyHeight: 0.28, cabEye: [0.31, 1.32, -0.15],
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({ name, radius: 0.38, center: [name.endsWith('L') ? 0.75 : -0.75, 0.38, name.startsWith('F') ? 1.19 : -1.19] })),
};
/** the catalog tire's grip on a surface, as DriveWorld.jsx reads it: { grip, roll } multipliers. Unknown id = a neutral tire. */
export const tireMods = (id, surface) => { const t = (wheels.wheels || wheels).find?.(w => w.id === id)?.grip; return t ? { grip: t.mu * (t.surf[surface] ?? 1), roll: t.rr } : { grip: 1, roll: 1 }; };
/** env for a surface key; grip / roll are multipliers for a different tire, wear or pressure; tire: a catalog wheel id. The game also multiplies grip by 1.5 (DriveWorld.jsx), so it is here. */
export const envFor = (surface, { grip = 1, roll = 1, tire } = {}) => { const s = SURFACE_DATA[surface], t = tire ? tireMods(tire, surface) : { grip: 1, roll: 1 }; return { height: () => 0, mu: s.grip * grip * t.grip * 1.5, rr: (s.rrCoef / STD_ROLL) * roll * t.roll, ACC: 11, MAXV: 40, DRG: 0.3 * 11 / 1600 }; };

const settle = (b, env) => { for (let i = 0; i < 2 * 120; i++) stepBody(b, TEST_DIMS, { throttle: 0, brake: false, steer: 0 }, env, STEP); };
/** metres to stop from `v0` m/s with the brake held (the handbrake path in rigid.js: the car's only brake input) */
export function stopDistance(surface, opts = {}, v0 = 20) {
  const env = envFor(surface, opts), b = createBody(TEST_DIMS, { y: 0.3 }); settle(b, env);
  b.vel.set(0, 0, v0); const x0 = b.c.z;
  for (let i = 0; i < 12 * 120; i++) { stepBody(b, TEST_DIMS, { throttle: 0, brake: true, steer: 0 }, env, STEP); if (b.vel.length() < 0.2) break; }
  return Math.abs(b.c.z - x0);
}
/** seconds from standstill to `v1` m/s at full throttle (Infinity if it never gets there in 20 s) */
export function timeTo(surface, opts = {}, v1 = 15) {
  const env = envFor(surface, opts), b = createBody(TEST_DIMS, { y: 0.3 }); settle(b, env);
  for (let i = 0; i < 20 * 120; i++) { stepBody(b, TEST_DIMS, { throttle: 1, brake: false, steer: 0 }, env, STEP); if (readBody(b, {}).v >= v1) return (i + 1) * STEP; }
  return Infinity;
}
