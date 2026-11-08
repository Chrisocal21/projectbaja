// The game index (I): every piece of the game, built straight from the data tables, so it never drifts from the game.
// No text is written here that the game doesn't already say: names, prices, notes and stats all come from the data.
import React from 'react';
import { useGame, priceOf } from './store.js';
import { BUILD_ITEMS, BUILD_CATS, RECIPES, TRAILER_UPGRADES } from './home.js';
import { MATERIALS, piecePrice, PIECES } from '../worlds/structures.js';
import { parts, wheelSets, rims, slots, SECTIONS, sectionOfSlot, bodyById, labelFor } from '../build.js';
import { VEHICLE_TYPES } from './fleet.js';
import { SUPPLIES, STORE_ITEMS, JOBS } from './jobs.js';
import { TOOLS, SIZE_NAME } from './items.js';
import { CONTAINER_RULES } from './loot.js';
import { DEF } from './workshop.js';
import { UPGRADES, upgradeLevel } from './upgrades.js';
import { BIOMES } from '../worlds/county.js';
import { Icon, Key } from './BuildMenu.jsx';

const $ = n => `$${n.toLocaleString()}`;
const ZONE = { garage: 'Inside the garage', yard: 'Outside, on your lot', any: 'Anywhere on your property' };
const slotLabel = Object.fromEntries(slots.map(s => [s.id, s.label]));
const fits = p => (p.bodies === '*' ? 'Every body' : Object.keys(p.bodies || {}).map(b => bodyById[b]?.label || b).join(', '));
const needName = n => (n.tool ? TOOLS[n.tool]?.name : n.kind === 'supply' ? SUPPLIES[n.id]?.name : n.kind === 'stock' && n.id === 'battery' ? '12V car battery' : n.id);
const FN = { start: 'Needed to start', drive: 'Needed to drive', steer: 'Needed to drive', grip: 'Needed to drive' };
const TOOL_NAME = { hoist: 'Engine hoist (in your garage)', jack: 'Floor jack' };

export const CONTROLS = [
  ['On foot', [['WASD', 'Walk'], ['Shift', 'Run'], ['Mouse', 'Look'], ['E', 'Interact'], ['Click', 'Pick up'], ['Tab', 'Inventory'], ['F', 'Car storage'], ['G', 'Put down'], ['R', 'Take a part off (at the car)'], ['X', 'Workshop (at the car)'], ['Q', 'Open / close a door (at the car)'], ['B', 'Build menu'], ['U', 'Upgrades'], ['M', 'Map'], ['I', 'Game index'], ['Esc', 'Menu']]],
  ['Driving', [['W / S', 'Throttle / brake-reverse'], ['A / D', 'Steer'], ['Space', 'Handbrake'], ['R', 'Reset'], ['C', 'Cab view'], ['E', 'Get out'], ['M', 'Map'], ['Esc', 'Menu']]],
  ['Building', [['Click / E', 'Build'], ['R', 'Rotate'], ['Wheel', 'Next in group'], ['[ ]', 'Previous / next piece'], [', .', 'Previous / next category'], ['1-8', 'Hotbar'], ['N', 'Material'], ['V', 'Move a placed thing'], ['X', 'Take down (50% back)'], ['B', 'Build menu'], ['Q / Right-click', 'Put the build tool away']]],
];

