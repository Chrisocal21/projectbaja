import React, { useState } from 'react';
import { game, useGame, save, say, addCash, catalogFor, nameOf } from './store.js';
import { SECTIONS, sectionOfSlot } from '../build.js';
import { cajonCatalog } from './cajonParts.js';
import { GARAGE_SUPPLIES, itemOf } from './garageSupplies.js';
import { dropNearPlayer } from './items.js';
import { raceCourses } from '../worlds/county.js';
import { presets } from '../catalog/index.js';
import { adminAddProp } from './home.js';

/**
 * Admin (test tool, on the phone): spawn any part on the ground at your feet, free, to try it out. One screen, one tab per kind of part.
 * Nothing here is part of the real game: the first spawn marks the save (home.adminUsed) so it is honest about it.
 */
/** the whole Baja Bug of the concept art in one build: carbon panels, tube bumpers and cage, roll cage, roof rack with four round lights, shocks, big tires */
const fullBajaBuild = b => ({
  ...b, livery: true, body: 'classic-stage2', wheels: 'tire-deep', stripped: [], hidden: [],
  parts: {
    fenders: 'CARBON_FendersCut', hood: 'CARBON_Hood', rearDeck: 'CARBON_RearDeck', frontBumper: 'PART_002_FrontTubeBumper', rearBumper: 'PART_003_RearEngineCage',
    rockers: 'PART_011_RockerGuards', rollCage: 'ROLL_Cage', fenderTubes: 'FENDER_ArchTubes', roofRack: 'ACC_RoofRack', roofLights: 'ROOF_RoundLights', rearCarrier: 'ACC_SpareCarrier',
    suspension: 'PART_006_TrailShockSet', shocks: 'SHOCK_001_Coilover', skid: 'GUARD_SkidPlate', mudFlaps: 'GUARD_MudFlaps', exhaust: 'EXH_Megaphone',
    frontLights: 'LIGHT_BumperPods', rearLights: 'LIGHT_RearBar', engineCarb: 'EMOD_DualWeber', engineBore: 'EMOD_Bore1776', engineCooling: 'EMOD_Doghouse',
  },
});
export default function AdminApp({ onBack }) {
  useGame();
  const body = game.build?.body || 'classic', cat = catalogFor(body), cajon = cajonCatalog();
  const sections = SECTIONS.filter(sec => cat.part.some(p => sectionOfSlot(p.slot) === sec.id));
  const tabs = [...sections.map(s => [s.id, s.label]), ['wheel', 'Tires'], ['rim', 'Rims'], ['cajon', 'El Cajon'], ['supplies', 'Supplies'], ['kits', 'Baja kit + tools'], ['races', 'Races'], ['cheats', 'Cash / time']];
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
  const go = (p, label) => { game.teleportTo = { x: p.x, z: p.z, h: p.h || 0 }; setLast(`Going to ${label}. Close the phone.`); };   // (Walker / the vehicle pick this up next frame)
  const kitBtn = (label, list) => <button key={label} style={{ textAlign: 'left', fontSize: 12, padding: '4px 6px' }} onClick={() => { if (!game.pos) return say('Walk into the world first.'); game.home = { ...game.home, adminUsed: true }; const l = list(); l.forEach(([k, id]) => dropNearPlayer(k, id)); save(); setLast('Spawned ' + l.length + ' items at your feet.'); }}>{label}</button>;
  const cheat = (label, fn) => <button key={label} onClick={() => { fn(); setLast(label); }}>{label}</button>;
  return <div className="phone-soon"><h3>Admin</h3>
    <small>Test tool: spawns free parts at your feet. {game.home?.adminUsed ? 'This save has used it.' : ''}</small>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} style={{ padding: '3px 7px', fontSize: 12 }} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'kits'
      ? <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <small>Everything needed to turn the Bug into a Baja Bug. Items land on the ground at your feet (pick them up, then fit them with hold-click).</small>
        <button style={{ textAlign: 'left', fontSize: 12, padding: '4px 6px', fontWeight: 700 }} onClick={() => { if (!game.adminSetBuild) return say('Not available here.'); game.home = { ...game.home, adminUsed: true }; game.adminSetBuild(fullBajaBuild(game.build)); setLast('Fitted a complete Baja Bug (carbon panels, cage, roof lights, tube bumpers, shocks, big tires).'); }}>FIT a complete Baja Bug right now (no spawning)</button>
        {kitBtn('Every part in the catalog (' + cat.part.length + ')', () => cat.part.map(p => ['part', p.id]))}
        {presets.filter(p => p.build.parts && Object.keys(p.build.parts).length).map(p => kitBtn('Parts of the "' + p.label + '" build', () => Object.values(p.build.parts).map(id => ['part', id])))}
        {kitBtn('Big tires and beadlock rims (every wheel set and rim)', () => [...cat.wheel.map(w => ['wheel', w.id]), ...cat.rim.map(r => ['rim', r.id])])}
        {kitBtn('Hand tools: wrench, floor jack', () => [['tool', 'wrench'], ['tool', 'jack']])}
        {kitBtn('Shock hoops, ready-made (skips fabricating)', () => [['fab', 'shockHoops']])}
        <button style={{ textAlign: 'left', fontSize: 12, padding: '4px 6px' }} onClick={() => { if (!game.pos) return say('Walk into the world first.'); game.home = { ...game.home, adminUsed: true }; const a = adminAddProp('welder', 2), b = adminAddProp('bender', 3.2); setLast(a && b ? 'Placed a MIG welder and a tube bender in the garage.' : 'Placed them: stand INSIDE the garage so they count as garage tools.'); }}>Place a MIG welder + tube bender (stand in the garage)</button>
        <button style={{ textAlign: 'left', fontSize: 12, padding: '4px 6px' }} onClick={() => { game.mats = { ...game.mats, scrap: (game.mats?.scrap || 0) + 30 }; save(); setLast('+30 scrap'); }}>+30 scrap metal (for fabricating at the workbench)</button>
      </div>
    : tab === 'races'
      ? <div style={{ width: '100%', textAlign: 'left', fontSize: 12 }}>{raceCourses().length ? raceCourses().map(c => <div key={c.id} style={{ padding: '4px 0', borderBottom: '1px solid #ffffff18' }}>
        <b>{c.name}</b> <small>{c.series} · {c.kind === 'loop' ? 'loop' : 'point to point'} · {(c.dirtLength / 1000).toFixed(1)} km dirt{c.pavedLength > 0 ? ` · ${(c.pavedLength / 1000).toFixed(1)} km paved` : ''}</small>
        <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><button style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => go(c.start, `${c.name} start`)}>Go to start</button>{c.kind === 'point' && <button style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => go({ ...c.finish, h: c.start.h }, `${c.name} finish`)}>Go to finish</button>}</div></div>) : <small>No race courses on this map (they are on the real map).</small>}</div>
    : tab === 'cheats'
      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {cheat('+$1,000', () => addCash(1000, 'Admin'))}{cheat('+$10,000', () => addCash(10000, 'Admin'))}
        {cheat('Time: morning', () => { game.clock = 7; })}{cheat('Time: noon', () => { game.clock = 12; })}{cheat('Time: night', () => { game.clock = 22; })}
        {[12, 16, 20, 30, 36].map(p => cheat('Tires ' + p + ' psi' + ((game.home?.tirePsi ?? 30) === p ? ' ✓' : ''), () => { game.home = { ...game.home, tirePsi: p }; say('Tire pressure ' + p + ' psi (street 30, sand/rock 12-20). Takes effect on the next frame.'); }))}
        {['open', 'lsd', 'locker'].map(d => cheat('Diff: ' + d + ((game.home?.diff ?? 'open') === d ? ' ✓' : ''), () => { game.home = { ...game.home, diff: d }; say('Rear differential: ' + d + ' (open sends power to the wheel with least grip; a locker drives both).'); }))}
        {cheat('+10 scrap', () => { game.mats = { ...game.mats, scrap: (game.mats?.scrap || 0) + 10 }; save(); })}
      </div>
      : <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>{rows.map(r => <button key={r.kind + r.id} style={{ textAlign: 'left', fontSize: 12, padding: '4px 6px' }} onClick={() => spawn(r.kind, r.id, r.label)}>{r.label}</button>)}</div>}
    <small style={{ minHeight: 16 }}>{last}</small>
    <button onClick={onBack}>Back</button></div>;
}
