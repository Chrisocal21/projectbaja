// The phone (simple first version, PROPOSAL): opens with Esc and replaces the old pause menu. Real apps: Map, Index, Upgrades, Settings, Fullscreen, Exit.
// Everything else is a grey "coming soon" placeholder until its system exists (see docs/GAMEPLAN.md item 18).
import React, { useState } from 'react';
import { game, useGame, save, catalogFor, priceOf, nameOf } from './store.js';
import { placeOrder, ordersOnTheWay } from './orders.js';
import { ORDER_HOURS, etaText } from './orderlogic.js';
import { LETTER } from './home.js';
import { jobById, jobCheck, SUPPLIES } from './jobs.js';
import { TOOLS } from './items.js';
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
  const [soon, setSoon] = useState(null), [saveView, setSaveView] = useState(false), [story, setStory] = useState(null), [jobsView, setJobsView] = useState(false), [bankView, setBankView] = useState(false), [netView, setNetView] = useState(false), [ordersView, setOrdersView] = useState(false);   // story: null | 'list' | 'letter'
  const real = (key, label, fn, sub) => ({ key, label, fn, sub });
  const apps = [
    ...(canMap ? [real('map', 'Map', onMap, 'M')] : []),
    real('web', 'Internet', () => setNetView(true)), real('bank', `$${game.cash}`, () => setBankView(true)),
    real('save', 'Save', () => setSaveView(true)), real('settings', 'Settings', onSettings), real('index', 'Index', onWiki, 'I'),
    ...(game.onFoot ? [real('upgrades', 'Upgrades', onUpgrades, 'U')] : []),
    { key: 'texts', label: 'Texts', soon: true }, { key: 'contacts', label: 'Contacts', soon: true }, real('jobs', 'Jobs', () => setJobsView(true)), real('orders', 'Orders', () => setOrdersView(true)), { key: 'cars', label: 'Car sales', soon: true },
    real('story', 'Story log', () => setStory('list')), { key: 'camera', label: 'Camera', soon: true }, { key: 'music', label: 'Radio', soon: true }, { key: 'weather', label: 'Weather', soon: true },
    real('full', fullscreen ? 'Exit full' : 'Fullscreen', onFullscreen), real('power', 'Exit', onExit, 'to title'),
  ];
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onResume(); }}><div className="phone">
    <div className="phone-notch" />
    <div className="phone-top"><span>{clockText(game.clock ?? 9)} <span style={{ opacity: 0.6 }}>▂▄▆</span></span><span>{game.saveLocked ? "● Saving is OFF (see Save)" : game.dev ? "● Test session: not saved" : "● Autosave on"}</span></div>
    {ordersView ? <OrdersApp onBack={() => setOrdersView(false)} />
      : netView ? <InternetApp onBack={() => setNetView(false)} />
      : bankView ? <MoneyApp onBack={() => setBankView(false)} />
      : jobsView ? <JobsApp onBack={() => setJobsView(false)} />
      : story ? <StoryLog view={story} setView={setStory} />
      : saveView ? <div className="phone-soon"><h3>Save</h3><SaveTools /><button onClick={() => setSaveView(false)}>Back</button></div>
      : soon ? <div className="phone-soon"><div className="ph-ico"><Ico d={ICONS[soon.key]} /></div><h3>{soon.label}</h3><p>{SOON[soon.key] || 'Coming soon'}</p><small>Placeholder: not built yet</small><button onClick={() => setSoon(null)}>Back</button></div>
      : <div className="phone-grid">{apps.map(a => <button key={a.key} className={`ph-app${a.soon ? ' soon' : ''}`} onClick={() => a.soon ? setSoon(a) : a.fn()}><span className="ph-ico"><Ico d={ICONS[a.key]} /></span><span>{a.label}</span>{a.sub && <small>{a.sub}</small>}</button>)}</div>}
    {teleports?.length > 0 && !soon && !ordersView && !saveView && !story && !jobsView && !bankView && !netView && <details className="phone-tp"><summary>Testing teleport (developer)</summary>{teleports.map(t => <button key={t.key} onClick={() => onTeleport(t.key)}>{t.key} · {t.name}</button>)}</details>}
    <button className="phone-home" onClick={onResume}>Close (Esc)</button><div className="phone-pill" />
  </div></div>;
}

/** the story log (real app, PROPOSAL layout): keepsakes and letters you have found. Walt's letter can be re-read here. */
function StoryLog({ view, setView }) {
  const it = game.items.find(i => i.kind === 'memento' && i.id === 'letter');
  const read = !!game.home?.letter, known = read || (it && it.loc !== 'world');
  const where = !it ? '' : it.loc === 'world' ? (it.wall ? 'hanging on the wall' : 'lying in the garage') : it.loc === 'garage' ? 'on your shelves' : 'with you';
  if (view === 'letter') return <div className="phone-soon"><h3>Walt's letter</h3><div className="card letter" style={{ textAlign: 'left', maxHeight: 280, overflow: 'auto' }}>{LETTER.map((l, i) => <p key={i} className={i === 0 || i === LETTER.length - 1 ? 'sig' : ''}>{l}</p>)}</div><button onClick={() => setView('list')}>Back</button></div>;
  return <div className="phone-soon"><h3>Story log</h3>
    {known ? <button className="ph-entry" onClick={() => { if (!read) { game.home = { ...game.home, letter: true }; save(); } setView('letter'); }}>Walt's letter · {read ? 'read' : 'unread'}{where && <small> · {where}</small>}</button>
      : <p>Nothing yet. Letters and keepsakes you find show up here.</p>}
    <button onClick={() => setView(null)}>Back</button></div>;
}