/** every section: { id, label, view: 'grid'|'list', items: [{ id, name, icon?, price?, sub, tags, text, stats }] } */
function sections() {
  const build = BUILD_CATS.flatMap(c => BUILD_ITEMS.filter(b => b.cat === c)).map(b => ({
    id: 'b:' + b.id, name: b.name.replace(/ \(.*\)/, ''), icon: { id: b.id }, price: b.price, sub: b.cat,
    tags: [b.cat, b.struct ? 'Grid piece' : b.cut ? 'Wall cut' : ZONE[b.zone]], text: b.note || (b.struct ? PIECES[b.id]?.note : '') || '',
    stats: [['Full name', b.name], ...(b.struct ? MATERIALS.map(m => [m.name, $(piecePrice(b.id, m.id))]) : []), ...(b.len ? [['Length', `${b.len} m`]] : [])],
  }));
  const mats = MATERIALS.map(m => ({ id: 'm:' + m.id, name: m.name, icon: { id: 'wall', mat: m.id }, sub: `×${m.mult} price`, tags: ['Building material'], text: '',
    stats: [['Price multiplier', `×${m.mult}`], ...Object.keys(PIECES).map(k => [PIECES[k].name.replace(/ \(.*\)/, ''), $(piecePrice(k, m.id))])] }));
  const carParts = SECTIONS.flatMap(sec => parts.filter(p => sectionOfSlot(p.slot) === sec.id).map(p => ({
    id: 'p:' + p.id, name: p.label, price: priceOf('part', p.id), sub: `${sec.label} · ${slotLabel[p.slot] || p.slot}`, tags: [sec.label, slotLabel[p.slot] || p.slot],
    text: '', stats: [['Fits', fits(p)], ...Object.entries(p.labels || {}).map(([b, l]) => [`On the ${bodyById[b]?.label || b}`, l]),
      ...(p.perf?.topMph ? [['Top speed', `+${p.perf.topMph} mph`]] : []), ...(p.perf?.power ? [['Power', `+${Math.round((p.perf.power - 1) * 100)}%`]] : [])],
  })));
  const tires = [
    ...wheelSets.map(w => ({ id: 'w:' + w.id, name: w.label, price: w.id === 'stock' ? null : priceOf('wheel', w.id), sub: 'Tire set', tags: ['Tires'], text: w.grip?.note || '',
      stats: [...(w.grip ? Object.entries(w.grip.surf || {}).map(([k, v]) => [`Grip on ${k}`, `${Math.round(w.grip.mu * v * 100)}%`]) : []), ...Object.entries(w.labels || {}).map(([b, l]) => [`On the ${bodyById[b]?.label || b}`, l])] })),
    ...rims.map(r => ({ id: 'r:' + r.id, name: r.label, price: r.id === 'steel' ? null : priceOf('rim', r.id), sub: 'Rim style', tags: ['Rims'], text: '', stats: [['Style', r.style || r.id]] })),
  ];
  const bug = DEF.slots.map(s => ({ id: 's:' + s.id, name: s.name, sub: [FN[s.fn], s.tool && TOOL_NAME[s.tool]].filter(Boolean).join(' · ') || 'Bolt-on', tags: [DEF.name, ...(s.fn ? [FN[s.fn]] : [])], text: '',
    stats: [['Size', SIZE_NAME[s.size] || '-'], ...(s.tool ? [['Tool', TOOL_NAME[s.tool] || s.tool]] : []), ...(s.cover ? [['Behind', DEF.covers[s.cover]?.name]] : []), ...(s.after?.length ? [['Fits after', s.after.map(a => DEF.slots.find(x => x.id === a)?.name || a).join(', ')]] : [])] }));
  const vehicles = Object.values(VEHICLE_TYPES).map(v => ({ id: 'v:' + v.id, name: v.name, price: v.price ?? null, sub: v.kind === 'build' ? 'Your project car' : v.kind === 'truck' ? 'Truck' : 'Project', tags: ['Vehicle'], text: v.pitch || '',
    stats: [['Length', `${v.length} m`], ['Width', `${v.width} m`], ...Object.entries(v.condition || {}).map(([k, c]) => [k, `${c}%`]), ...Object.values(v.storage || {}).map(s => [`Storage: ${s.label}`, `${s.cap} (largest item: ${SIZE_NAME[s.max]})`])] }));
  const store = STORE_ITEMS.map(([what, name, price, note]) => ({ id: 'st:' + what, name, price, sub: note, tags: ["Dusty's corner store"], text: '', stats: [] }));
  const fab = RECIPES.map(r => ({ id: 'f:' + r.id, name: r.name, sub: `${r.scrap} scrap metal`, tags: ['Workbench'], text: r.note, stats: [['Scrap metal', r.scrap], ['Tools', r.tools.map(t => BUILD_ITEMS.find(b => b.id === t)?.name || t).join(' + ')]] }));
  const trailer = TRAILER_UPGRADES.map(u => ({ id: 't:' + u.id, name: u.name, price: u.price, sub: "Grandpa's trailer", tags: ["Grandpa's trailer"], text: u.note, stats: [] }));
  const jobs = JOBS.map(j => ({ id: 'j:' + j.id, name: j.title, price: j.pay, sub: j.who, tags: ['Customer job'], text: `“${j.ask}”`, stats: [['Customer', j.who], ['Needs', needName(j.need)], ['Pays', $(j.pay)]] }));
  const places = Object.values(BIOMES).map(b => ({ id: 'pl:' + b.name, name: b.name, sub: 'Area of Baja County', tags: ['Place'], text: '', stats: [] }));
  const finds = Object.values(CONTAINER_RULES).map(c => ({ id: 'c:' + c.label, name: c.label[0].toUpperCase() + c.label.slice(1), sub: 'Search it with E', tags: ['Container'], text: '', stats: [] }));
  const upgrades = UPGRADES.map(u => ({ id: 'u:' + u.id, name: u.name, price: u.prices[0], sub: `${u.zone === 'garage' ? 'Garage' : 'Yard'} · level ${upgradeLevel(u.id)}/${u.levels}`, tags: ['Upgrade (U)', u.zone === 'garage' ? 'Garage' : 'Yard'],
    text: u.notes[0], stats: u.notes.map((n, i) => [`Level ${i + 1}`, `${n} — $${u.prices[i]}`]) }));
  return [
    { id: 'build', label: 'Building', view: 'grid', items: build },
    { id: 'mats', label: 'Materials', view: 'grid', items: mats },
    { id: 'upgrades', label: 'Upgrades', view: 'list', items: upgrades },
    { id: 'bug', label: "The '71 Bug", view: 'list', items: bug },
    { id: 'parts', label: 'Car parts', view: 'list', items: carParts },
    { id: 'tires', label: 'Tires & rims', view: 'list', items: tires },
    { id: 'vehicles', label: 'Vehicles', view: 'list', items: vehicles },
    { id: 'store', label: 'Store & supplies', view: 'list', items: store },
    { id: 'fab', label: 'Fabrication', view: 'list', items: fab },
    { id: 'trailer', label: 'Trailer upgrades', view: 'list', items: trailer },
    { id: 'jobs', label: 'Customer jobs', view: 'list', items: jobs },
    { id: 'places', label: 'Places', view: 'list', items: places },
    { id: 'finds', label: 'Containers', view: 'list', items: finds },
    { id: 'controls', label: 'Controls', view: 'controls', items: [] },
  ];
}

