// Tiny game-state store shared by the 3D scene (pickups, shop, pause) and the React UI (menus, HUD).
import { useEffect, useState } from 'react';
import { WEAR } from '../weather.js';
import { createTx, snapshotOf } from '../rules/atomic.js';
import { parts, wheelSets, rims, partFits, wheelSetFits, partById, wheelById, rimById, labelFor } from '../build.js';

import { parseSave, wrap, CURRENT, sanitizeJob, sanitizeCrates, resumePlan, keysToPrune } from './saveFormat.js';

export const KEY = 'baja-save-v1';   // the key name is kept for compatibility; the value is now a versioned envelope (saveFormat.js)
const notices = [];           // load-time warnings, shown now and again when the story starts (the title may not be up yet)
/** keep only the newest 3 backups and 3 corrupt copies (the main save is never touched) */
export function pruneOldCopies() {
  try { const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); keysToPrune(keys).forEach(k => localStorage.removeItem(k)); } catch {}
}
/** read + migrate the save. Never throws, never destroys: a bad blob is stashed, a newer one is kept untouched. */
function loadSave() {
  let raw = null, locked = false;
  try { raw = localStorage.getItem(KEY); } catch { return { data: {}, locked: false }; }
  const r = parseSave(raw), ts = Date.now();
  if (r.status === 'corrupt') {
    try { localStorage.setItem(`baja-save-corrupt-${ts}`, raw); notices.push('Your save could not be read. A copy was kept (baja-save-corrupt-' + ts + ') and a fresh game was started.'); }
    catch { locked = true; notices.push('Your save could not be read and could not be copied aside. Saving is turned off so it is not overwritten.'); }
  } else if (r.status === 'newer') {
    locked = true; notices.push('This save is from a newer version of the game. Update the game to load it. Saving is off so it is not overwritten.');
  } else if (r.status === 'ok' && r.from < CURRENT) {
    try { localStorage.setItem(`baja-save-backup-v${r.from}-${ts}`, raw); }
    catch { locked = true; notices.push('Could not back up your old save before updating it. Saving is turned off so nothing is lost.'); }
  }
  pruneOldCopies();
  return { data: r.status === 'ok' ? r.data : {}, locked, status: r.status };
}
const loaded = loadSave(), saved = loaded.data;

