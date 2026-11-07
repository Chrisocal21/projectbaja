import React from 'react';
import { slots } from '../build.js';
import { game, useGame, owns, priceOf, nameOf, catalogFor, buy, setUnlockAll, addCash, resetProgress } from './store.js';

export function TitleScreen({ bodyLabel, onPlay, onGarage }) {
  useGame();
  return <div className="title-screen">
    <div className="title-panel">
      <span className="eyebrow">OFF-ROAD SANDBOX</span>
      <h1>PROJECT <b>BAJA</b></h1>
      <p>Build it. Drive it. Find parts, buy upgrades, break things.</p>
      <div className="menu">
        <button className="big" onClick={() => onPlay('drive', 'test')}>▶ Drive — Test Center</button>
        <button className="big" onClick={() => onPlay('drive', 'open')}>▶ Drive — Open Desert (race)</button>
        <button onClick={() => onPlay('pro', 'test')}>Pro physics (beta) — flat pad</button>
        <button onClick={onGarage}>Garage — customize {bodyLabel}</button>
      </div>
      <label className="check"><input type="checkbox" checked={game.unlockAll} onChange={e => setUnlockAll(e.target.checked)} /> Unlock everything (testing). Untick to test shops &amp; crates — ${game.cash}</label>
    </div>
    <div className="title-foot">W/S throttle · A/D steer · Space brake · R reset · E shop · Esc menu</div>
  </div>;
}

export function PauseMenu({ onResume, onCustomize, onExit, onTeleport, teleports, fullscreen, onFullscreen }) {
  useGame();
  return <div className="overlay"><div className="card">
    <h2>PAUSED</h2>
    <div className="menu">
      <button className="big" onClick={onResume}>Resume</button>
      <button onClick={onCustomize}>Customize vehicle{game.unlockAll ? '' : ' (owned parts)'}</button>
      {teleports?.length > 0 && <div className="tp"><small>TELEPORT</small>{teleports.map(t => <button key={t.key} onClick={() => onTeleport(t.key)}>{t.key} · {t.name}</button>)}</div>}
      <button onClick={onFullscreen}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
      <label className="check"><input type="checkbox" checked={game.unlockAll} onChange={e => setUnlockAll(e.target.checked)} /> Unlock everything (testing)</label>
      <div className="row"><span>Cash ${game.cash}</span><button onClick={() => addCash(1000)}>+ $1000</button><button onClick={resetProgress}>Reset progress</button></div>
      <button onClick={onExit}>Exit to title</button>
    </div>
  </div></div>;
}

export function ShopPanel({ bodyId, onBuy, onClose }) {
  useGame();
  const cat = catalogFor(bodyId), slotLabel = Object.fromEntries(slots.map(s => [s.id, s.label]));
  const Row = ({ kind, it }) => {
    const own = owns(kind, it.id), price = priceOf(kind, it.id);
    return <div className="shop-row"><span>{nameOf(kind, it.id, bodyId)}{kind === 'part' && <small>{slotLabel[it.slot] || it.slot}{it.perf?.topMph ? ` · +${it.perf.topMph} mph` : ''}</small>}</span>
      {own ? <button onClick={() => onBuy(kind, it.id, true)}>Equip</button> : <button className="buy" disabled={game.cash < price} onClick={() => onBuy(kind, it.id)}>${price}</button>}</div>;
  };
  return <div className="overlay"><div className="card shop">
    <div className="shop-head"><h2>BAJA PARTS <span>${game.cash}</span></h2><button onClick={onClose}>Leave shop</button></div>
    <div className="shop-list">
      <small>ENGINE &amp; BODY PARTS</small>{cat.part.map(it => <Row key={it.id} kind="part" it={it} />)}
      <small>TIRES</small>{cat.wheel.map(it => <Row key={it.id} kind="wheel" it={it} />)}
      <small>RIMS</small>{cat.rim.map(it => <Row key={it.id} kind="rim" it={it} />)}
    </div>
    {game.unlockAll && <p className="hint">Everything is unlocked (testing). Untick “Unlock everything” in the pause menu to try real buying.</p>}
  </div></div>;
}

export function HudOverlay() {
  useGame();
  return <>
    <div className="hud-top"><b>${game.cash}</b></div>
    {game.prompt && <div className="hud-prompt">{game.prompt}</div>}
    {game.toast && <div className="hud-toast">{game.toast.msg}</div>}
  </>;
}
