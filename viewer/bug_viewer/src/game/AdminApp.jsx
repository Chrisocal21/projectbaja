import React, { useState } from 'react';
import { game, useGame, save, say, addCash, catalogFor, nameOf } from './store.js';
import { SECTIONS, sectionOfSlot } from '../build.js';
import { cajonCatalog } from './cajonParts.js';
import { GARAGE_SUPPLIES, itemOf } from './garageSupplies.js';
import { dropNearPlayer } from './items.js';

/**
 * Admin (test tool, on the phone): spawn any part on the ground at your feet, free, to try it out. One screen, one tab per kind of part.
 * Nothing here is part of the real game: the first spawn marks the save (home.adminUsed) so it is honest about it.
 */
export default function AdminApp({ onBack }) {
  useGame();
  const body = game.build?.body || 'classic', cat = catalogFor(body), cajon = cajonCatalog();
  const sections = SECTIONS.filter(sec => cat.part.some(p => sectionOfSlot(p.slot) === sec.id));
  const tabs = [...sections.map(s => [s.id, s.label]), ['wheel', 'Tires'], ['rim', 'Rims'], ['cajon', 'El Cajon'], ['supplies', 'Supplies'], ['cheats', 'Cash / time']];
  const [tab, setTab] = useState(tabs[0][0]), [last, setLast] = useState('');
  const spawn = (kind, id, label) => {
    if (!game.pos) return say('Walk into the world first.');
    game.home = { ...game.home, adminUsed: true };
    dropNearPlayer(kind, id); save(); setLast(`Spawned: ${label}`);
  };
  const rows = sections.some(s => s.id === tab) ? cat.part.filter(p => sectionOfSlot(p.slot) === tab).map(p => ({ kind: 'part', id: p.id, label: nameOf('part', p.id, body) }))
    : tab === 'wheel' ? cat.wheel.map(w => ({ kind: 'wheel', id: w.id, label: nameOf('wheel', w.id, body) }))
    : tab === 'rim' ? cat.rim.map(r => ({ kind: 'rim', id: r.id, label: nameOf('rim', r.id, body) }))
    : tab === 'cajon' ? cajon.map(c => ({ kind: 'stock', id: c.id, label: c.name }))
    : tab === 'supplies' ? GARAGE_SUPPLIES.map(([id, name]) => { const [kind, item] = itemOf(id); return { kind, id: item, label: name }; })
    : [];
  const cheat = (label, fn) => <button key={label} onClick={() => { fn(); setLast(label); }}>{label}</button>;
  return <div className="phone-soon"><h3>Admin</h3>
    <small>Test tool: spawns free parts at your feet. {game.home?.adminUsed ? 'This save has used it.' : ''}</small>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} style={{ padding: '3px 7px', fontSize: 12 }} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'cheats'
      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {cheat('+$1,000', () => addCash(1000, 'Admin'))}{cheat('+$10,000', () => addCash(10000, 'Admin'))}
        {cheat('Time: morning', () => { game.clock = 7; })}{cheat('Time: noon', () => { game.clock = 12; })}{cheat('Time: night', () => { game.clock = 22; })}
        {cheat('+10 scrap', () => { game.mats = { ...game.mats, scrap: (game.mats?.scrap || 0) + 10 }; save(); })}
      </div>
      : <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>{rows.map(r => <button key={r.kind + r.id} style={{ textAlign: 'left', fontSize: 12, padding: '4px 6px' }} onClick={() => spawn(r.kind, r.id, r.label)}>{r.label}</button>)}</div>}
    <small style={{ minHeight: 16 }}>{last}</small>
    <button onClick={onBack}>Back</button></div>;
}