export const game = {
  paused: false, flyMode: false, prompt: '', pos: { x: 0, z: 0, h: 0 }, pose: null, keepPose: false,
  cash: saved.cash ?? 500, owned: new Set(saved.owned || []), unlockAll: saved.unlockAll ?? true,
  toast: null, crates: sanitizeCrates(saved.crates), listeners: new Set(), target: null, wear: saved.wear ?? 0.85,
  items: saved.items || [], boxes: saved.boxes || {}, build: saved.build || null,
  fleet: saved.fleet || { bug: { pose: null } }, active: saved.active || 'bug',
  home: saved.home || { cleared: [], power: false, letter: false }, props: saved.props || [], mats: saved.mats || { scrap: 0 }, job: sanitizeJob(saved.job), clock: saved.clock ?? 9,
  nextUid: { props: saved.nextUid?.props || 1, items: saved.nextUid?.items || 1 }, saveLocked: loaded.locked, resume: resumePlan(saved, saved.fleet?.[saved.active ?? 'bug']?.pose), live: false,
  onFoot: false, dev: false, start: 'plaza', speed: 0, fueled: !!saved.fueled, walkStart: null, walkPose: null, face: { x: 0, z: -1 },
};
WEAR.value = game.wear;
if (typeof window !== 'undefined') window.__game = game;   // test hook
export const emit = () => game.listeners.forEach(f => f());
// Dev sessions (test worlds, free drive) never write the story save (canon: saves are sacred).
let warnedWrite = false;
const buildData = () => ({ cash: game.cash, owned: [...game.owned], unlockAll: game.unlockAll, wear: game.wear, items: game.items, boxes: game.boxes, build: game.build, fleet: { ...game.fleet, [game.active]: { ...(game.fleet[game.active] || {}), pose: game.pose ? { x: game.pose.x, z: game.pose.z, h: game.pose.h } : game.fleet[game.active]?.pose || null } }, active: game.active, home: game.home, props: game.props, mats: game.mats, clock: game.clock, nextUid: game.nextUid, job: game.job, fueled: game.fueled, crates: game.crates, onFoot: game.onFoot, walkPose: game.onFoot ? game.walkPose : null });
export const writeSave = () => {
  if (game.dev || game.saveLocked) return;
  try { localStorage.setItem(KEY, JSON.stringify(wrap(buildData()))); warnedWrite = false; }
  catch { if (!warnedWrite) { warnedWrite = true; say('WARNING: the game could not save (storage full or blocked). Your progress is not being kept.'); } }
};
/** autosave the moving parts (position, job timer) that no action saves: every few seconds and when the page is closed or hidden */
if (typeof window !== 'undefined') {
  const auto = () => { if (game.live && !game.dev) writeSave(); };
  setInterval(auto, 5000);
  window.addEventListener('pagehide', auto);
  document.addEventListener('visibilitychange', () => { if (document.hidden) auto(); });
}
/** show load-time warnings again once the story starts */
export const flushSaveNotices = () => { if (notices.length) say(notices.join(' ')); };
if (typeof window !== 'undefined') setTimeout(flushSaveNotices, 0);
const tx = createTx({ snapshot: () => snapshotOf(game), restore: s => Object.assign(game, s), write: writeSave });
const persist = () => tx.request();
/** run one player action (fit, detach, buy...) as a single save write; if it throws, nothing changes */
export const transact = fn => { try { return tx.run(fn); } finally { emit(); } };
export const save = () => { persist(); emit(); };
export const saveBuild = b => { game.build = b; persist(); };

export const itemKey = (kind, id) => `${kind}:${id}`;
export const isFree = (kind, id) => (kind === 'wheel' && id === 'stock') || (kind === 'rim' && id === 'steel');
export const owns = (kind, id) => game.unlockAll || isFree(kind, id) || game.owned.has(itemKey(kind, id));
export const nameOf = (kind, id, bodyId) => labelFor(kind === 'part' ? partById[id] : kind === 'wheel' ? wheelById[id] : rimById[id], bodyId);

export function priceOf(kind, id) {
  if (kind === 'part') { const p = partById[id]; return p.price ?? Math.round((120 + (p.perf?.topMph || 0) * 12 + ((p.perf?.power || 1) - 1) * 600) / 10) * 10; }
  if (kind === 'wheel') return wheelById[id].price ?? 300;
  return rimById[id].price ?? 120;
}

