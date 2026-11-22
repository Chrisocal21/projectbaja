// Time and driving act on panel finish: dirt kicks up while you drive, bare steel rusts as game hours pass. Called from tickClock (game/clock.js).
import { game } from './store.js';
import { partById, bodyById } from '../build.js';
import { eligiblePanels, dirtyVehicle, weatherHome } from '../finishJobs.js';

let hoursAcc = 0, dirtAcc = 0;
const bump = () => { game.finishRev = (game.finishRev || 0) + 1; };
export const DIRT_PER_SEC = 0.002;   // PROPOSAL: about eight minutes of driving to be filthy

/** dt = real seconds; hours = game hours that passed this frame. Work is batched so the saved state is not rebuilt every frame. */
export function tickFinish(dt, hours) {
  if (!game.onFoot && game.speed > 4 && game.build) { dirtAcc += dt * DIRT_PER_SEC; if (dirtAcc >= 0.03) {
    const b = game.build, colour = b.colors?.paint || bodyById[b.body]?.defaultPaint;
    game.home = dirtyVehicle(game.home, game.active, eligiblePanels(b, partById, colour), dirtAcc); dirtAcc = 0; bump(); } }
  hoursAcc += hours; if (hoursAcc >= 0.25) { game.home = weatherHome(game.home, hoursAcc); hoursAcc = 0; bump(); }
}
