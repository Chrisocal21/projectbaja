// Find a clear place to put a vehicle (pure). A vehicle is a row of circles along its length; a spot is clear when none of them touch an obstacle circle ([x, z, r, ...]).
export const vehicleRow = (pose, length, width = 2) => {
  const n = Math.max(2, Math.ceil(length / 1.6)), r = Math.max(1, width / 2 + 0.1), out = [];
  for (let k = 0; k < n; k++) { const o = (k / (n - 1) - 0.5) * (length - 2 * r); out.push([pose.x + Math.sin(pose.h) * o, pose.z + Math.cos(pose.h) * o, r]); }
  return out;
};
export const spotClear = (pose, length, width, circles, margin = 0.4) => vehicleRow(pose, length, width).every(([x, z, r]) => circles.every(c => Math.hypot(x - c[0], z - c[1]) >= r + c[2] + margin));
/** first clear pose: the wanted one, then `extra` poses in order (for example open lot stalls), then rings around the wanted one, nearest first. null if nothing fits. */
export function clearSpot(want, length, width, circles, extra = []) {
  const tries = [want, ...extra];
  for (let rad = 4; rad <= 28; rad += 2) for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; tries.push({ x: want.x + Math.cos(a) * rad, z: want.z + Math.sin(a) * rad, h: want.h }); }
  return tries.find(p => spotClear(p, length, width, circles)) || null;
}
