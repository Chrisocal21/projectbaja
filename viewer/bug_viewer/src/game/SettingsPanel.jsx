import React, { useState } from 'react';
import { useGame } from './store.js';
import { SETTING_ROWS, settings, setSetting, resetSettings } from './settings.js';
import { CONTROLS } from './controls.js';

/** the phone's Settings: two tabs, so it stays on one screen. Settings, and Controls (every key in the game; the on-screen key bar is a setting, off by default). */
export default function SettingsPanel({ onClose }) {
  useGame();
  const s = settings(), [tab, setTab] = useState('settings');
  return <div className="overlay"><div className="card settings" style={tab === 'controls' ? { overflow: 'hidden', maxHeight: 'none' } : undefined}>
    <div className="shop-head"><h2>{tab === 'controls' ? 'CONTROLS' : 'SETTINGS'}</h2><button onClick={onClose}>Back (Esc)</button></div>
    <div style={{ display: 'flex', gap: 6, margin: '2px 0 8px' }}>{[['settings', 'Settings'], ['controls', 'Controls']].map(([k, l]) => <button key={k} className={tab === k ? 'big' : ''} style={tab === k ? { borderColor: '#DC652D', color: '#DC652D' } : undefined} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'controls' ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '4px 22px', textAlign: 'left', fontSize: 13 }}>
      {CONTROLS.map(([g, list]) => <div key={g}><div className="set-sec" style={{ margin: '6px 0 4px' }}>{g}</div>
        {list.map(([k, t]) => <div key={k + t} style={{ display: 'flex', gap: 8, padding: '2px 0' }}><b style={{ minWidth: 92, color: '#DC652D', fontWeight: 600 }}>{k}</b><span style={{ opacity: 0.85 }}>{t}</span></div>)}</div>)}
    </div> : <>
      {SETTING_ROWS.map((r, i) => r.sec ? <div key={i} className="set-sec">{r.sec}</div> : <div key={r.k} className={`set-row${r.k === 'creative' && s.creative ? ' hot' : ''}`}>
        <div><b>{r.label}</b>{r.note && <small>{r.note}</small>}</div>
        {r.type === 'toggle' && <button className={`set-toggle${s[r.k] ? ' on' : ''}`} onClick={() => setSetting(r.k, !s[r.k])} aria-pressed={!!s[r.k]}><i />{s[r.k] ? 'On' : 'Off'}</button>}
        {r.type === 'range' && <label className="set-range"><input type="range" min={r.min} max={r.max} step={r.step} value={s[r.k]} onChange={e => setSetting(r.k, +e.target.value)} /><em>{r.fmt(s[r.k])}</em></label>}
        {r.type === 'choice' && <div className="set-choice">{r.options.map(([v, l]) => <button key={l} className={s[r.k] === v ? 'on' : ''} onClick={() => setSetting(r.k, v)}>{l}</button>)}</div>}
      </div>)}
      <div className="menu set-foot"><button onClick={resetSettings}>Reset to defaults</button></div>
    </>}
  </div></div>;
}
