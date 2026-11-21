// Which restorable vehicle are you standing at? (PURE: no game state, loads under node)
// The game used to work on exactly one car (the Bug). Now any restorable vehicle can be worked on in place: the Bug, donor wrecks, the El Cajon.
//   vehicles: [{ id, pose: { x, z, h }, width, length, ... }]   player: { x, z }
// Frame: the same as Walker's carLocal / game/fleet.js localTo: lx across (+ = the car's left), lz along (+ = forward).

export function toLocal(pose, x, z) {
  const dx = x - pose.x, dz = z - pose.z, c = Math.cos(pose.h), s = Math.sin(pose.h);
  return { lx: dx * c - dz * s, lz: dx * s + dz * c };
}

/** the nearest vehicle whose footprint (grown by `reach` metres) you stand in, or null -> { id, v, lx, lz } */
export function pickWork(player, vehicles, reach = 1.5) {
  let best = null;
  for (const v of vehicles) {
    if (!v?.pose) continue;
    const { lx, lz } = toLocal(v.pose, player.x, player.z);
    if (Math.abs(lx) >= v.width / 2 + reach || Math.abs(lz) >= v.length / 2 + reach) continue;
    const d = Math.hypot(lx, lz);
    if (!best || d < best.d) best = { id: v.id, v, lx, lz, d };
  }
  return best && { id: best.id, v: best.v, lx: best.lx, lz: best.lz };
}
