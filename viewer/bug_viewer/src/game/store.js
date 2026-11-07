// Tiny game-state store shared by the 3D scene (pickups, shop, pause) and the React UI (menus, HUD).
import { useEffect, useState } from 'react';
import { parts, wheelSets, rims, partFits, wheelSetFits, partById, wheelById, rimById, labelFor } from '../build.js';

const KEY = 'baja-save-v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saved = read();

export const game = {
  paused: false, prompt: '', pos: { x: 0, z: 0, h: 0 }, pose: null, keepPose: false,
  cash: saved.cash ?? 500, owned: new Set(saved.owned || []), unlockAll: saved.unlockAll ?? true,
  toast: null, crates: {}, listeners: new Set(),
};
export const emit = () => game.listeners.forEach(f => f());
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ cash: game.cash, owned: [...game.owned], unlockAll: game.unlockAll })); } catch {} };

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
