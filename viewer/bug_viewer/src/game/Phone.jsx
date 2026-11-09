// The phone (simple first version, PROPOSAL): opens with Esc and replaces the old pause menu. Real apps: Map, Index, Upgrades, Settings, Fullscreen, Exit.
// Everything else is a grey "coming soon" placeholder until its system exists (see docs/GAMEPLAN.md item 18).
import React, { useState } from 'react';
import { game, useGame } from './store.js';
import { SaveTools } from './update.jsx';

const SOON = { web: 'Browse the internet (parts, cars, news)', bank: 'Money: bills, sales, balance history', texts: 'Messages from suppliers and clients', contacts: 'Who you know in town', jobs: 'Odd jobs and orders', story: 'Story log: letters, photos, notes', camera: 'Take photos for the wall', music: 'Radio and music', weather: 'Weather and time', orders: 'Order parts, watch the delivery on the map', cars: 'Cars for sale' };
const ICONS = {
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14', web: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  bank: 'M12 3v18M16.5 7.5C15.5 6 13.5 5.5 12 5.5c-2 0-3.8 1-3.8 2.8 0 4 8 2 8 6.2 0 1.8-1.8 3-4.2 3-1.8 0-3.6-.7-4.5-2.2',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1.5-2-3.5-2.4.8-1.6-1L14.6 4h-4l-.4 2.8-1.6 1L6.2 7 4.2 10.5 6.2 12l-.1 1-2 1.5 2 3.5 2.4-.8 1.6 1 .4 2.8h4l.4-2.8 1.6-1 2.4.8 2-3.5-2-1.5z',
  texts: 'M4 5h16v11H9l-5 4V5z', contacts: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 20c1-4 4-6 8-6s7 2 8 6', jobs: 'M4 8h16v11H4zM9 8V5h6v3', story: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  camera: 'M4 8h4l2-3h4l2 3h4v11H4zM12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', music: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z', weather: 'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4.5 4.5 0 0 1 17 18z',
  orders: 'M3 6h3l2 10h10l2-7H7', cars: 'M4 15v-3l2-5h12l2 5v3M4 15h16M7 18v2M17 18v2M7 12h10', save: 'M5 4h12l2 2v14H5zM8 4v5h7V4M8 20v-6h8v6', index: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM9 8h6', upgrades: 'M12 20V6M6 12l6-6 6 6', power: 'M12 3v8M6.5 6.5a8 8 0 1 0 11 0', full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
};
const Ico = ({ d }) => <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

export function PhonePanel({ onResume, onSettings, onWiki, onUpgrades, onMap, onExit, onTeleport, teleports, fullscreen, onFullscreen, canMap }) {
  useGame();
  const [soon, setSoon] = useState(null), [saveView, setSaveView] = useState(false);
  const real = (key, label, fn, sub) => ({ key, label, fn, sub });
  const apps = [
    ...(canMap ? [real('map', 'Map', onMap, 'M')] : []),
    { key: 'web', label: 'Internet', soon: true }, { key: 'bank', label: `$${game.cash}`, soon: true },
    real('save', 'Save', () => setSaveView(true)), real('settings', 'Settings', onSettings), real('index', 'Index', onWiki, 'I'),
    ...(game.onFoot ? [real('upgrades', 'Upgrades', onUpgrades, 'U')] : []),
    { key: 'texts', label: 'Texts', soon: true }, { key: 'contacts', label: 'Contacts', soon: true }, { key: 'jobs', label: 'Jobs', soon: true }, { key: 'orders', label: 'Orders', soon: true }, { key: 'cars', label: 'Car sales', soon: true },
    { key: 'story', label: 'Story log', soon: true }, { key: 'camera', label: 'Camera', soon: true }, { key: 'music', label: 'Radio', soon: true }, { key: 'weather', label: 'Weather', soon: true },
    real('full', fullscreen ? 'Exit full' : 'Fullscreen', onFullscreen), real('power', 'Exit', onExit, 'to title'),
  ];
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onResume(); }}><div className="phone">
    <div className="phone-notch" />
    <div className="phone-top"><span>Baja</span><span>{game.saveLocked ? "● Saving is OFF (see Save)" : game.dev ? "● Test session: not saved" : "● Autosave on"}</span></div>
    {saveView ? <div className="phone-soon"><h3>Save</h3><SaveTools /><button onClick={() => setSaveView(false)}>Back</button></div>
      : soon ? <div className="phone-soon"><div className="ph-ico"><Ico d={ICONS[soon.key]} /></div><h3>{soon.label}</h3><p>{SOON[soon.key] || 'Coming soon'}</p><small>Placeholder: not built yet</small><button onClick={() => setSoon(null)}>Back</button></div>
      : <div className="phone-grid">{apps.map(a => <button key={a.key} className={`ph-app${a.soon ? ' soon' : ''}`} onClick={() => a.soon ? setSoon(a) : a.fn()}><span className="ph-ico"><Ico d={ICONS[a.key]} /></span><span>{a.label}</span>{a.sub && <small>{a.sub}</small>}</button>)}</div>}
    {teleports?.length > 0 && !soon && !saveView && <div className="phone-tp"><small>TESTING TELEPORT</small>{teleports.map(t => <button key={t.key} onClick={() => onTeleport(t.key)}>{t.key} · {t.name}</button>)}</div>}
    <button className="phone-home" onClick={onResume}>Close (Esc)</button>
  </div></div>;
}
