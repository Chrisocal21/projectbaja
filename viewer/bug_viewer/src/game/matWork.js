// Hands-on material work (rules: game/materials.js), held on the left button like finishing and building: cutting scrap into steel at the
// workbench with the angle grinder, and taking loose junk apart. main.jsx starts it on mouse down and stops it on mouse up.
import { game, save, say } from './store.js';
import { toolInHand, TOOLS, nameOfItem } from './items.js';
import { CUT, SALVAGE, cutWhy, addMats, matsText } from './materials.js';

const toolName = id => (TOOLS[id]?.name || id).toLowerCase();
const now = () => performance.now();
const cutState = () => ({ tool: toolInHand()?.id, power: !!game.home?.power, mats: game.mats });

/** the line under the crosshair at the workbench with the grinder in hand (null = not holding it: the bench reads as usual) */
export function cutPrompt() {
  if (toolInHand()?.id !== CUT.tool) return null;
  const why = cutWhy(cutState());
  return (why || `Hold left click — Cut ${matsText(CUT.take)} into ${matsText(CUT.give)} (you have ${game.mats?.scrap || 0} scrap)`) + '  ·  Press E — Workbench';
}
/** the item the crosshair is on, if it can be taken apart → { it, s } */
export function salvageAt(target) {
  const it = target?.startsWith('item:') && game.items.find(i => i.uid === +target.slice(5)), s = it && it.kind === 'junk' && it.loc === 'world' && SALVAGE[it.id];
  return s ? { it, s } : null;
}
/** the extra line on a junk item you can take apart */
export function salvageHint(it) {
  const s = it?.kind === 'junk' && SALVAGE[it.id]; if (!s) return '';
  return toolInHand()?.id === s.tool ? `Hold left click — Take it apart (${matsText(s.give)})` : `Take it apart with the ${toolName(s.tool)} (${matsText(s.give)})`;
}

let timer = 0;
export function stopMatWork() {
  if (!timer) return; clearInterval(timer); timer = 0;
  if (game.holdBar?.work) game.holdBar = null;
}
/** run a held job: it only advances while you keep looking at `target`; done() fires when the bar fills */
function hold(target, secs, label, done) {
  stopMatWork();
  let t = 0, last = now(); game.holdBar = { t0: last, dur: 1e9, label, frac: 0, work: true };
  timer = setInterval(() => {
    const n = now(), dt = Math.min(0.25, (n - last) / 1000); last = n;
    if (game.target !== target) return;
    t += dt; if (game.holdBar) game.holdBar.frac = Math.min(1, t / secs);
    if (t >= secs && done()) t = 0;   // done() true = go again while the button stays down
  }, 90);
}

/** hold left click at the workbench with the grinder: one piece of steel each time the bar fills, again and again while you hold it. Returns true if it took the click. */
export function startCut() {
  if (toolInHand()?.id !== CUT.tool) return false;
  const why = cutWhy(cutState()); if (why) { say(why); return true; }
  hold('bench', CUT.secs, 'Cutting steel…', () => {
    const w = cutWhy(cutState()); if (w) { say(w); stopMatWork(); return false; }
    game.mats = addMats(addMats(game.mats, CUT.take, -1), CUT.give); save();
    say(`Cut ${matsText(CUT.give)} (you have ${game.mats.steel} steel · ${game.mats.scrap} scrap metal)`);
    if (cutWhy(cutState())) { stopMatWork(); return false; }
    return true;
  });
  return true;
}
/** hold left click on loose junk with the right tool in hand. Returns true if it took the click (wrong tool = false, so the click still picks it up when your hands are free). */
export function startSalvage(target) {
  const a = salvageAt(target); if (!a || toolInHand()?.id !== a.s.tool) return false;
  const { it, s } = a, name = nameOfItem(it);
  if (s.tool === 'grinder' && !game.home?.power) { say('The grinder needs power: flip the main breaker.'); return true; }
  hold(target, s.secs, `${s.verb}…`, () => {
    stopMatWork();
    if (!game.items.some(i => i.uid === it.uid && i.loc === 'world')) return false;
    game.items = game.items.filter(i => i.uid !== it.uid); game.mats = addMats(game.mats, s.give); save();
    say(`Took the ${name.toLowerCase()} apart: +${matsText(s.give)}`);
    return false;
  });
  return true;
}
