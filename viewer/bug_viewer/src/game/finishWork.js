// Hold-click finishing on the aimed panel (grinder, spray cans, buffer, hose). main.jsx starts it on mouse down and stops it on mouse up.
// The rules live in rules/finish.js and finishJobs.js; this file only reads what you aim at, applies a tick, and saves the panel.
import { game, save, say } from './store.js';
import { toolInHand } from './items.js';
import { partById, bodyById } from '../build.js';
import { defOfBuild } from '../rules/vehicles.js';
import { newPanel } from '../rules/finish.js';
import { FINISH_TOOLS, isFinishTool, stepJob, getFinish, setFinish, isBodyPanelSlot, bodySeed } from '../finishJobs.js';

let timer = 0, last = 0, worked = 0;

/** What the crosshair is on, if a finish tool could work on it: { vehId, key, base, name } or { why }. */
export function finishTarget() {
  const W = game.work, build = W ? W.build : game.build, id = game.aim;
  if (!build || !id) return null;
  const vehId = W ? W.id : game.active;
  if (isBodyPanelSlot(id)) { const colour = build.colors?.paint || bodyById[build.body]?.defaultPaint; return { vehId, key: id, base: 'steel', seed: () => bodySeed(colour), name: (defOfBuild(build).slots.find(s => s.id === id)?.name || id).toLowerCase() }; }
  if (!id.startsWith('up:')) return { why: 'Only body panels (doors, hood, engine lid, fenders) and fiberglass panels can be finished.' };
  const part = partById[build.parts?.[id.slice(3)]];
  if (!part?.material?.unpainted) return { why: 'That part has no panel finish.' };
  return { vehId, key: id, base: 'glass', seed: () => newPanel('glass'), name: (part.name || id.slice(3)).toLowerCase() };
}

export const finishToolInHand = () => { const t = toolInHand(); return t && isFinishTool(t.id) ? t : null; };

/** The prompt line under the crosshair while a finish tool is in hand. */
export function finishPrompt() {
  const tool = finishToolInHand(), tg = tool && finishTarget(); if (!tool) return null;
  if (!tg) return `${FINISH_TOOLS[tool.id].name}: aim at a panel`;
  if (tg.why) return tg.why;
  const r = stepJob(tool.id, getFinish(game.home, tg.vehId, tg.key) || tg.seed(), 0.01, tg.base);
  return r.ok ? `Hold left click: ${FINISH_TOOLS[tool.id].verb.toLowerCase()} the ${tg.name}` : r.why;
}

export function startFinish() {
  stopFinish(false);
  const tool = finishToolInHand(); if (!tool) return false;
  const tg = finishTarget(); if (!tg) { say(`${FINISH_TOOLS[tool.id].name}: aim at a panel.`); return true; }
  if (tg.why) { say(tg.why); return true; }
  const first = stepJob(tool.id, getFinish(game.home, tg.vehId, tg.key) || tg.seed(), 0.01, tg.base);
  if (!first.ok) { say(first.why); return true; }
  last = performance.now(); worked = 0; game.holdBar = { t0: last, dur: 1e9, label: `${first.verb} the ${tg.name}…`, frac: 0, work: true };
  timer = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
    const cur = finishTarget(); if (!cur || cur.key !== tg.key || cur.vehId !== tg.vehId) return;   // looked away: nothing happens until you look back
    const r = stepJob(tool.id, getFinish(game.home, tg.vehId, tg.key) || tg.seed(), dt, tg.base);
    if (!r.ok) { say(r.why); stopFinish(true); return; }
    game.home = setFinish(game.home, tg.vehId, tg.key, r.panel); game.finishRev = (game.finishRev || 0) + 1;
    worked += dt / FINISH_TOOLS[tool.id].secs; if (game.holdBar) game.holdBar.frac = Math.min(1, worked);
  }, 90);
  return true;
}

export function stopFinish(persist = true) {
  if (!timer) return; clearInterval(timer); timer = 0;
  if (game.holdBar?.work) game.holdBar = null;
  if (persist) save();
}
