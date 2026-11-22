// Tyre-balance profiles: how much sideways grip each axle has. All numbers are estimates to tune by feel.
//   fs / rs   front / rear slip stiffness (the slip tangent at which a tyre reaches about 76% of its grip): smaller = bites sooner, less slip angle
//   rc        rear grip cap multiplier at low speed (1 = the tyre's friction limit as is)
//   rcHigh / rsHigh   the same two numbers at 35 m/s and over; between 12 and 35 m/s they blend smoothly, so a parking-lot turn still slides but a 150 km/h one stays planted
// rigid.js reads dims.handling; a vehicle with none falls back to DRIFT_BASELINE, which is exactly how every vehicle handled before Nov 22.

/** SAVED on purpose (Nov 22): the loose, slide-happy balance every vehicle had until now. A good starting point for a drift car and a drift track later.
 *  The rest of that feel lives in DriveWorld.jsx and handling.js: STEER_FADE 0.026, tire grip factor 1.5 (tmu), steerAssist() counter-steer, steerRate (1.5 rad/s turn-in on keys,
 *  3.2 on a stick, 1.9 recentring). At 38 m/s with 0.08 rad of wheel the Bug and a truck spun or rolled on this balance, which is the point of a drift car. */
export const DRIFT_BASELINE = { name: 'Drift baseline (old default)', fs: 0.14, rs: 0.14, rc: 0.95, rcHigh: 0.95, rsHigh: 0.14 };

/** rear-engine, light buggies (the Bug and the Baja Bug): a planted tail, still lively */
export const BUGGY = { name: 'Buggy', fs: 0.14, rs: 0.14, rc: 0.95, rcHigh: 1.3, rsHigh: 0.10 };

/** front-engined trucks: the weight sits over the front axle, so the rear is the sticky end and the truck pushes before it slides */
export const OFFROAD_TRUCK = { name: 'Off-road truck', fs: 0.14, rs: 0.12, rc: 1.1, rcHigh: 1.45, rsHigh: 0.09 };

export const PROFILES = { driftBaseline: DRIFT_BASELINE, buggy: BUGGY, offroadTruck: OFFROAD_TRUCK };
