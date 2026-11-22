// A real rigid-body car: one mass with a full 3-D orientation (quaternion), four spring-damper wheels, a friction-circle tire at each contact patch,
// and a body shell that rests on the ground when the wheels cannot. Nothing is faked per axis (no separate pitch / roll angles), so a car that leaves
// the ground tumbles like a car, lands on whatever hits first, slides to a stop on its side or roof, and cannot spin forever or stick in a pose.
// Pure (no React): runs in node for the tests. Axes in body space: +x = the car's left, +y = up, +z = forward. The body origin sits on the ground between the tires.
import * as THREE from 'three';
import { wheelSteerAngle } from './suspension.js';

export const MASS = 1000, G = 9.81;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Q = () => new THREE.Quaternion();
const UP = V(0, 1, 0);
const clamp = THREE.MathUtils.clamp;

export function suspensionSpec(dims) {
  return {
    compression: dims.offroad ? 0.42 : 0.15, droop: dims.offroad ? 0.26 : 0.14,
    stiffness: dims.offroad ? 17000 : 34000, damping: dims.offroad ? 3400 : 3000, antiRoll: dims.offroad ? 14000 : 18000,
  };
}

/** centre of mass (body space), inertia and the points of the shell that can touch the ground */
export function bodyShape(dims) {
  const hub = dims.mounts[0].center[1], fz = dims.mounts.find(m => m.name === 'FL')?.center[2] ?? 1.19, rz = dims.mounts.find(m => m.name === 'RL')?.center[2] ?? -1.19;
  const L = dims.wheelbase + 1.3, W = dims.track + 0.2, H = 1.1;
  const mass = dims.mass || MASS, com = V(0, dims.cgY ?? hub + 0.17, dims.cgFromRear != null ? rz + dims.cgFromRear : fz * 0.42 + rz * 0.58);   // rear engine: 58% of the weight on the rear axle, so no pitch torque at rest
  const I = V(mass * (H * H + L * L) / 12 * 1.3, mass * (W * W + L * L) / 12 * 1.2, mass * (W * W + H * H) / 12 * 1.6);
  const roofY = (dims.cabEye ? dims.cabEye[1] : dims.bellyHeight + 1.1) + 0.2, hull = [];
  for (const x of [-dims.track * 0.35, 0, dims.track * 0.35]) for (const z of [-dims.wheelbase / 2 - 0.4, 0, dims.wheelbase / 2 + 0.4]) hull.push(V(x, dims.bellyHeight + (z === 0 ? 0 : 0.2), z));
  for (const x of [-dims.track * 0.3, dims.track * 0.3]) for (const z of [-dims.wheelbase * 0.2, dims.wheelbase * 0.2, dims.wheelbase * 0.38]) hull.push(V(x, roofY, z));
  for (const x of [-dims.track / 2 - 0.15, dims.track / 2 + 0.15]) for (const z of [-dims.wheelbase * 0.35, 0, dims.wheelbase * 0.35]) hull.push(V(x, dims.bellyHeight + 0.45, z));
  for (const x of [-dims.track * 0.32, dims.track * 0.32]) hull.push(V(x, roofY - 0.3, dims.wheelbase * 0.5), V(x, roofY - 0.3, -dims.wheelbase * 0.5));   // windshield base and rear deck
  return { com, I, hull, mass };
}

const SAMPLES = (r, hw) => { const out = []; for (let i = 0; i <= 6; i++) { const a = (i / 6 - 0.5) * Math.PI; out.push(V(0, -Math.cos(a) * r, Math.sin(a) * r)); } out.push(V(-hw, -r, 0), V(hw, -r, 0)); return out; };

