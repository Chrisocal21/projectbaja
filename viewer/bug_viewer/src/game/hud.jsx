// The in-game HUD: status (top left), notifications (top right), interaction prompt (centre), carry/storage (bottom right),
// key hints (bottom left) and the crosshair. Pure presentation over the game store.
import React from 'react';
import { game, useGame } from './store.js';
import { held, nameOfItem, sizeOf, SIZE_NAME, used, CAPACITY, hasRack, storageOf } from './items.js';
import { activeType } from './fleet.js';
import { Key } from './BuildMenu.jsx';

/** "Press E — Get in  ·  X — Take a part off" → [['E', 'Get in'], ['X', 'Take a part off']] (text without a key stays plain) */
export const promptParts = s => s.split(/\s+·\s+/).map(p => { const m = /^(?:Press )?([A-Z][A-Za-z0-9]{0,4}|Esc|Tab|Shift) — (.+)$/.exec(p.trim()); return m ? [m[1], m[2]] : [null, p.trim()]; });

const Meter = ({ label, v, cap }) => <div className="hc-meter"><span>{label}</span><i><b style={{ width: `${Math.min(100, (v / Math.max(1, cap)) * 100)}%` }} className={v >= cap ? 'full' : ''} /></i><em>{v}/{cap}</em></div>;

export function HudOverlay() {
  useGame();
  const h = game.home, story = !game.dev, open = !!(h?.open && h?.power);
  return <>
    <div className="hud-status">
      <div className="hs-cash"><small>$</small>{game.cash.toLocaleString()}</div>
      {story && h && <div className="hs-chips">
        <span className={`hs-chip ${open ? 'ok' : h.power ? 'off' : 'dead'}`}><i />{open ? 'Shop open' : h.power ? 'Shop closed' : 'No power'}</span>
        {game.settings?.creative && <span className="hs-chip creative"><i />Creative</span>}
        {(game.mats?.scrap || 0) > 0 && <span className="hs-chip plain">Scrap {game.mats.scrap}</span>}
      </div>}
    </div>
    {game.prompt && <div className="hud-prompt2">{promptParts(game.prompt).map(([k, t], i) => <span key={i} className="hp-part">{k && <Key k={k} />}<span>{t}</span></span>)}</div>}
    {game.toast && <div key={game.toast.t} className="hud-toast2"><i />{game.toast.msg}</div>}
    {game.onFoot && !game.buildMode && <div className="hud-carry2">
      <div className="hc-hands"><small>HANDS</small><b>{held() ? nameOfItem(held()) : 'Empty'}</b>{held() && <em>{SIZE_NAME[sizeOf(held().kind, held().id)]} · <Key k="G" /> put down</em>}</div>
      <Meter label="Pack" v={used('pack')} cap={CAPACITY.pack} />
      {Object.entries(storageOf()).map(([k, v]) => <Meter key={k} label={`${activeType().name} · ${v.label}`} v={used(k)} cap={v.cap} />)}
      {activeType().kind === 'build' && !hasRack() && <div className="hc-note">No roof rack</div>}
    </div>}
  </>;
}

/** bottom-left key hints for the current mode */
export function KeyHints({ driving, pro, cabLabel }) {
  useGame();
  const bm = game.buildMode;
  if (!game.settings?.keyHints) return null;
  const list = bm ? (bm.moving ? [['Click', 'Set down'], ['R', 'Rotate'], ['B', 'Cancel']]
    : [['Click', 'Build'], ['R', 'Rotate'], ['Wheel', 'Next in group'], ['1-8', 'Hotbar'], ['N', 'Material'], ['V', 'Move'], ['X', 'Remove'], ['B', 'Build menu'], ['Q', 'Put away']])
    : driving ? [['W/S', 'Throttle'], ['A/D', 'Steer'], ['Space', 'Brake'], ['R', 'Reset'], ['C', cabLabel || 'Cab view'], ['E', 'Get out'], ['M', 'Map'], ['Esc', 'Menu'], ...(pro ? [['Pad', 'Gamepad ok']] : [])]
      : [['WASD', 'Walk'], ['Shift', 'Run'], ['E', 'Interact'], ['Tab', 'Inventory'], ['F', 'Car storage'], ...(game.canBuild ? [['B', 'Build'], ['U', 'Upgrades']] : []), ['M', 'Map'], ['I', 'Index'], ['Esc', 'Menu']];
  return <div className={`hud-keys2${bm ? ' col' : ''}`}>{list.map(([k, t]) => <span key={k + t}><Key k={k} />{t}</span>)}</div>;
}

export function Crosshair() {
  useGame();
  if (!game.onFoot || !game.settings?.crosshair) return null;
  return <div className={`xhair${game.buildMode ? ' build' : ''}${game.target ? ' hot' : ''}`}><i /></div>;
}
