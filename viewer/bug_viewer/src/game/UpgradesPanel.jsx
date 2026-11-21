import React from 'react';
import { game, useGame } from './store.js';
import { TRACKS, stagesOf, hasStage, stageWhy, buyStage, nextStage, effects } from './upgrades.js';

/** U: Walt's place in four tracks, built in stages. The build menu (B) is decorations only; this is how the house itself grows. */
export default function UpgradesPanel({ onClose }) {
  useGame();
  const fx = effects();
  return <div className="overlay"><div className="card inv upgrades">
    <div className="shop-head"><h2>UPGRADES</h2><span className="cash">${game.cash.toLocaleString()}</span><button onClick={onClose}>Close (Esc)</button></div>
    <p className="hint">Walt's place grows in stages: garage, office, camper and property. Each stage is bought once and never taken down. (B is for decorations and furniture.)</p>
    <p className="hint">Now: parts come off and go on at {Math.round(fx.holdScale * 100)}% of the usual time · orders arrive in {fx.orderHours} hour{fx.orderHours === 1 ? '' : 's'} · pack holds {4 + fx.packBonus}.</p>
    {TRACKS.map(t => { const list = stagesOf(t.id), done = list.filter(s => hasStage(s.id)).length, next = nextStage(t.id);
      return <div key={t.id} className="up-row">
        <div className="up-main"><span><b>{t.name}</b><small>{t.blurb} · stage {done}/{list.length}{done === list.length ? ' · fully built' : ''}</small></span></div>
        <div className="up-levels">{list.map(s => <i key={s.id} className={hasStage(s.id) ? 'on' : ''} />)}</div>
        {list.map(s => { const own = hasStage(s.id), why = stageWhy(s.id), cash = game.cash < s.price && !game.settings?.creative;
          return <div key={s.id} className="up-main" style={{ opacity: own ? 0.55 : 1 }}>
            <span><b>{own ? '✓ ' : s.id === next?.id ? '→ ' : ''}{s.name}</b><small>{s.note}</small></span>
            {own ? <small>built</small> : <button className="buy" disabled={!!why && !(cash && why.startsWith('Not enough'))} title={why} onClick={() => buyStage(s.id)}>{why && !why.startsWith('Not enough') ? 'Locked' : cash ? `Need $${s.price}` : `$${s.price}`}</button>}
            {!own && why && !why.startsWith('Not enough') && <small>{why}</small>}
          </div>; })}
      </div>; })}
  </div></div>;
}
