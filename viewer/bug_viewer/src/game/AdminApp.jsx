import React, { useState } from 'react';
import { offroadPlan } from '../worlds/county.js';
import { game, useGame, save, say, addCash, catalogFor, nameOf } from './store.js';
import { SECTIONS, sectionOfSlot } from '../build.js';
import { cajonCatalog } from './cajonParts.js';
import { GARAGE_SUPPLIES, itemOf } from './garageSupplies.js';
import { dropNearPlayer } from './items.js';
import { raceCourses } from '../worlds/county.js';
import { presets } from '../catalog/index.js';
import { adminAddProp, BUILD_ITEMS } from './home.js';
import { JUNK, MEMENTOS, TOOLS } from './items.js';
import { addProject, nextProjectUid } from './projects.js';
import { shellBuild } from './cajonParts.js';
import { VEHICLE_TYPES, switchTo, owned } from './fleet.js';
import { bodies, defaultBuild, normalize } from '../build.js';
import { BUG } from '../rules/vehicles.js';
import { priceOf } from './store.js';

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
  const [pickedBody, setPickedBody] = useState(null), [q, setQ] = useState('');
  const body = pickedBody || game.build?.body || 'classic', cat = catalogFor(body), cajon = cajonCatalog();   // the body whose parts the archive lists (change it with the chips under the search box)
  const sections = SECTIONS.filter(sec => cat.part.some(p => sectionOfSlot(p.slot) === sec.id));
  const tabs = [['all', 'Everything'], ...sections.map(s => [s.id, s.label]), ['vehicles', 'Vehicles'], ['shells', 'Body shells'], ['items', 'Items'], ['props', 'Props'], ['wheel', 'Tires'], ['rim', 'Rims'], ['cajon', 'El Cajon'], ['supplies', 'Supplies'], ['kits', 'Baja kit + tools'], ['races', 'Races'], ['cheats', 'Cash / time']];   // the archive: everything in the game is listed somewhere here, and can be spawned
  const [tab, setTab] = useState('all'), [last, setLast] = useState('');
  const spawn = (kind, id, label) => {
    if (!game.pos) return say('Walk into the world first.');
    game.home = { ...game.home, adminUsed: true };
    dropNearPlayer(kind, id); save(); setLast(`Spawned: ${label}`);
  };
  const here = () => ({ x: game.pos.x + game.face.x * 7, z: game.pos.z + game.face.z * 7, h: Math.atan2(game.face.x, game.face.z) });
  const projectOf = (name, def, build) => { addProject({ uid: nextProjectUid(), name, def, build, pose: here() }); };
  const bugFull = () => normalize({ ...defaultBuild(), stripped: [], hidden: [] }), bugBare = () => normalize({ ...defaultBuild(), stripped: BUG.slots.map(s => s.id), hidden: [] });
  const act = r => {
    if (!game.pos) return say('Walk into the world first.');
    game.home = { ...game.home, adminUsed: true };
    if (r.act === 'prop') { adminAddProp(r.id, 2); setLast('Placed: ' + r.label); }
    else if (r.act === 'project') { r.make(); save(); setLast('Parked in the yard ahead of you: ' + r.label); }
    else if (r.act === 'fleet') { if (owned(r.id)) setLast(r.label + ' is already yours.'); else { game.fleet = { ...game.fleet, [r.id]: { pose: here() } }; save(); setLast('Added to your vehicles, parked ahead of you: ' + r.label); } }
    else if (r.act === 'switch') { setLast(switchTo(r.id, false) ? 'Now driving ' + r.label : 'Already the active vehicle.'); }
    else if (r.act === 'mat') { game.mats = { ...game.mats, [r.id]: (game.mats?.[r.id] || 0) + r.n }; save(); setLast('+' + r.n + ' ' + r.id); }
    else spawn(r.kind, r.id, r.label);
  };
  const price = (k, id) => { try { const v = priceOf(k, id); return v ? ' · $' + v : ''; } catch { return ''; } };
  const partRows = cat.part.map(p => ({ cat: sectionOfSlot(p.slot), kind: 'part', id: p.id, label: nameOf('part', p.id, body), info: 'part · ' + p.slot + price('part', p.id) }));
  const wheelRows = cat.wheel.map(w => ({ cat: 'wheel', kind: 'wheel', id: w.id, label: nameOf('wheel', w.id, body), info: 'tire set' + price('wheel', w.id) }));
  const rimRows = cat.rim.map(r => ({ cat: 'rim', kind: 'rim', id: r.id, label: nameOf('rim', r.id, body), info: 'rim' + price('rim', r.id) }));
  const vehicleRows = [
    { act: 'project', id: 'bug-full', label: 'Bug: complete, every stock part fitted (work vehicle)', info: 'project vehicle', make: () => projectOf('Complete Bug', 'bug', bugFull()) },
    { act: 'project', id: 'bug-bare', label: 'Bug: bare shell, everything off (work vehicle)', info: 'project vehicle', make: () => projectOf('Bare Bug shell', 'bug', bugBare()) },
    { act: 'project', id: 'cajon-shell', label: "El Cajon: shell as Dusty gives it (work vehicle)", info: 'project vehicle', make: () => projectOf("'66 El Cajon", 'cajon', shellBuild()) },
    { act: 'project', id: 'cajon-full', label: 'El Cajon: complete, every part fitted (work vehicle)', info: 'project vehicle', make: () => projectOf("'66 El Cajon (complete)", 'cajon', { ...shellBuild(), stripped: [], hidden: [] }) },
    ...Object.values(VEHICLE_TYPES).filter(v => v.id !== 'bug' && v.dims).map(v => ({ act: 'fleet', id: v.id, label: v.name, info: 'vehicle' + (v.price ? ' · $' + v.price : '') + (owned(v.id) ? ' · owned' : ''), kind: 'vehicle' })),
    ...Object.values(VEHICLE_TYPES).filter(v => owned(v.id) && v.id !== game.active).map(v => ({ act: 'switch', id: v.id, label: 'Switch to ' + v.name, info: 'drive it', kind: 'vehicle' })),
  ];
  const shellRows = bodies.map(b => ({ kind: 'shell', id: b.id, label: 'Body shell: ' + (b.name || b.id), info: 'bare shell, ready to build on', cat: 'shell' }));
  const itemRows = [
    ...Object.entries(JUNK).map(([id, v]) => ({ kind: 'junk', id, label: v.name, info: 'junk · size ' + v.size })), ...Object.entries(MEMENTOS).map(([id, v]) => ({ kind: 'memento', id, label: v.name, info: 'memento' })),
    ...Object.entries(TOOLS).map(([id, v]) => ({ kind: 'tool', id, label: v.name, info: 'tool · size ' + v.size })), { kind: 'fab', id: 'shockHoops', label: 'Shock hoops (ready-made)', info: 'fabricated part' },
    ...GARAGE_SUPPLIES.map(([id, name, cost, kindOf, note]) => { const [kind, item] = itemOf(id); return { kind, id: item, label: name, info: 'supply · ' + (kindOf || '') + (cost ? ' · $' + cost : '') + (note ? ' · ' + note : '') }; }),
    ...cajon.map(c => ({ kind: 'stock', id: c.id, label: 'El Cajon: ' + c.name, info: 'vehicle part' })),
    ...[10, 100].map(n => ({ act: 'mat', id: 'scrap', n, label: '+' + n + ' scrap metal', info: 'material' })),
  ];
  const propRows = BUILD_ITEMS.map(b => ({ act: 'prop', id: b.id, label: b.name || b.id, info: 'prop' + (b.cat ? ' · ' + b.cat : '') + (b.price ? ' · $' + b.price : '') }));
  const everything = [...partRows, ...wheelRows, ...rimRows, ...vehicleRows, ...shellRows, ...itemRows, ...propRows];
  const filtered = list => { const t = q.trim().toLowerCase(); return t ? list.filter(r => (r.label + ' ' + r.id + ' ' + (r.info || '')).toLowerCase().includes(t)) : list; };
  const rows = tab === 'all' ? filtered(everything) : tab === 'vehicles' ? filtered(vehicleRows) : tab === 'shells' ? filtered(shellRows) : tab === 'items' ? filtered(itemRows) : tab === 'props' ? filtered(propRows)
    : sections.some(s => s.id === tab) ? filtered(partRows.filter(r => r.cat === tab))
    : tab === 'wheel' ? filtered(wheelRows)
    : tab === 'rim' ? filtered(rimRows)
    : tab === 'cajon' ? filtered(cajon.map(c => ({ kind: 'stock', id: c.id, label: c.name, info: 'El Cajon part' })))
    : tab === 'supplies' ? filtered(itemRows.filter(r => r.info.startsWith('supply')))
    : [];
  const go = (p, label) => { game.teleportTo = { x: p.x, z: p.z, h: p.h || 0 }; setLast(`Going to ${label}. Close the phone.`); };   // (Walker / the vehicle pick this up next frame)
  const kitBtn = (label, list) => <button key={label} style={{ textAlign: 'left', fontSize: 12, padding: '4px 6px' }} onClick={() => { if (!game.pos) return say('Walk into the world first.'); game.home = { ...game.home, adminUsed: true }; const l = list(); l.forEach(([k, id]) => dropNearPlayer(k, id)); save(); setLast('Spawned ' + l.length + ' items at your feet.'); }}>{label}</button>;
  const cheat = (label, fn) => <button key={label} onClick={() => { fn(); setLast(label); }}>{label}</button>;
  return <div className="phone-soon"><h3>Admin</h3>
    <small>Test tool: spawns free parts at your feet. {game.home?.adminUsed ? 'This save has used it.' : ''}</small>
    <input value={q} onChange={e => setQ(e.target.value)} placeholder={'Search everything (' + everything.length + ' things)…'} style={{ width: '100%', padding: '5px 8px', fontSize: 13, boxSizing: 'border-box' }} />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}><small>Parts for:</small>{bodies.map(b => <button key={b.id} className={body === b.id ? 'on' : ''} style={{ padding: '1px 6px', fontSize: 11 }} onClick={() => setPickedBody(b.id)}>{b.name || b.id}</button>)}</div>
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
        {['track', 'jump', 'whoops', 'berms', 'ford', 'river', 'forest', 'climb'].map(k => cheat('Go to nearest ' + ({ track: 'dirt track', ford: 'creek crossing', river: 'river ford', forest: 'forest trail', climb: 'hill climb' }[k] || k), () => { const p = offroadPlan(); const me = game.pos; const it = (p?.items || []).filter(i => i.kind === k).sort((u, v) => Math.hypot(u.x - me.x, u.z - me.z) - Math.hypot(v.x - me.x, v.z - me.z))[0]; if (!it) return say('None on this map.'); if (it.path) return go({ x: it.start[0], z: it.start[1], h: Math.atan2(it.path[1][0] - it.start[0], it.path[1][1] - it.start[1]) }, 'the nearest ' + k + ' (start of its trail)'); const s0 = k === 'track' ? -it.S / 2 - 30 : -30, Hd = it.h; go({ x: it.x + Math.sin(Hd) * s0, z: it.z + Math.cos(Hd) * s0, h: Hd }, 'the nearest ' + k); }))}
        {cheat('+10 scrap', () => { game.mats = { ...game.mats, scrap: (game.mats?.scrap || 0) + 10 }; save(); })}
      </div>
      : <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 360, overflowY: 'auto' }}><small>{rows.length} shown. Click one to spawn it.</small>{rows.slice(0, 300).map((r, i) => <button key={(r.kind || r.act) + r.id + i} style={{ textAlign: 'left', fontSize: 12, padding: '4px 6px' }} onClick={() => act(r)}><b>{r.label}</b><br /><small style={{ opacity: 0.7 }}>{r.info}</small></button>)}{rows.length > 300 && <small>…search to narrow {rows.length - 300} more</small>}</div>}
    <small style={{ minHeight: 16 }}>{last}</small>
    <button onClick={onBack}>Back</button></div>;
}
