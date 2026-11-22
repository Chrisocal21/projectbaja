// Lights (L): cycles off > headlights > (with a roof light bar) headlights + bar > bar only > off. game.lights is a session mode, not saved:
// you start each session with them off. Rules: rules/lights.js
import { lightsCheck, hasLightBar, nextMode, headOn, barOn, LIGHT_MODES } from '../rules/lights.js';
import { game, say } from './store.js';

/** the build of the vehicle you are using (the Bug's is game.build; the El Cajon's is on the fleet) */
export const activeBuild = () => (game.active === 'bug' ? game.build : game.fleet?.[game.active]?.build || null);

export function lightsUsable() { return lightsCheck(game.active, activeBuild()); }
export const lightMode = () => (typeof game.lights === 'string' ? game.lights : game.lights ? 'head' : 'off');
/** what is actually lit right now: { head, bar } (nothing without a battery and headlights) */
export function lightsLit() {
  if (!lightsUsable().ok) return { head: false, bar: false };
  const m = lightMode(), bar = hasLightBar(activeBuild());
  return { head: headOn(m), bar: bar && barOn(m) };
}
export function toggleLights() {
  const c = lightsUsable(); if (!c.ok) { game.lights = 'off'; say(c.why); return 'off'; }
  const m = nextMode(lightMode(), hasLightBar(activeBuild()));
  game.lights = m; say(m === 'off' ? 'Lights off.' : `${LIGHT_MODES[m]} on.`); return m;
}
