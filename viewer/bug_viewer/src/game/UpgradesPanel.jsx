import React, { useState } from 'react';
import { game, useGame } from './store.js';
import { TRACKS, stagesOf, hasStage, stageWhy, buyStage, nextStage, effects } from './upgrades.js';

/** U: Walt's place in four tracks, built in stages, one tab per track so it fits on one screen (no scrolling). The build menu (B) is decorations only; this is how the house itself grows. */
export default function UpgradesPanel({ onClose }) {
  useGame();
  const [tab, setTab] = useState(() => TRACKS.find(t => nextStage(t.id))?.id || TRACKS[0].id);
  const fx = effects(), t = TRACKS.find(x => x.id === tab), list = stagesOf(t.id), next = nextStage(t.id);
  return <div className="overlay"><div className="card inv upgrades" style={{ overflow: 'hidden', maxHeight: 'none' }}>
    <div className="shop-head"><h2>UPGRADES</h2><span className="cash">${game.cash.toLocaleString()}</span><button onClick={onClose}>Close (Esc)</button></div>
    <div style={{ display: 'flex', gap: 6, margin: '2px 0 8px' }}>{TRACKS.map(x => { const n = stagesOf(x.id), done = n.filter(s => hasStage(s.id)).length;
      return <button key={x.id} className={tab === x.id ? 'big' : ''} style={tab === x.id ? { borderColor: '#DC652D', color: '#DC652D' } : undefined} onClick={() => setTab(x.id)}>{x.name} {done}/{n.length}</button>; })}</div>
    <p className="hint" style={{ margin: '0 0 6px' }}>{t.blurb} Bought once, never taken down.</p>
    {list.map(s => { const own = hasStage(s.id), why = stageWhy(s.id), poor = why.startsWith('Not enough'), locked = !!why && !poor && !own;
      return <div key={s.id} className="up-main" style={{ opacity: own ? 0.55 : 1, padding: '5px 0' }}>
        <span><b>{own ? '✓ ' : s.id === next?.id ? '→ ' : ''}{s.name}</b><small>{s.note}{locked ? ` (${why})` : ''}</small></span>
        {own ? <small>built</small> : <button className="buy" disabled={locked} title={why} onClick={() => buyStage(s.id)}>{locked ? 'Locked' : poor ? `Need $${s.price}` : `$${s.price}`}</button>}
      </div>; })}
    <p className="hint" style={{ margin: '8px 0 0' }}>Now: fitting at {Math.round(fx.holdScale * 100)}% of the usual time · orders in {fx.orderHours} hour{fx.orderHours === 1 ? '' : 's'} · pack holds {30 + fx.packBonus}. (B is for decorations and furniture.)</p>
  </div></div>;
}
