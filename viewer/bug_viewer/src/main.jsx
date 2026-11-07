import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Grid, OrbitControls } from '@react-three/drei';
import DriveWorld from './DriveWorld.jsx';
import ProDrive from './ProDrive.jsx';
import ProDebug from './ProDebug.jsx';
import BuildModel from './BuildModel.jsx';
import {
  slots, bodies, wheelSets, parts, presets, PALETTE, SIZE, LIFT,
  defaultBuild, normalize, setBody, setWheels, setRim, rims, setPart, applyPreset, resolve,
  partState, partFile, wheelSetFits, labelFor, encodeBuild, decodeBuild, randomBuild, countBuilds,
} from './build.js';
import { game, useGame, owns, buy, say, newGame, buyCar, interact, addCash, priceOf, saveBuild, nameOf } from './game/store.js';
import { held, pickUp, dropHeld, loadHeld, takeFromCar, dropRemoved, boxAtShop, seedWorld, searchBox } from './game/items.js';
import { TitleScreen, PauseMenu, ShopPanel, HudOverlay, DealerPanel, RemovePanel, ContainerPanel, InventoryPanel } from './game/ui.jsx';
import { WALK_START } from './worlds/siteData.js';
import { spawns as TEST_SPAWNS } from './worlds/testcenter.js';
import { partById, SECTIONS, tireMax, bodyById, wheelById } from './build.js';
import './style.css';

