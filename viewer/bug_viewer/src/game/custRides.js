// What a customer turns up in (pure). Rolled per visit, never tied to a person (no lore). PROPOSAL mix and sizes.
// len = length in m (for parking/obstacles), bike = two wheels.
export const RIDES = {
  pickup: { name: 'pickup', len: 5.1, w: 1.95 },
  oldpickup: { name: 'old pickup', len: 5.1, w: 2.0 },
  sedan: { name: 'sedan', len: 4.7, w: 1.8 },
  van: { name: 'van', len: 4.9, w: 1.95 },
  dirtbike: { name: 'dirt bike', len: 2.1, w: 0.8, bike: true },
  moto: { name: 'motorcycle', len: 2.2, w: 0.85, bike: true },
};
/** jobs a motorcycle can need too: no wipers, no fan belt, no car wheel */
export const BIKE_JOBS = new Set(['battery', 'bulb', 'tire', 'oil', 'tune']);
const CARS = ['pickup', 'oldpickup', 'sedan', 'sedan', 'van'], BIKES = ['dirtbike', 'moto'];

/** roll the vehicle for one visit: about one in four bike-able jobs comes on a bike */
export function rollRide(jobId, rand = Math.random) {
  if (BIKE_JOBS.has(jobId) && rand() < 0.25) return BIKES[Math.floor(rand() * BIKES.length) % BIKES.length];
  return CARS[Math.floor(rand() * CARS.length) % CARS.length];
}
/** a saved ride, checked: old saves (or a bike on a job a bike can't need) fall back to the pickup */
export const rideOf = w => (RIDES[w?.ride] && (!RIDES[w.ride].bike || BIKE_JOBS.has(w.id)) ? w.ride : 'pickup');
export const rideLen = w => RIDES[rideOf(w)].len;
