// Build menu (B) in the style of base-building games: category rail, icon grid, detail panel with the material
// picker, and a hotbar (1-8). Plus the in-world placement HUD shown while you hold a piece.
import React from 'react';
import { game, useGame } from './store.js';
import { BUILD_ITEMS, BUILD_CATS, buildById, hotbar, bindHotbar } from './home.js';
import { MATERIALS, DEFAULT_MAT, matName, piecePrice, nextMat } from '../worlds/structures.js';
import { iconOf } from './icons.js';

export const shortName = it => it.name.replace(/ \(.*\)/, '');
const priceFor = (it, mat) => (it.struct ? piecePrice(it.id, mat) : it.price);
const ZONE = { garage: 'Inside the garage', yard: 'Outside, on your lot', any: 'Anywhere on your property' };
const blurb = it => it.note || (it.struct ? 'Snaps to the 2 m building grid.' : it.cut ? '' : ZONE[it.zone] + '.');

export function Icon({ id, mat, cls = '' }) {
  const it = buildById[id], url = it && iconOf(id, it.struct ? mat || DEFAULT_MAT : undefined);
  if (url) return <img className={`ic ${cls}`} src={url} alt="" draggable={false} />;
  return <span className={`ic ph ${cls}`}>{it ? shortName(it).split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : ''}</span>;
}
export const Key = ({ k }) => <kbd className="kc">{k}</kbd>;

/** the 8 quick slots; `active` = the item in hand */
export function Hotbar({ active, mat, onPick, binding }) {
  return <div className={`hotbar${binding ? ' binding' : ''}`}>{hotbar().map((e, i) => {
    const it = e && buildById[e.id], on = it && active === e.id && (!e.mat || e.mat === mat);
    return <button key={i} className={`hb-slot${on ? ' on' : ''}${it ? '' : ' empty'}`} onClick={() => it && onPick?.(e)} tabIndex={-1}>
      <kbd>{i + 1}</kbd>{it && <Icon id={e.id} mat={e.mat || mat} />}{it && <span className="hb-name">{shortName(it)}</span>}
    </button>;
  })}</div>;
}

