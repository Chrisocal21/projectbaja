// Atomic game actions (canon: "an install updates the vehicle and the inventory in one atomic transaction").
// Plain JS, no React: the store hands in how to snapshot, restore and write the save.
//
//   const tx = createTx({ snapshot, restore, write });
//   tx.request()   - what the store calls instead of writing; inside a transaction it only marks the save dirty
//   tx.run(fn)     - runs fn; every write requested inside becomes ONE write at the end. If fn throws, the state
//                    is restored from the snapshot and nothing is written, so a half-done install never reaches the save.

export function createTx({ snapshot, restore, write }) {
  let depth = 0, snap = null;
  return {
    get open() { return depth > 0; },
    request() { if (depth) return false; write(); return true; },
    run(fn) {
      if (depth === 0) snap = snapshot();
      depth++;
      let r;
      try { r = fn(); }
      catch (e) { depth--; if (depth === 0) { restore(snap); snap = null; } throw e; }
      depth--;
      if (depth === 0) { snap = null; write(); }
      return r;
    },
  };
}

/** a deep-enough copy of the parts of the game state an install or removal touches */
export const snapshotOf = g => ({ items: g.items.map(i => ({ ...i })), build: g.build, cash: g.cash, mats: { ...g.mats }, home: g.home });
