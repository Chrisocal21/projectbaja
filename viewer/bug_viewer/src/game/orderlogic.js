// Ordering parts from the phone (PROPOSAL, first slice): pure queue math, no game state. docs/GAMEPLAN.md, job 4.
// An order is { kind, id, left } where `left` is in-game hours until it arrives at the shop pickup area.
export const ORDER_HOURS = 3;   // PROPOSAL: a few in-game hours

export const newOrder = (kind, id, hours = ORDER_HOURS) => ({ kind, id, left: hours });

/** time passes: returns { orders: still on the way, arrived: orders that are due now } (input is not changed) */
export function advanceOrders(orders, hours) {
  const dt = Math.max(0, hours), still = [], arrived = [];
  for (const o of orders || []) { const left = o.left - dt; (left <= 1e-9 ? arrived : still).push(left <= 1e-9 ? o : { ...o, left }); }
  return { orders: still, arrived };
}

/** hours between two readings of a 24 h clock, going forward (a wrap past midnight counts; a jump of 12 h or more is not real play) */
export function clockDelta(before, after) {
  const d = (((after - before) % 24) + 24) % 24;
  return d < 12 ? d : 0;
}

export const etaText = left => (left <= 0.05 ? 'any moment' : left < 1 ? `${Math.max(1, Math.round(left * 60))} min` : `${Math.round(left * 10) / 10} h`);

/** the same thing arriving together is one line: [{ name, n, left }] (left = the soonest of the group). order of first appearance. */
export function groupOrders(list, nameOf, etaOf) {
  const out = [], at = {};
  for (const o of list) {
    const name = nameOf(o), key = name + '|' + etaOf(o.left);
    if (at[key] === undefined) { at[key] = out.length; out.push({ name, n: 1, left: o.left }); } else { out[at[key]].n++; out[at[key]].left = Math.min(out[at[key]].left, o.left); }
  }
  return out;
}
