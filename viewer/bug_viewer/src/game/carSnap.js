// "Snap to the car": while you hold a part that goes on the car you're standing at, the part's own spot on the car glows (BuildModel's fit ghost)
// and a plain left click bolts it on, wherever the crosshair points (an empty hub has nothing to aim at). Floor / cargo placement stands down
// so the click can't put the part on the ground instead.
import { game } from './store.js';
import { held } from './items.js';
import { FEEL } from './restPose.js';
import { fitCandidate } from './workshop.js';
import { activeType } from './fleet.js';

/** the held part's fit plan when it can go on the car right now (you're at the car), else null */
export function carFitPlan() {
  const W = game.work;
  if (!FEEL || !game.onFoot || !W || !(game.snapAim || game.snapNear) || !W.build) return null;   // snapAim: crosshair on the car or at the empty hub (BuildModel DetachGlow)
  const h = held(); if (!h) return null;
  const fc = fitCandidate(W.build, W.zone);
  return fc && fc.it === h && fc.plan.ok ? fc : null;
}
export const carFitReady = () => !!carFitPlan();
