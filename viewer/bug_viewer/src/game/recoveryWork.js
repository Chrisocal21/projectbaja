// Getting a bogged car out by hand (bogDown.js): hold left click at a wheel with a shovel to dig it out, or with traction boards to lay them under it.
// main.jsx starts it on mouse down and stops it on mouse up. The boards stay on the ground where you laid them: drive out over them, then walk back for them.
import { game, save, say } from './store.js';
import { toolInHand, setDown } from './items.js';
import { CORNER_NAME } from '../wear.js';
import { RECOVERY_TOOLS, isRecoveryTool, DIG, LAY_SECS, canDig, digWheel } from '../bogDown.js';

let timer = 0, last = 0, prog = 0;
const cornerAimed = () => /^(?:ec)?wheel([FR][LR])$/i.exec(game.aim || '')?.[1]?.toUpperCase() || null;
const rec = () => game.home?.sink?.[game.active];
const sinkNow = () => rec()?.n || 0;
export const recoveryToolInHand = () => { const t = toolInHand(); return t && isRecoveryTool(t.id) ? t : null; };

/** the prompt line while a shovel or traction boards are in hand */
export function recoveryPrompt() {
  const t = recoveryToolInHand(); if (!t) return null;
  const c = cornerAimed(); if (!c) return `${RECOVERY_TOOLS[t.id].name}: aim at a wheel of a stuck car`;
  const w = CORNER_NAME[c];
  if (t.id === 'shovel') return sinkNow() <= 0.02 ? `The ${w} wheel is not dug in.` : canDig(rec(), c) ? `Hold left click to dig out the ${w} wheel` : `The ${w} wheel is dug out. Dig another, or try driving.`;
  return sinkNow() <= 0.12 ? 'The car is not stuck: no need for the boards.' : `Hold left click to lay the traction boards at the ${w} wheel`;
}

/** where a wheel's board goes: just past the wheel, on the side it would roll onto (in front of a front wheel, behind a rear one) */
function boardSpot(c) {
  const po = game.pose; if (!po) return null;
  const fx = Math.sin(po.h), fz = Math.cos(po.h), along = c[0] === 'F' ? 1.7 : -1.7, side = c[1] === 'L' ? 0.75 : -0.75;
  return { x: po.x + fx * along + fz * side, z: po.z + fz * along - fx * side, ry: po.h };
}

export function startRecovery() {
  stopRecovery(false);
  const t = recoveryToolInHand(); if (!t) return false;
  const c0 = cornerAimed(); if (!c0) { say(`${RECOVERY_TOOLS[t.id].name}: aim at a wheel.`); return true; }
  if (t.id === 'shovel' && !canDig(rec(), c0)) { say(recoveryPrompt()); return true; }
  if (t.id === 'boards' && sinkNow() <= 0.12) { say('The car is not stuck: no need for the boards.'); return true; }
  const secs = t.id === 'shovel' ? DIG.secs : LAY_SECS;
  prog = 0; last = performance.now();
  game.holdBar = { t0: last, dur: 1e9, label: t.id === 'shovel' ? `Digging out the ${CORNER_NAME[c0]} wheel…` : 'Laying the traction boards…', frac: 0, work: true };
  timer = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (cornerAimed() !== c0) return;   // looked away: nothing happens until you look back
    prog += dt / secs; if (game.holdBar) game.holdBar.frac = Math.min(1, prog);
    if (prog < 1) return;
    if (t.id === 'shovel') {
      const r = digWheel(rec(), c0);
      game.home = { ...game.home, sink: { ...(game.home.sink || {}), [game.active]: r } };
      say(r.n > 0.3 ? `Dug out the ${CORNER_NAME[c0]} wheel. It is still deep: dig the others too.` : 'Dug out. Ease it out gently: spinning the wheels digs you back in.');
    } else {
      const p = boardSpot(c0); if (!p) { stopRecovery(false); return; }
      setDown(t, p.x, p.z, p.ry);   // the boards leave your hands and lie on the ground at the wheel
      game.home = { ...game.home, sink: { ...(game.home.sink || {}), [game.active]: { ...(rec() || { n: 0 }), boards: t.uid } } };
      say(`Boards down at the ${CORNER_NAME[c0]} wheel. Get in and drive out over them gently, then come back for them.`);
    }
    stopRecovery(true);
  }, 90);
  return true;
}

export function stopRecovery(persist = true) {
  if (!timer) return; clearInterval(timer); timer = 0;
  if (game.holdBar?.work) game.holdBar = null;
  if (persist) save();
}