const CAMERA_POSITION = [3.4, 2, 4.3];
const CAT_TITLES = { Body: 'BODY PANELS', Protection: 'BUMPERS & CAGE', Mechanical: 'ENGINE & SUSPENSION', Lighting: 'LIGHTING' };
const categories = [...new Set(slots.map(s => s.category))];
const fmt = n => n >= 1e15 ? n.toExponential(1).replace('e+', ' x 10^') : n >= 1e12 ? `${(n / 1e12).toFixed(1)} trillion` : n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion` : n.toLocaleString('en-US');

function CameraReset({ resetKey, cam }) {
  const { camera, controls } = useThree();
  useEffect(() => { camera.position.set(...(cam?.pos || CAMERA_POSITION)); controls?.target.set(...(cam?.target || [0, 0.8, 0])); controls?.update(); }, [camera, controls, resetKey, cam]);
  return null;
}

function Stage({ build, wireframe, autoRotate, resetKey, onSelect, showGrid, drive, pro, world, hud, cam }) {
  const r = useMemo(() => resolve(build), [build]);
  if (drive && pro) return <Canvas shadows key={`pro-${JSON.stringify(build)}`} camera={{ position: [0, 4, -12], fov: 60, near: 0.1, far: 900 }} dpr={[1, 2]}>
    <Suspense fallback={null}><ProDrive hud={hud} dims={r.dims} bodyId={build.body}><BuildModel build={build} wireframe={wireframe} drive /></ProDrive></Suspense>
  </Canvas>;
  if (drive) return <Canvas shadows key={`drive-${world}-${JSON.stringify(build)}`} camera={{ position: [0, 4, -16], fov: 60, near: 0.1, far: 700 }} dpr={[1, 2]}>
    <Suspense fallback={null}><DriveWorld hud={hud} dims={r.dims} worldId={world} bodyId={build.body}><BuildModel build={build} wireframe={wireframe} drive /></DriveWorld></Suspense>
  </Canvas>;
  return <Canvas key="view" shadows camera={{ position: CAMERA_POSITION, fov: 43, near: 0.05, far: 100 }} dpr={[1, 2]} onPointerMissed={() => onSelect(null)}>
    <color attach="background" args={['#172124']} />
    <ambientLight intensity={1.25} /><hemisphereLight args={['#e6e9d5', '#384348', 1.7]} />
    <directionalLight position={[5, 9, 4]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-4, 3, -4]} intensity={1.2} />
    <Suspense fallback={null}>
      <Environment resolution={128}>
        <Lightformer intensity={2} color="#fff2dc" position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 4, 1]} />
        <Lightformer intensity={1} position={[-4, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[6, 3, 1]} />
      </Environment>
      <BuildModel build={build} wireframe={wireframe} onSelect={onSelect} />
    </Suspense>
    {showGrid && <Grid position={[0, -0.035, 0]} args={[30, 30]} cellSize={0.5} sectionSize={2} cellColor="#546365" sectionColor="#748587" fadeDistance={22} fadeStrength={2} infiniteGrid />}
    <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={1.2} minDistance={2.7} maxDistance={18} maxPolarAngle={Math.PI / 2.05} target={[0, 0.8, 0]} />
    <CameraReset resetKey={resetKey} cam={cam} />
  </Canvas>;
}

const initialBuild = () => {
  const h = location.hash.slice(1);
  return (h && decodeBuild(h)) || normalize(defaultBuild());
};

function App() {
  useGame();
  const [build, setBuildRaw] = useState(initialBuild);
  const [wireframe, setWireframe] = useState(false), [spin, setSpin] = useState(false), [grid, setGrid] = useState(true);
  const buildRef = useRef(null);
  const [mode, setMode] = useState('title'), [play, setPlay] = useState({ kind: 'drive', world: 'test' }), [panel, setPanelState] = useState(null), [fs, setFs] = useState(false), hud = useRef(null), panelRef = useRef(null);
  const drive = mode === 'play', pro = drive && play.kind === 'pro', world = play.world;
  const setBuild = next => { if (mode === 'play') game.keepPose = true; setBuildRaw(next); };
  const setPanel = p => { panelRef.current = p; game.paused = p !== null; setPanelState(p); if (p && document.pointerLockElement) document.exitPointerLock(); };
  const resume = () => { setPanel(null); try { document.querySelector('canvas')?.requestPointerLock()?.catch?.(() => {}); } catch {} };
  const toggleFs = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch {} };
  const startPlay = (kind, w) => { Object.assign(game, { dev: true, onFoot: false, start: 'plaza', walkStart: null, walkPose: null, pose: null, target: null, fueled: false }); game.keepPose = false; game.prompt = ''; setPlay({ kind, world: w }); setMode('play'); setPanel(null); try { document.documentElement.requestFullscreen?.().catch?.(() => {}); } catch {} };
  const startStory = cont => {
    if (!cont) { newGame(); seedWorld(); setBuildRaw(normalize(defaultBuild())); } else if (game.build) setBuildRaw(normalize(game.build));
    Object.assign(game, { dev: false, onFoot: !cont, start: cont ? 'garage' : 'lot', walkStart: cont ? null : WALK_START, walkPose: null, pose: null, keepPose: false, prompt: '', target: null, fueled: false });
    setPlay({ kind: 'drive', world: 'test' }); setMode('play'); setPanel(null); try { document.documentElement.requestFullscreen?.().catch?.(() => {}); } catch {}
  };
  // the 3D scene is rebuilt when the car changes; keep the mouse captured through it
  const rebuild = nb => { game.rebuilding = true; update(nb); setTimeout(() => { game.rebuilding = false; try { document.querySelector('canvas')?.requestPointerLock()?.catch?.(() => {}); } catch {} }, 900); };
  const installHeld = () => {
    const it = held(); if (!it) return;
    const b = buildRef.current, bd = bodyById[b.body];
    if (it.kind === 'part' && partState(partById[it.id], bd) !== 'ok') return say("That doesn't fit this car.");
    if (it.kind === 'wheel' && !wheelSetFits(wheelById[it.id], b.body)) return say("Those don't fit this car.");
    const nb = it.kind === 'part' ? setPart(b, partById[it.id].slot, it.id) : it.kind === 'wheel' ? setWheels(b, it.id) : setRim(b, it.id);
    game.items = game.items.filter(x => x !== it); dropRemoved(b, nb);
    say(`Installed: ${nameOf(it.kind, it.id, b.body)}`); rebuild(nb);
  };
  const removePart = (kind, id) => {
    const b = buildRef.current, nb = kind === 'part' ? setPart(b, partById[id].slot, null) : kind === 'wheel' ? setWheels(b, 'stock') : setRim(b, 'steel');
    dropRemoved(b, nb); say(`Took off: ${nameOf(kind, id, b.body)} — it's on the floor.`); setPanel(null); rebuild(nb);
  };
  const buyBoxed = (kind, id) => { const c = priceOf(kind, id); if (game.cash < c) return; addCash(-c); boxAtShop(kind, id); say(`Bought: ${nameOf(kind, id, build.body)} — boxed at the pickup area outside the shop.`); };
  const worldInteract = id => {
    if (id === 'shop') setPanel('shop');
    else if (id === 'bug') setPanel('dealer');
    else if (id.startsWith('item:')) pickUp(+id.slice(5));
    else if (id.startsWith('box:')) { searchBox(id.slice(4)); setPanel(id); }
    else if (id === 'load') loadHeld();
    else if (id === 'install') installHeld();
    else if (id === 'bench') { if (game.dev) setPanel('garage'); else say('Workbench: parts get fitted by hand — grab them, bring them here. (Coming soon.)'); }
    else interact(id);
  };
  const toTitle = () => { setPanel(null); setMode('title'); game.prompt = ''; try { if (document.fullscreenElement) document.exitFullscreen(); } catch {} };
  const [resetKey, setResetKey] = useState(0), [selected, setSelected] = useState(null), [filter, setFilter] = useState('All');
  const [copied, setCopied] = useState(false), [channel, setChannel] = useState('paint'), [piecesOpen, setPiecesOpen] = useState(true);
  const r = useMemo(() => resolve(build), [build]);
  const { body, wheelSet } = r;
  const channels = [...(body.colorChannels || []), ...(r.tire ? [{ id: 'rim', label: 'Rims' }] : [])], activeChannel = channels.find(c => c.id === channel) || channels[0];
  const pieces = body.pieces || [], pieceCats = [...new Set(pieces.map(x => x.category))];
  const setColor = c => { const colors = { ...build.colors }; if (c) colors[activeChannel.id] = c; else delete colors[activeChannel.id]; setBuild({ ...build, colors }); };
  const togglePiece = id => setBuild({ ...build, hidden: build.hidden.includes(id) ? build.hidden.filter(h => h !== id) : [...build.hidden, id] });
  const update = next => { setBuild(next); setSelected(null); };
  useEffect(() => { const f = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); }, []);
  useEffect(() => {   // pause on Esc / lost pointer lock; E opens the shop when standing at it
    if (mode !== 'play') return;
    const lockChange = () => { if (!document.pointerLockElement && panelRef.current === null && !game.rebuilding) setPanel('pause'); };
    const key = e => {
      const p = panelRef.current;
      if (e.code === 'Escape') { if (p === null || p === 'shop' || p === 'garage') setPanel('pause'); else if (p === 'dealer' || p === 'inv' || p === 'remove' || p?.startsWith('box:')) resume(); }
      else if (e.code === 'Tab') { e.preventDefault(); if (p === 'inv') resume(); else if (p === null && game.onFoot) setPanel('inv'); }
      else if (p === null && game.onFoot && !e.repeat && e.code === 'KeyG') dropHeld();
      else if (p === null && game.onFoot && !e.repeat && e.code === 'KeyF') { if (game.nearCar) { if (held()) loadHeld(); else takeFromCar(); } }
      else if (p === null && game.onFoot && !e.repeat && e.code === 'KeyX' && game.nearCar && game.inGarage && !held()) setPanel('remove');
      else if (e.code === 'KeyE' && !e.repeat && p === null) { if (game.target) worldInteract(game.target); else if (game.prompt.startsWith('Press E')) setPanel('shop'); }
    };
    document.addEventListener('pointerlockchange', lockChange); window.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerlockchange', lockChange); window.removeEventListener('keydown', key); };
  }, [mode]);
  useEffect(() => {   // turning "unlock everything" off strips parts you do not own yet
    if (game.unlockAll) return;
    let b = build;
    for (const [slot, id] of Object.entries(build.parts)) if (!owns('part', id)) b = setPart(b, slot, null);
    if (!owns('wheel', b.wheels)) b = setWheels(b, 'stock');
    if (!owns('rim', b.rim)) b = setRim(b, 'steel');
    if (b !== build) setBuildRaw(b);
  }, [game.unlockAll]);
  const equip = (kind, id, equipOnly) => {
    if (!equipOnly) { if (!buy(kind, id)) return; say(game.dev ? 'Purchased!' : 'Purchased — it is yours now. Getting it onto the car is up to you.'); }
    if (!game.dev) return;   // outside testing, parts are fitted by hand, not by a menu
    update(kind === 'part' ? setPart(build, partById[id].slot, id) : kind === 'wheel' ? setWheels(build, id) : setRim(build, id));
  };
  const unequip = (kind, id) => update(kind === 'part' ? setPart(build, partById[id].slot, null) : kind === 'wheel' ? setWheels(build, 'stock') : setRim(build, 'steel'));
  const previewOf = (kind, id) => {
    if (kind === 'part') return setPart(build, partById[id].slot, id);
    if (kind === 'wheel') return setWheels(build, id);
    const nb = setRim(build, id);   // rims only show on Rugged tires: borrow one for the preview
    if (resolve(nb).tire) return nb;
    const w = wheelSets.find(x => wheelSetFits(x, body.id) && resolve(setWheels(nb, x.id)).tire);
    return w ? setWheels(nb, w.id) : nb;
  };
  useEffect(() => { buildRef.current = build; saveBuild(build); try { history.replaceState(null, '', `#${encodeBuild(build)}`); } catch {} }, [build]);

  const visibleSlots = slots.filter(s => (filter === 'All' || s.category === filter) && parts.some(p => p.slot === s.id && partState(p, body) !== 'hidden'));
  const active = r.active.length + (wheelSet.kind !== 'stock' ? 1 : 0);
  const bodyTotal = countBuilds(body.id), allTotal = countBuilds();
  const share = async () => {
    const url = `${location.origin}${location.pathname}#${encodeBuild(build)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { window.prompt('Copy this build link:', url); }
  };

  const sidebar = <aside className="sidebar">
      <header><span className="eyebrow">PROJECT: BAJA — VEHICLE ASSET LAB</span><h1>{body.label}</h1><p>{body.note}</p></header>
      <div className="scroll">
        <div className="section">
          <div className="section-title">BUILD <span>{fmt(allTotal)} possible</span></div>
          <div className="presets">
            <button className="primary" disabled={!game.unlockAll} onClick={() => update(randomBuild())}>Randomize</button>
            <button onClick={share}>{copied ? 'Link copied' : 'Copy build link'}</button>
          </div>
          <div className="presets">{presets.map(p => <button key={p.id} disabled={!game.unlockAll} onClick={() => update(applyPreset(p))}>{p.label}</button>)}</div>
        </div>

        <div className="section"><div className="section-title">BODY</div>
          <div className="presets">{bodies.map(b => <button key={b.id} className={build.body === b.id ? 'active' : ''} title={b.note} onClick={() => update(setBody(build, b.id))}>{b.label}</button>)}</div>
        </div>

        <div className="section"><div className="section-title">COLOUR</div>
          {channels.length > 1 && <div className="filters">{channels.map(c => <button key={c.id} className={activeChannel.id === c.id ? 'current' : ''} onClick={() => setChannel(c.id)}>{c.label}</button>)}</div>}
          <div className="swatches">
            {PALETTE.map(([c, name]) => <button key={name} className={`swatch${(build.colors[activeChannel.id] || null) === c ? ' on' : ''}`} title={name} style={c ? { background: c } : undefined} onClick={() => setColor(c)}>{c ? '' : '∅'}</button>)}
            <label className="swatch custom" title="Custom colour"><input type="color" value={build.colors[activeChannel.id] || '#888888'} onChange={e => setColor(e.target.value)} />+</label>
          </div>
        </div>

        <div className="section"><div className="section-title">TIRES</div>
          <div className="presets">{wheelSets.filter(w => wheelSetFits(w, body.id)).map(w => <button key={w.id} disabled={!owns('wheel', w.id)} title={owns('wheel', w.id) ? '' : 'Locked - find or buy it'} className={build.wheels === w.id ? 'active' : ''} onClick={() => update(setWheels(build, w.id))}>{labelFor(w, body.id)}</button>)}</div>
          {wheelSet.grip && <small className="hint">{wheelSet.grip.note}<br />Grip on dirt {Math.round(wheelSet.grip.mu * wheelSet.grip.surf.dirt * 100)}% · sand {Math.round(wheelSet.grip.mu * wheelSet.grip.surf.sand * 100)}% · rock {Math.round(wheelSet.grip.mu * wheelSet.grip.surf.rock * 100)}% · mud {Math.round(wheelSet.grip.mu * wheelSet.grip.surf.mud * 100)}%</small>}
          <Slider label="Tire size" value={build.wheelScale} {...SIZE} max={tireMax(build.lift)} disabled={!r.tire} unit="×" digits={2} onChange={v => setBuild({ ...build, wheelScale: v })} hint={!r.tire ? 'Pick a Rugged tire to resize' : null} />
          <Slider label="Lift" value={build.lift} {...LIFT} disabled={!r.liftable} unit=" m" digits={3} onChange={v => setBuild({ ...build, lift: v })} hint={!r.liftable ? 'Pick non-stock wheels to lift this body' : null} />
        </div>

        {r.tire && <div className="section"><div className="section-title">RIMS <span>{rims.length} styles</span></div>
          <div className="presets">{rims.map(x => <button key={x.id} disabled={!owns('rim', x.id)} title={owns('rim', x.id) ? '' : 'Locked - find or buy it'} className={build.rim === x.id ? 'active' : ''} onClick={() => update(setRim(build, x.id))}>{x.label}</button>)}</div>
          <small className="hint">Colour them under COLOUR → Rims</small></div>}
        {!r.tire && <div className="section"><div className="section-title">RIMS</div><small className="hint">Pick a Rugged tire to choose separate rim styles</small></div>}

        {pieces.length > 0 && <div className="section pieces"><div className="section-title">BODY PIECES <span>{pieces.length - build.hidden.length}/{pieces.length} on</span></div>
          <div className="filters"><button onClick={() => setPiecesOpen(o => !o)}>{piecesOpen ? 'Collapse' : 'Expand'}</button><button onClick={() => update({ ...build, hidden: [] })}>Show all</button><button onClick={() => update({ ...build, hidden: pieces.map(x => x.id) })}>Hide all</button></div>
          {piecesOpen && pieceCats.map(cat => <div key={cat} className="piece-group"><small>{cat}</small>
            {pieces.filter(x => x.category === cat).map(x => <label key={x.id} className="piece"><input type="checkbox" checked={!build.hidden.includes(x.id)} onChange={() => togglePiece(x.id)} /><span>{x.label}</span></label>)}</div>)}
        </div>}

        {SECTIONS.map(sec => {
          const catSlots = slots.filter(s => sec.slots.includes(s.id) && parts.some(p => p.slot === s.id && partState(p, body) !== 'hidden'));
          if (!catSlots.length) return null;
          return <div key={sec.id} className="section"><div className="section-title">{sec.label.toUpperCase()}</div>
            <div className="slots">{catSlots.map(s => {
              const opts = parts.filter(p => p.slot === s.id && partState(p, body) !== 'hidden');
              return <label key={s.id} className="slot"><span><strong>{s.label}</strong></span>
                <select value={build.parts[s.id] || ''} onChange={e => update(setPart(build, s.id, e.target.value || null))}>
                  <option value="">None</option>
                  {opts.map(p => <option key={p.id} value={p.id} disabled={partState(p, body) !== 'ok' || !owns('part', p.id)}>{labelFor(p, body.id)}{partState(p, body) !== 'ok' ? ' — refit needed' : owns('part', p.id) ? '' : ' — locked'}</option>)}
                </select></label>;
            })}</div></div>;
        })}
        {visibleSlots.length === 0 && <p className="empty">No separate parts for this body — its cage, rack and engine are part of the shell.</p>}
      </div>
      <div className="aside-foot">{fmt(bodyTotal)} builds for this body · add pieces by dropping a GLB + a catalog entry<br />Model units: meters · +Z forward</div>
    </aside>;

  const stageEl = <Stage build={build} drive={drive} pro={pro} world={world} hud={hud} wireframe={wireframe} autoRotate={spin || mode === 'title'} showGrid={grid && mode !== 'title'} resetKey={resetKey} onSelect={setSelected} />;
  if (mode === 'title') return <div className="full">{stageEl}<TitleScreen onNew={() => startStory(false)} onContinue={() => startStory(true)} onDev={(k, w) => (k === 'garage' ? setMode('garage') : startPlay(k, w))} /></div>;
  if (mode === 'play') return <div className="full">
    {stageEl}
    <div className="hud"><div ref={hud} className="speed">0 km/h</div></div>
    {game.onFoot && <div className="crosshair" />}
    <div className="hud-keys">{game.onFoot ? 'WASD walk · Shift run · Mouse look · E interact · Tab inventory · F car storage · G put down · Esc menu' : `W/S throttle · A/D steer · Space brake · R reset · C ${body.cabLabel || 'cab view'} · E interact / get out · Esc menu${pro ? ' · Gamepad ok' : ''}`}</div>
    <HudOverlay />
    {pro && <ProDebug />}
    {panel === 'pause' && <PauseMenu onResume={resume} onCustomize={() => setPanel('garage')} onExit={toTitle} fullscreen={fs} onFullscreen={toggleFs}
      teleports={play.kind === 'drive' && play.world === 'test' ? TEST_SPAWNS : []} onTeleport={k => { resume(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit' + k })); }} />}
    {panel === 'shop' && <ShopPanel bodyId={body.id} build={build} story={!game.dev} onBuy={game.dev ? equip : buyBoxed} onUnequip={unequip} onClose={resume} previewOf={previewOf} renderPreview={(pb, close) => <Stage build={pb} cam={close ? { pos: [2.3, 0.9, 3.0], target: [0, 0.45, 0.5] } : null} autoRotate showGrid={false} resetKey={0} onSelect={() => {}} />} />}
    {panel === 'dealer' && <DealerPanel onBuy={() => { if (buyCar('bug', 1800)) say("Al: 'She's yours. Keys are in the ignition. Probably.'"); }} onDrive={() => { interact('enter'); resume(); }} onClose={resume} />}
    {panel?.startsWith('box:') && <ContainerPanel id={panel.slice(4)} onClose={resume} />}
    {panel === 'inv' && <InventoryPanel onClose={resume} />}
    {panel === 'remove' && <RemovePanel build={build} onRemove={removePart} onClose={resume} />}
    {panel === 'garage' && <div className="drawer">{sidebar}<button className="drawer-close" onClick={resume}>Done - resume driving</button></div>}
  </div>;

  return <div className="shell">
    {sidebar}

    <main className="main">
      <div className="topbar"><div><strong>3D VEHICLE VIEW</strong><span>Drag rotate · Scroll zoom · Right-click pan · Click mesh inspect</span></div>
        <div className="toolbar">
          <button className="primary" onClick={() => startPlay('drive', 'test')}>▶ Play</button>
          <button onClick={() => setMode('title')}>Title screen</button>
          <button onClick={() => setResetKey(k => k + 1)}>Reset camera</button>
          <button className={spin ? 'toggled' : ''} onClick={() => setSpin(s => !s)}>Auto rotate</button>
          <button className={wireframe ? 'toggled' : ''} onClick={() => setWireframe(w => !w)}>Wireframe</button>
          <button className={grid ? 'toggled' : ''} onClick={() => setGrid(g => !g)}>Grid</button>
        </div></div>
      <div className="viewport">
        {stageEl}
        <div className="view-label">{body.label.toUpperCase()} <span>GARAGE</span></div>
      </div>
      <div className="details">
        <div><span className="eyebrow">MESH INSPECTOR</span>{selected ? <><h2>{selected.sourceName || selected.name}</h2><p>Node: {selected.name} · Source: {selected.asset}.glb</p><div className="statline"><span>{selected.triangles.toLocaleString()} tris</span><span>Bounds {selected.size.join(' × ')} m</span></div></> : <><h2>Select a component</h2><p>Click any visible mesh to inspect its name, source and dimensions.</p></>}</div>
        <div className="status"><span className="eyebrow">THIS BUILD</span><strong>{active} fitted</strong><p>{wheelSet.kind === 'stock' ? 'Stock wheels' : labelFor(wheelSet, body.id)}{r.tire ? ` · ${build.wheelScale.toFixed(2)}×` : ''}{r.lift ? ` · +${(r.lift * 100).toFixed(0)} cm` : ''}</p><small>{fmt(bodyTotal)} variations on this body, {fmt(allTotal)} across the catalog. Copy the build link to share it.</small></div>
      </div>
    </main>
  </div>;
}

function Slider({ label, value, min, max, step, unit, digits, disabled, hint, onChange }) {
  return <div className={`slider${disabled ? ' off' : ''}`} title={hint || ''}>
    <div><span>{label}</span><b>{value.toFixed(digits)}{unit}</b></div>
    <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(+e.target.value)} />
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