/** a new body at ground origin (x, y, z) facing heading h, travelling v m/s forward */
export function createBody(dims, { x = 0, y = 0, z = 0, h = 0, v = 0, lateralV = 0 } = {}) {
  const shape = bodyShape(dims), q = Q().setFromAxisAngle(UP, h);
  const c = shape.com.clone().applyQuaternion(q).add(V(x, y, z));
  const vel = V(Math.sin(h) * v + Math.cos(h) * lateralV, 0, Math.cos(h) * v - Math.sin(h) * lateralV);
  return { c, q, vel, w: V(), shape, xs: dims.mounts.map(() => 0), travel: dims.mounts.map(() => 0), samples: dims.mounts.map(m => SAMPLES(m.radius, m.halfWidth ?? 0.14)), contacts: 4, touch: false, slip: 0, wheels: [], load: 0 };
}

export function bodyOrigin(b, out = V()) { return out.copy(b.shape.com).applyQuaternion(b.q).negate().add(b.c); }

const tmpA = V(), tmpB = V(), tmpC = V(), tmpD = V();

/** one fixed step. ctl: { throttle -1..1, brake bool (handbrake), steer rad }; env: { height(x,z), mu, rr, ACC, MAXV, DRG } */
export function stepBody(b, dims, ctl, env, dt) {
  const cfg = suspensionSpec(dims), { q, c, vel, w, shape } = b, mounts = dims.mounts, hf = env.height;
  const M = shape.mass;   // this car's mass (from its fitted parts); engine force and air drag stay fixed so a heavier car is slower
  const up = V(0, 1, 0).applyQuaternion(q), fwdB = V(0, 0, 1).applyQuaternion(q);
  const origin = bodyOrigin(b, V());
  const F = V(0, -M * G, 0), T = V();
  const push = (f, p) => { F.add(f); T.add(tmpD.copy(p).sub(c).cross(f)); };
  const vcar = vel.x * fwdB.x + vel.z * fwdB.z, fl = Math.hypot(fwdB.x, fwdB.z) || 1, speed = vcar / fl;   // forward speed along the heading
  const mu = env.mu, ACC = env.ACC * 0.75;

  // ---- wheel kinematics: where the ground is under each tire, and how far that squeezes the spring ----
  const info = mounts.map((m, i) => {
    const steerA = wheelSteerAngle(ctl.steer, m.name, dims), wq = q.clone().multiply(Q().setFromAxisAngle(UP, steerA));
    const nominal = V(...m.center).applyQuaternion(q).add(origin);
    let sup = -Infinity;
    if (up.y > 0.05) for (const s of b.samples[i]) { const p = tmpA.copy(s).applyQuaternion(wq); sup = Math.max(sup, hf(nominal.x + p.x, nominal.z + p.z) - p.y); }
    const needed = up.y > 0.05 ? (sup + 0.005 - nominal.y) / up.y : -1;
    return { m, i, wq, nominal, needed, x: clamp(needed, -cfg.droop, cfg.compression), touching: needed >= -cfg.droop - 0.002 };
  });
  // ---- spring + damper + bump stop + anti-roll bar: the load each tire carries ----
  for (const o of info) {
    o.preload = M * G * (o.m.name.startsWith('F') ? 0.21 : 0.29);
    const xdot = clamp((o.x - b.xs[o.i]) / dt, -9, 9), frac = Math.max(0, o.x) / cfg.compression;
    let N = o.preload + cfg.stiffness * o.x * (1 + 6 * frac ** 3) + (xdot > 0 ? cfg.damping * (0.3 + 2.2 * frac * frac) * xdot : cfg.damping * 3.2 * xdot);
    if (o.needed > cfg.compression) N += 160000 * (o.needed - cfg.compression);   // bottomed out: the stop is nearly solid
    o.N = N; b.xs[o.i] = o.x;
  }
  for (const axle of ['F', 'R']) {
    const l = info.find(o => o.m.name === axle + 'L'), r = info.find(o => o.m.name === axle + 'R');
    if (l.touching && r.touching) { const d = cfg.antiRoll * (l.x - r.x); l.N += d; r.N -= d; }
  }
  // ---- tires: spring load pushes along the ground normal; friction acts in the ground plane inside one friction circle ----
  let contacts = 0, slipMax = 0, loadSum = 0;
  b.wheels = info.map(o => {
    const { m } = o;
    const hubW = o.nominal.clone().addScaledVector(up, o.touching ? o.x : -cfg.droop);
    let N = 0;
    if (o.touching) {
      contacts++;
      N = clamp(o.N, 0, 90000); loadSum += N;
      const h0 = hf(hubW.x, hubW.z), n = V(-(hf(hubW.x + 0.35, hubW.z) - h0) / 0.35, 1, -(hf(hubW.x, hubW.z + 0.35) - h0) / 0.35).normalize();
      const cp = hubW.clone().addScaledVector(n, -m.radius);
      const vc = V().copy(w).cross(tmpB.copy(cp).sub(c)).add(vel);
      const wf = V(0, 0, 1).applyQuaternion(o.wq); wf.addScaledVector(n, -wf.dot(n)).normalize();
      const wl = V().crossVectors(n, wf);
      const vl = vc.dot(wf), vs = vc.dot(wl), front = m.name.startsWith('F'), cap = mu * N * (front ? 1 : 1.1);
      const sa = vs / Math.max(Math.abs(vl), 0.8);   // tan of the slip angle (floored so it behaves at a standstill)
      let Fy = -cap * Math.tanh(sa / (front ? 0.2 : 0.26));
      Fy = clamp(Fy, -Math.abs(vs) * M / 4 / dt * 0.5, Math.abs(vs) * M / 4 / dt * 0.5);   // never ask for more than stops the sideways slide in one step
      // longitudinal: engine (rear wheels), brakes (front-biased), handbrake (rear locks), rolling resistance
      let Fx = 0;
      const throttle = ctl.throttle, braking = throttle < 0 && speed > 0.5;
      if (!front && throttle > 0) Fx += MASS * ACC * Math.max(0, 1 - (speed / env.MAXV) ** 2) * throttle / 2;
      if (!front && throttle < 0 && !braking) Fx -= MASS * ACC * 0.45 * (speed > -9 ? 1 : 0) / 2;
      const sgn = clamp(vl / 0.5, -1, 1);
      if (braking) Fx -= sgn * M * 22 * (front ? 0.65 : 0.35) / 2;
      if (ctl.brake) Fx -= sgn * (front ? M * 22 * 0.3 / 2 : cap * 2);
      Fx -= clamp(vl / 0.3, -1, 1) * (0.03 * env.rr + (throttle === 0 && !front ? 0.02 : 0)) * N;
      const avail = Math.sqrt(Math.max(0, cap * cap - Fy * Fy));
      Fx = clamp(Fx, -avail, avail);
      push(V().addScaledVector(n, N).addScaledVector(wf, Fx).addScaledVector(wl, Fy), cp);
      if (!front) slipMax = Math.max(slipMax, Math.abs(Math.atan(sa)));
      o.vl = vl;
    }
    // wheel travel shown on the car: drops smoothly when airborne instead of snapping
    b.travel[o.i] = o.touching ? o.x : Math.max(-cfg.droop, b.travel[o.i] - dt * 1.2);
    b.travel[o.i] = Math.max(b.travel[o.i], Math.min(cfg.compression, o.needed));
    return { name: m.name, hub: V(...m.center).addScaledVector(UP, b.travel[o.i]), travel: b.travel[o.i], touching: o.touching, load: N, vl: o.vl || 0 };
  });
  // ---- the shell: points on the body are spring-damper contacts with sliding friction, so a rolled car rests on its roof or side and scrapes to a stop ----
  let touch = false;
  const groundUnder = hf(c.x, c.z);
  if (c.y - groundUnder < 2.2) for (const hp of shape.hull) {
    const p = tmpC.copy(hp).applyQuaternion(q).add(origin), pen = hf(p.x, p.z) + 0.025 - p.y;
    if (pen <= 0) continue;
    touch = true;
    const rel = tmpB.copy(p).sub(c), vp = V().copy(w).cross(rel).add(vel), vn = vp.y;
    const Fn = clamp(130000 * pen + 11000 * Math.max(0, -vn), 0, M * G * 14) * (contacts >= 3 ? 0.5 : 1);
    const ht = V(vp.x, 0, vp.z), hl = ht.length(), mub = 0.75;
    const f = V(0, Fn, 0);
    if (hl > 1e-4) f.addScaledVector(ht, -mub * Fn / (hl + 0.2));
    push(f, p.clone());
  }
  // ---- air drag, and a little yaw damping while the tires are down ----
  const sp = vel.length();
  F.addScaledVector(vel, -env.DRG * 0.45 * MASS * sp);
  if (contacts >= 2) T.addScaledVector(up, -0.3 * shape.I.y * w.dot(up));
  else T.addScaledVector(w, -0.02 * shape.I.y);
  // ---- integrate: forces move the centre of mass; torque turns it (Euler's equation in the body frame) ----
  vel.addScaledVector(F, dt / M);
  const qi = q.clone().invert(), wb = V().copy(w).applyQuaternion(qi), Tb = T.applyQuaternion(qi), I = shape.I;
  const al = V((Tb.x - (wb.y * I.z * wb.z - wb.z * I.y * wb.y)) / I.x, (Tb.y - (wb.z * I.x * wb.x - wb.x * I.z * wb.z)) / I.y, (Tb.z - (wb.x * I.y * wb.y - wb.y * I.x * wb.x)) / I.z);
  wb.addScaledVector(al, dt);
  w.copy(wb).applyQuaternion(q);
  c.addScaledVector(vel, dt);
  const dq = new THREE.Quaternion(w.x * dt * 0.5, w.y * dt * 0.5, w.z * dt * 0.5, 0).multiply(q);
  q.set(q.x + dq.x, q.y + dq.y, q.z + dq.z, q.w + dq.w).normalize();
  b.contacts = contacts; b.touch = touch; b.slip = slipMax; b.load = loadSum;
  return b;
}

