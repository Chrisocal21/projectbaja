// What Walt's garage runs on, orderable from the phone's Internet app and the office PC (PROPOSAL, docs/CONTROLS_AND_STORAGE_PLAN.md section 5).
// Pure data. Dusty's corner store sells the same things over the counter (jobs.js STORE_ITEMS); ordering saves the walk, not the money.
// Canon says no magic stock, so nothing here is free or unlimited: every order is paid for and arrives as a box at the shop pickup, like a part.
export const SUPPLIES = {
  oil: { name: 'Motor oil (5 qt)', price: 12 }, bulb: { name: 'Headlight bulb', price: 6 },
  plug: { name: 'Tire plug kit', price: 10 }, wipers: { name: 'Wiper blades', price: 14 },
  belt: { name: 'Fan belt', price: 18 },
};
/** [item id as "kind:id", display name, price, tab, note]. The id is what ends up in game.items (kind + id) when the box arrives. */
export const GARAGE_SUPPLIES = [
  ...Object.entries(SUPPLIES).map(([id, s]) => ['supply:' + id, s.name, s.price, 'supplies', 'for customer jobs']),
  ['stock:battery', '12V car battery', 60, 'supplies', 'fits the Bug; the El Cajon has its own'],
  ['tool:wrench', 'Wrench', 15, 'tools', 'bolts most things on and off'],
  ['tool:jack', 'Floor jack', 90, 'tools', 'change tires anywhere'],
];
export const SUPPLY_TABS = [['supplies', 'Supplies'], ['tools', 'Tools']];
const byId = Object.fromEntries(GARAGE_SUPPLIES.map(r => [r[0], r]));
export const supplyName = id => byId[id]?.[1] || id;
export const supplyPrice = id => byId[id]?.[2] ?? 0;
export const suppliesIn = tab => GARAGE_SUPPLIES.filter(r => r[3] === tab).map(([id, name, price, , note]) => ({ id, name, price, note }));
/** "supply:oil" -> ['supply', 'oil'] (the item that gets set down when the order arrives) */
export const itemOf = id => { const i = id.indexOf(':'); return [id.slice(0, i), id.slice(i + 1)]; };
