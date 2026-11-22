// E at a bin / tool chest / rack: put what you hold into it, or take the last thing out. Rules and numbers: binRules.js
import { game, save, say } from './store.js';
import { held, sizeOf, canCarry, nameOfItem, takeFromGarage } from './items.js';
import { isBin, stowBlock, inBin, binPrompt } from './binRules.js';

const sz = i => sizeOf(i.kind, i.id);
const propOf = uid => game.props.find(p => p.uid === uid);
const toStow = () => held() || [...game.items].reverse().find(i => i.loc === 'pack' && i.kind !== 'tool');   // what E puts in: your hands, else the last small part in the pack
export const binText = uid => { const p = propOf(uid); return p && isBin(p.id) ? binPrompt(p.id, game.items, uid, sz, nameOfItem, !!toStow()) : ''; };
export function useBin(uid) {
  const p = propOf(uid); if (!p || !isBin(p.id)) return;
  const it = toStow();
  if (it) {
    const why = stowBlock(p.id, game.items, uid, it, sz); if (why) return say(why);
    for (const k of ['x', 'z', 'y', 'ry', 'wall', 'spot', 'box', 'veh', 'surf', 'pose', 'peg']) delete it[k];
    Object.assign(it, { loc: 'bin', bin: uid }); game.items = [...game.items]; save(); return say(`${nameOfItem(it)} → ${binText(uid).split(':')[0]}`);
  }
  say(binText(uid));
}
/** left click on a bin: take the last thing put in out again */
export function takeBin(uid) {
  const p = propOf(uid); if (!p || !isBin(p.id)) return;
  const last = inBin(game.items, uid).pop(); if (!last) return say(binText(uid));
  if (!canCarry(last.kind, last.id)) return say('Your hands are full.');
  delete last.bin; last.loc = 'garage'; takeFromGarage(last.uid);
  if (last.loc === 'garage') { last.loc = 'bin'; last.bin = uid; return; }   // no room after all: it stays in the bin
  save(); say(`Took out ${nameOfItem(last)}.`);
}
/** the prop is stored or sold: what was inside falls out onto the floor beside it */
export function spillBin(p) {
  const inside = inBin(game.items, p.uid); if (!inside.length) return;
  inside.forEach((i, n) => { delete i.bin; Object.assign(i, { loc: 'world', y: 0, ry: 0, x: p.x + ((n % 4) - 1.5) * 0.35, z: p.z + Math.floor(n / 4) * 0.35 + 0.5 }); });
  game.items = [...game.items]; save(); say(`${inside.length} thing${inside.length === 1 ? '' : 's'} spilled out onto the floor`);
}
