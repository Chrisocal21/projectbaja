import React from 'react';
import { slots, partById, wheelById, SECTIONS, sectionOfSlot } from '../build.js';
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

export function ShopPanel({ bodyId, build, previewOf, renderPreview, onBuy, onClose }) {
  useGame();
  const [tabSel, setTab] = React.useState('engine'), [sel, setSel] = React.useState(null);
  const cat = catalogFor(bodyId), slotLabel = Object.fromEntries(slots.map(s => [s.id, s.label]));
  const tabs = [...SECTIONS.filter(sec => cat.part.some(p => sectionOfSlot(p.slot) === sec.id)).map(sec => [sec.id, sec.label]), ['wheel', 'Tires'], ['rim', 'Rims']];
  const tab = tabs.some(t => t[0] === tabSel) ? tabSel : tabs[0][0], kindOfTab = tab === 'wheel' ? 'wheel' : tab === 'rim' ? 'rim' : 'part';
  const items = kindOfTab === 'part' ? cat.part.filter(p => sectionOfSlot(p.slot) === tab) : kindOfTab === 'wheel' ? cat.wheel : cat.rim;
  const cur = sel && sel.kind === kindOfTab && (kindOfTab !== 'part' || sectionOfSlot(partById[sel.id].slot) === tab) ? sel : null;
  const equipped = (kind, id) => (kind === 'part' ? build.parts[partById[id].slot] === id : kind === 'wheel' ? build.wheels === id : build.rim === id);
  const own = cur ? owns(cur.kind, cur.id) : false, price = cur ? priceOf(cur.kind, cur.id) : 0, isOn = cur ? equipped(cur.kind, cur.id) : false;
  const it = cur && cur.kind === 'part' ? partById[cur.id] : null;
  return <div className="overlay"><div className="card shop">
    <div className="shop-head"><h2>BAJA PARTS</h2><span className="cash">${game.cash}</span><button onClick={onClose}>Leave shop</button></div>
    <div className="shop-body">
      <div className="shop-side">
        <div className="shop-tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="shop-list">{items.map(x => {
          const o = owns(kindOfTab, x.id), on = equipped(kindOfTab, x.id);
          return <div key={x.id} className={`shop-row${cur?.id === x.id ? ' sel' : ''}`} onClick={() => setSel({ kind: kindOfTab, id: x.id })}>
            <span>{nameOf(kindOfTab, x.id, bodyId)}<small>{kindOfTab === 'part' ? `${slotLabel[x.slot] || x.slot}${x.perf?.topMph ? ` · +${x.perf.topMph} mph` : ''}` : kindOfTab === 'wheel' ? (x.grip?.note || 'Tire set') : 'Rim style'}</small></span>
            <em className={on ? 'tag on' : o ? 'tag' : 'price'}>{on ? 'EQUIPPED' : o ? 'OWNED' : `$${priceOf(kindOfTab, x.id)}`}</em></div>;
        })}</div>
      </div>
      <div className="shop-view">
        <div className="shop-stage">{renderPreview(cur ? previewOf(cur.kind, cur.id) : build, cur && cur.kind !== 'part')}</div>
        <div className="shop-info">
          {cur ? <>
            <div><strong>{nameOf(cur.kind, cur.id, bodyId)}</strong>{it?.perf && <small>{it.perf.topMph ? `+${it.perf.topMph} mph top speed` : ''}{it.perf.power ? ` · ${Math.round((it.perf.power - 1) * 100)}% more power` : ''}</small>}
              {cur.kind === 'wheel' && wheelById[cur.id]?.grip && <small>{wheelById[cur.id].grip.note}</small>}
              {cur.kind === 'rim' && <small>Shown on Rugged tires. Colour it in the customizer.</small>}</div>
            {isOn ? <button disabled>Equipped</button> : own ? <button className="buy" onClick={() => onBuy(cur.kind, cur.id, true)}>Equip</button>
              : <button className="buy" disabled={game.cash < price} onClick={() => onBuy(cur.kind, cur.id)}>{game.cash < price ? `Need $${price}` : `Buy $${price}`}</button>}
          </> : <small>Click an item to preview it on your car. Drag to rotate.</small>}
        </div>
      </div>
    </div>
    {game.unlockAll && <p className="hint">Everything is unlocked (testing). Untick "Unlock everything" in the pause menu to try real buying.</p>}
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
