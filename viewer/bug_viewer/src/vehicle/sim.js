// Vehicle physics core - plain JS, no React / three.js, so it is cheap and reusable for AI cars.
// Stage 1: planar rigid body (x, z, heading, forward/lateral speed, yaw rate) on flat ground, four independent wheels.
// Weight transfer is computed from filtered body accelerations; in Stage 3 the same loads come from real springs.
import { tireForce } from './tire.js';
import { surfaceAt } from './surfaces.js';

export const STEP = 1 / 120;
const G = 9.81;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** mounts: [{ name:'FL'|'FR'|'RL'|'RR', radius, center:[x(left +), y, z(forward +)] }] in model space. */
export function createCar(config, mounts) {
  const byName = Object.fromEntries(mounts.map(m => [m.name, m]));
  const zF = byName.FL.center[2], zR = byName.RL.center[2], L = zF - zR;
  const car = {
    cfg: config, L, track: Math.abs(byName.FL.center[0]) * 2,
    x: 0, z: 0, h: 0, u: 0, w: 0, r: 0,          // position, heading, forward speed, lateral speed (left +), yaw rate (left +)
    steer: 0, throttle: 0, axF: 0, ayF: 0, pitchVis: 0, rollVis: 0,
    wheels: mounts.map(m => ({ name: m.name, R: m.radius, cx: m.center[0], cz: m.center[2], front: m.name[0] === 'F',
      omega: 0, steerAngle: 0, N: 0, Fx: 0, Fy: 0, kappa: 0, alpha: 0, used: 0, surface: 'tarmac', comp: null, tmp: {} })),
    speed: 0, telemetry: null,
  };
  placeWheels(car);
  return car;
}

/** Wheel positions relative to the centre of gravity (CG sits frontWeight-fraction of the way back from the front axle). */
export function placeWheels(car) {
  const c = car.cfg, zF = Math.max(...car.wheels.map(w => w.cz)), zR = Math.min(...car.wheels.map(w => w.cz));
  car.L = zF - zR;
  const cgZ = zF - (1 - c.chassis.frontWeight) * car.L;
  for (const w of car.wheels) { w.lx = w.cx; w.lz = w.cz - cgZ; }
  car.a = zF - cgZ; car.b = cgZ - zR;
  const bw = car.track + 0.5, bl = car.L + 1.4;
  car.Iz = c.chassis.mass / 12 * (bw * bw + bl * bl) * c.chassis.inertiaScale;
}

export function resetCar(car, x = 0, z = 0, h = 0) {
  Object.assign(car, { x, z, h, u: 0, w: 0, r: 0, steer: 0, throttle: 0, axF: 0, ayF: 0, pitchVis: 0, rollVis: 0 });
  for (const w of car.wheels) w.omega = 0;
}

/** input: { throttle 0..1, brake 0..1, steer -1..1 (left +), handbrake 0..1 } */
export function stepCar(car, input, dt = STEP) {
  const n = car.cfg.substeps || 1;
  for (let i = 0; i < n; i++) sub(car, input, dt / n);
}

function ackermannAngle(car, w, delta) {
  if (!w.front || Math.abs(delta) < 1e-5) return w.front ? delta : 0;
  const R = car.L / Math.tan(delta);                       // signed turn radius (left turn = +)
  const true_ = Math.atan(car.L / (R - w.lx));
  return delta + (true_ - delta) * car.cfg.steer.ackermann;
}

