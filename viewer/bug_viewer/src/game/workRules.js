// Work orders and the repair ledger (PURE, loads under node): every customer job you finish is written down: who, what was wrong, what you
// used, what it paid and when. The last 40 are kept in home.workLog and saved. PROPOSAL.
export const KEEP = 40;
/** j: the job (JOBS entry), used: a short text of what went into it, pay: what it paid, t: game clock hour */
export const makeOrder = (j, used, pay, t) => ({ who: j.who, job: j.title, used: used || 'your hands', pay, t: Math.round((t ?? 0) * 10) / 10 });
export const addOrder = (log, o) => [...(log || []), o].slice(-KEEP);
export const orderLine = o => `${o.who}: ${o.job} (${o.used}) +$${o.pay}`;
/** totals for the ledger header */
export function ledgerTotals(log) {
  const l = log || [], pay = l.reduce((n, o) => n + o.pay, 0), who = {};
  for (const o of l) who[o.who] = (who[o.who] || 0) + 1;
  const top = Object.entries(who).sort((a, b) => b[1] - a[1])[0];
  return { jobs: l.length, pay, best: top && top[1] > 1 ? `${top[0]} (${top[1]}x)` : '' };
}
