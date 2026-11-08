// Stateful half of the day/night cycle: advances game.clock. The math is pure, in worlds/clock.js (tested there) —
// same split as game/upgrades.js over worlds/upgrades.js.
import { game } from './store.js';
import { advanceClock, MORNING_HOUR } from '../worlds/clock.js';

export { MORNING_HOUR };
export const SUN_FOLLOW = 40;   // how far the shadow-casting light sits from the player/vehicle, along the sun's real direction (keeps the shadow frustum tight in a huge world without breaking the day/night angle)
export const clockHour = () => game.clock ?? MORNING_HOUR;
/** advance the clock by dt seconds of real play; a no-op outside story play (dev sessions) or while paused */
export function tickClock(dt) {
  if (game.dev || game.paused) return;
  game.clock = advanceClock(clockHour(), dt);
}
