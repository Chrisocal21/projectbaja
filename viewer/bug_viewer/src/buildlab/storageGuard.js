// Imported FIRST by the Build Sandbox. The game's building-piece models (worlds/StructureModels.jsx) reuse textures from
// worlds/Sites.jsx and lot/CarLot.jsx, which import the game store (game/store.js) - and that module reads the story save
// ('baja-save-v1') when it loads. This page must never read or write the game's save (or its settings), so on this page
// localStorage only sees keys that start with 'baja-buildlab'. Everything else reads as empty and writes are dropped.
const ALLOW = /^baja-buildlab/;
try {
  const S = Storage.prototype, get = S.getItem, set = S.setItem, rem = S.removeItem;
  S.getItem = function (k) { return ALLOW.test(String(k)) ? get.call(this, k) : null; };
  S.setItem = function (k, v) { if (ALLOW.test(String(k))) set.call(this, k, v); };
  S.removeItem = function (k) { if (ALLOW.test(String(k))) rem.call(this, k); };
  S.clear = function () { for (let i = this.length - 1; i >= 0; i--) { const k = S.key.call(this, i); if (ALLOW.test(String(k))) rem.call(this, k); } };
} catch { /* storage blocked: the sandbox still runs, it just can't autosave */ }
export const guarded = true;
