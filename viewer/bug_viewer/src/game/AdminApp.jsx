import React, { useState } from 'react';
import { offroadPlan, SITES, toWorld } from '../worlds/county.js';
import { OBSTACLES as SITE_OBSTACLES } from '../worlds/siteData.js';
import { STALLS } from '../worlds/lot.js';
import { clearSpot } from './clearSpot.js';
import { propObstacles } from './home.js';
import { standingVehicles } from './fleet.js';
import { defOf } from './projects.js';
import { teleportPlaces } from './whereAmI.js';
import { FRESH, summary, clues, wearNote } from '../wear.js';
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
 * Admin (test tool, on the phone). Home = one big tile per vehicle (Bug, Baja Bug, truck, El Cajon) and per tool (items, props, teleport, races, cheats, search).
 * Inside a vehicle: spawn the whole vehicle right where you stand, or pick parts. Nothing here is part of the real game: the first spawn marks the save (home.adminUsed).
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

const TILES = [
  ['bug', "'71 Bug", 'Stock Bug: bring it here, spawn parts'],
  ['baja', 'Baja Bug', 'Built-up desert Bug and its parts'],
  ['truck', "'84 Pickup", 'Drivable 4x4 truck'],
  ['cajon', 'El Cajon', 'Dusty\'s coupe-utility project'],
  ['items', 'Items & tools', 'Junk, tools, supplies, scrap'],
  ['props', 'Props', 'Garage and yard pieces'],
  ['teleport', 'Teleport', 'Cities, towns, spots; bring a vehicle'],
  ['races', 'Races', 'Courses: go to start or finish'],
  ['cheats', 'Cash · time · wear', 'Money, time of day, tires, diff, features'],
  ['search', 'Search everything', 'Every part, item, vehicle and prop'],
];


const Ctx = React.createContext(null);
const Row = ({ r }) => { const { act } = React.useContext(Ctx); return <button className="ph-entry adm-row" onClick={() => act(r)}><b>{r.label}</b><small>{r.info}</small></button>; };
const Big = ({ label, info, onClick }) => <button className="ph-entry adm-big" onClick={onClick}><b>{label}</b><small>{info}</small></button>;
const Kit = ({ label, list }) => { const { need, setLast } = React.useContext(Ctx); return <button className="ph-entry adm-row" onClick={() => { if (!need()) return; const l = list(); l.forEach(([k, id]) => dropNearPlayer(k, id)); save(); setLast('Spawned ' + l.length + ' items at your feet.'); }}><b>{label}</b></button>; };
const Cheat = ({ label, fn }) => { const { setLast } = React.useContext(Ctx); return <button className="ph-entry adm-chip" onClick={() => { fn(); setLast(label); }}>{label}</button>; };
const Search = ({ placeholder = 'Search…' }) => { const { q, setQ } = React.useContext(Ctx); return <input className="adm-search" value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} />; };
const List = ({ rows, cap = 200 }) => <div className="adm-list">{rows.slice(0, cap).map((r, i) => <Row key={(r.kind || r.act) + r.id + i} r={r} />)}{!rows.length && <small>Nothing matches.</small>}{rows.length > cap && <small>…{rows.length - cap} more: search to narrow.</small>}</div>;
const Section = ({ title, children }) => <div className="adm-sec"><h4>{title}</h4>{children}</div>;

