// Tiny game-state store shared by the 3D scene (pickups, shop, pause) and the React UI (menus, HUD).
import { useEffect, useState } from 'react';
import { WEAR } from '../weather.js';
import { parts, wheelSets, rims, partFits, wheelSetFits, partById, wheelById, rimById, labelFor } from '../build.js';

const KEY = 'baja-save-v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saved = read();

export const game = {
  paused: false, prompt: '', pos: { x: 0, z: 0, h: 0 }, pose: null, keepPose: false,
  cash: saved.cash ?? 500, owned: new Set(saved.owned || []), unlockAll: saved.unlockAll ?? true,
  toast: null, crates: {}, listeners: new Set(), target: null, wear: saved.wear ?? 0.85,
  items: saved.items || [], boxes: saved.boxes || {}, build: saved.build || null,
  onFoot: false, dev: false, start: 'plaza', speed: 0, fueled: false, walkStart: null, walkPose: null, face: { x: 0, z: -1 },
};
WEAR.value = game.wear;
export const emit = () => game.listeners.forEach(f => f());
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ cash: game.cash, owned: [...game.owned], unlockAll: game.unlockAll, wear: game.wear, items: game.items, boxes: game.boxes, build: game.build })); } catch {} };
export const save = () => { persist(); emit(); };
export const saveBuild = b => { game.build = b; if (!game.dev) persist(); };

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
export function addCash(n) { game.cash += n; persist(); emit(); }
export function grant(kind, id) { game.owned.add(itemKey(kind, id)); persist(); emit(); }
export function setUnlockAll(v) { game.unlockAll = v; persist(); emit(); }
export function setWear(v) { game.wear = v; WEAR.value = v; persist(); emit(); }
/** Start the story: a pocket of cash, nothing owned, every part has to be found or bought. */
export function newGame() { game.cash = 2500; game.owned.clear(); game.unlockAll = false; game.crates = {}; game.wear = 0.85; WEAR.value = 0.85; persist(); emit(); }
export function buyCar(id, price) { if (game.owned.has('car:' + id) || game.cash < price) return false; game.cash -= price; game.owned.add('car:' + id); persist(); emit(); return true; }
/** Press E on something in the world. Panels (shop, dealer, workbench) are opened by the app; everything else is handled here. */
export function interact(id) {
  const lines = ["Al: 'Two cars on the lot, one wallet. Pick one.'", "Al: 'The Bug's no beauty, but she's honest. Mostly.'", "Al: 'Parts? Take her to your garage and build it yourself.'", "Al: 'Battery was dead so I pulled it. Dusty's gas station sells 'em.'"];
  if (id === 'enter') { game.onFoot = false; game.walkPose = null; emit(); }
  else if (id === 'exit') {
    const p = game.pose; if (p) game.walkStart = { x: p.x + Math.cos(p.h) * 2.6, z: p.z - Math.sin(p.h) * 2.6, yaw: p.h + Math.PI };
    game.onFoot = true; emit();
  }
  else if (id === 'tarp') say("Al: 'That one's not running yet, kid. Give me a month.'");
  else if (id === 'al') say(lines[(game.alLine = ((game.alLine ?? -1) + 1)) % lines.length]);
  else if (id === 'pump') { if (game.fueled) say('Tank is already full.'); else if (game.cash < 25) say('Not enough cash for gas.'); else { addCash(-25); game.fueled = true; say('Tank filled up — $25'); } }
  else if (id === 'wash') { if (game.wear <= 0.02) say("Clerk: 'Car's already clean, pal.'"); else if (game.cash < 120) say('Not enough cash for a wash.'); else { addCash(-120); setWear(Math.max(0, game.wear - 0.12)); say('Hand wash & wax — $120. Looks a bit better.'); } }
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
  if (!pool.length || Math.random() < 0.3) { const n = 100 + Math.floor(Math.random() * 4) * 50; addCash(n); say(`+$${n} cash`); return; }
  const [k, id] = pool[Math.floor(Math.random() * pool.length)];
  grant(k, id); say(`Found: ${nameOf(k, id, bodyId)}${game.unlockAll ? '' : ' — equip it in Customize'}`);
}

export function useGame() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set(n => n + 1); game.listeners.add(f); return () => game.listeners.delete(f); }, []);
  return game;
}
