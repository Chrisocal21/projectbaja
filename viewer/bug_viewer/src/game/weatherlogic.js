// Weather app numbers (pure). PROPOSAL: the game has no weather system yet, only the day/night sky, so this reports what is true today:
// a desert temperature that follows the sun, and quiet road / wind rows that become real when weather exists.
import { SUNRISE, SUNSET } from '../worlds/clock.js';

export const LOW_F = 58, HIGH_F = 102;   // coolest just before dawn, hottest around 5 PM
/** temperature in F at an in-game hour: a smooth curve, low at 5:00, high at 17:00 */
export function tempF(hour) { const h = ((hour % 24) + 24) % 24; return Math.round(LOW_F + (HIGH_F - LOW_F) * (0.5 - 0.5 * Math.cos(((h - 5) / 24) * 2 * Math.PI * 1))); }
export const feel = t => (t >= 95 ? 'Hot' : t >= 80 ? 'Warm' : t >= 68 ? 'Mild' : 'Cool');
export const skyWord = h => { const x = ((h % 24) + 24) % 24; return x < SUNRISE - 0.5 || x >= SUNSET + 0.5 ? 'Clear night' : x < SUNRISE + 1 ? 'Sunrise' : x >= SUNSET - 1 ? 'Sunset' : 'Clear and sunny'; };
/** the next n hours: [{hour, temp, sky}] */
export function forecast(hour, n = 6) { const out = []; for (let i = 1; i <= n; i++) { const h = (Math.floor(hour) + i) % 24; out.push({ hour: h, temp: tempF(h), sky: skyWord(h) }); } return out; }