export default function AdminApp({ onBack }) {
  useGame();
  const [view, setView] = useState(null), [q, setQ] = useState(''), [last, setLast] = useState(''), [veh, setVeh] = useState(''), [sec, setSec] = useState('all');
  const open = v => { setView(v); setQ(''); setSec('all'); };
  const cajon = cajonCatalog();
  const bodyOf = view === 'baja' ? 'classic-stage2' : bodies[0]?.id || 'classic';   // the body whose parts a vehicle view lists
  const cat = catalogFor(bodyOf), sections = SECTIONS.filter(s => cat.part.some(p => sectionOfSlot(p.slot) === s.id));
  const need = () => { if (!game.pos) { say('Walk into the world first.'); return false; } game.home = { ...game.home, adminUsed: true }; return true; };
  const ahead = () => ({ x: game.pos.x + (game.face?.x ?? 0) * 7, z: game.pos.z + (game.face?.z ?? 1) * 7, h: Math.atan2(game.face?.x ?? 0, game.face?.z ?? 1) });
  /** 7 m ahead of you if that is clear; otherwise an open lot stall, otherwise the nearest clear ground (so a spawned vehicle never lands inside shelves, walls or another car) */
  const here = (length = 4.2, width = 1.9) => {
    const circles = [...SITE_OBSTACLES, ...propObstacles(), ...standingVehicles().map(v => v.pose).filter(Boolean).flatMap(po => [[po.x, po.z, 2.2]]), ...(game.projects || []).map(p => [p.pose.x, p.pose.z, Math.max(2, defOf(p).length / 2)]), ...(game.job ? [[game.job.x, game.job.z, 2.6]] : [])];
    const stalls = STALLS.map(st => { const [x, z] = toWorld(SITES.garage, st.lx, st.lz); return { x, z, h: SITES.garage.rot + Math.atan2(st.fx, st.fz) }; }).sort((a, b) => Math.hypot(a.x - game.pos.x, a.z - game.pos.z) - Math.hypot(b.x - game.pos.x, b.z - game.pos.z));
    return clearSpot(ahead(), length, width, circles, stalls) || ahead();
  };
  const projectOf = (name, def, build) => { addProject({ uid: nextProjectUid(), name, def, build, pose: here(defOf({ def }).length, defOf({ def }).width) }); };
  const bugFull = () => normalize({ ...defaultBuild(), stripped: [], hidden: [] }), bugBare = () => normalize({ ...defaultBuild(), stripped: BUG.slots.map(s => s.id), hidden: [] });
  /** put a drivable vehicle where you stand (7 m ahead): the one you drive jumps there, any other is added to your vehicles if needed and parked there */
  const placeDrivable = id => {
    if (!need()) return; const p = here(), name = VEHICLE_TYPES[id]?.name || id;
    if (id === game.active) { game.carTo = p; setLast(`Your ${name} is now ahead of you.`); return; }
    game.fleet = { ...game.fleet, [id]: { ...(game.fleet[id] || {}), pose: p } }; save(); setLast(`${name} parked ahead of you. Walk up and press E to drive it.`);
  };
  const spawn = (kind, id, label) => { if (!need()) return; dropNearPlayer(kind, id); save(); setLast(`Spawned: ${label}`); };
  const act = r => {
    if (r.act === 'prop') { if (need()) { adminAddProp(r.id, 2); setLast('Placed: ' + r.label); } }
    else if (r.act === 'project') { if (need()) { r.make(); save(); setLast('Parked ahead of you as a work vehicle: ' + r.label); } }
    else if (r.act === 'drive') placeDrivable(r.id);
    else if (r.act === 'switch') { setLast(switchTo(r.id, false) ? 'Now driving ' + r.label : 'Already the active vehicle.'); }
    else if (r.act === 'baja') { if (!need()) return; if (!game.adminSetBuild) return say('Not available here.'); game.adminSetBuild(fullBajaBuild(game.build)); placeDrivable('bug'); setLast('Your Bug is now a complete Baja Bug, ahead of you.'); }
    else if (r.act === 'mat') { if (need()) { game.mats = { ...game.mats, [r.id]: (game.mats?.[r.id] || 0) + r.n }; save(); setLast('+' + r.n + ' ' + r.id); } }
    else spawn(r.kind, r.id, r.label);
  };
  const price = (k, id) => { try { const v = priceOf(k, id); return v ? ' · $' + v : ''; } catch { return ''; } };
  const partRows = cat.part.map(p => ({ cat: sectionOfSlot(p.slot), kind: 'part', id: p.id, label: nameOf('part', p.id, bodyOf), info: p.slot + price('part', p.id) + (wearNote('part', p.id) ? ' · ' + wearNote('part', p.id) : '') }));
  const wheelRows = cat.wheel.map(w => ({ cat: 'wheel', kind: 'wheel', id: w.id, label: nameOf('wheel', w.id, bodyOf), info: 'tire set' + price('wheel', w.id) + (wearNote('wheel', w.id) ? ' · ' + wearNote('wheel', w.id) : '') }));
  const rimRows = cat.rim.map(r => ({ cat: 'rim', kind: 'rim', id: r.id, label: nameOf('rim', r.id, bodyOf), info: 'rim' + price('rim', r.id) }));
  const cajonRows = cajon.map(c => ({ kind: 'stock', id: c.id, label: c.name, info: 'El Cajon part' }));
  const shellRows = bodies.map(b => ({ kind: 'shell', id: b.id, label: 'Body shell: ' + (b.name || b.id), info: 'bare shell, ready to build on' }));
  const itemRows = [
    ...Object.entries(JUNK).map(([id, v]) => ({ kind: 'junk', id, label: v.name, info: 'junk · size ' + v.size })), ...Object.entries(MEMENTOS).map(([id, v]) => ({ kind: 'memento', id, label: v.name, info: 'memento' })),
    ...Object.entries(TOOLS).map(([id, v]) => ({ kind: 'tool', id, label: v.name, info: 'tool · size ' + v.size })), { kind: 'fab', id: 'shockHoops', label: 'Shock hoops (ready-made)', info: 'fabricated part' },
    ...GARAGE_SUPPLIES.map(([id, name, cost, kindOf, note]) => { const [kind, item] = itemOf(id); return { kind, id: item, label: name, info: 'supply · ' + (kindOf || '') + (cost ? ' · $' + cost : '') + (note ? ' · ' + note : '') }; }),
    ...[10, 100].map(n => ({ act: 'mat', id: 'scrap', n, label: '+' + n + ' scrap metal', info: 'material' })),
  ];
  const propRows = BUILD_ITEMS.map(b => ({ act: 'prop', id: b.id, label: b.name || b.id, info: 'prop' + (b.cat ? ' · ' + b.cat : '') + (b.price ? ' · $' + b.price : '') }));
  const vehicleRows = [
    { act: 'drive', id: 'bug', label: "Bring my '71 Bug here", info: 'drivable' }, { act: 'baja', id: 'bug', label: 'Make my Bug a complete Baja Bug, here', info: 'drivable, prebuilt' },
    ...Object.values(VEHICLE_TYPES).filter(v => v.id !== 'bug' && v.dims && v.id !== 'cajon').map(v => ({ act: 'drive', id: v.id, label: v.name + ' here', info: 'drivable' + (owned(v.id) ? ' · owned' : '') })),
    { act: 'project', id: 'bug-full', label: 'Complete Bug (work vehicle)', info: 'every stock part fitted', make: () => projectOf('Complete Bug', 'bug', bugFull()) },
    { act: 'project', id: 'bug-bare', label: 'Bare Bug shell (work vehicle)', info: 'everything off', make: () => projectOf('Bare Bug shell', 'bug', bugBare()) },
    { act: 'project', id: 'cajon-shell', label: "El Cajon shell (work vehicle)", info: 'as Dusty gives it', make: () => projectOf("'66 El Cajon", 'cajon', shellBuild()) },
    { act: 'project', id: 'cajon-full', label: 'El Cajon, complete (work vehicle)', info: 'every part fitted', make: () => projectOf("'66 El Cajon (complete)", 'cajon', { ...shellBuild(), stripped: [], hidden: [] }) },
  ];
  const everything = [...partRows, ...wheelRows, ...rimRows, ...cajonRows, ...vehicleRows, ...shellRows, ...itemRows, ...propRows];
  const filtered = list => { const t = q.trim().toLowerCase(); return t ? list.filter(r => (r.label + ' ' + r.id + ' ' + (r.info || '')).toLowerCase().includes(t)) : list; };
  const go = (p, label) => { game.teleportTo = { x: p.x, z: p.z, h: p.h || 0 }; setLast(`Going to ${label}. Close the phone.`); };   // (Walker / the vehicle pick this up next frame)
  /** teleport to a place and, if a vehicle is picked, bring it along: the one you drive jumps with you, any other is added to your vehicles (if needed), parked there and entered */
  const goTo = p => {
    const dest = { x: p.x, z: p.z, h: p.h || 0 }, side = { x: p.x + Math.cos(dest.h) * 5, z: p.z - Math.sin(dest.h) * 5, h: dest.h };
    game.home = { ...game.home, adminUsed: true };
    if (!veh) { game.teleportTo = dest; return setLast('Going to ' + p.name + '. Close the phone.'); }
    if (!owned(veh)) game.fleet = { ...game.fleet, [veh]: { pose: null } };
    if (veh === game.active) { game.carTo = dest; if (game.onFoot) game.teleportTo = side; else game.teleportTo = dest; }
    else { switchTo(veh, !game.onFoot); game.pose = { ...dest }; game.spawnAt = { ...dest }; game.keepPose = true; game.teleportTo = game.onFoot ? side : null; }
    save(); setLast('Going to ' + p.name + ' with ' + (VEHICLE_TYPES[veh]?.name || veh) + '. Close the phone.');
  };

  // ---- one view per vehicle ----
  const partsPicker = (extra = []) => {
    const chips = [['all', 'All parts'], ...sections.map(s => [s.id, s.label]), ['wheel', 'Tires'], ['rim', 'Rims'], ...extra];
    const rows = sec === 'all' ? [...partRows, ...wheelRows, ...rimRows] : sec === 'wheel' ? wheelRows : sec === 'rim' ? rimRows : sec === 'cajon' ? cajonRows : partRows.filter(r => r.cat === sec);
    return <Section title="Parts (drop at your feet, free)"><div className="adm-chips">{chips.map(([k, l]) => <button key={k} className={'ph-entry adm-chip' + (sec === k ? ' on' : '')} onClick={() => setSec(k)}>{l}</button>)}</div><Search placeholder="Search these parts…" /><List rows={filtered(rows)} /></Section>;
  };
  const vehicleView = () => {
    if (view === 'bug') return <>
      <Section title="Vehicle"><Row r={{ act: 'drive', id: 'bug', label: "Bring my '71 Bug here", info: 'it appears ahead of you, ready to drive' }} />
        <Row r={{ act: 'project', id: 'bug-full', label: 'Spawn a complete Bug (work vehicle)', info: 'every stock part fitted', make: () => projectOf('Complete Bug', 'bug', bugFull()) }} />
        <Row r={{ act: 'project', id: 'bug-bare', label: 'Spawn a bare Bug shell (work vehicle)', info: 'everything off, to build up', make: () => projectOf('Bare Bug shell', 'bug', bugBare()) }} />
        <Row r={{ kind: 'shell', id: bodies[0]?.id, label: 'Body shell only', info: 'bare shell at your feet' }} /></Section>
      {partsPicker()}</>;
    if (view === 'baja') return <>
      <Section title="Vehicle"><Row r={{ act: 'baja', id: 'bug', label: 'Make my Bug a complete Baja Bug, here', info: 'carbon panels, cage, lights, shocks, big tires; ready to drive' }} />
        <button className="ph-entry adm-row" onClick={() => { if (!need()) return; if (!game.adminSetBuild) return say('Not available here.'); game.adminSetBuild(fullBajaBuild(game.build)); setLast('Fitted a complete Baja Bug (no moving).'); }}><b>Fit the Baja kit on my Bug (no moving)</b><small>stays where it is</small></button>
        <Row r={{ act: 'project', id: 'baja-work', label: 'Spawn a complete Baja Bug (work vehicle)', info: 'parked ahead, fully built, can be taken apart', make: () => projectOf('Complete Baja Bug', 'bug', normalize({ ...fullBajaBuild(defaultBuild()), stripped: [], hidden: [] })) }} /></Section>
      <Section title="Kits (items drop at your feet)">
        <Kit label={'Every part in the catalog (' + cat.part.length + ')'} list={() => cat.part.map(p => ['part', p.id])} />
        {presets.filter(p => p.build.parts && Object.keys(p.build.parts).length).map(p => <Kit key={p.label} label={'Parts of the "' + p.label + '" build'} list={() => Object.values(p.build.parts).map(id => ['part', id])} />)}
        <Kit label="Big tires and beadlock rims (every set)" list={() => [...cat.wheel.map(w => ['wheel', w.id]), ...cat.rim.map(r => ['rim', r.id])]} /></Section>
      {partsPicker()}</>;
    if (view === 'truck') return <>
      <Section title="Vehicle">{Object.values(VEHICLE_TYPES).filter(v => v.id !== 'bug' && v.dims && v.id !== 'cajon').map(v => <Row key={v.id} r={{ act: 'drive', id: v.id, label: v.name + ' here', info: (owned(v.id) ? 'yours; moves it ahead of you' : 'free, added to your vehicles') + ' · walk up and press E' }} />)}
        {Object.values(VEHICLE_TYPES).filter(v => owned(v.id) && v.id !== game.active && v.dims).map(v => <Row key={'s' + v.id} r={{ act: 'switch', id: v.id, label: 'Switch to ' + v.name, info: 'make it the one you drive' }} />)}</Section>
      <small>No loose parts for the pickup yet.</small></>;
    return <>   {/* cajon */}
      <Section title="Vehicle"><Row r={{ act: 'project', id: 'cajon-shell', label: 'El Cajon shell (work vehicle)', info: 'as Dusty gives it', make: () => projectOf("'66 El Cajon", 'cajon', shellBuild()) }} />
        <Row r={{ act: 'project', id: 'cajon-full', label: 'El Cajon, complete (work vehicle)', info: 'every part fitted', make: () => projectOf("'66 El Cajon (complete)", 'cajon', { ...shellBuild(), stripped: [], hidden: [] }) }} /></Section>
      <Section title="El Cajon parts"><Search placeholder="Search El Cajon parts…" /><List rows={filtered(cajonRows)} /></Section></>;
  };

  const body = () => {
    if (view === 'bug' || view === 'baja' || view === 'truck' || view === 'cajon') return vehicleView();
    if (view === 'items') return <>
      <Section title="Quick sets"><Kit label="Finish tools: grinder, buffer, hose, 5 spray cans" list={() => [['tool', 'grinder'], ['tool', 'buffer'], ['tool', 'hose'], ['tool', 'spray-white'], ['tool', 'spray-red'], ['tool', 'spray-blue'], ['tool', 'spray-black'], ['tool', 'spray-yellow']]} /><Kit label="Tire pressure: gauge, air chuck" list={() => [['tool', 'gauge'], ['tool', 'airchuck']]} /><Kit label="Hand tools: wrench, floor jack" list={() => [['tool', 'wrench'], ['tool', 'jack']]} /><Kit label="Shock hoops, ready-made (skips fabricating)" list={() => [['fab', 'shockHoops']]} />
        <button className="ph-entry adm-row" onClick={() => { if (!need()) return; const a = adminAddProp('welder', 2), b = adminAddProp('bender', 3.2); setLast(a && b ? 'Placed a MIG welder and a tube bender in the garage.' : 'Stand INSIDE the garage so they count as garage tools.'); }}><b>MIG welder + tube bender</b><small>stand in the garage</small></button></Section>
      <Section title="All items"><Search placeholder="Search items…" /><List rows={filtered(itemRows)} /></Section></>;
    if (view === 'props') return <Section title="Props"><Search placeholder="Search props…" /><List rows={filtered(propRows)} /></Section>;
    if (view === 'search') return <Section title={`Everything (${everything.length})`}><Search placeholder="Search everything…" /><List rows={filtered(everything)} cap={150} /></Section>;
    if (view === 'teleport') {
      const t = q.trim().toLowerCase(), list = teleportPlaces().filter(p => !t || p.name.toLowerCase().includes(t));
      return <>
        <Section title="Bring a vehicle"><select className="adm-select" value={veh} onChange={e => setVeh(e.target.value)}><option value="">none (just me)</option><option value={game.active}>the one I'm in ({VEHICLE_TYPES[game.active]?.name || game.active})</option>{Object.values(VEHICLE_TYPES).filter(v => v.dims && v.id !== game.active).map(v => <option key={v.id} value={v.id}>{v.name}{owned(v.id) ? ' (mine)' : ' (adds it)'}</option>)}</select></Section>
        <Section title="Where to"><Search placeholder="Search places…" />
          <div className="adm-list">{list.map((p, i) => <button key={p.name + i} className="ph-entry adm-row" onClick={() => game.pos ? goTo(p) : say('Walk into the world first.')}><b>{p.name}</b><small>{p.kind === 'town' ? 'city / town' : 'spot'}{veh ? ' · with a vehicle' : ''}</small></button>)}{!list.length && <small>No match.</small>}</div></Section></>;
    }
    if (view === 'races') return <Section title="Race courses">{raceCourses().length ? raceCourses().map(c => <div key={c.id} className="adm-row adm-static"><b>{c.name}</b><small>{c.series} · {c.kind === 'loop' ? 'loop' : 'point to point'} · {(c.dirtLength / 1000).toFixed(1)} km dirt{c.pavedLength > 0 ? ` · ${(c.pavedLength / 1000).toFixed(1)} km paved` : ''}</small>
      <div className="adm-chips"><button className="ph-entry adm-chip" onClick={() => go(c.start, `${c.name} start`)}>Go to start</button>{c.kind === 'point' && <button className="ph-entry adm-chip" onClick={() => go({ ...c.finish, h: c.start.h }, `${c.name} finish`)}>Go to finish</button>}</div></div>) : <small>No race courses on this map (they are on the real map).</small>}</Section>;
    if (view === 'cheats') return <>
      <Section title="Cash and time"><div className="adm-chips"><Cheat label="+$1,000" fn={() => addCash(1000, 'Admin')} /><Cheat label="+$10,000" fn={() => addCash(10000, 'Admin')} /><Cheat label="Morning" fn={() => { game.clock = 7; }} /><Cheat label="Noon" fn={() => { game.clock = 12; }} /><Cheat label="Night" fn={() => { game.clock = 22; }} /></div></Section>
      <Section title="Tires and drivetrain"><div className="adm-chips">
        {[12, 16, 20, 30, 36].map(p => <Cheat key={p} label={p + ' psi' + ((game.home?.tirePsi ?? 30) === p ? ' ✓' : '')} fn={() => { game.home = { ...game.home, tirePsi: p }; say('Tire pressure ' + p + ' psi (street 30, sand/rock 12-20).'); }} />)}
        {['open', 'lsd', 'locker'].map(d => <Cheat key={d} label={'Diff: ' + d + ((game.home?.diff ?? 'open') === d ? ' ✓' : '')} fn={() => { game.home = { ...game.home, diff: d }; say('Rear differential: ' + d + '.'); }} />)}</div></Section>
      <Section title="Go to the nearest…"><div className="adm-chips">
        {['track', 'jump', 'whoops', 'berms', 'ford', 'river', 'forest', 'climb'].map(k => <Cheat key={k} label={({ track: 'dirt track', ford: 'creek crossing', river: 'river ford', forest: 'forest trail', climb: 'hill climb' }[k] || k)} fn={() => { const p = offroadPlan(); const me = game.pos; const it = (p?.items || []).filter(i => i.kind === k).sort((u, v) => Math.hypot(u.x - me.x, u.z - me.z) - Math.hypot(v.x - me.x, v.z - me.z))[0]; if (!it) return say('None on this map.'); if (it.path) return go({ x: it.start[0], z: it.start[1], h: Math.atan2(it.path[1][0] - it.start[0], it.path[1][1] - it.start[1]) }, 'the nearest ' + k + ' (start of its trail)'); const s0 = k === 'track' ? -it.S / 2 - 30 : -30, Hd = it.h; go({ x: it.x + Math.sin(Hd) * s0, z: it.z + Math.cos(Hd) * s0, h: Hd }, 'the nearest ' + k); }} />)}</div></Section>
      <Section title="Wear"><div className="adm-chips"><Cheat label="Service vehicle (reset wear)" fn={() => { game.home = { ...game.home, wear: { ...(game.home.wear || {}), [game.active]: FRESH() } }; save(); }} /><Cheat label="Wear it out (test)" fn={() => { game.home = { ...game.home, wear: { ...(game.home.wear || {}), [game.active]: { shocks: 1, tires: 1, align: 1, engine: 1, side: 1 } } }; }} /><Cheat label="+10 scrap" fn={() => { game.mats = { ...game.mats, scrap: (game.mats?.scrap || 0) + 10 }; save(); }} /><Cheat label="+10 wood" fn={() => { game.mats = { ...game.mats, wood: (game.mats?.wood || 0) + 10 }; save(); }} /></div>
        <small>{summary(game.home?.wear?.[game.active] || FRESH())}{clues(game.home?.wear?.[game.active] || FRESH())[0] ? ' — ' + clues(game.home.wear[game.active])[0] : ''}</small></Section></>;
    return null;
  };

  const title = TILES.find(t => t[0] === view)?.[1];
  return <Ctx.Provider value={{ act, need, setLast, q, setQ }}><div className="phone-soon adm">
    <div className="adm-head">{view ? <button className="ph-entry adm-back" onClick={() => open(null)}>‹ Admin</button> : <span />}<h3>{title || 'Admin'}</h3><span /></div>
    {!view
      ? <><small>Test tool. Everything here is free and marks the save as used. {game.home?.adminUsed ? 'This save has used it.' : ''}</small>
        <div className="adm-grid">{TILES.map(([k, l, i]) => <Big key={k} label={l} info={i} onClick={() => open(k)} />)}</div></>
      : <div className="adm-body">{body()}</div>}
    <small className="adm-last">{last}</small>
    {!view && <button onClick={onBack}>Back</button>}
  </div></Ctx.Provider>;
}
