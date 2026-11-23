// The runtime side of the shops on the map (worlds/shopSites.js, game/shopStock.js): barns, junkyards, off-road stores and gas-station marts.
// Walking up to a shop and pressing E calls openRoadShop; the panel shows roadShelf(); buying calls roadBuy. What you buy leaves that shelf for good.
import { game, say, save, addCash, priceOf, catalogFor } from './store.js';
import { canCarry, giveToPlayer, nameOfItem } from './items.js';
import { shelf } from './shopStock.js';
import { shopName, isShop } from '../worlds/shopSites.js';
import { supplyPrice } from './garageSupplies.js';
import { STORE_ITEMS } from './jobs.js';
import { cajonCatalog } from './cajonParts.js';

/** which buyer (game/market.js BUYERS) takes your goods at each kind of shop */
export const SHOP_BUYER = { barn: 'barn', junk: 'junkyard', offroad: 'offroad', gas: 'mart', rest: 'mart' };
const MART = STORE_ITEMS.filter(r => r[0] !== 'wash').map(([what, , price, note]) => { const [kind, itemId] = what.split(':'); return { id: what, kind, itemId, price, note }; });
let CTX = null;
const ctx = () => CTX ||= {
  cat: { ...catalogFor('classic'), stock: cajonCatalog().filter(c => c.id !== 'wheel') },
  price: (kind, id) => priceOf(kind, id), supplyPrice, martItems: MART,
};
/** the title over the shop's counter */
export const shopTitle = site => (isShop(site) ? shopName(site) : (site.brandName ? site.brandName + ' MART' : 'ROADSIDE MART')).toUpperCase();

/** stand at a shop: remember which one the panel is for */
export function openRoadShop(site, brandName) { game.roadShop = { site: { ...site, brandName }, title: shopTitle({ ...site, brandName }) }; }
/** the shelf now: { key, theme, rows } minus what you have bought, each row with its display label */
export function roadShelf() {
  const rs = game.roadShop; if (!rs) return { rows: [], theme: '' };
  const sh = shelf(rs.site, ctx(), game.home?.shopSold, game.home?.hoursTotal || 0, game.home?.shopSoldAt);
  return { ...sh, rows: sh.rows.map(r => ({ ...r, label: nameOfItem({ kind: r.kind, id: r.itemId }) })) };
}
export function roadBuy(row) {
  const rs = game.roadShop; if (!rs) return;
  if (game.cash < row.price) return say('Not enough cash.');
  if (!canCarry(row.kind, row.itemId)) return say('Your hands are full.');
  const name = nameOfItem({ kind: row.kind, id: row.itemId }), key = roadShelf().key;
  addCash(-row.price, `Bought at ${rs.title.toLowerCase()}: ${name}`); giveToPlayer(row.kind, row.itemId);
  const h = game.home, at = h.hoursTotal || 0;
  game.home = { ...h, shopSold: { ...(h.shopSold || {}), [key]: [...(h.shopSold?.[key] || []).filter(i => i !== row.id), row.id] }, shopSoldAt: { ...(h.shopSoldAt || {}), [key]: { ...(h.shopSoldAt?.[key] || {}), [row.id]: at } } };
  save(); say(`Bought: ${name}`);
}
