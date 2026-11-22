// Hold-click tire pressure at a wheel (tire gauge lets air out, air chuck fills from the garage compressor). main.jsx starts it on mouse down and stops it on mouse up.
// Rules in tirePressure.js; pressure is the one number game.home.tirePsi that driving already uses.
import { game, save, say } from './store.js';
import { toolInHand } from './items.js';
import { hasInGarage } from './home.js';
import { isPressureTool, stepPressure, pressureLine, pressureHint, PRESSURE_TOOLS, PSI } from '../tirePressure.js';

let timer = 0, last = 0;
const isWheelAim = () => /^(ec)?wheel[FR][LR]$/i.test(game.aim || '');
const psiNow = () => game.home?.tirePsi ?? PSI.street;
export const pressureToolInHand = () => { const t = toolInHand(); return t && isPressureTool(t.id) ? t : null; };

/** the prompt line while a pressure tool is in hand */
export function pressurePrompt() {
  const tool = pressureToolInHand(); if (!tool) return null;
  if (!isWheelAim()) return `${PRESSURE_TOOLS[tool.id].name}: aim at a wheel`;
  return pressureLine(tool.id, psiNow()) + (tool.id === 'gauge' ? ` (${pressureHint(psiNow())} pressure)` : '');
}

export function startPressure() {
  stopPressure(false);
  const tool = pressureToolInHand(); if (!tool) return false;
  if (!isWheelAim()) { say(`${PRESSURE_TOOLS[tool.id].name}: aim at a wheel.`); return true; }
  const first = stepPressure(tool.id, psiNow(), 0.01, hasInGarage('compressor'));
  if (!first.ok) { say(first.why); return true; }
  last = performance.now();
  game.holdBar = { t0: last, dur: 1e9, label: `${PRESSURE_TOOLS[tool.id].verb}…`, frac: 0, work: true };
  timer = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (!isWheelAim()) return;   // looked away: nothing happens until you look back
    const r = stepPressure(tool.id, psiNow(), dt, hasInGarage('compressor'));
    if (!r.ok) { say(r.why); stopPressure(true); return; }
    game.home = { ...game.home, tirePsi: r.psi };
    if (game.holdBar) game.holdBar.frac = Math.min(1, (r.psi - PSI.min) / (PSI.max - PSI.min));   // the bar is the needle: low to high
  }, 90);
  return true;
}

export function stopPressure(persist = true) {
  if (!timer) return; clearInterval(timer); timer = 0;
  if (game.holdBar?.work) game.holdBar = null;
  if (persist) save();
}
