// Where a part you just took off lands: on the ground near you, NOT under the car and NOT on top of another loose part. PURE maths.
//   player { x, z }   face { x, z } unit vector you look along   car { x, z, h, width, length } or null   others [{ x, z }]
// Tries spots on rings around the player, those in front of you first, and takes the first one clear of the car and of other parts.
const RINGS = [1.5, 2.1, 2.7, 3.3];
const ANGLES = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 2.1, -2.1, 3.14];

function inCar(car, x, z, margin) {
  if (Array.isArray(car)) return car.some(c => inCar(c, x, z, margin));   // several vehicles: not under any of them
  if (!car) return false;
  const c = Math.cos(car.h), s = Math.sin(car.h), dx = x - car.x, dz = z - car.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;   // same car frame as Walker's carLocal
  return Math.abs(lx) < car.width / 2 + margin && Math.abs(lz) < car.length / 2 + margin;
}

export function dropSpot(player, face, car, others = [], { gap = 0.8, carMargin = 0.35 } = {}) {
  const base = Math.atan2(face.z, face.x);
  let fallback = null;
  for (const r of RINGS) for (const a of ANGLES) {
    const x = player.x + Math.cos(base + a) * r, z = player.z + Math.sin(base + a) * r;
    if (inCar(car, x, z, carMargin)) continue;
    fallback ||= { x, z };
    if (others.every(o => Math.hypot(o.x - x, o.z - z) >= gap)) return { x, z };
  }
  return fallback || { x: player.x + face.x * 1.5, z: player.z + face.z * 1.5 };   // crowded: stack it near, still outside the car if there was any room
}
