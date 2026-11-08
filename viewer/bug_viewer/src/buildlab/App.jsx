// DEV Build Sandbox (buildlab.html): an EMPTY 60 x 60 m world to build in with the game's real pieces and rules, in two views:
//   GAME FEEL (default): first-person walker + the game's own build menu / build HUD / hotbar (game/BuildMenu.jsx, hud.css).
//   CREATOR: orbit / top-down camera with the grid, plus region select, measure, info.
// Blueprint library (save a region, stamp it as one ghost, undo), export / import of .baja-build.json: reachable in BOTH views.
// Uses no game progress and never touches the game's save: see storageGuard.js. Own storage: baja-buildlab-v1 (the world) and
// baja-buildlab-library-v1 (the blueprint library).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PIECES, MATERIALS, DEFAULT_MAT, nextMat, matName, piecePrice, supported } from '../worlds/structures.js';
import { StructureModel } from '../worlds/StructureModels.jsx';
import IconBaker from '../worlds/IconBaker.jsx';
import { game, useGame, say, emit } from '../game/store.js';
import { buildById, hotbar, nextInCat } from '../game/home.js';
import { BuildMenu, BuildHud, Key, Icon } from '../game/BuildMenu.jsx';
import { STORAGE_KEY, LIBRARY_KEY, CATEGORIES, toDoc, docText, fromDoc, fileName, pieceKey, normRy, boundsOf, priceOf, countsOf, placeRel, extractRegion, toLibrary, libraryText, parseAny, uniqueName } from './format.js';
import { removeWhy, snapPiece } from './rules.js';
import { Grid, Pieces, Interact, Helpers, RegionBox, Measure } from './Scene.jsx';
import Walk from './Walk.jsx';
import GarageModel from './GarageModel.jsx';
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
const IconModel = ({ id, mat }) => (id === GARAGE_ID ? <GarageModel /> : <StructureModel id={id} mat={mat} />);
const setBM = patch => { game.buildMode = { ...(game.buildMode || {}), ...patch }; emit(); };
const releaseMouse = () => { try { document.exitPointerLock?.(); } catch { /* */ } };

