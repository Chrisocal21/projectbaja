// What each tire is standing on (physics milestone 3; PURE). One formula for the ground under the car's middle (HUD, steering aid, sound, dust)
// and for the ground under each wheel (the grip and rolling drag the solver uses). docs/vehicle-physics/PHYSICS_AUDIT.md
import { pressureEffect } from './vehiclePhysics.js';

export const TIRE_BASE = 1.5;   // base off-road tire grip on top of the surface's own number (was 1.25: more grip, Nov 21)
export const REQUERY = 0.4;     // metres a wheel rolls before its ground is looked up again (the county lookup is not free)

/** a surface under one tire: sf = world.surface(x, z), wade = metres of water there, psi = tire pressure, tire = the fitted tires { mu, rr, surf } */
export function tireGround(sf, { wade = 0, psi, tire }) {
  const fx = pressureEffect(psi, sf.key), dry = sf.mu * fx.grip * tire.mu * (tire.surf?.[sf.gk || sf.key] ?? 1) * TIRE_BASE;
  return {
    name: wade > 0.05 ? 'Water crossing' : sf.name, key: sf.key, dryMu: dry, fx,
    mu: dry * (1 - 0.4 * Math.min(1, wade / 0.4)), rr: sf.rr * fx.rr * tire.rr * (1 + 6 * Math.min(1, wade / 0.5)),
  };
}

/** remembers the ground under each wheel: at(i, x, z, stamp, look) calls look(x, z) only after the wheel has rolled REQUERY m, or when stamp changes
 *  (a different map, tires or pressure) */
export function createWheelGround() {
  const seen = [];
  return {
    at(i, x, z, stamp, look) {
      const c = seen[i];
      if (c && c.stamp === stamp && Math.abs(x - c.x) < REQUERY && Math.abs(z - c.z) < REQUERY) return c.value;
      const value = look(x, z); seen[i] = { x, z, stamp, value }; return value;
    },
    clear() { seen.length = 0; },
  };
}