/** stand the car back up where it lies (the recovery crew), keeping its heading */
export function uprightBody(b, dims, lift = 0.6) {
  const fwd = V(0, 0, 1).applyQuaternion(b.q), h = Math.hypot(fwd.x, fwd.z) > 0.2 ? Math.atan2(fwd.x, fwd.z) : 0;
  const o = bodyOrigin(b, V());
  b.q.setFromAxisAngle(UP, h); b.vel.set(0, 0, 0); b.w.set(0, 0, 0);
  b.c.copy(b.shape.com).applyQuaternion(b.q).add(V(o.x, o.y + lift, o.z));
}

/** the numbers the rest of the game reads (position, heading, speeds), derived from the body */
export function readBody(b, out = {}) {
  const q = b.q, fwd = V(0, 0, 1).applyQuaternion(q), left = V(1, 0, 0).applyQuaternion(q), up = V(0, 1, 0).applyQuaternion(q);
  const o = bodyOrigin(b, V());
  out.x = o.x; out.y = o.y; out.z = o.z;
  if (Math.hypot(fwd.x, fwd.z) > 0.25) out.h = Math.atan2(fwd.x, fwd.z);
  const sh = Math.sin(out.h || 0), ch = Math.cos(out.h || 0);
  out.v = b.vel.x * sh + b.vel.z * ch; out.lateralV = b.vel.x * ch - b.vel.z * sh;
  out.yr = b.w.y; out.vy = b.vel.y;
  out.pitch = Math.asin(clamp(fwd.y, -1, 1)); out.roll = Math.asin(clamp(left.y, -1, 1));
  out.upY = up.y; out.rolled = up.y < 0.25;
  out.contacts = b.contacts; out.touch = b.touch; out.air = b.contacts === 0 && !b.touch; out.slip = b.slip;
  out.wheels = b.wheels;
  return out;
}