export function BuildMenu({ onPick, onClose }) {
  useGame();
  const bm = game.buildMode, start = buildById[bm?.item] || buildById.foundation || BUILD_ITEMS[0];
  const [cat, setCat] = React.useState(start.cat), [q, setQ] = React.useState(''), [sel, setSel] = React.useState(start.id), [hover, setHover] = React.useState(null), [mat, setMat] = React.useState(bm?.mat || DEFAULT_MAT);
  const shown = buildById[hover || sel], live = React.useRef({}); live.current = { shown, mat };
  const query = q.trim().toLowerCase();
  const groups = query ? BUILD_CATS.map(c => [c, BUILD_ITEMS.filter(b => b.cat === c && (b.name.toLowerCase().includes(query) || c.toLowerCase().includes(query)))]).filter(g => g[1].length) : [[cat, BUILD_ITEMS.filter(b => b.cat === cat)]];
  React.useEffect(() => {
    const k = e => {
      if (e.target?.tagName === 'INPUT') { if (e.code === 'Enter') onPick(live.current.shown.id, live.current.mat); return; }
      const d = /^Digit([1-8])$/.exec(e.code);
      if (d) { bindHotbar(+d[1] - 1, live.current.shown.id, live.current.shown.struct ? live.current.mat : undefined); return; }
      if (e.code === 'KeyN') setMat(m => nextMat(m, e.shiftKey ? -1 : 1));
      if (e.code === 'Enter') onPick(live.current.shown.id, live.current.mat);
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  const price = priceFor(shown, mat), short = game.cash < price;
  return <div className="bm-overlay" onContextMenu={e => e.preventDefault()}><div className="bm">
    <header className="bm-head">
      <div className="bm-title"><span>BUILD</span><small>{BUILD_ITEMS.length} pieces</small></div>
      <label className="bm-search"><svg viewBox="0 0 16 16" width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.6" /></svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search pieces…" spellCheck={false} /></label>
      <div className="bm-cash"><small>CASH</small><b>${game.cash.toLocaleString()}</b></div>
      <button className="bm-x" onClick={onClose} title="Close (Esc)">✕</button>
    </header>
    <div className="bm-body">
      <nav className="bm-cats">{BUILD_CATS.map(c => { const first = BUILD_ITEMS.find(b => b.cat === c);
        return <button key={c} className={!query && c === cat ? 'on' : ''} onClick={() => { setCat(c); setQ(''); setSel(first.id); }}><Icon id={first.id} mat={mat} /><span>{c}</span><em>{BUILD_ITEMS.filter(b => b.cat === c).length}</em></button>; })}</nav>
      <section className="bm-list">{groups.length ? groups.map(([c, list], gi) => <div key={c}>
        <h4 className="bm-sec"><b>{gi + 1}.</b> {c}</h4>
        <div className="bm-grid">{list.map(it => { const p = priceFor(it, mat), slot = hotbar().findIndex(e => e?.id === it.id);
          return <button key={it.id} className={`bm-tile${it.id === sel ? ' on' : ''}${game.cash < p ? ' poor' : ''}`} onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(h => (h === it.id ? null : h))} onClick={() => { setSel(it.id); onPick(it.id, mat); }}>
            <Icon id={it.id} mat={mat} />{slot >= 0 && <kbd className="bm-slot">{slot + 1}</kbd>}
            <span className="bm-tname">{shortName(it)}</span><span className="bm-tprice">${p.toLocaleString()}</span>
          </button>; })}</div></div>) : <p className="bm-none">Nothing matches "{q}".</p>}</section>
      <aside className="bm-detail">
        <div className="bm-stage"><Icon id={shown.id} mat={mat} cls="big" /></div>
        <h3>{shortName(shown)}</h3>
        <div className="bm-tags"><span>{shown.cat}</span><span>{shown.struct ? 'Grid piece' : shown.cut ? 'Wall cut' : ZONE[shown.zone]}</span>{shown.len && <span>{shown.len} m</span>}</div>
        {blurb(shown) && <p>{blurb(shown)}</p>}
        {shown.struct && <><h5>MATERIAL <Key k="N" /></h5><div className="bm-mats">{MATERIALS.map(m => <button key={m.id} className={m.id === mat ? 'on' : ''} onClick={() => setMat(m.id)} title={m.name}>
          <Icon id={shown.id} mat={m.id} /><span>{m.name.replace(/ \(.*\)/, '')}</span><em>${piecePrice(shown.id, m.id)}</em></button>)}</div></>}
        <div className="bm-cost"><span>COST</span><b className={short ? 'bad' : ''}>${price.toLocaleString()}</b>{shown.struct && <small>{matName(mat)}</small>}{short && <small className="bad">You have ${game.cash.toLocaleString()}</small>}</div>
        <button className="bm-go" onClick={() => onPick(shown.id, mat)}>Select <Key k="Enter" /></button>
      </aside>
    </div>
    <footer className="bm-foot">
      <Hotbar active={bm?.item} mat={mat} binding onPick={e => onPick(e.id, e.mat || mat)} />
      <div className="bm-keys"><span><Key k="Click" /> Select</span><span><Key k="1" />–<Key k="8" /> Put the highlighted piece on the hotbar</span><span><Key k="N" /> Material</span><span><Key k="Esc" /> Close</span></div>
    </footer>
  </div></div>;
}

/** while placing: what is in hand, what it costs, why it can't go here, and the hotbar */
export function BuildHud() {
  useGame();
  const bm = game.buildMode; if (!bm) return null;
  const it = buildById[bm.item], mat = bm.mat || DEFAULT_MAT, price = priceFor(it, mat), deg = Math.round(((bm.ry || 0) * 180) / Math.PI) % 360;
  const status = bm.why || (bm.moving ? 'Click to set it down here' : 'Click to build');
  return <div className="bh">
    <div className="bh-card">
      <Icon id={it.id} mat={mat} />
      <div className="bh-info">
        <small>{bm.moving ? 'MOVING' : it.cat.toUpperCase()}</small>
        <b>{shortName(it)}</b>
        <span>{it.struct && !bm.moving ? `${matName(mat)} · ` : ''}{bm.moving ? 'free' : `$${price.toLocaleString()}`}{it.struct || it.cut ? '' : ` · ${deg}°`}</span>
      </div>
      <div className={`bh-why ${bm.why ? 'bad' : 'ok'}`}><i />{status}</div>
    </div>
    {!bm.moving && <Hotbar active={bm.item} mat={mat} />}
  </div>;
}
