// Engine torque curve, automatic gearbox, differential and a simple air-cooled heat model. Numbers: catalog/physics.json (all estimates).
import data from './catalog/physics.json' with { type: 'json' };

const E = data.engine, H = E.heat, D = data.diff;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const createEngine = () => ({ temp: H.start, gear: 0, shiftT: 0, rpm: E.idleRpm, damage: 0, derate: 1, hot: false });

/** normalised torque (1 = peak) at an rpm */
export function torqueAt(rpm) {
  const c = E.torqueCurve; if (rpm <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) if (rpm <= c[i][0]) { const [r0, t0] = c[i - 1], [r1, t1] = c[i]; return t0 + (t1 - t0) * (rpm - r0) / (r1 - r0); }
  return 0;   // past the end of the curve: the limiter
}
/** final drive solved so the top gear reaches maxV (m/s) at redline on the reference tire; taller tires then act as a taller gear */
export const finalDrive = maxV => E.redlineRpm * Math.PI / 30 * E.refTireRadius / (E.gears[E.gears.length - 1] * maxV * 1.03);

/** one step of the engine: gearbox, heat, and the total drive force at the wheels (N). refForce = the thrust of the car at its first-gear peak. */
export function stepEngine(eng, ctl, speed, tireR, maxV, refForce, dt) {
  const fd = finalDrive(maxV), v = Math.max(0, speed), thr = Math.max(0, ctl.throttle);
  // automatic gearbox with hysteresis
  if (!eng.gear) eng.gear = 1;
  const rpmIn = g => v / tireR * E.gears[g - 1] * fd * 30 / Math.PI;
  if (eng.shiftT > 0) eng.shiftT -= dt;
  else if (eng.gear < E.gears.length && rpmIn(eng.gear) > E.redlineRpm * 0.93) { eng.gear++; eng.shiftT = E.shiftSeconds; }
  else if (eng.gear > 1 && rpmIn(eng.gear) < E.redlineRpm * 0.42) { eng.gear--; eng.shiftT = E.shiftSeconds * 0.5; }
  const ratio = E.gears[eng.gear - 1];
  eng.rpm = Math.max(E.idleRpm, eng.gear === 1 ? Math.max(E.launchRpm * thr, rpmIn(1)) : rpmIn(eng.gear));
  const tn = torqueAt(eng.rpm);
  // heat: rises with load, falls with airflow (road speed) and the fan
  const load = thr * (0.4 + 0.6 * tn);
  eng.temp += ((H.idleHeat + H.loadHeat * load) - (H.fanCool + H.airCool * v) * (eng.temp - H.ambient)) * dt;
  eng.hot = eng.temp > H.warnC;
  eng.derate = eng.temp <= H.derateStartC ? 1 : 1 - (1 - H.derateTo) * clamp((eng.temp - H.derateStartC) / (H.derateFullC - H.derateStartC), 0, 1);
  if (eng.temp > H.damageAboveC) eng.damage = Math.min(1, eng.damage + H.damagePerSecond * dt);
  if (thr <= 0 || eng.shiftT > 0) return 0;
  const F = refForce * E.thrustScale * (tn * ratio * fd / tireR) / (1 * E.gears[0] * fd / E.refTireRadius) * thr;
  return F * eng.derate * (1 - 0.5 * eng.damage);
}

/** split the drive force F over the two driven wheels; capL/capR = the most each wheel's tire can push right now (0 = off the ground) */
export function splitDrive(F, capL, capR, type = D.default) {
  const d = D.types[type] || D.types.open, half = F / 2;
  const weakCap = Math.min(capL, capR), strongCap = Math.max(capL, capR), lowIsL = capL <= capR;
  let weak, strong;
  if (type === 'locker') { weak = Math.min(half, weakCap); strong = Math.min(F - weak, strongCap); if (weak < half && strong > half) weak = Math.min(weakCap, F - strong); }
  else { weak = Math.min(half, weakCap); strong = Math.min(half, strongCap, weak * d.biasRatio + d.preload * F); }
  return lowIsL ? [weak, strong] : [strong, weak];
}
