// Hold-click tire pressure at a wheel (tire gauge lets air out, air chuck fills from the garage compressor). main.jsx starts it on mouse down and stops it on mouse up.
// Rules in tirePressure.js; pressure is the one number game.home.tirePsi that driving already uses.
import { game, save, say } from './store.js';
import { toolInHand, packItems } from './items.js';
import { hasInGarage } from './home.js';
import { isPressureTool, stepPressure, pressureLine, pressureHint, PRESSURE_TOOLS, PSI, PATCH_SECS } from '../tirePressure.js';
import { CORNER_NAME } from '../wear.js';

let timer = 0, last = 0, patched = 0;
/** the aimed wheel's corner ('FL'..) when its tire has a hole and a 12 V pump is in hand: that is a plug job, not a fill */
const flatAimed = () => { const c = /(FL|FR|RL|RR)$/i.exec(game.aim || '')?.[1]?.toUpperCase(); return c && toolInHand()?.id === 'pump' && game.home?.wear?.[game.active]?.flat?.[c] ? c : null; };
const kitIn = () => packItems().find(i => i.kind === 'supply' && i.id === 'plug');
const isWheelAim = () => /^(ec)?wheel[FR][LR]$/i.test(game.aim || '');
const psiNow = () => game.home?.tirePsi ?? PSI.street;
export const pressureToolInHand = () => { const t = toolInHand(); return t && isPressureTool(t.id) ? t : null; };

/** the prompt line while a pressure tool is in hand */
export function pressurePrompt() {
  const tool = pressureToolInHand(); if (!tool) return null;
  if (!isWheelAim()) return `${PRESSURE_TOOLS[tool.id].name}: aim at a wheel`;
  const fc = flatAimed(); if (fc) return kitIn() ? `The ${CORNER_NAME[fc]} tire has a hole. Hold left click to plug it (uses a plug kit)` : `The ${CORNER_NAME[fc]} tire has a hole: you need a tire plug kit in your pack.`;
  return pressureLine(tool.id, psiNow()) + (tool.id === 'gauge' ? ` (${pressureHint(psiNow())} pressure)` : '');
}

export function startPressure() {
  stopPressure(false);
  const tool = pressureToolInHand(); if (!tool) return false;
  if (!isWheelAim()) { say(`${PRESSURE_TOOLS[tool.id].name}: aim at a wheel.`); return true; }
  const fc0 = flatAimed(); if (fc0) { if (!kitIn()) { say("Plugging a hole needs a tire plug kit in your pack ($10 at Dusty's)."); return true; } patched = 0; }
  const first = stepPressure(tool.id, psiNow(), 0.01, hasInGarage('compressor'));
  if (!first.ok) { say(first.why); return true; }
  last = performance.now();
  game.holdBar = { t0: last, dur: 1e9, label: fc0 ? `Plugging the ${CORNER_NAME[fc0]} tire…` : `${PRESSURE_TOOLS[tool.id].verb}…`, frac: 0, work: true };
  timer = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (!isWheelAim()) return;   // looked away: nothing happens until you look back
    const fc = flatAimed(); if (fc) {   // a hole: plug it first (takes PATCH_SECS of holding), the kit is used up at the end
      patched += dt / PATCH_SECS; if (game.holdBar) game.holdBar.frac = Math.min(1, patched);
      if (patched >= 1) { const kit = kitIn(); if (kit) game.items = game.items.filter(i => i !== kit); const w = game.home.wear[game.active]; game.home = { ...game.home, wear: { ...game.home.wear, [game.active]: { ...w, flat: { ...w.flat, [fc]: false } } } }; patched = 0; say(`Plugged the ${CORNER_NAME[fc]} tire. Now pump it up.`); stopPressure(true); }
      return;
    }
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
