// Headlights (L): the one toggle. game.lights is a session flag, not saved: you start each session with them off. Rules: rules/lights.js
import { lightsCheck } from '../rules/lights.js';
import { game, say } from './store.js';

/** the build of the vehicle you are using (the Bug's is game.build; the El Cajon's is on the fleet) */
export const activeBuild = () => (game.active === 'bug' ? game.build : game.fleet?.[game.active]?.build || null);

export function lightsUsable() { return lightsCheck(game.active, activeBuild()); }
export function toggleLights() {
  if (game.lights) { game.lights = false; say('Headlights off.'); return false; }
  const c = lightsUsable(); if (!c.ok) { game.lights = false; say(c.why); return false; }
  game.lights = true; say('Headlights on.'); return true;
}
