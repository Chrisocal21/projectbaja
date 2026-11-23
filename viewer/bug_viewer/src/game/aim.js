// One shared "is the crosshair really on it?" rule for E, left-click, prompts and furniture pick-up.
// Pure maths, no three.js: origin {x,y,z} = camera position, dir {x,y,z} = unit look direction (pitch included).

/** unit look direction from yaw/pitch (camera rotation order YXZ, yaw 0 looks down -z) */
export function lookDir(yaw, pitch) { const c = Math.cos(pitch); return { x: -Math.sin(yaw) * c, y: Math.sin(pitch), z: -Math.cos(yaw) * c }; }

/** Does the view ray pass within `r` metres of a vertical post (centre x,z; from y0 up to y0+h), no further than `reach` metres (straight line) ahead?
 *  Closest approach between the ray (t >= 0) and the vertical segment. */
export function aimsAt(origin, dir, t, reach = 7) { return aimDist(origin, dir, t, reach) !== null; }
/** the distance along the ray to the first point of the post it passes through, or null if the ray misses it */
export function aimDist(origin, dir, t, reach = 7) {
  const h = t.h ?? 1, r = t.r ?? 0.5, y0 = t.y ?? 0, n = h > 0.05 ? 16 : 1;
  let first = null;
  for (let i = 0; i <= n; i++) {
    const qy = y0 + (n === 1 ? h / 2 : h * i / n), vx = t.x - origin.x, vy = qy - origin.y, vz = t.z - origin.z;
    const s = vx * dir.x + vy * dir.y + vz * dir.z;               // distance along the ray to the closest point
    if (s < 0.05) continue;                                       // behind (or on top of) the camera
    const dist = Math.hypot(vx - s * dir.x, vy - s * dir.y, vz - s * dir.z);
    if (dist <= r && Math.hypot(vx, vy, vz) <= reach + r && (first === null || s < first)) first = s;
  }
  return first;
}

/** Same for a yaw-rotated box: centre x,z, floor y, half sizes hx (across), hz (along), height h, yaw (heading, as in pose.h: forward = (sin h, cos h)). */
export function aimsAtBox(origin, dir, b, reach = 7) {
  const sn = Math.sin(b.yaw || 0), cs = Math.cos(b.yaw || 0), y0 = b.y ?? 0;
  const loc = (x, z) => { const dx = x - b.x, dz = z - b.z; return [dx * cs - dz * sn, dx * sn + dz * cs]; };   // local lx (across), lz (along)
  const [ox, oz] = loc(origin.x, origin.z), [dx, dz] = [dir.x * cs - dir.z * sn, dir.x * sn + dir.z * cs];
  let t0 = 0.05, t1 = reach + Math.max(b.hx, b.hz);
  for (const [o, d, lo, hi] of [[ox, dx, -b.hx, b.hx], [oz, dz, -b.hz, b.hz], [origin.y, dir.y, y0, y0 + b.h]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; continue; }
    let a = (lo - o) / d, c = (hi - o) / d; if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return false;
  }
  return t0 <= reach + Math.max(b.hx, b.hz);
}

/** Is a solid wall between the eye and a target at (tx, tz)? walls = obstacle circles [x, z, r, top] with top 99. Samples along the flat line from the eye;
 *  the last `skip` metres before the target are ignored so a thing standing against a wall on your side can still be reached. */
export function wallBlocks(origin, tx, tz, walls, skip = 0.15) {
  const dx = tx - origin.x, dz = tz - origin.z, len = Math.hypot(dx, dz); if (len < 0.3) return false;
  const steps = Math.ceil(len / 0.2);
  for (let i = 1; i < steps; i++) {
    const t = i / steps, d = len * t; if (len - d < skip) break;
    const x = origin.x + dx * t, z = origin.z + dz * t;
    for (const w of walls) if (Math.abs(x - w[0]) <= w[2] + 0.05 && Math.abs(z - w[1]) <= w[2] + 0.05 && Math.hypot(x - w[0], z - w[1]) <= w[2] + 0.05) return true;
  }
  return false;
}