export default function WikiPanel({ onClose }) {
  useGame();
  const all = React.useMemo(sections, []), total = all.reduce((n, s) => n + s.items.length, 0);
  const [sec, setSec] = React.useState('build'), [q, setQ] = React.useState(''), [sel, setSel] = React.useState(() => all[0].items[0]?.id || null);
  const query = q.trim().toLowerCase();
  const match = it => !query || [it.name, it.sub, it.text, ...it.tags, ...it.stats.flat()].some(t => String(t ?? '').toLowerCase().includes(query));
  const shownSecs = query ? all.filter(s => s.items.some(match)) : all.filter(s => s.id === sec);
  const cur = sel && all.flatMap(s => s.items).find(i => i.id === sel);
  return <div className="bm-overlay" onContextMenu={e => e.preventDefault()}><div className="bm wk">
    <header className="bm-head">
      <div className="bm-title"><span>INDEX</span><small>{total} entries</small></div>
      <label className="bm-search"><svg viewBox="0 0 16 16" width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.6" /></svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search everything…" spellCheck={false} /></label>
      <button className="bm-x" onClick={onClose} title="Close (Esc)">✕</button>
    </header>
    <div className="bm-body">
      <nav className="bm-cats wk-cats">{all.map(s => <button key={s.id} className={!query && s.id === sec ? 'on' : ''} onClick={() => { setSec(s.id); setQ(''); setSel(s.items[0]?.id || null); }}><span>{s.label}</span><em>{s.items.length || ''}</em></button>)}</nav>
      <section className="bm-list">{shownSecs.length ? shownSecs.map(s => { const items = s.items.filter(match);
        return <div key={s.id}><h4 className="bm-sec">{s.label}</h4>
          {s.view === 'controls' ? <div className="wk-controls">{CONTROLS.map(([g, list]) => <div key={g}><h5>{g}</h5>{list.map(([k, t]) => <div key={k + t} className="wk-key"><Key k={k} /><span>{t}</span></div>)}</div>)}</div>
            : s.view === 'grid' ? <div className="bm-grid">{items.map(it => <button key={it.id} className={`bm-tile${sel === it.id ? ' on' : ''}`} onClick={() => setSel(it.id)}>
              <Icon id={it.icon.id} mat={it.icon.mat} /><span className="bm-tname">{it.name}</span><span className="bm-tprice">{it.price != null ? $(it.price) : it.sub}</span></button>)}</div>
            : <div className="wk-rows">{items.map(it => <button key={it.id} className={`wk-row${sel === it.id ? ' on' : ''}`} onClick={() => setSel(it.id)}>
              <span><b>{it.name}</b><small>{it.sub}</small></span>{it.price != null && <em>{$(it.price)}</em>}</button>)}</div>}
        </div>; }) : <p className="bm-none">Nothing matches "{q}".</p>}</section>
      <aside className="bm-detail">{cur ? <>
        {cur.icon && <div className="bm-stage"><Icon id={cur.icon.id} mat={cur.icon.mat} cls="big" /></div>}
        <h3>{cur.name}</h3>
        <div className="bm-tags">{cur.tags.filter(Boolean).map(t => <span key={t}>{t}</span>)}</div>
        {cur.text && <p>{cur.text}</p>}
        {cur.stats.length > 0 && <dl className="wk-stats">{cur.stats.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>}
        {cur.price != null && <div className="bm-cost"><span>{cur.id.startsWith('j:') ? 'PAYS' : 'PRICE'}</span><b>{$(cur.price)}</b></div>}
      </> : <p className="wk-empty">Pick an entry to see its details.</p>}</aside>
    </div>
    <footer className="bm-foot"><span className="wk-foot">Everything in Baja County, straight from the game's data.</span><div className="bm-keys"><span><Key k="I" /> or <Key k="Esc" /> Close</span></div></footer>
  </div></div>;
}
