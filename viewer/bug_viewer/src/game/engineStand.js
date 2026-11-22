// The engine stand as a bench (impure). Set an engine down within reach of a stand and it goes on; its outside pieces appear on it
// as real items you pick up one by one (taking them off in order) and set back down beside it to refit. Pieces keep their condition.
// Data: core item { kind:'stock', id:'engine', onStand: standUid, parts: { slot: { c } } }; piece item { kind:'epart', id: slot, cond, onEngine: coreUid }.
import { game, save, say } from './store.js';
import { allocUid } from './saveFormat.js';
import { ENGINE_SLOTS, slotOf, freshParts, removeBlock, fitBlock } from './engineRules.js';

export const STAND_R = 1.5, MOUNT_S = 1.5, FIT_S = 1.0;
const timers = new Map();
const commit = () => { game.items = [...game.items]; save(); };
const uid = () => allocUid(game.nextUid, 'items', game.items);
/** where a piece sits on the stand, in world metres */
export function slotWorld(stand, slotId) {
  const s = slotOf(slotId), [dx, dy, dz] = s.at, a = stand.ry || 0, c = Math.cos(a), n = Math.sin(a);
  return { x: stand.x + dx * c + dz * n, z: stand.z - dx * n + dz * c, y: dy, ry: a };
}
const placeAt = (it, w) => { it.x = w.x; it.z = w.z; it.y = w.y; it.ry = w.ry; };
const hasStand = (stands, u) => stands.some(m => m.uid === u);

/** called when you try to take an item: false = refused (the reason was said). Also keeps the stand's books when the engine or a piece leaves. */
export function engineGate(it) {
  if (it.onEngine) {
    const core = game.items.find(i => i.uid === it.onEngine);
    if (core) {
      const why = removeBlock(core.parts, it.id);
      if (why) { say(why); return false; }
      it.cond = core.parts[it.id].c; it.grimy = !!core.parts[it.id].g; delete core.parts[it.id];
    }
    delete it.onEngine; return true;
  }
  if (it.onStand) {   // lifting the engine off: whatever is still on it goes with it (kept in `parts`), loose pieces stay behind
    game.items = game.items.filter(i => i.onEngine !== it.uid); delete it.onStand;
  }
  return true;
}

/** every frame: engines mount on stands, loose pieces beside a stand with an engine refit. */
export function tickEngineStand(dt) {
  if (game.dev || game.paused) return;
  const stands = game.props.filter(p => p.id === 'engineStand'); if (!stands.length) return;
  let changed = false;
  // pieces whose engine left their stand go loose
  for (const i of game.items) if (i.onEngine && !game.items.some(c => c.uid === i.onEngine && c.onStand)) { delete i.onEngine; changed = true; }
  for (const m of stands) {
    const near = i => i.loc === 'world' && i.x !== undefined && Math.hypot(i.x - m.x, i.z - m.z) <= STAND_R;
    const core = game.items.find(i => i.onStand === m.uid && i.loc === 'world');
    if (!core) {
      const eng = game.items.find(i => i.kind === 'stock' && i.id === 'engine' && !i.onStand && near(i));
      if (!eng) { timers.delete(m.uid); continue; }
      const t = (timers.get(m.uid) || 0) + dt; timers.set(m.uid, t);
      if (t < MOUNT_S) continue;
      timers.delete(m.uid);
      eng.parts = eng.parts || freshParts(); eng.onStand = m.uid; placeAt(eng, { x: m.x, z: m.z, y: 0.5, ry: m.ry || 0 });
      for (const s of ENGINE_SLOTS) if (eng.parts[s.id]) game.items.push({ uid: uid(), kind: 'epart', id: s.id, loc: 'world', cond: eng.parts[s.id].c, grimy: !!eng.parts[s.id].g, onEngine: eng.uid, ...slotWorld(m, s.id) });
      say('The engine is on the stand. Take the pieces off one at a time; set them back beside it to refit.'); changed = true; continue;
    }
    const loose = game.items.filter(i => i.kind === 'epart' && !i.onEngine && near(i));
    const pick = loose.find(i => !fitBlock(core.parts, i.id));
    if (!pick) {
      const bad = loose.find(i => fitBlock(core.parts, i.id));
      const key = bad ? m.uid + ':' + bad.uid + ':' + fitBlock(core.parts, bad.id) : '';
      if (bad && timers.get(m.uid + 'w') !== key) { timers.set(m.uid + 'w', key); say('Engine stand: ' + fitBlock(core.parts, bad.id)); }
      timers.delete(m.uid + 'p'); continue;
    }
    const t = (timers.get(m.uid + 'p') || 0) + dt; timers.set(m.uid + 'p', t);
    if (t < FIT_S) continue;
    timers.delete(m.uid + 'p'); timers.delete(m.uid + 'w');
    core.parts[pick.id] = { c: pick.cond ?? 70, ...(pick.grimy ? { g: 1 } : {}) }; pick.onEngine = core.uid; placeAt(pick, slotWorld(m, pick.id));
    say(`${slotOf(pick.id).name} fitted.`); changed = true;
  }
  if (changed) commit();
}
