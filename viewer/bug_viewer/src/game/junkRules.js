// Hauling junk out of the place (PURE, loads under node). A pile is not one click: it goes out in loads, each load is a held haul,
// and the pile gets visibly smaller with every one. Progress lives in home.junkLoads[id] and is saved. PROPOSAL numbers.
export const LOADS = { boxes: 2, cans: 2, papers: 3, scrap: 3, fridge: 3, brush: 3 };
export const HAUL_S = 2.5;   // seconds of holding for one load
export const loadsOf = kind => LOADS[kind] || 2;
export const doneOf = (home, id) => Math.max(0, home?.junkLoads?.[id] | 0);
export const leftOf = (home, j) => Math.max(0, loadsOf(j.kind) - doneOf(home, j.id));
/** how much of the pile is still there, 0..1 (the model scales to this, never below a heap you can still see) */
export const sizeOf = (home, j) => leftOf(home, j) / loadsOf(j.kind);
/** one load hauled -> the new count, and whether that was the last */
export function haul(home, j) { const n = Math.min(loadsOf(j.kind), doneOf(home, j.id) + 1); return { n, last: n >= loadsOf(j.kind) }; }
/** the prompt under the crosshair */
export const haulPrompt = (home, j) => { const l = leftOf(home, j); return `Press E — Pick up ${j.label}`; };
