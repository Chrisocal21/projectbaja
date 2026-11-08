import React from 'react';
import { game, useGame } from './store.js';
import { UPGRADES, upgradeLevel, isMaxed, nextPrice, nextNote, upgradeWhy, buyUpgrade } from './upgrades.js';

const ZONE = { garage: 'Garage', yard: 'Yard' };

export default function UpgradesPanel({ onClose }) {
  useGame();
  return <div className="overlay"><div className="card inv upgrades">
    <div className="shop-head"><h2>UPGRADES</h2><span className="cash">${game.cash.toLocaleString()}</span><button onClick={onClose}>Close (Esc)</button></div>
    <p className="hint">Levelled upgrades to the garage and the yard — separate from the building kit (B). Bought once per level, never taken down.</p>
    {UPGRADES.map(u => { const lvl = upgradeLevel(u.id), maxed = isMaxed(u.id), why = upgradeWhy(u.id);
      return <div key={u.id} className="up-row">
        <div className="up-main">
          <span><b>{u.name}</b><small>{ZONE[u.zone]} · level {lvl}/{u.levels}{maxed ? ' · fully built' : ''}</small></span>
          {!maxed && <button className="buy" disabled={!!why && why !== `Not enough cash ($${nextPrice(u.id)}).`} title={why} onClick={() => buyUpgrade(u.id)}>{game.cash < nextPrice(u.id) && !game.settings?.creative ? `Need $${nextPrice(u.id)}` : `$${nextPrice(u.id)}`}</button>}
        </div>
        <div className="up-levels">{Array.from({ length: u.levels }, (_, i) => <i key={i} className={i < lvl ? 'on' : ''} />)}</div>
        <p>{maxed ? u.notes[u.notes.length - 1] : nextNote(u.id)}</p>
      </div>; })}
    <p className="hint">Queued: another office expansion level. What's here works now; more will come as the kit grows.</p>
  </div></div>;
}
