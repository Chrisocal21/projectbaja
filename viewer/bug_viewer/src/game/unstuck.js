// Unstuck (key Y). Driving: the whole vehicle is set upright on the nearest clear ground and you stay in it.
// On foot: only you move, to the nearest clear spot (your vehicle stays where it is).
import { game, say } from './store.js';
import { propObstacles } from './home.js';
import { standingVehicles, activeType } from './fleet.js';
import { defOf } from './projects.js';
import { OBSTACLES as SITE_OBSTACLES } from '../worlds/siteData.js';
import { clearSpot } from './clearSpot.js';

const circles = () => [...SITE_OBSTACLES, ...propObstacles(), ...standingVehicles().map(v => v.pose).filter(Boolean).map(po => [po.x, po.z, 2.2]), ...(game.projects || []).map(p => [p.pose.x, p.pose.z, Math.max(2, defOf(p).length / 2)]), ...(game.job ? [[game.job.x, game.job.z, 2.6]] : [])];

export function unstuck() {
  if (game.dev || game.paused) return;
  if (game.onFoot) {
    const p = { x: game.pos.x, z: game.pos.z, h: 0 };
    const s = clearSpot(p, 0.8, 0.8, circles());
    if (!s) return say('No clear ground nearby.');
    game.teleportTo = { x: s.x, z: s.z, keepYaw: true }; say('Unstuck: moved you to clear ground.'); return;
  }
  const t = activeType(), po = game.pose; if (!po) return;
  const s = clearSpot({ x: po.x, z: po.z, h: po.h }, t.length || 4.2, t.width || 1.9, circles());
  if (!s) return say('No clear ground nearby.');
  game.teleportTo = { x: s.x, z: s.z, h: s.h }; say('Unstuck: the vehicle is set upright on clear ground.');
}
