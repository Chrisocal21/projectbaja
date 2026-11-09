// The office PC (PROPOSAL, docs/GAMEPLAN.md item 19): the big-screen version of the phone, at a desk you walk to (the 'computer' build item).
// Tabs: Vehicles (lookup), Parts (cart: several parts in one go), Records (money history), Files (only what canon already gives: Walt's letter).
// No new lore: nothing is written here that is not already in the game or in docs/CANON.md.
import React, { useState } from 'react';
import { game, useGame, say, catalogFor, priceOf, nameOf } from './store.js';
import { placeOrder, ordersOnTheWay, orderName } from './orders.js';
import { VEHICLE_TYPES, FOR_SALE } from './fleet.js';
import { ORDER_HOURS, etaText } from './orderlogic.js';
import { DEF } from './workshop.js';
import { missing, missingToDrive, listNames } from '../rules/restore.js';
import { LETTER } from './home.js';

const clock = h => { const m = Math.round((h % 24) * 60), hh = Math.floor(m / 60) % 24, mm = m % 60; return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #ffffff18' };

function VehiclesTab() {
  const out = missing(DEF, game.build || {}), drive = missingToDrive(DEF, game.build || {});
  const owned = Object.keys(game.fleet || {});
  return <div>
    <h3>Your vehicles</h3>
    {owned.map(id => { const t = VEHICLE_TYPES[id] || { name: id === 'bug' ? "Grandma's '71 Bug" : id }; const isBug = id === 'bug';
      return <div key={id} style={{ ...row, alignItems: 'flex-start', flexDirection: 'column' }}><b>{t.name}</b>
        {isBug ? <small>{drive.length ? `Won't start. Missing: ${listNames(drive)}.` : 'Has everything it needs to drive.'}{out.length ? ` Not fitted: ${out.length} of ${DEF.slots.length} slots.` : ' Everything fitted.'}</small>
          : <small>{t.pitch ? `"${t.pitch}"` : 'Parked.'}</small>}</div>; })}
    <h3>On Al's lot</h3>
    {FOR_SALE.map(({ id }) => { const t = VEHICLE_TYPES[id]; return <div key={id} style={row}><span><b>{t.name}</b><br /><small>"{t.pitch}"</small></span><span>${t.price.toLocaleString()}</span></div>; })}
    <small>To buy a car, use Car sales on your phone.</small>
  </div>;
}

function PartsTab() {
  const [tab, setTab] = useState('part'), [cart, setCart] = useState([]), body = game.build?.body || 'classic', list = catalogFor(body)[tab] || [];
  const total = cart.reduce((s, c) => s + priceOf(c.kind, c.id), 0), waiting = ordersOnTheWay();
  const add = (kind, id) => setCart(c => [...c, { kind, id }]);
  const send = () => { if (game.dev) return say('Ordering is off in test sessions.'); if (game.cash < total) return say(`Not enough cash ($${total}).`); cart.forEach(c => placeOrder(c.kind, c.id)); setCart([]); };
  return <div>
    <small>Cash ${game.cash} · each order arrives at the pickup area about {ORDER_HOURS} game hours later</small>
    <div style={{ display: 'flex', gap: 6, margin: '6px 0' }}>{[['part', 'Parts'], ['wheel', 'Tires'], ['rim', 'Rims']].map(([k, l]) => <button key={k} className={tab === k ? 'big' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ maxHeight: 300, overflow: 'auto' }}>{list.map(p => <div key={p.id} style={row}><span>{nameOf(tab, p.id, body)}<small> · ${priceOf(tab, p.id)}</small></span><button onClick={() => add(tab, p.id)}>Add</button></div>)}</div>
      <div><b>Cart</b>
        {cart.length ? cart.map((c, i) => <div key={i} style={row}><span>{nameOf(c.kind, c.id, body)}<small> · ${priceOf(c.kind, c.id)}</small></span><button onClick={() => setCart(x => x.filter((_, j) => j !== i))}>Remove</button></div>) : <p><small>Empty. Add parts from the list.</small></p>}
        {cart.length > 0 && <div style={{ ...row, borderBottom: 'none' }}><b>Total ${total}</b><button className="big" disabled={game.cash < total} onClick={send}>{game.cash < total ? 'Not enough cash' : `Order all (${cart.length})`}</button></div>}
        {waiting.length > 0 && <div><small>ON THE WAY</small>{waiting.map((o, i) => <div key={i}>{orderName(o, body)}<small> · {etaText(o.left)}</small></div>)}</div>}
      </div></div>
  </div>;
}

function RecordsTab() {
  const log = [...(game.home?.cashLog || [])].reverse(), income = log.filter(e => e.d > 0).reduce((s, e) => s + e.d, 0), spent = log.filter(e => e.d < 0).reduce((s, e) => s - e.d, 0);
  return <div>
    <p style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>${game.cash}</p>
    <small>Last {log.length} changes · in ${income} · out ${spent}</small>
    <div style={{ maxHeight: 280, overflow: 'auto', marginTop: 6 }}>{log.length ? log.map((e, i) => <div key={i} style={row}><span>{e.why}<small> · {clock(e.t)}</small></span><b style={{ color: e.d > 0 ? '#7fd88a' : '#e88a80' }}>{e.d > 0 ? '+' : '-'}${Math.abs(e.d)}</b></div>) : <p>No activity yet.</p>}</div>
  </div>;
}

function FilesTab() {
  const read = !!game.home?.letter, [open, setOpen] = useState(false);
  return <div>
    {open ? <div><div className="card letter" style={{ maxHeight: 300, overflow: 'auto', textAlign: 'left' }}>{LETTER.map((l, i) => <p key={i} className={i === 0 || i === LETTER.length - 1 ? 'sig' : ''}>{l}</p>)}</div><button onClick={() => setOpen(false)}>Close file</button></div>
      : read ? <div style={row}><span>Walt's letter</span><button onClick={() => setOpen(true)}>Open</button></div>
      : <p>No files yet. Things you find that Walt left behind show up here.</p>}
  </div>;
}

export default function OfficePC({ onClose }) {
  useGame();
  const [tab, setTab] = useState('vehicles');
  const tabs = [['vehicles', 'Vehicles'], ['parts', 'Parts'], ['records', 'Records'], ['files', 'Files']];
  return <div className="overlay"><div className="card dealer">
    <div className="shop-head"><h2>WALT'S OFFICE PC</h2><span className="cash">${game.cash.toLocaleString()}</span><button onClick={onClose}>Close (Esc)</button></div>
    <div style={{ display: 'flex', gap: 6, margin: '4px 0 10px' }}>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'big' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'vehicles' ? <VehiclesTab /> : tab === 'parts' ? <PartsTab /> : tab === 'records' ? <RecordsTab /> : <FilesTab />}
  </div></div>;
}
