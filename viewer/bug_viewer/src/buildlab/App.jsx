// DEV Build Sandbox (buildlab.html): a 60 x 60 m grid where the WHOLE world is a blueprint designer (think Satisfactory's
// Blueprint Designer). Build with the game's real pieces and rules, compare against scale references, save designs (or a
// region of the world) as blueprints in a library, stamp them back down rotated, and export / import .baja-build.json files.
// Uses NO game state and never touches the game's save: see storageGuard.js. Its own storage: baja-buildlab-v1 (the world)
// and baja-buildlab-library-v1 (the blueprint library).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { PIECES, PIECE_IDS, MATERIALS, DEFAULT_MAT, nextMat, matName, piecePrice, supported } from '../worlds/structures.js';
import { STORAGE_KEY, LIBRARY_KEY, CATEGORIES, toDoc, docText, fromDoc, fileName, pieceKey, normRy, boundsOf, priceOf, countsOf, placeRel, extractRegion, toLibrary, libraryText, parseAny, uniqueName, gridOrigin } from './format.js';
import { removeWhy, snapPiece } from './rules.js';
import { Grid, Pieces, Interact, RegionBox, Measure } from './Scene.jsx';
import { isGarage, GARAGE_ID, GARAGE_NAME } from './garage.js';

const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const uid = () => Math.random().toString(36).slice(2, 10);
const deg = r => Math.round((normRy(r) * 180) / Math.PI);
const f2 = v => (Math.round(v * 100) / 100).toString();
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch { /* */ } t.remove(); return ok;
  }
}
const nameOf = id => (id === GARAGE_ID ? GARAGE_NAME : PIECES[id].name);
const SHORT = { foundation: 'Foundation', floor: 'Floor', roof: 'Roof', wall: 'Wall', windowWall: 'Window', door: 'Door', garageDoor: 'Garage door', pillar: 'Pillar' };
const MAT_SW = { sheet: '#c5d0d4', siding: '#e6dfcb', block: '#b4b1a8', stucco: '#d9c6a0', rusty: '#8a7a62' };

