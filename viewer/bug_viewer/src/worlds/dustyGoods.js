// Where each thing Dusty sells stands in his store (pure numbers). Local frame of SITES.gas, like dustyLayout.js.
// [what ("kind:id", as in jobs.js STORE_ITEMS), x, height above the site, z]. PROPOSAL arrangement.
import { SHELVES, STORE } from './dustyLayout.js';

const [ISLAND, BACK] = SHELVES;
const TOP = ISLAND.h - 0.1, MID = 0.18 + (BACK.h - 0.3) / 2 + 0.02;   // the island's top board and the back wall's middle board
const FLOOR = 0.13, FRONT = STORE.z1 - 0.75;                          // on the floor under the window
const row = (shelf, y, ids) => ids.map((what, i) => [what, shelf.x - shelf.w / 2 + 0.45 + i * (shelf.w - 0.9) / (ids.length - 1), y, shelf.z]);

export const GOODS_SPOTS = [
  ...row(ISLAND, TOP, ['supply:oil', 'supply:bulb', 'supply:plug', 'supply:wipers', 'supply:belt', 'tool:spray-white', 'tool:spray-black', 'tool:wrench']),
  ...row(BACK, MID, ['stock:battery', 'junk:jerrycan', 'tool:pump', 'tool:hose', 'mat:bolts']),
  ['tool:jack', 0.2, FLOOR, FRONT], ['tool:shovel', 1.7, FLOOR, FRONT], ['mat:wood', 3.2, FLOOR, FRONT], ['mat:steel', 4.7, FLOOR, FRONT],
];
/** the shelf boards that hold real goods: [shelf index in SHELVES, board index]. No set dressing goes there. */
export const REAL_BOARDS = [[0, 2], [1, 1]];