export default function App() {
  useGame();
  // ---------- world + meta (autosaved) ----------
  const init = useMemo(() => {
    const s = load(STORAGE_KEY, null), r = s?.doc ? fromDoc(s.doc) : null;
    return { pieces: r && !r.fatal ? r.pieces : [], meta: { name: 'My build', author: '', description: '', category: 'house', ...(r?.meta || {}), created: r?.meta?.created || new Date().toISOString() }, ui: s?.ui || {} };
  }, []);
  const [pieces, setPieces] = useState(init.pieces);
  const [meta, setMeta] = useState(init.meta);
  const hist = useRef({ past: [], future: [] });
  const [mode, setMode] = useState('game');           // 'game' | 'creator'
  const [panel, setPanel] = useState(null);           // null | 'build' | 'files'
  const [filesTab, setFilesTab] = useState('library');
  const [tool, setTool] = useState('build');          // build | select | region | measure | stamp
  const [flip, setFlip] = useState(false);
  const [moving, setMoving] = useState(null);         // { key, piece } picked up, not yet put down
  const [stamp, setStamp] = useState(null);           // { lid, name, rel, turns }
  const [selKeys, setSelKeys] = useState(() => new Set());
  const [region, setRegion] = useState(null);
  const [measure, setMeasure] = useState({ a: null, b: null });
  const [hover, setHover] = useState(null);
  const [turns, setTurns] = useState(0);              // quarter turns of the garage ghost
  const [fine, setFine] = useState(init.ui.fine ?? true);
  const [locked, setLocked] = useState(false);
  const [library, setLibrary] = useState(() => load(LIBRARY_KEY, { items: [] }).items || []);
  const [dialog, setDialog] = useState(null);         // import dialog
  const [pasted, setPasted] = useState('');
  const [saveForm, setSaveForm] = useState(null);
  const [editing, setEditing] = useState(null);       // lid being renamed
  const [confirmDel, setConfirmDel] = useState(null);
  const piecesRef = useRef(), fileRef = useRef(), ctl = useRef({}), prevBM = useRef(null);

  useEffect(() => { store(STORAGE_KEY, { doc: toDoc(pieces, meta), ui: { fine } }); }, [pieces, meta, fine]);
  useEffect(() => { if (!store(LIBRARY_KEY, { version: 1, items: library })) say('Could not save the library (browser storage full?)'); }, [library]);
  useEffect(() => { setSelKeys(s => { const have = new Set(pieces.map(pieceKey)), n = new Set([...s].filter(k => have.has(k))); return n.size === s.size ? s : n; }); }, [pieces]);

  const commit = useCallback((next) => { hist.current.past.push(pieces); if (hist.current.past.length > 200) hist.current.past.shift(); hist.current.future = []; setPieces(next); }, [pieces]);
  const endMove = () => { setMoving(null); game.buildMode = prevBM.current; prevBM.current = null; emit(); };
  const undo = () => { const h = hist.current; if (!h.past.length) return say('Nothing to undo'); h.future.push(pieces); setPieces(h.past.pop()); if (moving) endMove(); say('Undo'); };
  const redo = () => { const h = hist.current; if (!h.future.length) return say('Nothing to redo'); h.past.push(pieces); setPieces(h.future.pop()); if (moving) endMove(); say('Redo'); };

  const bm = game.buildMode;
  const ghostSpec = moving ? { type: 'piece', id: moving.piece.id, mat: moving.piece.mat }
    : tool === 'build' && bm?.item ? { type: 'piece', id: bm.item, mat: bm.mat || DEFAULT_MAT }
      : tool === 'stamp' && stamp ? { type: 'stamp', rel: stamp.rel, turns: stamp.turns, lid: stamp.lid } : null;

  // ---------- actions ----------
  const byKey = k => pieces.find(p => pieceKey(p) === k);
  const pickUp = k => {
    const p = byKey(k); if (!p) return;
    const why = removeWhy(p, pieces); if (why) return say(why);
    if (isGarage(p)) setTurns(Math.round(normRy(p.ry) / (Math.PI / 2)) % 4);
    else { const base = snapPiece(p.id, p.x, p.z).ry; setFlip(PIECES[p.id].kind === 'edge' && normRy(p.ry) !== base); }
    if (!moving) prevBM.current = game.buildMode;
    setTool('build'); setMoving({ key: k, piece: p }); game.buildMode = { item: p.id, mat: p.mat, ry: 0, moving: { key: k } }; emit();
    say(`Moving the ${nameOf(p.id).toLowerCase()}: click to set it down, B or Esc cancels`);
  };
  const removeKeys = keys => {
    const rest = pieces.filter(p => !keys.has(pieceKey(p)));
    const orphan = rest.filter(p => !isGarage(p) && !supported(p.id, p.x, p.z, p.ry, rest));
    if (orphan.length) return say('Take the walls, floor and roof off that foundation first.');
    commit(rest); say(`Took down ${keys.size} piece(s)`);
  };
  const place = g => {
    if (!g) return;
    if (g.why) return say(g.why);
    if (g.type === 'stamp') { commit([...pieces, ...g.abs]); say(`Stamped "${stamp.name}": ${g.abs.length} pieces (one undo step)`); return; }
    const np = g.id === GARAGE_ID ? { id: g.id, x: g.x, z: g.z, ry: g.ry } : { id: g.id, mat: g.mat, x: g.x, z: g.z, ry: g.ry };
    if (moving) { commit(pieces.map(p => (pieceKey(p) === moving.key ? np : p))); endMove(); say('Moved'); return; }
    commit([...pieces, np]); say(`Built: ${nameOf(np.id)}${np.mat ? `, ${matName(np.mat).toLowerCase()}` : ''}`);
  };
  const pickItem = (id, mat) => {
    setMoving(null); prevBM.current = null; setStamp(null); setTool('build'); setFlip(false); setPanel(null);
    game.buildMode = { item: id, mat: buildById[id].struct ? (mat || DEFAULT_MAT) : undefined, ry: 0 }; emit();
    setTimeout(() => ctl.current.relock?.(), 0);
  };
  const putAway = () => { if (moving) { endMove(); return say('Move cancelled: it stays where it was'); } if (tool === 'stamp') { switchTool('build'); return; } game.buildMode = null; emit(); say('Build tool put away'); };
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
  ctl.current.setLocked = setLocked;
  ctl.current.onCancel = putAway;
  ctl.current.onWheel = d => { const b = game.buildMode; if (b?.item && !b.moving && tool === 'build') setBM({ item: nextInCat(b.item, d), mat: buildById[nextInCat(b.item, d)].struct ? b.mat || DEFAULT_MAT : undefined }); };
  Object.assign(ctl.current, { tool, ghostSpec, flip, turns, moving, pieces, paused: panel !== null || !!dialog });

  const switchTool = t => { if (moving) endMove(); if (t !== 'stamp') setStamp(null); if (t !== 'measure') setMeasure({ a: null, b: null }); setTool(t); };
  const startStamp = item => { if (moving) endMove(); game.buildMode = null; emit(); setStamp({ lid: item.lid, name: item.doc.name, rel: item.doc.pieces, turns: 0 }); setTool('stamp'); setPanel(null); say(`Stamping "${item.doc.name}": R turns it 90°, click to place, Q stops`); setTimeout(() => ctl.current.relock?.(), 0); };
  const openPanel = (p, tab) => { releaseMouse(); if (tab) setFilesTab(tab); setPanel(p); };
  const toggleMode = () => { setMode(m => (m === 'game' ? 'creator' : 'game')); releaseMouse(); setHover(null); if (tool === 'region' || tool === 'measure') switchTool('build'); };

  // keep the game's build HUD in step with the ghost (valid / why, rotation)
  const gh = hover?.ghost;
  useEffect(() => {
    const b = game.buildMode; if (!b || tool === 'stamp') return;
    const why = gh?.why ?? '', ry = gh?.ry ?? b.ry;
    if (b.why !== why || b.ry !== ry) { game.buildMode = { ...b, why, ry }; emit(); }
  }, [gh?.why, gh?.ry, gh?.x, gh?.z, tool]);

  // ---------- keys ----------
  const keyRef = useRef(); keyRef.current = e => {
    if (e.target.closest?.('input, textarea, select')) return;
    const c = e.code, ctrl = e.ctrlKey || e.metaKey;
    if (c === 'Tab') { e.preventDefault(); if (!dialog) toggleMode(); return; }
    if (dialog) { if (c === 'Escape') setDialog(null); return; }
    if (panel === 'build') { if (c === 'Escape' || c === 'KeyB') { setPanel(null); setTimeout(() => ctl.current.relock?.(), 0); } return; }   // the menu handles its own 1-8 / N / Enter
    if (panel === 'files') { if (c === 'Escape') setPanel(null); return; }
    if (ctrl && c === 'KeyZ') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (ctrl && c === 'KeyY') { e.preventDefault(); return redo(); }
    if (ctrl) return;
    if (c === 'KeyB') { if (moving) return endMove(), say('Move cancelled: it stays where it was'); return openPanel('build'); }
    if (c === 'KeyL') return openPanel('files');
    const d = /^Digit([1-8])$/.exec(c);
    if (d) { if (moving) return; const h = hotbar()[+d[1] - 1]; if (h) { pickItem(h.id, h.mat || game.buildMode?.mat); say(buildById[h.id].name.replace(/ \(.*\)/, '')); } return; }
    if (c === 'KeyN') { const b = game.buildMode; if (b && buildById[b.item]?.struct && !moving) { setBM({ mat: nextMat(b.mat || DEFAULT_MAT, e.shiftKey ? -1 : 1) }); say(`Material: ${matName(game.buildMode.mat)}`); } else say('Materials are for building pieces: foundations, floors, walls, doors, roofs.'); return; }
    if (c === 'KeyR') { if (tool === 'stamp' && stamp && !moving) setStamp(s => ({ ...s, turns: (s.turns + 1) % 4 })); else if (ghostSpec?.id === GARAGE_ID) setTurns(t => (t + 1) % 4); else setFlip(f => !f); return; }
    if (c === 'KeyQ') return putAway();
    if (c === 'Escape') { if (moving) { endMove(); say('Move cancelled: it stays where it was'); } else if (tool === 'measure' && measure.a) setMeasure({ a: null, b: null }); else if (tool === 'region' && selKeys.size) { setSelKeys(new Set()); setRegion(null); } else if (tool === 'stamp') switchTool('build'); else if (tool !== 'build') switchTool('build'); return; }
    if (c === 'KeyX' || c === 'Delete' || c === 'Backspace') { e.preventDefault(); if (tool === 'region' && selKeys.size) return removeKeys(selKeys); if (hover?.key) return removeKeys(new Set([hover.key])); return; }
    if (c === 'KeyV') { if (moving) return; if (hover?.key) return pickUp(hover.key); return say('Nothing to move here: aim at a piece you built.'); }
    if (mode === 'creator') {
      if (c === 'KeyG') return switchTool('region');
      if (c === 'KeyM') return switchTool('measure');
    }
  };
  useEffect(() => { const h = e => keyRef.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  useEffect(() => { if (mode === 'creator') ctl.current.relock = null; }, [mode]);

  // ---------- library ----------
  const selPieces = useMemo(() => pieces.filter(p => selKeys.has(pieceKey(p))), [pieces, selKeys]);
  const openSave = () => setSaveForm({ name: uniqueName(meta.name || 'Blueprint', library.map(i => i.doc.name)), description: '', category: meta.category || 'house', author: meta.author || '', scope: selPieces.length ? 'sel' : 'all' });
  const doSave = () => {
    const pcs = saveForm.scope === 'sel' ? selPieces : pieces; if (!pcs.length) return say('Nothing to save: build something (or select a region in the creator view) first');
    let thumbnail = '';
    try { thumbnail = ctl.current.snapshot(new Set(pcs.map(pieceKey)), boundsOf(pcs)); } catch (e) { console.warn('thumbnail failed', e); }
    const name = uniqueName(saveForm.name.trim() || 'Blueprint', library.map(i => i.doc.name));
    const doc = toDoc(pcs, { ...saveForm, name, created: new Date().toISOString(), thumbnail });
    setLibrary(l => [{ lid: uid(), doc }, ...l]); setSaveForm(null); setMeta(m => ({ ...m, author: saveForm.author }));
    say(`Saved blueprint "${name}" (${pcs.length} pieces)`);
  };
  const addToLibrary = items => {
    setLibrary(l => { const names = l.map(i => i.doc.name), add = []; for (const it of items) { const name = uniqueName(it.meta.name || 'Imported', [...names, ...add.map(a => a.doc.name)]); add.push({ lid: uid(), doc: toDoc(it.pieces, { ...it.meta, name }) }); } return [...add, ...l]; });
  };
  const loadWorld = (pcs, m) => { if (moving) endMove(); commit(pcs); if (m) setMeta(x => ({ ...x, ...m, thumbnail: undefined })); const b = boundsOf(pcs); if (pcs.length) ctl.current.lookAt?.((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2, Math.max(14, b.w + b.d)); };

  // ---------- import / export ----------
  const startImport = text => {
    const r = parseAny(text);
    if (r.fatal) { setDialog({ fatal: r.fatal, items: [], kind: r.kind }); return; }
    const clean = r.items.every(i => !i.fatal && !i.problems.length);
    if (clean && r.kind === 'library') { addToLibrary(r.items); setFilesTab('library'); say(`Added ${r.items.length} blueprint(s) to the library`); return; }
    releaseMouse(); setDialog({ fatal: '', items: r.items, kind: r.kind, clean });
  };
  const readFile = e => { const f = e.target.files?.[0]; if (!f) return; f.text().then(startImport); e.target.value = ''; };
  const exportWorld = () => { if (!pieces.length) return say('Nothing to export yet: build something first'); download(fileName(meta.name), docText(toDoc(pieces, meta))); say(`Exported "${meta.name}" (${pieces.length} pieces)`); };

  // ---------- derived info ----------
  const all = useMemo(() => { const d = toDoc(pieces, meta); return { d, abs: boundsOf(pieces), counts: countsOf(pieces) }; }, [pieces, meta]);
  const hovered = hover?.key ? byKey(hover.key) : null;
  const shown = moving ? moving.piece : hovered;
  const selBounds = selPieces.length ? boundsOf(selPieces) : null;
  if (typeof window !== 'undefined') window.__buildlab = { pieces, library, tool, mode, panel, stamp, selKeys: [...selKeys], hover, ctl: ctl.current, meta, game };
  const gameMode = mode === 'game', bg = gameMode ? '#a9c6da' : '#cfd8dc';

  const hints = gameMode
    ? (stamp && tool === 'stamp' ? [['Click', 'Stamp'], ['R', 'Turn 90°'], ['Q', 'Stop'], ['Tab', 'Creator view'], ['L', 'Files']]
      : bm ? (bm.moving ? [['Click', 'Set down'], ['R', 'Rotate'], ['B', 'Cancel']] : [['Click', 'Build'], ['R', 'Rotate'], ['Wheel', 'Next in group'], ['1-8', 'Hotbar'], ['N', 'Material'], ['V', 'Move'], ['X', 'Remove'], ['B', 'Build menu'], ['Q', 'Put away'], ['Tab', 'Creator view'], ['L', 'Files']])
        : [['WASD', 'Walk'], ['Shift', 'Run'], ['B', 'Build menu'], ['V', 'Move'], ['X', 'Remove'], ['Tab', 'Creator view'], ['L', 'Files']])
    : [['Right-drag', 'Orbit'], ['Middle-drag', 'Pan'], ['Wheel', 'Zoom'], ['WASD', 'Pan'], ['Click', 'Place'], ['R', 'Rotate'], ['B', 'Build menu'], ['X', 'Remove'], ['V', 'Move'], ['Ctrl+Z', 'Undo'], ['Tab', 'Game view']];

  return <div className="bl-root full" data-mode={mode}>
    <style>{CSS}</style>
    <Canvas shadows camera={{ position: [0, 1.72, 10], fov: 70, near: 0.1, far: 500 }} onContextMenu={e => e.preventDefault()}>
      <color attach="background" args={[bg]} />
      <hemisphereLight args={['#f4f1ea', '#8a7f6a', 0.9]} />
      <directionalLight position={[18, 30, 12]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-camera-far={90} shadow-bias={-0.0004} />
      <Grid fine={fine && !gameMode} />
      <Pieces pieces={pieces} hideKey={moving?.key} groupRef={piecesRef} />
      {region && tool === 'region' && <RegionBox r={region} />}
      {selBounds && !gameMode && <RegionBox r={{ x0: selBounds.minX, z0: selBounds.minZ, x1: selBounds.maxX, z1: selBounds.maxZ }} color="#ffb43a" label={`${selPieces.length} selected · ${f2(selBounds.w)} x ${f2(selBounds.d)} m`} />}
      {tool === 'measure' && <Measure a={measure.a} b={measure.b} />}
      <Helpers ctl={ctl} piecesRef={piecesRef} />
      <IconBaker Model={IconModel} T={null} />
      {gameMode ? <Walk ctl={ctl} piecesRef={piecesRef} /> : <Interact ctl={ctl} piecesRef={piecesRef} />}
    </Canvas>

    {/* ---------- the game's HUD ---------- */}
    {gameMode && game.settings.crosshair && <div className={`xhair${bm ? ' build' : ''}${game.target ? ' hot' : ''}`}><i /></div>}
    {gameMode && !locked && !panel && !dialog && <div className="bl-lockhint"><Key k="Click" /> to look around. <Key k="Esc" /> lets go of the mouse.</div>}
    {panel !== 'build' && bm && tool !== 'stamp' && <BuildHud />}
    {panel !== 'build' && tool === 'stamp' && stamp && <div className="bh"><div className="bh-card">
      <span className="ic ph">BP</span>
      <div className="bh-info"><small>BLUEPRINT</small><b>{stamp.name}</b><span>{stamp.rel.length} pieces · {stamp.turns * 90}°</span></div>
      <div className={`bh-why ${gh?.why ? 'bad' : 'ok'}`}><i />{gh?.why || 'Click to stamp it down'}</div>
    </div></div>}
    {game.toast && <div className="hud-toast2"><i />{game.toast.msg}</div>}
    <div className={`hud-keys2${bm || stamp ? ' col' : ''}`}>{hints.map(([k, t]) => <span key={k + t}><Key k={k} />{t}</span>)}</div>

    {/* ---------- sandbox bar: both views ---------- */}
    <div className="bl-bar">
      <span className="bl-tag-dev">BUILD SANDBOX <em>DEV</em></span>
      <button onClick={toggleMode} data-act="mode" title="Tab">{gameMode ? 'Creator view' : 'Game view'} <Key k="Tab" /></button>
      <button onClick={() => openPanel('build')} data-act="menu">Build menu <Key k="B" /></button>
      <button onClick={() => openPanel('files', 'library')} data-act="files">Library ({library.length}) <Key k="L" /></button>
      <button onClick={exportWorld} data-act="export">Export</button>
      <button onClick={() => openPanel('files', 'file')} data-act="import">Import…</button>
    </div>

    {/* ---------- creator-only tools ---------- */}
    {!gameMode && <div className="bl-side">
      <h4>CREATOR TOOLS</h4>
      <div className="bl-tools">
        {[['build', 'Place', 'B'], ['select', 'Pick up', 'V'], ['region', 'Region', 'G'], ['measure', 'Measure', 'M']].map(([t, l, k]) => <button key={t} className={tool === t ? 'on' : ''} onClick={() => (t === 'build' ? (switchTool('build'), openPanel('build')) : switchTool(t))} data-tool={t}>{l} <Key k={k} /></button>)}
      </div>
      <label className="bl-check"><input type="checkbox" checked={fine} onChange={e => setFine(e.target.checked)} /> Fine 0.5 m grid</label>
      <h5>{moving ? 'Picked up' : 'Under the mouse'}</h5>
      {shown ? <table className="bl-kv"><tbody>
        <tr><td>piece</td><td><b>{nameOf(shown.id)}</b></td></tr>
        {!isGarage(shown) && <tr><td>material</td><td>{matName(shown.mat)}</td></tr>}
        {hover?.size && !moving && <tr><td>size (m)</td><td>{hover.size.map(f2).join(' × ')}</td></tr>}
        <tr><td>position</td><td>x {f2(shown.x)} · z {f2(shown.z)} · {deg(shown.ry)}°</td></tr>
        {!isGarage(shown) && <tr><td>price</td><td>${piecePrice(shown.id, shown.mat)}</td></tr>}
      </tbody></table> : <p className="bl-dim">Nothing. Point at a placed piece.</p>}
      {gh && <><h5>Ghost</h5><table className="bl-kv"><tbody>
        {gh.type === 'piece' ? <tr><td>at</td><td>x {f2(gh.x)} · z {f2(gh.z)} · {deg(gh.ry)}°</td></tr> : <tr><td>origin</td><td>x {gh.origin.x} · z {gh.origin.z}</td></tr>}
        <tr><td>status</td><td className={gh.why ? 'bad' : 'ok'}>{gh.why || 'can go here'}</td></tr>
      </tbody></table></>}
      {hover?.mpt && <p className="bl-dim">Measure point: {hover.mpt.map(f2).join(', ')}</p>}
      <h5>Whole build</h5>
      <table className="bl-kv"><tbody>
        <tr><td>pieces</td><td><b>{pieces.length}</b> · ${priceOf(pieces)}</td></tr>
        <tr><td>by type</td><td>{Object.entries(all.counts).map(([k, n]) => `${n} ${k}`).join(', ') || '-'}</td></tr>
        <tr><td>size</td><td>{pieces.length ? `${f2(all.abs.w)} × ${f2(all.abs.d)} m, ${f2(all.abs.h)} m tall` : '-'}</td></tr>
        {selPieces.length > 0 && <tr><td>selected</td><td>{selPieces.length} pieces · {f2(selBounds.w)} × {f2(selBounds.d)} m</td></tr>}
      </tbody></table>
      <p className="bl-dim">Region: drag a box (Ctrl-click adds one piece), then Library → Save as blueprint. Del removes the selection.</p>
    </div>}

    {/* ---------- the game's build menu ---------- */}
    {panel === 'build' && <BuildMenu onClose={() => { setPanel(null); setTimeout(() => ctl.current.relock?.(), 0); }} onPick={pickItem} />}

    {/* ---------- library / world file (both views) ---------- */}
    {panel === 'files' && <div className="bm-overlay" onContextMenu={e => e.preventDefault()}><div className="bl-files">
      <header><div className="bl-ftabs">{[['library', `Blueprint library (${library.length})`], ['file', 'World file: export / import']].map(([t, l]) => <button key={t} className={filesTab === t ? 'on' : ''} onClick={() => setFilesTab(t)} data-tab={t}>{l}</button>)}</div><button className="bm-x" onClick={() => setPanel(null)} title="Close (Esc)">✕</button></header>
      <div className="bl-fbody">
        {filesTab === 'library' && <>
          {!saveForm ? <div className="bl-row">
            <button className="bl-primary" onClick={openSave} data-act="save-bp">Save as blueprint…</button>
            <span className="bl-dim">{selPieces.length ? `${selPieces.length} selected in the creator view` : 'Creator view, Region tool (G): drag a box to save just part'}</span>
          </div> : <div className="bl-form">
            <label>Name <input value={saveForm.name} onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))} data-f="bp-name" /></label>
            <label>Category <select value={saveForm.category} onChange={e => setSaveForm(f => ({ ...f, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Author <input value={saveForm.author} onChange={e => setSaveForm(f => ({ ...f, author: e.target.value }))} /></label>
            <label>Description <textarea rows={2} value={saveForm.description} onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))} /></label>
            <div className="bl-row"><label className="bl-inl"><input type="radio" checked={saveForm.scope === 'sel'} disabled={!selPieces.length} onChange={() => setSaveForm(f => ({ ...f, scope: 'sel' }))} /> Selection ({selPieces.length})</label><label className="bl-inl"><input type="radio" checked={saveForm.scope === 'all'} onChange={() => setSaveForm(f => ({ ...f, scope: 'all' }))} /> Everything ({pieces.length})</label></div>
            <div className="bl-row"><button className="bl-primary" onClick={doSave} data-act="save-bp-go">Save</button><button onClick={() => setSaveForm(null)}>Cancel</button></div>
          </div>}
          <div className="bl-row">
            <button onClick={() => { if (!library.length) return say('The library is empty'); download(fileName(`${meta.author || 'my'} blueprints`, 'baja-build-library'), libraryText(toLibrary(library.map(i => i.doc), { author: meta.author }))); }} data-act="export-lib">Export library</button>
            <button onClick={async () => { if (!library.length) return say('The library is empty'); const ok = await copyText(libraryText(toLibrary(library.map(i => i.doc), { author: meta.author }))); say(ok ? 'Library copied as text' : 'Copy failed'); }} data-act="copy-lib">Copy library as text</button>
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
                  <button onClick={() => { loadWorld(placeRel(d.pieces, d.origin), { name: d.name, description: d.description, category: d.category, author: d.author }); setPanel(null); }} title="Replace the world with this blueprint, where it was designed (undo-able)">Load</button>
                  <button onClick={() => setEditing(item.lid)}>Rename</button>
                  <button onClick={() => setLibrary(l => [{ lid: uid(), doc: { ...d, name: uniqueName(`${d.name} copy`, l.map(i => i.doc.name)), created: new Date().toISOString() } }, ...l])}>Duplicate</button>
                  <button onClick={() => download(fileName(d.name), docText(d))} data-act="export-bp">Export</button>
                  <button onClick={async () => { const ok = await copyText(docText(d)); say(ok ? `Copied "${d.name}" as text` : 'Copy failed'); }}>Copy</button>
                  {confirmDel === item.lid ? <button className="bl-danger" onClick={() => { setLibrary(l => l.filter(i => i.lid !== item.lid)); setConfirmDel(null); if (stamp?.lid === item.lid) switchTool('build'); }}>Really delete</button>
                    : <button onClick={() => setConfirmDel(item.lid)}>Delete</button>}
                </div>
              </div>
            </div>; })}
          </div>
          <ImportBox pasted={pasted} setPasted={setPasted} startImport={startImport} fileRef={fileRef} readFile={readFile} hint="A blueprint or a whole library file. Blueprints go into the library (renamed on a name clash)." />
        </>}
        {filesTab === 'file' && <>
          <p className="bl-dim">The whole world as one blueprint file. Send the .json (or the copied text) to the owner.</p>
          <div className="bl-form">
            <label>Name <input value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} data-f="name" /></label>
            <label>Author <input value={meta.author} onChange={e => setMeta(m => ({ ...m, author: e.target.value }))} data-f="author" /></label>
            <label>Category <select value={meta.category} onChange={e => setMeta(m => ({ ...m, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Description <textarea rows={2} value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} /></label>
          </div>
          <div className="bl-row">
            <button className="bl-primary" onClick={exportWorld} data-act="export2">Export .json</button>
            <button onClick={async () => { const t = docText(toDoc(pieces, meta)); const ok = await copyText(t); say(ok ? 'Copied as text' : 'Copy failed (select the text in the box below instead)'); setPasted(t); }} data-act="copy">Copy as text</button>
            <button className="bl-danger" onClick={() => { if (!pieces.length) return; if (moving) endMove(); commit([]); say('Cleared (Ctrl+Z brings it back)'); }} data-act="clear">Clear world</button>
          </div>
          <ImportBox pasted={pasted} setPasted={setPasted} startImport={startImport} fileRef={fileRef} readFile={readFile} hint="A single blueprint can be loaded into the world (replacing it) or added to the library." />
        </>}
      </div>
    </div></div>}

    {dialog && <div className="bm-overlay" style={{ zIndex: 60 }}><div className="bl-files bl-dialog" data-dialog>
      <h3>Import</h3>
      {dialog.fatal ? <><p className="bad">{dialog.fatal}</p><div className="bl-row"><button onClick={() => setDialog(null)}>Close</button></div></> : <>
        {dialog.items.map((it, i) => <div key={i} className="bl-imp">
          <b>{it.name}</b> — {it.fatal ? <span className="bad">{it.fatal}</span> : <>{it.pieces.length} of {it.total} pieces valid</>}
          {!it.fatal && it.problems.length > 0 && <ul>{it.problems.slice(0, 40).map((p, j) => <li key={j}>{p}</li>)}{it.problems.length > 40 && <li>…and {it.problems.length - 40} more</li>}</ul>}
        </div>)}
        {(() => {
          const ok = dialog.items.filter(i => !i.fatal && i.pieces.length), partial = !dialog.clean;
          return <div className="bl-row">
            {dialog.kind === 'blueprint' && ok.length > 0 && <button className="bl-primary" data-act="import-world" onClick={() => { const it = ok[0]; loadWorld(it.pieces, it.meta); setDialog(null); setPanel(null); setPasted(''); say(`Loaded "${it.name}": ${it.pieces.length} pieces (Ctrl+Z to undo)`); }}>{partial ? 'Load the valid pieces into the world' : 'Load into the world (replace)'}</button>}
            {ok.length > 0 && <button data-act="import-lib" onClick={() => { addToLibrary(ok); setDialog(null); setPasted(''); setFilesTab('library'); setPanel('files'); say(`Added ${ok.length} blueprint(s) to the library`); }}>{partial ? `Add the valid part to the library (${ok.length})` : `Add to library (${ok.length})`}</button>}
            <button onClick={() => setDialog(null)}>Cancel</button>
          </div>;
        })()}
      </>}
    </div></div>}
  </div>;
}

function ImportBox({ pasted, setPasted, startImport, fileRef, readFile, hint }) {
  return <div className="bl-import">
    <h5>Import</h5>
    <p className="bl-dim">{hint}</p>
    <div className="bl-row"><button onClick={() => fileRef.current?.click()} data-act="import-file">Load .json file…</button><input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={readFile} /></div>
    <textarea rows={5} placeholder="…or paste .baja-build.json text here" value={pasted} onChange={e => setPasted(e.target.value)} data-f="paste" spellCheck={false} />
    <div className="bl-row"><button onClick={() => pasted.trim() && startImport(pasted)} data-act="import-text">Import pasted text</button><button onClick={() => setPasted('')}>Clear box</button></div>
  </div>;
}

// Look: the game's HUD tokens (hud.css: --hud-*), clipped corners, condensed caps. The sandbox's own bits only.
const CSS = `
html,body,#root{margin:0;height:100%;overflow:hidden;background:#a9c6da;font-family:var(--hud-font);}
.bl-root{position:fixed;inset:0;color:var(--hud-text);}
.bl-root canvas{display:block;}
.bl-bar{position:absolute;z-index:25;top:14px;left:50%;transform:translateX(-50%);display:flex;gap:6px;align-items:center;padding:6px 10px;background:var(--hud-bg);border:1px solid var(--hud-line);border-top:2px solid var(--hud-acc);clip-path:var(--cut);}
.bl-tag-dev{font:700 15px var(--hud-cond);letter-spacing:.16em;margin-right:6px;} .bl-tag-dev em{font-style:normal;background:var(--hud-acc);color:#1a1206;padding:0 5px;margin-left:4px;}
.bl-bar button,.bl-side button,.bl-files button{background:rgba(255,255,255,.05);color:var(--hud-text);border:1px solid var(--hud-line2);border-radius:0;padding:5px 10px;font:600 13px var(--hud-font);cursor:pointer;}
.bl-bar button:hover,.bl-side button:hover,.bl-files button:hover{border-color:var(--hud-acc);background:var(--hud-acc-soft);}
.bl-side button.on,.bl-ftabs button.on{border-color:var(--hud-acc);background:var(--hud-acc);color:#1a1206;} .bl-side button.on .kc{color:#1a1206;}
.bl-side{position:absolute;z-index:20;left:14px;top:70px;width:290px;max-height:calc(100% - 200px);overflow:auto;padding:12px 14px;background:var(--hud-bg2);border:1px solid var(--hud-line);border-top:2px solid var(--hud-acc);font-size:12.5px;clip-path:var(--cut);}
.bl-side h4{margin:0 0 8px;font:700 16px var(--hud-cond);letter-spacing:.18em;color:var(--hud-acc);}
.bl-side h5,.bl-files h5{margin:12px 0 5px;font:700 11px var(--hud-cond);letter-spacing:.18em;text-transform:uppercase;color:var(--hud-dim);}
.bl-tools{display:grid;grid-template-columns:1fr 1fr;gap:4px;}
.bl-check{display:flex;gap:6px;align-items:center;margin-top:8px;color:var(--hud-dim);}
.bl-kv{width:100%;border-collapse:collapse;} .bl-kv td{padding:2px 4px;vertical-align:top;} .bl-kv td:first-child{color:var(--hud-dim);width:70px;}
.ok{color:var(--hud-ok);} .bad{color:#ffb3a6;}
.bl-dim{color:var(--hud-dim);margin:4px 0;}
.bl-lockhint{position:absolute;z-index:18;left:50%;top:calc(50% + 70px);transform:translateX(-50%);padding:8px 16px;background:var(--hud-bg);border:1px solid var(--hud-line);font:600 14px var(--hud-font);pointer-events:none;}
.hud-keys2,.hud-toast2,.bh,.xhair,.hotbar{z-index:15;}
.bl-files{width:min(760px,94vw);max-height:88vh;display:flex;flex-direction:column;background:rgba(14,18,20,.97);border:1px solid var(--hud-line2);border-top:2px solid var(--hud-acc);font-size:13px;clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));}
.bl-files header{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--hud-line);}
.bl-ftabs{display:flex;gap:6px;} .bl-ftabs button{font:700 14px var(--hud-cond);letter-spacing:.1em;text-transform:uppercase;}
.bl-fbody{padding:8px 18px 18px;overflow:auto;}
.bl-dialog{padding:16px 20px;width:min(640px,92vw);overflow:auto;} .bl-dialog h3{margin:0 0 8px;font:700 24px var(--hud-cond);letter-spacing:.14em;text-transform:uppercase;}
.bl-dialog ul{margin:4px 0 8px;padding-left:18px;color:#ffb0a4;font-size:12px;} .bl-imp{margin:6px 0;}
.bl-primary{background:var(--hud-acc) !important;color:#1a1206 !important;border-color:var(--hud-acc) !important;}
.bl-danger{border-color:var(--hud-bad) !important;color:#ffb3a6 !important;}
.bl-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0;}
.bl-form{display:grid;gap:5px;margin:6px 0;} .bl-form label{display:grid;grid-template-columns:90px 1fr;align-items:center;gap:6px;} .bl-form label.bl-inl{display:flex;gap:6px;}
.bl-files input:not([type]),.bl-files select,.bl-files textarea{background:rgba(0,0,0,.35);color:var(--hud-text);border:1px solid var(--hud-line2);border-radius:0;padding:5px;font:inherit;width:100%;box-sizing:border-box;}
.bl-import textarea{font-family:Consolas,monospace;font-size:11px;}
.bl-lib{display:grid;gap:6px;margin-top:6px;}
.bl-card{display:grid;grid-template-columns:112px 1fr;gap:10px;background:var(--hud-tile);border:1px solid var(--hud-line);padding:6px;} .bl-card.on{border-color:var(--hud-acc);}
.bl-card img,.bl-nothumb{width:112px;height:70px;object-fit:cover;background:#0b1012;} .bl-nothumb{display:flex;align-items:center;justify-content:center;color:var(--hud-dim);font-size:11px;}
.bl-cardtext{display:grid;gap:2px;min-width:0;} .bl-cardtext b{font:700 16px var(--hud-cond);letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .bl-cardtext small{color:var(--hud-dim);}
.bl-cardbtns{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;} .bl-cardbtns button{padding:2px 7px;font-size:12px;}
.bl-axis{font-size:11px;color:#3a3730;white-space:nowrap;pointer-events:none;user-select:none;font-weight:600;}
.bl-ax-x{color:#c0392b;font-size:14px;} .bl-ax-z{color:#2a6fd6;font-size:14px;} .bl-origin{color:#111;}
.bl-tag{background:rgba(16,23,25,.8);color:#fff;font-size:11px;padding:2px 6px;white-space:nowrap;pointer-events:none;user-select:none;}
.bl-tag-region{background:rgba(42,111,214,.85);transform:translate(0,-130%);}
.bl-tag-measure{background:#ff2bd6;font-size:13px;font-weight:700;} .bl-tag-measure small{display:block;font-weight:400;font-size:10.5px;}
`;
