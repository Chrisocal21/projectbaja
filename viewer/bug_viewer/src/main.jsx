import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Grid, OrbitControls } from '@react-three/drei';
import DriveWorld from './DriveWorld.jsx';
import BuildModel from './BuildModel.jsx';
import {
  slots, bodies, wheelSets, parts, presets, PALETTE, SIZE, LIFT,
  defaultBuild, normalize, setBody, setWheels, setRim, rims, setPart, applyPreset, resolve,
  partState, partFile, wheelSetFits, labelFor, encodeBuild, decodeBuild, randomBuild, countBuilds,
} from './build.js';
import './style.css';

const CAMERA_POSITION = [3.4, 2, 4.3];
const CAT_TITLES = { Body: 'BODY PANELS', Protection: 'BUMPERS & CAGE', Mechanical: 'ENGINE & SUSPENSION', Lighting: 'LIGHTING' };
const categories = [...new Set(slots.map(s => s.category))];
const fmt = n => n >= 1e15 ? n.toExponential(1).replace('e+', ' x 10^') : n >= 1e12 ? `${(n / 1e12).toFixed(1)} trillion` : n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion` : n.toLocaleString('en-US');

function CameraReset({ resetKey }) {
  const { camera, controls } = useThree();
  useEffect(() => { camera.position.set(...CAMERA_POSITION); controls?.target.set(0, 0.8, 0); controls?.update(); }, [camera, controls, resetKey]);
  return null;
}

function Stage({ build, wireframe, autoRotate, resetKey, onSelect, showGrid, drive, hud }) {
  const r = useMemo(() => resolve(build), [build]);
  if (drive) return <Canvas shadows key={`drive-${JSON.stringify(build)}`} camera={{ position: [0, 4, -16], fov: 60, near: 0.1, far: 700 }} dpr={[1, 2]}>
    <Suspense fallback={null}><DriveWorld hud={hud} dims={r.dims}><BuildModel build={build} wireframe={wireframe} drive /></DriveWorld></Suspense>
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
    <CameraReset resetKey={resetKey} />
  </Canvas>;
}

const initialBuild = () => {
  const h = location.hash.slice(1);
  return (h && decodeBuild(h)) || normalize(defaultBuild());
};

function App() {
  const [build, setBuild] = useState(initialBuild);
  const [wireframe, setWireframe] = useState(false), [spin, setSpin] = useState(false), [grid, setGrid] = useState(true);
  const [drive, setDrive] = useState(false), hud = useRef(null);
  const [resetKey, setResetKey] = useState(0), [selected, setSelected] = useState(null), [filter, setFilter] = useState('All');
  const [copied, setCopied] = useState(false), [channel, setChannel] = useState('paint'), [piecesOpen, setPiecesOpen] = useState(true);
  const r = useMemo(() => resolve(build), [build]);
  const { body, wheelSet } = r;
  const channels = [...(body.colorChannels || []), ...(r.tire ? [{ id: 'rim', label: 'Rims' }] : [])], activeChannel = channels.find(c => c.id === channel) || channels[0];
  const pieces = body.pieces || [], pieceCats = [...new Set(pieces.map(x => x.category))];
  const setColor = c => { const colors = { ...build.colors }; if (c) colors[activeChannel.id] = c; else delete colors[activeChannel.id]; setBuild({ ...build, colors }); };
  const togglePiece = id => setBuild({ ...build, hidden: build.hidden.includes(id) ? build.hidden.filter(h => h !== id) : [...build.hidden, id] });
  const update = next => { setBuild(next); setSelected(null); };
  useEffect(() => { try { history.replaceState(null, '', `#${encodeBuild(build)}`); } catch {} }, [build]);

  const visibleSlots = slots.filter(s => (filter === 'All' || s.category === filter) && parts.some(p => p.slot === s.id && partState(p, body) !== 'hidden'));
  const active = r.active.length + (wheelSet.kind !== 'stock' ? 1 : 0);
  const bodyTotal = countBuilds(body.id), allTotal = countBuilds();
  const share = async () => {
    const url = `${location.origin}${location.pathname}#${encodeBuild(build)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { window.prompt('Copy this build link:', url); }
  };

  return <div className="shell">
    <aside className="sidebar">
      <header><span className="eyebrow">PROJECT: BAJA — VEHICLE ASSET LAB</span><h1>{body.label}</h1><p>{body.note}</p></header>
      <div className="scroll">
        <div className="section">
          <div className="section-title">BUILD <span>{fmt(allTotal)} possible</span></div>
          <div className="presets">
            <button className="primary" onClick={() => update(randomBuild())}>Randomize</button>
            <button onClick={share}>{copied ? 'Link copied' : 'Copy build link'}</button>
          </div>
          <div className="presets">{presets.map(p => <button key={p.id} onClick={() => update(applyPreset(p))}>{p.label}</button>)}</div>
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
          <div className="presets">{wheelSets.filter(w => wheelSetFits(w, body.id)).map(w => <button key={w.id} className={build.wheels === w.id ? 'active' : ''} onClick={() => update(setWheels(build, w.id))}>{labelFor(w, body.id)}</button>)}</div>
          {wheelSet.grip && <small className="hint">{wheelSet.grip.note}<br />Grip on dirt {Math.round(wheelSet.grip.mu * wheelSet.grip.surf.dirt * 100)}% · sand {Math.round(wheelSet.grip.mu * wheelSet.grip.surf.sand * 100)}% · rock {Math.round(wheelSet.grip.mu * wheelSet.grip.surf.rock * 100)}% · mud {Math.round(wheelSet.grip.mu * wheelSet.grip.surf.mud * 100)}%</small>}
          <Slider label="Tire size" value={build.wheelScale} {...SIZE} disabled={!r.tire} unit="×" digits={2} onChange={v => setBuild({ ...build, wheelScale: v })} hint={!r.tire ? 'Pick a Rugged tire to resize' : null} />
          <Slider label="Lift" value={build.lift} {...LIFT} disabled={!r.liftable} unit=" m" digits={3} onChange={v => setBuild({ ...build, lift: v })} hint={!r.liftable ? 'Pick non-stock wheels to lift this body' : null} />
        </div>

        {r.tire && <div className="section"><div className="section-title">RIMS <span>{rims.length} styles</span></div>
          <div className="presets">{rims.map(x => <button key={x.id} className={build.rim === x.id ? 'active' : ''} onClick={() => update(setRim(build, x.id))}>{x.label}</button>)}</div>
          <small className="hint">Colour them under COLOUR → Rims</small></div>}
        {!r.tire && <div className="section"><div className="section-title">RIMS</div><small className="hint">Pick a Rugged tire to choose separate rim styles</small></div>}

        {pieces.length > 0 && <div className="section pieces"><div className="section-title">BODY PIECES <span>{pieces.length - build.hidden.length}/{pieces.length} on</span></div>
          <div className="filters"><button onClick={() => setPiecesOpen(o => !o)}>{piecesOpen ? 'Collapse' : 'Expand'}</button><button onClick={() => update({ ...build, hidden: [] })}>Show all</button><button onClick={() => update({ ...build, hidden: pieces.map(x => x.id) })}>Hide all</button></div>
          {piecesOpen && pieceCats.map(cat => <div key={cat} className="piece-group"><small>{cat}</small>
            {pieces.filter(x => x.category === cat).map(x => <label key={x.id} className="piece"><input type="checkbox" checked={!build.hidden.includes(x.id)} onChange={() => togglePiece(x.id)} /><span>{x.label}</span></label>)}</div>)}
        </div>}

        {categories.map(cat => {
          const catSlots = slots.filter(s => s.category === cat && parts.some(p => p.slot === s.id && partState(p, body) !== 'hidden'));
          if (!catSlots.length) return null;
          return <div key={cat} className="section"><div className="section-title">{CAT_TITLES[cat] || cat.toUpperCase()}</div>
            <div className="slots">{catSlots.map(s => {
              const opts = parts.filter(p => p.slot === s.id && partState(p, body) !== 'hidden');
              return <label key={s.id} className="slot"><span><strong>{s.label}</strong></span>
                <select value={build.parts[s.id] || ''} onChange={e => update(setPart(build, s.id, e.target.value || null))}>
                  <option value="">None</option>
                  {opts.map(p => <option key={p.id} value={p.id} disabled={partState(p, body) !== 'ok'}>{labelFor(p, body.id)}{partState(p, body) === 'ok' ? '' : ' — refit needed'}</option>)}
                </select></label>;
            })}</div></div>;
        })}
        {visibleSlots.length === 0 && <p className="empty">No separate parts for this body — its cage, rack and engine are part of the shell.</p>}
      </div>
      <div className="aside-foot">{fmt(bodyTotal)} builds for this body · add pieces by dropping a GLB + a catalog entry<br />Model units: meters · +Z forward</div>
    </aside>

    <main className="main">
      <div className="topbar"><div><strong>3D VEHICLE VIEW</strong><span>Drag rotate · Scroll zoom · Right-click pan · Click mesh inspect</span></div>
        <div className="toolbar">
          <button className={drive ? 'toggled' : ''} onClick={() => setDrive(d => !d)}>{drive ? 'Exit drive' : 'Drive'}</button>
          <button onClick={() => setResetKey(k => k + 1)}>Reset camera</button>
          <button className={spin ? 'toggled' : ''} onClick={() => setSpin(s => !s)}>Auto rotate</button>
          <button className={wireframe ? 'toggled' : ''} onClick={() => setWireframe(w => !w)}>Wireframe</button>
          <button className={grid ? 'toggled' : ''} onClick={() => setGrid(g => !g)}>Grid</button>
        </div></div>
      <div className="viewport">
        <Stage build={build} drive={drive} hud={hud} wireframe={wireframe} autoRotate={spin} showGrid={grid} resetKey={resetKey} onSelect={setSelected} />
        {drive && <div className="hud"><div ref={hud} className="speed">0 km/h</div>W/S throttle · A/D steer · Space brake · R reset · C {body.cabLabel || 'cab view'} · Mouse look · Scroll zoom · Esc free cursor</div>}
        <div className="view-label">{body.label.toUpperCase()} <span>{drive ? 'DRIVE MODE' : 'STATIC ASSET PREVIEW'}</span></div>
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