function sub(car, input, dt) {
  const c = car.cfg, m = c.chassis.mass, W = car.wheels;
  const u = car.u, speed = Math.hypot(car.u, car.w);
  car.speed = speed;

  // ---- driver inputs -> commands (reverse logic, brake vs reverse) ----
  let drive = input.throttle, brake = input.brake;
  if (input.brake > 0.05 && u < 0.6 && input.throttle < 0.05) { drive = -input.brake * c.drive.reverseFrac; brake = 0; }
  else if (input.throttle > 0.05 && u < -1) { brake = Math.max(brake, input.throttle); drive = 0; }
  const hand = input.handbrake || 0;

  // ---- steering: speed-sensitive, grip-limited, rate-limited ----
  const st = c.steer, mu0 = c.tire.mu;
  let maxS = st.max / (1 + (Math.abs(u) / st.vref) ** 2);
  if (st.assist > 0) maxS = Math.min(maxS, Math.max(st.min, st.assist * car.L * mu0 * G / (u * u + 4)));
  const target = input.steer * maxS;
  const rate = (Math.abs(target) < Math.abs(car.steer) ? st.returnRate : st.rate) * dt;
  car.steer += clamp(target - car.steer, -rate, rate);

  // ---- wheel loads: static + longitudinal and lateral weight transfer (from filtered accelerations) ----
  const h = c.chassis.cgHeight, track = car.track, L = car.L;
  const lag = Math.min(1, dt / Math.max(0.005, c.chassis.loadLag));
  const dNlong = m * car.axF * h / L;
  const down = 0.5 * c.aero.rho * -c.aero.clA * u * u;                          // downforce (N), split by weight
  const Nf = m * G * car.b / L - dNlong + down * c.chassis.frontWeight, Nr = m * G * car.a / L + dNlong + down * (1 - c.chassis.frontWeight);
  const latF = m * car.ayF * h / track * c.chassis.rollDistFront, latR = m * car.ayF * h / track * (1 - c.chassis.rollDistFront);

  // ---- drive & brake torques ----
  const speedFade = 1 - smooth(c.drive.topSpeed - 4, c.drive.topSpeed, Math.max(0, u));
  const fDrive = drive >= 0
    ? Math.min(c.drive.forceMax, c.drive.power / Math.max(u, 2)) * drive * speedFade
    : drive * Math.min(c.drive.forceMax, c.drive.power / Math.max(-u, 2));      // reverse (drive is already scaled by reverseFrac)
  const fEngBrake = drive <= 0.02 && u > 0.5 ? -c.drive.engineBrake * (1 - Math.max(0, drive)) : 0;
  const nFront = W.filter(w => w.front).length, nRear = W.length - nFront;

  let Fxb = 0, Fyb = 0, Mz = 0;
  for (const w of W) {
    const axleN = w.front ? Nf : Nr, lat = w.front ? latF : latR;
    // left wheels unload when turning left (ay > 0)
    w.N = Math.max(0, axleN / (w.front ? nFront : nRear) + (w.cx > 0 ? -lat : lat));
    const delta = ackermannAngle(car, w, car.steer), cs = Math.cos(delta), sn = Math.sin(delta);
    w.steerAngle = delta;
    // contact-patch velocity in the body frame, then in the wheel frame
    const uw = u - car.r * w.lx, vw = car.w + car.r * w.lz;
    const vx = uw * cs + vw * sn, vy = -uw * sn + vw * cs;
    const surf = surfaceAt(car.x, car.z, w); w.surface = surf.id;

    const share = w.front ? c.drive.frontShare / nFront : (1 - c.drive.frontShare) / nRear;
    const Td = (fDrive + fEngBrake) * share * w.R;
    const Tb = brake * c.brake.force * (w.front ? c.brake.bias / nFront : (1 - c.brake.bias) / nRear) * w.R + (w.front ? 0 : hand * c.brake.handbrake);
    const Trr = surf.rr * w.N * w.R * Math.tanh(w.omega * w.R);

    // implicit wheel-spin update (the tire is stiff at low speed; explicit Euler would explode)
    const f0 = tireForce(surf, c.tire, vx, vy, w.omega, w.N, w.R, w.tmp);
    const fx0 = f0.Fx;
    const k = Math.abs(tireForce(surf, c.tire, vx, vy, w.omega + 0.02, w.N, w.R, {}).Fx - fx0) / 0.02;   // local slope (abs: past the peak the slope is negative, but we still want a stable implicit step)
    const I = c.tire.inertia, denom = I + dt * w.R * k;
    let om = w.omega + dt * (Td - Trr - w.R * fx0) / denom;
    const dB = dt * Tb / denom;
    if (Tb > 0) om = Math.abs(om) <= dB ? 0 : om - Math.sign(om) * dB;
    w.omega = om;

    const f = tireForce(surf, c.tire, vx, vy, w.omega, w.N, w.R, w.tmp);
    w.Fx = f.Fx; w.Fy = f.Fy; w.kappa = f.kappa; w.alpha = f.alpha; w.used = f.used;
    const fF = f.Fx * cs - f.Fy * sn, fL = f.Fx * sn + f.Fy * cs;      // wheel frame -> body frame
    Fxb += fF; Fyb += fL; Mz += w.lz * fL - w.lx * fF;
  }

  // ---- aero drag, then integrate the rigid body (semi-implicit Euler) ----
  const kd = 0.5 * c.aero.rho * c.aero.cdA * speed;
  const ax = (Fxb - kd * car.u) / m, ay = (Fyb - kd * car.w) / m;
  car.u += (ax + car.w * car.r) * dt;
  car.w += (ay - car.u * car.r) * dt;
  car.r += (Mz / car.Iz - c.chassis.yawDamp * car.r) * dt;
  car.h += car.r * dt;
  const fx = Math.sin(car.h), fz = Math.cos(car.h);                        // forward; left = (cos h, -sin h)
  car.x += (fx * car.u + fz * car.w) * dt;
  car.z += (fz * car.u - fx * car.w) * dt;

  // ---- filtered accelerations drive next step's weight transfer ----
  car.axF += (Fxb / m - car.axF) * lag;
  car.ayF += (Fyb / m - car.ayF) * lag;
  car.pitchVis += (-car.axF * c.visual.pitchPerG / G - car.pitchVis) * Math.min(1, dt * 10);
  car.rollVis += (-car.ayF * c.visual.rollPerG / G - car.rollVis) * Math.min(1, dt * 10);
}

/** Snapshot for the debug overlay. */
export function telemetry(car) {
  return {
    kmh: Math.hypot(car.u, car.w) * 3.6, u: car.u, w: car.w, r: car.r, steer: car.steer,
    slipDeg: Math.atan2(car.w, Math.max(Math.abs(car.u), 0.5)) * 57.296,
    latG: car.ayF / G, longG: car.axF / G,
    wheels: car.wheels.map(w => ({ name: w.name, load: w.N, alphaDeg: w.alpha * 57.296, kappa: w.kappa, surface: w.surface, comp: w.comp, used: w.used })),
  };
}