export function say(msg) {
  const t = Date.now(); game.toast = { msg, t }; emit();
  setTimeout(() => { if (game.toast?.t === t) { game.toast = null; emit(); } }, 3200);
}
export function setPrompt(p) { if (game.prompt !== p) { game.prompt = p; emit(); } }
/** change the cash; `why` (short text) goes in the phone's Money history (last 30 kept in game.home.cashLog) */
export function addCash(n, why) { game.cash += n; if (n) game.home = { ...game.home, cashLog: [...(game.home.cashLog || []), { d: n, why: why || (n > 0 ? 'Money in' : 'Spent'), t: Math.round((game.clock ?? 0) * 10) / 10 }].slice(-30) }; persist(); emit(); }
export function grant(kind, id) { game.owned.add(itemKey(kind, id)); persist(); emit(); }
export function setUnlockAll(v) { game.unlockAll = v; persist(); emit(); }
export function setWear(v) { game.wear = v; WEAR.value = v; persist(); emit(); }
/** Start the story: grandpa's garage and his old Bug are yours, plus what's left of your savings. Every part has to be found or bought. */
export function newGame() {
  game.cash = 1500; game.owned.clear(); game.owned.add('car:bug'); game.unlockAll = false; game.crates = {}; game.wear = 0.85; WEAR.value = 0.85;
  game.fleet = { bug: { pose: null } }; game.active = 'bug'; game.home = { cleared: [], power: false, letter: false }; game.props = []; game.mats = { scrap: 0 }; game.job = null; game.clock = 9; game.nextUid = { props: 1, items: 1 }; game.fueled = false; game.resume = null;
  persist(); emit();
}
export function buyCar(id, price) { if (game.owned.has('car:' + id) || game.cash < price) return false; game.cash -= price; game.owned.add('car:' + id); persist(); emit(); return true; }
/** Press E on something in the world. Panels (shop, dealer, workbench) are opened by the app; everything else is handled here. */
export function interact(id) {
  const lines = ["Al: 'You're Walt's grandkid? Sorry about the old man. He bought half his junk off me.'", "Al: 'That Bug of his has been sitting since '09. Gas'll be stale — she'll take a few cranks.'", "Al: 'Need to haul an engine? That four-by-four out front'll do it. Cash only.'", "Al: 'The half-ton? No motor. Find one and she's a project.'"];
  if (id === 'enter') { game.onFoot = false; game.walkPose = null; emit(); }
  else if (id === 'exit') {
    const p = game.pose; if (p) game.walkStart = { x: p.x + Math.cos(p.h) * 2.6, z: p.z - Math.sin(p.h) * 2.6, yaw: p.h + Math.PI };
    game.onFoot = true; emit();
  }
  else if (id === 'tarp') say("Al: 'The half-ton's got good bones and no motor. Not for sale till I find one.'");
  else if (id === 'al') say(lines[(game.alLine = ((game.alLine ?? -1) + 1)) % lines.length]);
  else if (id === 'pump') { if (game.fueled) say('Tank is already full.'); else if (game.cash < 25) say('Not enough cash for gas.'); else { addCash(-25, 'Gas'); game.fueled = true; say('Tank filled up — $25'); } }
  else if (id === 'wash') { if (game.wear <= 0.02) say("Clerk: 'Car's already clean, pal.'"); else if (game.cash < 120) say('Not enough cash for a wash.'); else { addCash(-120, 'Car wash'); setWear(Math.max(0, game.wear - 0.12)); say('Hand wash & wax — $120. Looks a bit better.'); } }
}
export function resetProgress() { game.cash = 500; game.owned.clear(); persist(); emit(); }

export function buy(kind, id) {
  const cost = priceOf(kind, id);
  if (owns(kind, id) || game.cash < cost) return false;
  game.cash -= cost; game.owned.add(itemKey(kind, id)); persist(); emit(); return true;
}

/** Everything the player could still find / buy for this body. */
export function catalogFor(bodyId) {
  return {
    part: parts.filter(p => partFits(p, bodyId)),
    wheel: wheelSets.filter(w => w.id !== 'stock' && wheelSetFits(w, bodyId)),
    rim: rims.filter(r => r.id !== 'steel'),
  };
}

/** A crate was driven into: cash or a random item the player doesn't own yet. */
export function openCrate(bodyId) {
  const c = catalogFor(bodyId), pool = [];
  for (const k of ['part', 'wheel', 'rim']) for (const it of c[k]) if (!game.owned.has(itemKey(k, it.id))) pool.push([k, it.id]);
  if (!pool.length || Math.random() < 0.3) { const n = 100 + Math.floor(Math.random() * 4) * 50; addCash(n, 'Found cash'); say(`+$${n} cash`); return; }
  const [k, id] = pool[Math.floor(Math.random() * pool.length)];
  grant(k, id); say(`Found: ${nameOf(k, id, bodyId)}${game.unlockAll ? '' : ' — equip it in Customize'}`);
}

export function useGame() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set(n => n + 1); game.listeners.add(f); return () => game.listeners.delete(f); }, []);
  return game;
}
