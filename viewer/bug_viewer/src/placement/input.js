// Input for vehicle cargo placement, called from the game's own handlers (main.jsx keydown / mousedown, Walker's sprint check).
// Every function is a no-op returning false unless ?placement=1 AND the player is aiming at a cargo surface, so with the flag off (or
// looking anywhere else) the walking game's keys are exactly as before. Owner's controls: LEFT CLICK puts down / takes out (never a key);
// Q / E turn 15° (Shift 90°) and R = next 90° ONLY while aiming a held item at a surface (E stays "interact" otherwise); wheel 5° (Shift 90°);
// hold Shift = snap to the surface grid (instead of running) only then. No key stands a tire up: it snaps upright into a mount (vehicleSurfaces mounts).
import { held } from '../game/items.js';
import { say } from '../game/store.js';
import { snapRot } from './rules.js';
import { PLACEMENT } from './flag.js';
import { aim, keys, placeHeld, takeFromGrid, turnHeld } from './cargoStore.js';

const DEG = Math.PI / 180, QUARTER = Math.PI / 2;
/** is a held item being aimed at a cargo surface right now? (then Shift snaps instead of running, Q / E / R / wheel turn it) */
export const aimingHeld = () => PLACEMENT && aim.cur?.mode === 'place' && !!held();
const turn = (dir, step, locked) => turnHeld(held(), r => (locked ? snapRot(r + dir * QUARTER, '90') : snapRot(r + dir * step, 'free')));

/** keydown: true = handled here (the caller stops) */
export function placementKey(e) {
  if (!aimingHeld()) return false;
  if (e.repeat && !/^Key[QE]$/.test(e.code)) return false;
  if (e.code === 'KeyQ') turn(-1, 15 * DEG, e.shiftKey);
  else if (e.code === 'KeyE') turn(1, 15 * DEG, e.shiftKey);
  else if (e.code === 'KeyR') turnHeld(held(), r => snapRot(r + QUARTER, '90'));
  else return false;
  return true;
}
/** left click (pointer already locked): put the held item down / take the aimed item out. true = handled. */
export function placementClick() {
  const a = PLACEMENT && aim.cur; if (!a) return false;
  if (a.mode === 'take') return takeFromGrid(a.uid);
  if (a.mode === 'place') {
    if (a.reason) { say(`Can't put it there: ${a.reason}`); return true; }
    return placeHeld(a.veh, a.surface, a.cand);
  }
  return false;
}
/** wheel, window capture phase: turns a held item while aiming (and the chase camera must not zoom at the same time) */
export function placementWheel(e) {
  if (!aimingHeld()) return;
  e.preventDefault(); e.stopPropagation();
  const d = e.deltaY || e.deltaX; if (d) turn(Math.sign(d), 5 * DEG, e.shiftKey);
}
/** Shift state for "hold Shift = snap" (tracked here so the rules see it, whatever else listens to Shift) */
export function placementShift(e) { if (e.type === 'blur') keys.shift = false; else if (e.key === 'Shift') keys.shift = e.type === 'keydown'; }
