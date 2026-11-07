// One config object per vehicle. Everything that changes how a car FEELS lives here (live-tunable from the debug panel).
// Units: metres, kilograms, seconds, newtons, radians. Positive steer / lateral = vehicle LEFT (+X). +Z is forward.
export function buggyConfig() {
  return {
    name: 'Baja buggy',
    chassis: {
      mass: 1000,            // kg
      cgHeight: 0.55,        // m above ground. Higher = more weight transfer, tippier
      frontWeight: 0.42,     // fraction of static weight on the front axle (rear-engine buggy = rear heavy)
      rollDistFront: 0.5,    // share of cornering weight transfer taken by the front axle. More = understeer, less = oversteer
      inertiaScale: 1.35,    // yaw inertia vs a plain box. Higher = lazier rotation, lower = twitchy
      loadLag: 0.10,         // s. Suspension-like lag before weight transfer reaches the tires (transient feel)
      yawDamp: 0.0,          // 1/s extra rotation damping (arcade crutch; keep 0 unless needed)
    },
    tire: {
      mu: 1.05,              // overall grip. Multiplies the surface grip
      loadSens: 0.25,        // grip lost as a wheel gets heavily loaded (weight transfer always costs total grip)
      nominalLoad: 2500,     // N, the load the tire is "rated" for
      lowSpeed: 3.0,         // m/s below which tires blend to a viscous model (stops jitter at rest)
      inertia: 1.4,          // kg m2 per wheel
    },
    steer: {
      max: 0.52,             // rad at standstill
      vref: 20,              // m/s. Steering authority halves at this speed
      assist: 1.5,           // steering limiter: stops you asking for more lateral g than the tires can give. 0 = off
      min: 0.02,             // rad floor so you can always steer a little
      rate: 3.2,             // rad/s turning in
      returnRate: 5.5,       // rad/s centring
      ackermann: 1.0,        // 1 = true Ackermann, 0 = parallel steer
    },
    // Stage 1 drivetrain placeholder (real engine, gearbox and diffs arrive in Stage 4)
    drive: {
      power: 95000,          // W
      forceMax: 7000,        // N at the wheels
      topSpeed: 38,          // m/s soft limiter
      frontShare: 0.0,       // 0 = RWD, 1 = FWD, 0.5 = even AWD
      engineBrake: 600,      // N when off throttle
      reverseFrac: 0.45,
    },
    brake: {
      force: 11500,          // N total at full pedal
      bias: 0.65,            // fraction to the front axle
      handbrake: 2600,       // N*m extra torque locking each rear wheel
    },
    aero: { cdA: 1.5, clA: 0.0, rho: 1.225 },   // drag area m2, lift/downforce area (negative = downforce)
    visual: { pitchPerG: 0.035, rollPerG: 0.05 }, // Stage 1 only: fake body lean for looks (real springs arrive in Stage 3)
    substeps: 2,
  };
}

/** What the live tuning panel exposes: [path, label, min, max, step]. */
export const CONFIG_SCHEMA = [
  ['tire.mu', 'Tire grip', 0.5, 2, 0.01],
  ['tire.loadSens', 'Load sensitivity', 0, 0.8, 0.01],
  ['chassis.frontWeight', 'Front weight %', 0.3, 0.7, 0.01],
  ['chassis.cgHeight', 'CG height m', 0.3, 1.2, 0.01],
  ['chassis.rollDistFront', 'Roll bar front share', 0.2, 0.8, 0.01],
  ['chassis.inertiaScale', 'Yaw inertia', 0.8, 2.5, 0.01],
  ['chassis.loadLag', 'Weight-transfer lag s', 0.01, 0.4, 0.01],
  ['steer.max', 'Max steer rad', 0.2, 0.8, 0.01],
  ['steer.vref', 'Steer speed fade m/s', 5, 60, 1],
  ['steer.assist', 'Steer grip limiter', 0, 4, 0.05],
  ['steer.rate', 'Steer rate', 1, 10, 0.1],
  ['drive.power', 'Power W', 20000, 300000, 1000],
  ['drive.forceMax', 'Max drive force N', 2000, 14000, 100],
  ['drive.frontShare', 'Torque to front', 0, 1, 0.05],
  ['brake.force', 'Brake force N', 3000, 20000, 100],
  ['brake.bias', 'Brake bias front', 0.3, 0.9, 0.01],
  ['brake.handbrake', 'Handbrake N*m', 0, 6000, 100],
  ['aero.cdA', 'Drag area', 0.4, 4, 0.05],
];

export const getPath = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
export const setPath = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