export default function App() {
  // ---------- world + meta (autosaved) ----------
  const init = useMemo(() => {
    const s = load(STORAGE_KEY, null), r = s?.doc ? fromDoc(s.doc) : null;
    return { pieces: r && !r.fatal ? r.pieces : [], meta: { name: 'My build', author: '', description: '', category: 'house', ...(r?.meta || {}), created: r?.meta?.created || new Date().toISOString() }, ui: s?.ui || {} };
  }, []);
  const [pieces, setPieces] = useState(init.pieces);
  const [meta, setMeta] = useState(init.meta);
  const hist = useRef({ past: [], future: [] });
  const [tool, setTool] = useState('build');
  const [sel, setSel] = useState(init.ui.sel || { id: 'foundation', mat: DEFAULT_MAT });
  const [flip, setFlip] = useState(false);
  const [moving, setMoving] = useState(null);      // { key, piece } picked up, not yet put down
  const [stamp, setStamp] = useState(null);        // { lid, name, rel, turns }
  const [selKeys, setSelKeys] = useState(() => new Set());
  const [region, setRegion] = useState(null);
  const [measure, setMeasure] = useState({ a: null, b: null });
  const [hover, setHover] = useState(null);
  const [toast, setToast] = useState(null);
  const [turns, setTurns] = useState(0);           // quarter turns of the garage ghost
  const [fine, setFine] = useState(init.ui.fine ?? true);
  const [tab, setTab] = useState(init.ui.tab || 'info');
  const [library, setLibrary] = useState(() => load(LIBRARY_KEY, { items: [] }).items || []);
  const [dialog, setDialog] = useState(null);      // import dialog
  const [pasted, setPasted] = useState('');
  const [saveForm, setSaveForm] = useState(null);
  const [editing, setEditing] = useState(null);    // lid being renamed
  const [confirmDel, setConfirmDel] = useState(null);
  const piecesRef = useRef(), fileRef = useRef(), ctl = useRef({});

  const say = useCallback((text, bad = false) => { setToast({ text, bad, t: Date.now() }); }, []);
  useEffect(() => { if (!toast) return; const h = setTimeout(() => setToast(null), 3200); return () => clearTimeout(h); }, [toast]);
  useEffect(() => { store(STORAGE_KEY, { doc: toDoc(pieces, meta), ui: { sel, fine, tab } }); }, [pieces, meta, sel, fine, tab]);
  useEffect(() => { if (!store(LIBRARY_KEY, { version: 1, items: library })) say('Could not save the library (browser storage full?)', true); }, [library]);
  useEffect(() => { setSelKeys(s => { const have = new Set(pieces.map(pieceKey)), n = new Set([...s].filter(k => have.has(k))); return n.size === s.size ? s : n; }); }, [pieces]);

  const commit = useCallback((next) => { hist.current.past.push(pieces); if (hist.current.past.length > 200) hist.current.past.shift(); hist.current.future = []; setPieces(next); }, [pieces]);
  const undo = () => { const h = hist.current; if (!h.past.length) return say('Nothing to undo'); h.future.push(pieces); setPieces(h.past.pop()); setMoving(null); say('Undo'); };
  const redo = () => { const h = hist.current; if (!h.future.length) return say('Nothing to redo'); h.past.push(pieces); setPieces(h.future.pop()); setMoving(null); say('Redo'); };

  const ghostSpec = moving ? { type: 'piece', id: moving.piece.id, mat: moving.piece.mat }   // (the garage is a 'piece' ghost too)
    : tool === 'build' ? { type: 'piece', id: sel.id, mat: sel.mat }
      : tool === 'stamp' && stamp ? { type: 'stamp', rel: stamp.rel, turns: stamp.turns, lid: stamp.lid } : null;

  // ---------- actions ----------
  const byKey = k => pieces.find(p => pieceKey(p) === k);
  const pickUp = k => {
    const p = byKey(k); if (!p) return;
    const why = removeWhy(p, pieces); if (why) return say(why, true);
    if (isGarage(p)) setTurns(Math.round(normRy(p.ry) / (Math.PI / 2)) % 4);
    else { const base = snapPiece(p.id, p.x, p.z).ry; setFlip(PIECES[p.id].kind === 'edge' && normRy(p.ry) !== base); }
    setMoving({ key: k, piece: p }); say(`Picked up: ${nameOf(p.id)}. Click to put it down, Esc puts it back.`);
  };
  const removeKeys = keys => {
    const rest = pieces.filter(p => !keys.has(pieceKey(p)));
    const orphan = rest.filter(p => !isGarage(p) && !supported(p.id, p.x, p.z, p.ry, rest));
    if (orphan.length) return say(`${orphan.length} piece(s) would be left with no foundation. Take the walls, floor and roof off first.`, true);
    commit(rest); say(`Removed ${keys.size} piece(s)`);
  };
  const place = g => {
    if (!g) return;
    if (g.why) return say(g.why, true);
    if (g.type === 'stamp') { commit([...pieces, ...g.abs]); say(`Stamped "${stamp.name}": ${g.abs.length} pieces (one undo step)`); return; }
    const np = g.id === GARAGE_ID ? { id: g.id, x: g.x, z: g.z, ry: g.ry } : { id: g.id, mat: g.mat, x: g.x, z: g.z, ry: g.ry };
    if (moving) { commit(pieces.map(p => (pieceKey(p) === moving.key ? np : p))); setMoving(null); say('Moved'); return; }
    commit([...pieces, np]);
  };
  ctl.current.onClick = e => {
    if (moving || tool === 'build') { if (!moving && e.shift && e.pieceKey) return pickUp(e.pieceKey); return place(e.ghost); }
    if (tool === 'stamp') return place(e.ghost);
    if (tool === 'select') { if (e.pieceKey) pickUp(e.pieceKey); return; }
    if (tool === 'region') {
      if (e.pieceKey && (e.ctrl || e.shift)) { setSelKeys(s => { const n = new Set(s); n.has(e.pieceKey) ? n.delete(e.pieceKey) : n.add(e.pieceKey); return n; }); setRegion(null); return; }
      setSelKeys(new Set()); setRegion(null); return;
    }
    if (tool === 'measure' && e.mpt) setMeasure(m => (!m.a || m.b ? { a: e.mpt, b: null } : { a: m.a, b: e.mpt }));
  };
  ctl.current.onRegion = r => { const inside = extractRegion(pieces, r); setRegion(r); setSelKeys(new Set(inside.map(pieceKey))); say(`Region: ${inside.length} piece(s) selected`); };
  ctl.current.onHover = setHover;
  Object.assign(ctl.current, { tool, ghostSpec, flip, turns, moving, pieces });

  const switchTool = t => { setMoving(null); if (t !== 'stamp') setStamp(null); if (t !== 'measure') setMeasure({ a: null, b: null }); setTool(t); };
  const startStamp = item => { setMoving(null); setStamp({ lid: item.lid, name: item.doc.name, rel: item.doc.pieces, turns: 0 }); setTool('stamp'); say(`Stamping "${item.doc.name}": R turns it 90°, click to place, Esc stops`); };

  // ---------- keys ----------
  const keyRef = useRef(); keyRef.current = e => {
    if (e.target.closest?.('input, textarea, select')) return;
    const c = e.code, ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && c === 'KeyZ') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (ctrl && c === 'KeyY') { e.preventDefault(); return redo(); }
    if (ctrl) return;
    if (/^Digit[1-9]$/.test(c)) { const id = c === 'Digit9' ? GARAGE_ID : PIECE_IDS[+c.slice(5) - 1]; if (id) { switchTool('build'); setSel(s => ({ ...s, id })); setFlip(false); } return; }
    if (c === 'BracketRight' || c === 'BracketLeft') { setSel(s => ({ ...s, mat: nextMat(s.mat, c === 'BracketRight' ? 1 : -1) })); return; }
    if (c === 'KeyR') { if (tool === 'stamp' && stamp && !moving) setStamp(s => ({ ...s, turns: (s.turns + 1) % 4 })); else if (ghostSpec?.id === GARAGE_ID) setTurns(t => (t + 1) % 4); else setFlip(f => !f); return; }
    if (c === 'Escape') { if (moving) { setMoving(null); say('Put it back'); } else if (tool === 'measure' && measure.a) setMeasure({ a: null, b: null }); else if (tool === 'region' && selKeys.size) { setSelKeys(new Set()); setRegion(null); } else switchTool('select'); return; }
    if (c === 'Delete' || c === 'Backspace') { e.preventDefault(); if (tool === 'region' && selKeys.size) return removeKeys(selKeys); if (hover?.key) return removeKeys(new Set([hover.key])); return; }
    if (c === 'KeyB') return switchTool('build');
    if (c === 'KeyV') return switchTool('select');
    if (c === 'KeyG') return switchTool('region');
    if (c === 'KeyM') return switchTool('measure');
  };
  useEffect(() => { const h = e => keyRef.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  // ---------- library ----------
  const selPieces = useMemo(() => pieces.filter(p => selKeys.has(pieceKey(p))), [pieces, selKeys]);
  const openSave = () => setSaveForm({ name: uniqueName(meta.name || 'Blueprint', library.map(i => i.doc.name)), description: '', category: meta.category || 'house', author: meta.author || '', scope: selPieces.length ? 'sel' : 'all' });
  const doSave = () => {
    const pcs = saveForm.scope === 'sel' ? selPieces : pieces; if (!pcs.length) return say('Nothing to save: build something (or select a region) first', true);
    let thumbnail = '';
    try { thumbnail = ctl.current.snapshot(new Set(pcs.map(pieceKey)), boundsOf(pcs)); } catch (e) { console.warn('thumbnail failed', e); }
    const name = uniqueName(saveForm.name.trim() || 'Blueprint', library.map(i => i.doc.name));
    const doc = toDoc(pcs, { ...saveForm, name, created: new Date().toISOString(), thumbnail });
    setLibrary(l => [{ lid: uid(), doc }, ...l]); setSaveForm(null); setMeta(m => ({ ...m, author: saveForm.author })); setTab('library');
    say(`Saved blueprint "${name}" (${pcs.length} pieces)`);
  };
  const addToLibrary = items => {
    setLibrary(l => { const names = l.map(i => i.doc.name), add = []; for (const it of items) { const name = uniqueName(it.meta.name || 'Imported', [...names, ...add.map(a => a.doc.name)]); add.push({ lid: uid(), doc: toDoc(it.pieces, { ...it.meta, name }) }); } return [...add, ...l]; });
  };
  const loadWorld = (pcs, m) => { setMoving(null); commit(pcs); if (m) setMeta(x => ({ ...x, ...m, thumbnail: undefined })); const b = boundsOf(pcs); if (pcs.length) ctl.current.lookAt?.((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2, Math.max(14, b.w + b.d)); };

  // ---------- import ----------
  const startImport = text => {
    const r = parseAny(text);
    if (r.fatal) { setDialog({ fatal: r.fatal, items: [], kind: r.kind }); return; }
    const clean = r.items.every(i => !i.fatal && !i.problems.length);
    if (clean && r.kind === 'library') { addToLibrary(r.items); setTab('library'); say(`Added ${r.items.length} blueprint(s) to the library`); return; }
    setDialog({ fatal: '', items: r.items, kind: r.kind, clean });
  };
  const readFile = e => { const f = e.target.files?.[0]; if (!f) return; f.text().then(startImport); e.target.value = ''; };

  // ---------- derived info ----------
  const all = useMemo(() => { const d = toDoc(pieces, meta); return { d, abs: boundsOf(pieces), counts: countsOf(pieces) }; }, [pieces, meta]);
  const hovered = hover?.key ? byKey(hover.key) : null;
  const shown = moving ? moving.piece : hovered;
  const g = hover?.ghost;
  const selBounds = selPieces.length ? boundsOf(selPieces) : null;
  if (typeof window !== 'undefined') window.__buildlab = { pieces, library, tool, stamp, selKeys: [...selKeys], hover, ctl: ctl.current, meta };

  return <div className="bl-root">
    <style>{CSS}</style>
    <Canvas shadows camera={{ position: [16, 18, 24], fov: 50, near: 0.1, far: 500 }} onContextMenu={e => e.preventDefault()}>
      <color attach="background" args={['#cfd8dc']} />
      <hemisphereLight args={['#f4f1ea', '#8a7f6a', 0.9]} />
      <directionalLight position={[18, 30, 12]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-camera-far={90} shadow-bias={-0.0004} />
      <Grid fine={fine} />
      <Pieces pieces={pieces} hideKey={moving?.key} groupRef={piecesRef} />
      {region && tool === 'region' && <RegionBox r={region} />}
      {selBounds && <RegionBox r={{ x0: selBounds.minX, z0: selBounds.minZ, x1: selBounds.maxX, z1: selBounds.maxZ }} color="#ffb43a" label={`${selPieces.length} selected · ${f2(selBounds.w)} x ${f2(selBounds.d)} m`} />}
      {tool === 'measure' && <Measure a={measure.a} b={measure.b} />}
      <Interact ctl={ctl} piecesRef={piecesRef} />
    </Canvas>

    {/* ---------- left: tools + palette ---------- */}
    <div className="bl-panel bl-left">
      <div className="bl-title">BUILD SANDBOX <span>DEV</span></div>
      <div className="bl-tools">
        {[['build', 'Build', 'B'], ['select', 'Pick up', 'V'], ['region', 'Region', 'G'], ['measure', 'Measure', 'M']].map(([t, l, k]) => <button key={t} className={tool === t ? 'on' : ''} onClick={() => switchTool(t)} data-tool={t}>{l}<kbd>{k}</kbd></button>)}
      </div>
      {tool === 'stamp' && stamp && <div className="bl-stampbar">Stamping <b>{stamp.name}</b> · {stamp.turns * 90}° <button onClick={() => setStamp(s => ({ ...s, turns: (s.turns + 1) % 4 }))}>R turn</button><button onClick={() => switchTool('select')}>Stop</button></div>}
      <div className="bl-sub">Pieces × materials <small>(price each)</small></div>
      <div className="bl-palette">
        <div className="bl-prow bl-phead"><span />{MATERIALS.map(m => <span key={m.id} title={m.name}><i style={{ background: MAT_SW[m.id] }} />{m.id}</span>)}</div>
        {PIECE_IDS.map((id, i) => <div key={id} className="bl-prow">
          <span title={PIECES[id].note}><kbd>{i + 1}</kbd>{SHORT[id] || id}</span>
          {MATERIALS.map(m => <button key={m.id} data-piece={id} data-mat={m.id} className={tool === 'build' && sel.id === id && sel.mat === m.id ? 'on' : ''} title={`${PIECES[id].name}, ${m.name}: $${piecePrice(id, m.id)}`} onClick={() => { switchTool('build'); setSel({ id, mat: m.id }); setFlip(false); }}>${piecePrice(id, m.id)}</button>)}
        </div>)}
        <div className="bl-prow bl-garagerow"><span title="The whole original building. Snaps so its walls sit on the game's grid lines; R turns it 90°."><kbd>9</kbd>Garage</span>
          <button data-piece="garage" className={tool === 'build' && sel.id === GARAGE_ID ? 'on' : ''} title={`${GARAGE_NAME}: the real building, as in the game. Build onto it with the game's rules.`} onClick={() => { switchTool('build'); setSel(s => ({ ...s, id: GARAGE_ID })); }}>Walt's garage + office wing{tool === 'build' && sel.id === GARAGE_ID ? ` · ${turns * 90}°` : ''}</button></div>
      </div>
      <div className="bl-toggles">
        <label><input type="checkbox" checked={fine} onChange={e => setFine(e.target.checked)} /> Fine 0.5 m grid</label>
      </div>
    </div>

    {/* ---------- right: info / library / file ---------- */}
    <div className="bl-panel bl-right">
      <div className="bl-tabs">{[['info', 'Info'], ['library', `Library (${library.length})`], ['file', 'World file']].map(([t, l]) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)} data-tab={t}>{l}</button>)}</div>

      {tab === 'info' && <div className="bl-body">
        <div className="bl-sub">{moving ? 'Picked up' : 'Under the mouse'}</div>
        {shown ? <table className="bl-kv"><tbody>
          <tr><td>piece</td><td><b>{shown.id}</b> · {nameOf(shown.id)}</td></tr>
          {!isGarage(shown) && <tr><td>material</td><td>{shown.mat} · {matName(shown.mat)}</td></tr>}
          {hover?.size && !moving && <tr><td>size (m)</td><td>{hover.size.map(f2).join(' × ')} <small>(x · y · z)</small></td></tr>}
          <tr><td>position</td><td>x {f2(shown.x)} · z {f2(shown.z)}</td></tr>
          <tr><td>rotation</td><td>{deg(shown.ry)}°</td></tr>
          {!isGarage(shown) && <tr><td>price</td><td>${piecePrice(shown.id, shown.mat)}</td></tr>}
        </tbody></table> : <p className="bl-dim">Nothing. Point at a placed piece.</p>}
        {g && <><div className="bl-sub">Ghost</div><table className="bl-kv"><tbody>
          {g.type === 'piece' ? <><tr><td>piece</td><td>{g.id}{g.id === GARAGE_ID ? '' : ` · ${g.mat}`}</td></tr><tr><td>at</td><td>x {f2(g.x)} · z {f2(g.z)} · {deg(g.ry)}°</td></tr></> : <><tr><td>blueprint</td><td>{stamp?.name} · {stamp?.turns * 90}°</td></tr><tr><td>origin</td><td>x {g.origin.x} · z {g.origin.z}</td></tr></>}
          <tr><td>status</td><td className={g.why ? 'bad' : 'ok'}>{g.why || 'can go here'}</td></tr>
        </tbody></table></>}
        {hover?.mpt && <p className="bl-dim">Measure point: {hover.mpt.map(f2).join(', ')}</p>}
        <div className="bl-sub">Whole build</div>
        <table className="bl-kv"><tbody>
          <tr><td>pieces</td><td><b>{pieces.length}</b> · ${priceOf(pieces)}</td></tr>
          <tr><td>by type</td><td>{Object.entries(all.counts).map(([k, n]) => `${n} ${k}`).join(', ') || '-'}</td></tr>
          <tr><td>footprint</td><td>{pieces.length ? <>x {f2(all.abs.minX)} → {f2(all.abs.maxX)} · z {f2(all.abs.minZ)} → {f2(all.abs.maxZ)}</> : '-'}</td></tr>
          <tr><td>size</td><td>{pieces.length ? `${f2(all.abs.w)} × ${f2(all.abs.d)} m, ${f2(all.abs.h)} m tall` : '-'}</td></tr>
          <tr><td>grid origin</td><td>{pieces.length ? `x ${all.d.origin.x} · z ${all.d.origin.z}` : '-'}</td></tr>
          {selPieces.length > 0 && <tr><td>selected</td><td>{selPieces.length} pieces · {f2(selBounds.w)} × {f2(selBounds.d)} m</td></tr>}
        </tbody></table>
      </div>}

      {tab === 'library' && <div className="bl-body">
        {!saveForm ? <div className="bl-row">
          <button className="bl-primary" onClick={openSave} data-act="save-bp">Save as blueprint…</button>
          <span className="bl-dim">{selPieces.length ? `${selPieces.length} selected (G to change)` : 'G = drag a region to save just part'}</span>
        </div> : <div className="bl-form">
          <label>Name <input value={saveForm.name} onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))} data-f="bp-name" /></label>
          <label>Category <select value={saveForm.category} onChange={e => setSaveForm(f => ({ ...f, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Author <input value={saveForm.author} onChange={e => setSaveForm(f => ({ ...f, author: e.target.value }))} /></label>
          <label>Description <textarea rows={2} value={saveForm.description} onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))} /></label>
          <div className="bl-row"><label><input type="radio" checked={saveForm.scope === 'sel'} disabled={!selPieces.length} onChange={() => setSaveForm(f => ({ ...f, scope: 'sel' }))} /> Selection ({selPieces.length})</label><label><input type="radio" checked={saveForm.scope === 'all'} onChange={() => setSaveForm(f => ({ ...f, scope: 'all' }))} /> Everything ({pieces.length})</label></div>
          <div className="bl-row"><button className="bl-primary" onClick={doSave} data-act="save-bp-go">Save</button><button onClick={() => setSaveForm(null)}>Cancel</button></div>
        </div>}
        <div className="bl-row">
          <button onClick={() => { if (!library.length) return say('The library is empty', true); const t = libraryText(toLibrary(library.map(i => i.doc), { author: meta.author })); download(fileName(`${meta.author || 'my'} blueprints`, 'baja-build-library'), t); }} data-act="export-lib">Export library</button>
          <button onClick={async () => { if (!library.length) return say('The library is empty', true); const ok = await copyText(libraryText(toLibrary(library.map(i => i.doc), { author: meta.author }))); say(ok ? 'Library copied as text' : 'Copy failed', !ok); }} data-act="copy-lib">Copy library as text</button>
        </div>
        <div className="bl-lib">
          {!library.length && <p className="bl-dim">No blueprints yet. Build something, then “Save as blueprint”.</p>}
          {library.map(item => { const d = item.doc; return <div key={item.lid} className={'bl-card' + (stamp?.lid === item.lid ? ' on' : '')} data-bp={d.name}>
            {d.thumbnail ? <img src={d.thumbnail} alt="" /> : <div className="bl-nothumb">no picture</div>}
            <div className="bl-cardtext">
              {editing === item.lid ? <input autoFocus defaultValue={d.name} onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null); }} onBlur={e => { const v = e.target.value.trim(); if (v && v !== d.name) setLibrary(l => l.map(i => (i.lid === item.lid ? { ...i, doc: { ...i.doc, name: uniqueName(v, l.filter(x => x.lid !== item.lid).map(x => x.doc.name)) } } : i))); setEditing(null); }} />
                : <b title={d.description}>{d.name}</b>}
              <small>{d.category} · {d.count} pcs · {f2(d.bounds.w)}×{f2(d.bounds.d)} m · ${d.price}{d.author ? ` · ${d.author}` : ''}</small>
              <div className="bl-cardbtns">
                <button className="bl-primary" onClick={() => startStamp(item)} data-act="stamp">Stamp</button>
                <button onClick={() => loadWorld(placeRel(d.pieces, d.origin), { name: d.name, description: d.description, category: d.category, author: d.author })} title="Replace the world with this blueprint, where it was designed (undo-able)">Load</button>
                <button onClick={() => setEditing(item.lid)}>Rename</button>
                <button onClick={() => setLibrary(l => [{ lid: uid(), doc: { ...d, name: uniqueName(`${d.name} copy`, l.map(i => i.doc.name)), created: new Date().toISOString() } }, ...l])}>Duplicate</button>
                <button onClick={() => download(fileName(d.name), docText(d))} data-act="export-bp">Export</button>
                <button onClick={async () => { const ok = await copyText(docText(d)); say(ok ? `Copied "${d.name}" as text` : 'Copy failed', !ok); }}>Copy</button>
                {confirmDel === item.lid ? <button className="bl-danger" onClick={() => { setLibrary(l => l.filter(i => i.lid !== item.lid)); setConfirmDel(null); if (stamp?.lid === item.lid) switchTool('select'); }}>Really delete</button>
                  : <button onClick={() => setConfirmDel(item.lid)}>Delete</button>}
              </div>
            </div>
          </div>; })}
        </div>
        <ImportBox pasted={pasted} setPasted={setPasted} startImport={startImport} fileRef={fileRef} readFile={readFile} hint="A blueprint or a whole library file. Blueprints go into the library (renamed on a name clash)." />
      </div>}

      {tab === 'file' && <div className="bl-body">
        <p className="bl-dim">The whole world as one blueprint file. Send the .json (or the copied text) to the owner.</p>
        <div className="bl-form">
          <label>Name <input value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} data-f="name" /></label>
          <label>Author <input value={meta.author} onChange={e => setMeta(m => ({ ...m, author: e.target.value }))} data-f="author" /></label>
          <label>Category <select value={meta.category} onChange={e => setMeta(m => ({ ...m, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Description <textarea rows={2} value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} /></label>
        </div>
        <div className="bl-row">
          <button className="bl-primary" onClick={() => download(fileName(meta.name), docText(toDoc(pieces, meta)))} data-act="export">Export .json</button>
          <button onClick={async () => { const ok = await copyText(docText(toDoc(pieces, meta))); say(ok ? 'Copied as text' : 'Copy failed (select the text in the box below instead)', !ok); setPasted(docText(toDoc(pieces, meta))); }} data-act="copy">Copy as text</button>
          <button className="bl-danger" onClick={() => { if (!pieces.length) return; setMoving(null); commit([]); say('Cleared (Ctrl+Z brings it back)'); }} data-act="clear">Clear world</button>
        </div>
        <ImportBox pasted={pasted} setPasted={setPasted} startImport={startImport} fileRef={fileRef} readFile={readFile} hint="A single blueprint can be loaded into the world (replacing it) or added to the library." />
      </div>}
    </div>

    {/* ---------- status, legend, toast ---------- */}
    {g?.why && <div className="bl-why">{g.why}</div>}
    {toast && <div className={'bl-toast' + (toast.bad ? ' bad' : '')} key={toast.t}>{toast.text}</div>}
    <div className="bl-legend">
      <b>Mouse</b> left: {tool === 'build' ? 'place (Shift: pick up)' : tool === 'select' ? 'pick up' : tool === 'region' ? 'drag a box (Ctrl: add/remove one piece)' : tool === 'measure' ? 'point A, then B' : 'place blueprint'} · right-drag: orbit · middle-drag: pan · wheel: zoom ·
      <b> Keys</b> WASD pan (Shift fast) · 1-8 piece, 9 garage · [ ] material · R {tool === 'stamp' || ghostSpec?.id === GARAGE_ID ? 'turn 90°' : 'flip wall/door'}{flip && tool !== 'stamp' && ghostSpec?.id !== GARAGE_ID ? ' (flipped)' : ''} · Del remove · Ctrl+Z / Ctrl+Y · Esc cancel · B V G M tools
    </div>

    {dialog && <div className="bl-modal"><div className="bl-dialog" data-dialog>
      <h3>Import</h3>
      {dialog.fatal ? <><p className="bad">{dialog.fatal}</p><div className="bl-row"><button onClick={() => setDialog(null)}>Close</button></div></> : <>
        {dialog.items.map((it, i) => <div key={i} className="bl-imp">
          <b>{it.name}</b> — {it.fatal ? <span className="bad">{it.fatal}</span> : <>{it.pieces.length} of {it.total} pieces valid</>}
          {!it.fatal && it.problems.length > 0 && <ul>{it.problems.slice(0, 40).map((p, j) => <li key={j}>{p}</li>)}{it.problems.length > 40 && <li>…and {it.problems.length - 40} more</li>}</ul>}
        </div>)}
        {(() => {
          const ok = dialog.items.filter(i => !i.fatal && i.pieces.length), partial = !dialog.clean;
          return <div className="bl-row">
            {dialog.kind === 'blueprint' && ok.length > 0 && <button className="bl-primary" data-act="import-world" onClick={() => { const it = ok[0]; loadWorld(it.pieces, it.meta); setDialog(null); setPasted(''); say(`Loaded "${it.name}": ${it.pieces.length} pieces (Ctrl+Z to undo)`); }}>{partial ? 'Load the valid pieces into the world' : 'Load into the world (replace)'}</button>}
            {ok.length > 0 && <button data-act="import-lib" onClick={() => { addToLibrary(ok); setDialog(null); setPasted(''); setTab('library'); say(`Added ${ok.length} blueprint(s) to the library`); }}>{partial ? `Add the valid part to the library (${ok.length})` : `Add to library (${ok.length})`}</button>}
            <button onClick={() => setDialog(null)}>Cancel</button>
          </div>;
        })()}
      </>}
    </div></div>}
  </div>;
}

function ImportBox({ pasted, setPasted, startImport, fileRef, readFile, hint }) {
  return <div className="bl-import">
    <div className="bl-sub">Import</div>
    <p className="bl-dim">{hint}</p>
    <div className="bl-row"><button onClick={() => fileRef.current?.click()} data-act="import-file">Load .json file…</button><input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={readFile} /></div>
    <textarea rows={5} placeholder="…or paste .baja-build.json text here" value={pasted} onChange={e => setPasted(e.target.value)} data-f="paste" spellCheck={false} />
    <div className="bl-row"><button onClick={() => pasted.trim() && startImport(pasted)} data-act="import-text">Import pasted text</button><button onClick={() => setPasted('')}>Clear box</button></div>
  </div>;
}

const CSS = `
html,body,#root{margin:0;height:100%;overflow:hidden;background:#cfd8dc;font-family:Barlow,system-ui,sans-serif;}
.bl-root{position:fixed;inset:0;}
.bl-root canvas{display:block;}
.bl-panel{position:absolute;z-index:20;top:10px;background:rgba(16,23,25,.9);color:#e7ecee;border-radius:8px;font-size:12.5px;box-shadow:0 4px 18px rgba(0,0,0,.3);max-height:calc(100% - 64px);overflow:auto;}
.bl-left{left:10px;width:330px;padding:10px;}
.bl-right{right:10px;width:360px;}
.bl-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;letter-spacing:.06em;margin-bottom:8px;}
.bl-title span{background:#d35400;color:#fff;border-radius:4px;padding:0 6px;font-size:13px;vertical-align:middle;}
.bl-panel button{background:#26343a;color:#e7ecee;border:1px solid #3b4d55;border-radius:5px;padding:4px 7px;font:inherit;cursor:pointer;}
.bl-panel button:hover{background:#31444c;}
.bl-panel button.on{background:#2f7a52;border-color:#55c98a;}
.bl-primary{background:#2a6fd6 !important;border-color:#5a95ee !important;}
.bl-danger{background:#7a2f26 !important;border-color:#b0483b !important;}
kbd{display:inline-block;margin-left:4px;padding:0 4px;border-radius:3px;background:#0b1012;color:#9fb3ba;font-size:10.5px;border:1px solid #33444b;font-family:inherit;}
.bl-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;}
.bl-sub{margin:10px 0 4px;color:#9fb3ba;text-transform:uppercase;letter-spacing:.08em;font-size:10.5px;font-weight:600;}
.bl-sub small{text-transform:none;letter-spacing:0;}
.bl-palette{display:grid;gap:2px;}
.bl-prow{display:grid;grid-template-columns:96px repeat(5,1fr);gap:2px;align-items:center;}
.bl-prow>span{white-space:nowrap;overflow:hidden;font-size:12px;}
.bl-prow>span kbd{margin:0 4px 0 0;}
.bl-prow button{padding:3px 0;font-size:11px;}
.bl-garagerow{grid-template-columns:96px 1fr;margin-top:4px;}
.bl-garagerow button{background:#4a3a22;border-color:#a0782f;}
.bl-phead span{font-size:10px;color:#9fb3ba;text-align:center;}
.bl-phead i{display:block;height:6px;border-radius:2px;margin:0 3px 2px;}
.bl-toggles{margin-top:10px;display:grid;gap:4px;}
.bl-toggles small,.bl-dim{color:#8ea2a9;}
.bl-dim{margin:4px 0;}
.bl-stampbar{margin-top:8px;padding:6px;background:#3a2f12;border:1px solid #b78a2a;border-radius:5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.bl-tabs{display:flex;gap:2px;padding:8px 8px 0;position:sticky;top:0;background:rgba(16,23,25,.98);}
.bl-tabs button{flex:1;border-bottom-left-radius:0;border-bottom-right-radius:0;}
.bl-body{padding:4px 10px 10px;}
.bl-kv{width:100%;border-collapse:collapse;}
.bl-kv td{padding:2px 4px;vertical-align:top;border-bottom:1px solid #22303500;}
.bl-kv td:first-child{color:#8ea2a9;width:78px;}
.ok{color:#6fe39a;} .bad{color:#ff8a7a;}
.bl-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0;}
.bl-form{display:grid;gap:5px;margin:6px 0;}
.bl-form label{display:grid;grid-template-columns:80px 1fr;align-items:center;gap:6px;}
.bl-form .bl-row label{display:flex;}
.bl-panel input:not([type]),.bl-panel select,.bl-panel textarea{background:#0b1012;color:#e7ecee;border:1px solid #33444b;border-radius:4px;padding:4px;font:inherit;width:100%;box-sizing:border-box;}
.bl-import textarea{font-family:Consolas,monospace;font-size:11px;}
.bl-lib{display:grid;gap:6px;margin-top:6px;}
.bl-card{display:grid;grid-template-columns:112px 1fr;gap:8px;background:#1d2a2f;border:1px solid #2c3d44;border-radius:6px;padding:6px;}
.bl-card.on{border-color:#e0b040;}
.bl-card img,.bl-nothumb{width:112px;height:70px;object-fit:cover;border-radius:4px;background:#0b1012;}
.bl-nothumb{display:flex;align-items:center;justify-content:center;color:#5d6f75;font-size:11px;}
.bl-cardtext{display:grid;gap:2px;min-width:0;}
.bl-cardtext b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bl-cardtext small{color:#8ea2a9;}
.bl-cardbtns{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;}
.bl-cardbtns button{padding:2px 5px;font-size:11px;}
.bl-legend{position:absolute;z-index:20;left:50%;transform:translateX(-50%);bottom:8px;background:rgba(16,23,25,.85);color:#dfe7ea;padding:6px 10px;border-radius:6px;font-size:12px;max-width:calc(100% - 40px);text-align:center;}
.bl-legend b{color:#fff;}
.bl-why{position:absolute;z-index:30;left:50%;transform:translateX(-50%);bottom:52px;background:rgba(122,47,38,.92);color:#fff;padding:5px 12px;border-radius:5px;font-size:13px;pointer-events:none;}
.bl-toast{position:absolute;z-index:30;left:50%;transform:translateX(-50%);top:12px;background:rgba(16,23,25,.92);color:#fff;padding:7px 14px;border-radius:6px;font-size:13px;pointer-events:none;}
.bl-toast.bad{background:rgba(122,47,38,.95);}
.bl-modal{position:absolute;z-index:40;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}
.bl-dialog{background:#101719;color:#e7ecee;border-radius:8px;padding:14px 18px;width:min(620px,92vw);max-height:80vh;overflow:auto;font-size:13px;}
.bl-dialog h3{margin:0 0 8px;font-family:'Barlow Condensed',sans-serif;font-size:20px;}
.bl-dialog ul{margin:4px 0 8px;padding-left:18px;color:#ffb0a4;font-size:12px;}
.bl-dialog button{background:#26343a;color:#e7ecee;border:1px solid #3b4d55;border-radius:5px;padding:5px 9px;font:inherit;cursor:pointer;}
.bl-imp{margin:6px 0;}
.bl-axis{font-size:11px;color:#3a3730;white-space:nowrap;pointer-events:none;user-select:none;font-weight:600;}
.bl-ax-x{color:#c0392b;font-size:14px;} .bl-ax-z{color:#2a6fd6;font-size:14px;} .bl-origin{color:#111;}
.bl-tag{background:rgba(16,23,25,.8);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;white-space:nowrap;pointer-events:none;user-select:none;}
.bl-tag-garage{background:rgba(160,64,0,.85);}
.bl-tag-region{background:rgba(42,111,214,.85);transform:translate(0,-130%);}
.bl-tag-measure{background:#ff2bd6;font-size:13px;font-weight:700;}
.bl-tag-measure small{display:block;font-weight:400;font-size:10.5px;}
`;
