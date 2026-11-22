// Glue for salvage terms (rules: salvageRules.js): called before a part comes off a wreck or donor. -> true if the part may come off now.
import { game, save, say, addCash } from './store.js';
import { salvageGate } from './salvageRules.js';

export function mayStrip(W) {
  if (game.dev || !W || W.id === 'bug' || W.uid == null) return true;
  const p = (game.projects || []).find(q => q.uid === W.uid); if (!p) return true;
  const g = salvageGate(p, game.cash);
  const set = patch => { game.projects = game.projects.map(q => (q.uid === p.uid ? { ...q, ...patch } : q)); };
  if (g.offered) set({ salvageOffered: true });
  if (g.allow && g.charge) { addCash(-g.charge, `Salvage fee: ${p.name}`); set({ salvagePaid: true }); }
  if (g.msg) { save(); say(g.msg); }
  return g.allow;   // paying the fee also lets this first part come off
}
