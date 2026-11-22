// Controller support. A gamepad is read every frame and turned into what the game already understands:
// buttons become key presses (and mouse buttons for hold-click), the left stick walks (on foot) or steers (driving, analog),
// the triggers are throttle/brake in the car and the hold-click buttons on foot, the right stick looks.
// Click the game once with the mouse first (the browser only allows mouse-look after a click).
import { game } from './store.js';

export const pad = { on: false, steer: 0, throttle: 0, lookX: 0, lookY: 0 };
const DEAD = 0.18, dz = v => { const a = Math.abs(v); return a < DEAD ? 0 : Math.sign(v) * (a - DEAD) / (1 - DEAD); };
const BTN = { 0: 'Space', 1: 'KeyF', 2: 'KeyE', 3: 'KeyR', 4: 'KeyL', 5: 'KeyC', 8: 'KeyM', 9: 'Escape', 10: 'ShiftLeft', 12: 'Tab', 13: 'KeyI' };
const down = {}, fire = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, shiftKey: code === 'ShiftLeft' }));
const set = (code, on) => { if (!!down[code] === on) return; down[code] = on; fire(on ? 'keydown' : 'keyup', code); };
const mouse = (btn, on) => { const k = 'm' + btn; if (!!down[k] === on) return; down[k] = on; window.dispatchEvent(new MouseEvent(on ? 'mousedown' : 'mouseup', { button: btn, bubbles: true })); };
let started = false;

export function startGamepad() {
  if (started || typeof window === 'undefined') return; started = true;
  const tick = () => {
    requestAnimationFrame(tick);
    const p = (navigator.getGamepads?.() || []).find(x => x && x.connected);
    if (!p) { if (pad.on) { pad.on = false; pad.steer = pad.throttle = pad.lookX = pad.lookY = 0; for (const c of Object.keys(down)) if (down[c]) { if (c[0] === 'm') mouse(+c[1], false); else set(c, false); } } return; }
    pad.on = true;
    const b = i => !!p.buttons[i]?.pressed, ax = i => p.axes[i] || 0, tv = i => p.buttons[i]?.value || 0;
    const foot = game.onFoot, lx = dz(ax(0)), ly = dz(ax(1));
    for (const [i, code] of Object.entries(BTN)) set(code, b(+i));
    pad.lookX = dz(ax(2)); pad.lookY = dz(ax(3));
    if (foot) {
      pad.steer = pad.throttle = 0;
      set('KeyA', lx < -0.35); set('KeyD', lx > 0.35); set('KeyW', ly < -0.35); set('KeyS', ly > 0.35);
      mouse(0, tv(7) > 0.5); mouse(2, tv(6) > 0.5);   // RT = hold left click (bolt on / work), LT = hold right click
    } else {
      pad.steer = -lx; pad.throttle = tv(7) - tv(6);   // steering left is +; RT throttle, LT brake / reverse
      set('KeyA', false); set('KeyD', false); set('KeyW', false); set('KeyS', false); mouse(0, false); mouse(2, false);
    }
  };
  requestAnimationFrame(tick);
}
