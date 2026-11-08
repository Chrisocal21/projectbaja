// The day/night cycle: pure time-of-day math (no rendering, no game state — same convention as structures.js, lot.js,
// openings.js). game/clock.js is the stateful half (advances game.clock, gates on paused/dev); worlds/DayNightSky.jsx
// turns these numbers into the sky, fog and lights. One full day is DAY_LENGTH_SEC of real play time.
export const DAY_LENGTH_SEC = 1080;              // 18 real minutes = one in-game day
export const CLOCK_RATE = 24 / DAY_LENGTH_SEC;   // in-game hours per real second
export const MORNING_HOUR = 7;                   // what sleeping in the trailer wakes you up to
export const SUNRISE = 6, SUNSET = 18;

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const near = (h, t, w) => Math.max(0, 1 - Math.abs(h - t) / w);

/** advance the clock by dt seconds, wrapping at 24 h */
export const advanceClock = (hours, dt) => (hours + dt * CLOCK_RATE + 240) % 24;
/** 0 (full night) .. 1 (full day), smoothed through a 2 h sunrise/sunset so it's never a hard cut */
export function dayPhase(hours) {
  if (hours > SUNRISE && hours < SUNSET) return 1;
  if (hours >= SUNSET) return 1 - smooth(SUNSET, SUNSET + 2, hours);
  return smooth(SUNRISE - 2, SUNRISE, hours);
}
/** 0 most of the day/night .. 1 right at sunrise or sunset: the warm-light window */
export const goldenPhase = hours => Math.max(near(hours, SUNRISE, 2), near(hours, SUNSET, 2));
export const isNight = hours => dayPhase(hours) < 0.05;

export const sunElevationDeg = hours => Math.sin(((hours - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI) * 70;
export const sunAzimuthDeg = hours => (hours / 24) * 360 - 90;
/** unit direction toward the sun */
export function sunDirection(hours) {
  const el = (sunElevationDeg(hours) * Math.PI) / 180, az = (sunAzimuthDeg(hours) * Math.PI) / 180;
  return [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
}
export function sunPosition(hours, dist = 300) { const [x, y, z] = sunDirection(hours); return [x * dist, y * dist, z * dist]; }

/** "9:42 PM" */
export function formatClock(hours) {
  const h24 = Math.floor(((hours % 24) + 24) % 24), m = Math.floor((hours % 1) * 60), h12 = ((h24 + 11) % 12) + 1, ap = h24 < 12 ? 'AM' : 'PM';
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}
