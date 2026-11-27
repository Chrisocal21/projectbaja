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

// Paint per visit, so two oil changes don't turn up in the same colour. PROPOSAL palettes: [body, trim].
// Cars: everyday, sun-faded work colours. Bikes: bright plastics (no brand colours copied on purpose).
export const CAR_PAINTS = [
  ['#e8e4da', '#6d6a63'], ['#9b2b22', '#d8d2c4'], ['#c9b48a', '#5a4a36'], ['#4d6b4a', '#d6d0bf'], ['#2b2d30', '#9a9488'],
  ['#55708c', '#e2ddd0'], ['#c99a2e', '#3a352e'], ['#9fa4a6', '#3b3e40'], ['#6e4a32', '#cfc5ae'], ['#b65a2a', '#ece6d6'], ['#3e4f6b', '#b8b2a4'],
];
export const BIKE_PAINTS = [
  ['#d9461e', '#1d1f22'], ['#c81f2a', '#f0f0ec'], ['#1f56b8', '#f0f0ec'], ['#e8c21c', '#1d1f22'], ['#3b9a3a', '#1d1f22'], ['#f2f2ee', '#c81f2a'], ['#1d1f22', '#e06a1a'],
];
/** [body, trim] for this visit: picked from the customer's uid (saved), so it stays put across reloads.
 * Steps of 3 through the list keep customers who arrive one after another in different colours. */
export function paintOf(w) {
  const list = RIDES[rideOf(w)].bike ? BIKE_PAINTS : CAR_PAINTS;
  const n = Number.isFinite(w?.uid) ? Math.abs(Math.floor(w.uid)) : 0;
  return list[(n * 3) % list.length];
}
