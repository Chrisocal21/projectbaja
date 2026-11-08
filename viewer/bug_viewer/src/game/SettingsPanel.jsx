import React from 'react';
import { useGame } from './store.js';
import { SETTING_ROWS, settings, setSetting, resetSettings } from './settings.js';

export default function SettingsPanel({ onClose }) {
  useGame();
  const s = settings();
  return <div className="overlay"><div className="card settings">
    <div className="shop-head"><h2>SETTINGS</h2><button onClick={onClose}>Back (Esc)</button></div>
    {SETTING_ROWS.map((r, i) => r.sec ? <div key={i} className="set-sec">{r.sec}</div> : <div key={r.k} className={`set-row${r.k === 'creative' && s.creative ? ' hot' : ''}`}>
      <div><b>{r.label}</b>{r.note && <small>{r.note}</small>}</div>
      {r.type === 'toggle' && <button className={`set-toggle${s[r.k] ? ' on' : ''}`} onClick={() => setSetting(r.k, !s[r.k])} aria-pressed={!!s[r.k]}><i />{s[r.k] ? 'On' : 'Off'}</button>}
      {r.type === 'range' && <label className="set-range"><input type="range" min={r.min} max={r.max} step={r.step} value={s[r.k]} onChange={e => setSetting(r.k, +e.target.value)} /><em>{r.fmt(s[r.k])}</em></label>}
      {r.type === 'choice' && <div className="set-choice">{r.options.map(([v, l]) => <button key={l} className={s[r.k] === v ? 'on' : ''} onClick={() => setSetting(r.k, v)}>{l}</button>)}</div>}
    </div>)}
    <div className="menu set-foot"><button onClick={resetSettings}>Reset to defaults</button></div>
  </div></div>;
}
