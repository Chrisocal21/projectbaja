// The in-game HUD: status (top left), notifications (top right), interaction prompt (centre), carry/storage (bottom right),
// key hints (bottom left) and the crosshair. Pure presentation over the game store.
import React from 'react';
import { game, useGame } from './store.js';
import { yardProgress } from './home.js';
import { held, nameOfItem, sizeOf, SIZE_NAME, used, CAPACITY, packCap, hasRack, storageOf } from './items.js';
import { activeType } from './fleet.js';
import { Key } from './BuildMenu.jsx';
import { clockHour } from './clock.js';
import { formatClock, isNight } from '../worlds/clock.js';

/** the time of day, ticking on its own (game.clock changes every frame without emit(), to avoid a 60fps React re-render) */
function ClockChip() {
  const [, tick] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(id); }, []);
  const h = clockHour(), night = isNight(h);
  return <span className={`hs-chip plain clock${night ? ' night' : ''}`}><i />{formatClock(h)}</span>;
}

/** "Press E — Get in  ·  X — Take a part off" → [['E', 'Get in'], ['X', 'Take a part off']] (text without a key stays plain) */
export const promptParts = s => s.split(/\s+·\s+/).map(p => { const m = /^(?:Press )?([A-Z][A-Za-z0-9]{0,4}|Esc|Tab|Shift) — (.+)$/.exec(p.trim()); return m ? [m[1], m[2]] : [null, p.trim()]; });

/** a row of slots (one square per unit of space) when the space is small, a bar when it is big */
const Meter = ({ label, v, cap }) => <div className="hc-meter"><span>{label}</span>
  {cap <= 12 ? <u className="pips">{Array.from({ length: cap }, (_, i) => <b key={i} className={i < v ? 'on' : ''} />)}</u>
    : <i><b style={{ width: `${Math.min(100, (v / Math.max(1, cap)) * 100)}%` }} className={v >= cap ? 'full' : ''} /></i>}
  <em className={v >= cap ? 'full' : ''}>{v}/{cap}</em></div>;

export function HudOverlay() {
  useGame();
  const h = game.home, story = !game.dev, open = !!(h?.open && h?.power);
  return <>
    <div className="hud-status">
      <div className="hs-cash"><small>$</small>{game.cash.toLocaleString()}</div>
      {story && h && <div className="hs-chips">
        <ClockChip />
        <span className={`hs-chip ${open ? 'ok' : h.power ? 'off' : 'dead'}`}><i />{open ? 'Shop open' : h.power ? 'Shop closed' : 'No power'}</span>
        {game.settings?.creative && <span className="hs-chip creative"><i />Creative</span>}
        {(game.mats?.scrap || 0) > 0 && <span className="hs-chip plain">Scrap {game.mats.scrap}</span>}
        {(game.mats?.wood || 0) > 0 && <span className="hs-chip plain">Wood {game.mats.wood}</span>}
      </div>}
    </div>
    {game.prompt && <div className="hud-prompt2">{promptParts(game.prompt).map(([k, t], i) => <span key={i} className="hp-part">{k && <Key k={k} />}<span>{t}</span></span>)}</div>}
    {game.toast && <div key={game.toast.t} className="hud-toast2"><i />{game.toast.msg}</div>}
  </>;
}

import { nextStep } from './teardown.js';
/** bottom-left key hints for the current mode */
export function KeyHints({ driving, pro, cabLabel }) {
  useGame();
  const bm = game.buildMode;
  if (!bm) return null;   // walking and driving show no key list (the keys live in the phone's Settings > Controls); only build mode needs its controls on screen
  const list = bm ? (bm.moving ? [['Click', 'Set down'], ['Wheel/Q/E/R', 'Rotate'], ['Shift', 'Snap'], ['Esc', 'Cancel']]
    : [['Click', 'Build / pick up'], ['Q/E/R', 'Rotate'], ['Shift', 'Snap'], ['Wheel', 'Rotate'], ['1-8', 'Hotbar'], ['V', 'Move'], ['X', 'Remove'], ['B', 'Build menu'], ['Esc', 'Put away']])
    : driving ? [['W/S', 'Throttle'], ['A/D', 'Steer'], ['Space', 'Brake'], ['R', 'Reset'], ['C', cabLabel || 'Cab view'], ['Y', 'Unstuck'], ['E', 'Get out'], ['M', 'Map'], ['Esc', 'Menu'], ...(pro ? [['Pad', 'Gamepad ok']] : [])]
      : [['WASD', 'Walk'], ['Shift', 'Run'], ['E', 'Interact'], ['Tab', 'Inventory'], ['F', 'Car storage'], ['L', 'Lights'], ['Y', 'Unstuck'], ...(game.canBuild ? [['B', 'Build'], ['U', 'Upgrades']] : []), ['M', 'Map'], ['I', 'Index'], ['Esc', 'Menu']];
  return <div className={`hud-keys2${bm ? ' col' : ''}`}>{bm?.why && <span style={{ color: '#ff8a7a' }}>{bm.why}</span>}{list.map(([k, t]) => <span key={k + t}><Key k={k} />{t}</span>)}</div>;
}

/** the assembly guide: while the Bug is not whole, one line says how far along it is and what to fit next (game/teardown.js) */
export function BuildHint() {
  useGame();
  if (!game.onFoot || game.buildMode || game.dev || !game.build) return null;
  const yard = yardProgress();   // the cleanup comes first; the assembly guide takes over once the yard is clear
  if (yard) return <div className="hud-guide"><small>FIRST JOB</small><b>CLEAN UP THE PLACE · {yard.total - yard.left}/{yard.total} TIRES</b><p>Old tires are still heaped around the shop. Bald ones go on the scrap pile beside the lot (${yard.pay} each). Ones with rubber left go on a tire rack. You can open for business once they are all dealt with.</p><div className="bar"><i style={{ width: `${((yard.total - yard.left) / yard.total) * 100}%` }} /></div></div>;
  const n = nextStep(game.build, game.items.find(i => i.kind === 'stock' && i.id === 'engine' && i.loc !== 'car')); if (!n) return null;
  return <div className="hud-guide"><small>ASSEMBLY</small><b>{n.text.replace('Putting her back together: ', '')}</b><p>{n.tip}</p><div className="bar"><i style={{ width: `${(n.fitted / n.total) * 100}%` }} /></div></div>;
}

export function Crosshair() {
  useGame();
  if (!game.onFoot || !game.settings?.crosshair) return null;
  return <div className={`xhair${game.buildMode ? ' build' : ''}${game.target ? ' hot' : ''}`}><i /></div>;
}