/** the Jobs app (real, PROPOSAL layout): the customer waiting in the lot, what they need, what it pays, and whether you can do it right now */
function JobsApp({ onBack }) {
  const j = game.job && jobById[game.job.id], done = game.home?.jobsDone || 0;
  const needName = !j ? '' : j.need.tool ? TOOLS[j.need.tool]?.name || j.need.tool : j.need.kind === 'supply' ? SUPPLIES[j.need.id]?.name : 'A car battery';
  const c = j ? jobCheck(j) : null;
  return <div className="phone-soon"><h3>Jobs</h3>
    {j ? <>
      <p><b>{j.who}</b>: {j.title}</p><p style={{ fontStyle: 'italic' }}>"{j.ask}"</p>
      <p>Needs: <b>{needName}</b> · Pays <b>${j.pay}</b></p>
      <p>{c.ok ? 'You have it: go to the car in the lot and press E.' : c.why}</p>
    </> : <p>No customer right now. When a car pulls into the lot, the job shows up here.</p>}
    <small>Jobs done: {done}</small>
    <button onClick={onBack}>Back</button></div>;
}

const clockText = h => { const m = Math.round((h % 24) * 60), hh = Math.floor(m / 60) % 24, mm = m % 60; return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; };
/** the Money app (real, PROPOSAL layout): balance plus the last 30 changes (game.home.cashLog, written by store.js addCash) */
function MoneyApp({ onBack }) {
  const log = [...(game.home?.cashLog || [])].reverse();
  return <div className="phone-soon"><h3>Money</h3>
    <p style={{ fontSize: 30, fontWeight: 700 }}>${game.cash}</p>
    {log.length ? <div style={{ width: '100%', maxHeight: 260, overflow: 'auto', textAlign: 'left' }}>{log.map((e, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0', borderBottom: '1px solid #ffffff18' }}>
      <span>{e.why}<small> · {clockText(e.t)}</small></span><b style={{ color: e.d > 0 ? '#7fd88a' : '#e88a80' }}>{e.d > 0 ? '+' : '-'}${Math.abs(e.d)}</b></div>)}</div>
      : <p>No activity yet. Sales, jobs, purchases and bills show up here.</p>}
    <button onClick={onBack}>Back</button></div>;
}

/** the Internet app (real, first slice, PROPOSAL): order parts from an unnamed supplier; the box arrives at the shop pickup area after a few game hours */
function InternetApp({ onBack }) {
  const [tab, setTab] = useState('part');
  const body = game.build?.body || 'classic', cat = catalogFor(body), list = cat[tab] || [], waiting = ordersOnTheWay();
  return <div className="phone-soon"><h3>Parts online</h3>
    <small>Cash ${game.cash} · arrives at the pickup area about {ORDER_HOURS} game hours after you order</small>
    <div style={{ display: 'flex', gap: 6 }}>{[['part', 'Parts'], ['wheel', 'Tires'], ['rim', 'Rims']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div style={{ width: '100%', maxHeight: 230, overflow: 'auto', textAlign: 'left' }}>{list.map(p => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: '1px solid #ffffff18' }}>
      <span>{nameOf(tab, p.id, body)}<small> · ${priceOf(tab, p.id)}</small></span><button disabled={game.cash < priceOf(tab, p.id)} onClick={() => placeOrder(tab, p.id)}>Order</button></div>)}</div>
    {waiting.length > 0 && <div style={{ width: '100%', textAlign: 'left' }}><small>ON THE WAY</small>{waiting.map((o, i) => <div key={i}>{nameOf(o.kind, o.id, body)}<small> · {etaText(o.left)}</small></div>)}</div>}
    <button onClick={onBack}>Back</button></div>;
}

function OrdersApp({ onBack }) {
  const body = game.build?.body || 'classic', waiting = ordersOnTheWay();
  return <div className="phone-soon"><h3>Orders</h3>
    {waiting.length ? <div style={{ width: '100%', textAlign: 'left' }}><small>ON THE WAY (arrives at the shop pickup area; see the Map)</small>{waiting.map((o, i) => <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid #ffffff18' }}>{nameOf(o.kind, o.id, body)}<small> · {etaText(o.left)}</small></div>)}</div>
      : <p>Nothing on the way. Order parts in Internet.</p>}
    <button onClick={onBack}>Back</button></div>;
}
