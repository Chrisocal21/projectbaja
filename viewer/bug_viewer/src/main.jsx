import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Grid, OrbitControls } from '@react-three/drei';
import DriveWorld from './DriveWorld.jsx';
import ProDrive from './ProDrive.jsx';
import ProDebug from './ProDebug.jsx';
import BuildModel from './BuildModel.jsx';
import TruckModel from './Truck.jsx';
import { switchTo, buyVehicle, activeType, vehicleType } from './game/fleet.js';
import { isPiece } from './worlds/structures.js';
import { furn, turnRy, aimedProp } from './game/furnish.js';
import { pegInteract } from './game/pegboard.js';
import { clearJunk, flipBreaker, toggleOpen, nextCatItem, nextInCat, hotbar, startMove, movePropTo, ensureStarterFixtures, ensureShopTires, ensureLetterItem, migrateGrid, nearestOpening, closeOpening, placeProp, removeProp, storeProp, BUILD_ITEMS, buildById, uncoverRaceCar, takeHeap, fabricate, upgradeTrailer, sleep, crankBug } from './game/home.js';
import { doJob, jobById } from './game/jobs.js';
import { spawns as COUNTY_SPAWNS } from './worlds/county.js';
import {
  slots, bodies, wheelSets, parts, presets, PALETTE, SIZE, LIFT,
  defaultBuild, normalize, setBody, setWheels, setRim, rims, setPart, applyPreset, resolve,
  partState, partFile, wheelSetFits, labelFor, encodeBuild, decodeBuild, randomBuild, countBuilds,
} from './build.js';
import { game, flushSaveNotices, useGame, owns, buy, say, newGame, buyCar, interact, addCash, priceOf, saveBuild, nameOf, transact } from './game/store.js';
import { held, pickUp, dropHeld, loadHeld, takeFromCar, dropRemoved, dropNearPlayer, boxAtShop, seedWorld, searchBox, canCarry, giveToPlayer, giveToGarage, inGarageZone, yardSpot, spawnItem, sizeOf, nameOfItem } from './game/items.js';
import LoadingScreen from './game/Loading.jsx';
import { planFit, planDetach, planDetachUpgrade, toggleCover, DEF } from './game/workshop.js';
import { isDriveable, isFitted } from './rules/restore.js';
import { GARAGE_DRIVE } from './worlds/siteData.js';
import { BuildMenu, BuildHud } from './game/BuildMenu.jsx';
import { HudOverlay, KeyHints, Crosshair } from './game/hud.jsx';
import { TitleScreen, PauseMenu, ShopPanel, DealerPanel, WorkshopPanel, StorePanel, ContainerPanel, InventoryPanel, ShellPanel, LetterPanel, FabPanel, JobPanel, TrailerPanel } from './game/ui.jsx';
import { PhonePanel } from './game/Phone.jsx';
import { UpdateToast, startUpdateWatch, confirmNewGame, takeResumeFlag } from './game/update.jsx';
import { WALK_START } from './worlds/siteData.js';
import { spawns as TEST_SPAWNS } from './worlds/testcenter.js';
import { nextMat, matName, DEFAULT_MAT } from './worlds/structures.js';
import { partById, SECTIONS, tireMax, bodyById, wheelById } from './build.js';
import MapPanel from './game/MapPanel.jsx';
import Compass from './game/Compass.jsx';
import { placementKey, placementClick } from './placement/input.js';   // vehicle cargo placement: no-ops unless ?placement=1
import SettingsPanel from './game/SettingsPanel.jsx';
import WikiPanel from './game/WikiPanel.jsx';
import UpgradesPanel from './game/UpgradesPanel.jsx';
import { canvasDpr } from './game/settings.js';
import './style.css';
import './hud.css';

const CAMERA_POSITION = [3.4, 2, 4.3];
const CAT_TITLES = { Body: 'BODY PANELS', Protection: 'BUMPERS & CAGE', Mechanical: 'ENGINE & SUSPENSION', Lighting: 'LIGHTING' };
const categories = [...new Set(slots.map(s => s.category))];
/** Stage 4b: the held build item is furniture (not a building piece or a cut doorway): free placement + the new rotate / click controls */
const furnishing = bm => { const it = bm && buildById[bm.item]; return !!it && !it.struct && !it.cut; };
const fmt = n => n >= 1e15 ? n.toExponential(1).replace('e+', ' x 10^') : n >= 1e12 ? `${(n / 1e12).toFixed(1)} trillion` : n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion` : n.toLocaleString('en-US');

function CameraReset({ resetKey, cam }) {
  const { camera, controls } = useThree();
  useEffect(() => { window.__cam = { camera, controls }; }, [camera, controls]);   // test hook
  useEffect(() => { camera.position.set(...(cam?.pos || CAMERA_POSITION)); controls?.target.set(...(cam?.target || [0, 0.8, 0])); controls?.update(); }, [camera, controls, resetKey, cam]);
  return null;
}

/** what forces the CAR (not the world or the canvas) to be re-created: build changes that alter its physics or its rigged wheels/steering wheel.
 *  Everything else re-renders in place. Remounting the whole canvas each time lost the WebGL context (black screen). */
const physicsKey = (build, r) => JSON.stringify({ b: build.body, w: build.wheels, d: r.dims, s: (build.stripped || []).filter(x => /^(wheel|shell|engine)/.test(x)), st: (build.hidden || []).includes('steering'), h: !!build.fab?.hoops });
function Stage({ build, wireframe, autoRotate, resetKey, onSelect, showGrid, drive, pro, world, hud, cam }) {
  const r = useMemo(() => resolve(build), [build]);
  if (drive && pro) return <Canvas shadows key={`pro-${physicsKey(build, r)}`} camera={{ position: [0, 4, -12], fov: 60, near: 0.1, far: 900 }} dpr={canvasDpr()}>
    <Suspense fallback={null}><ProDrive hud={hud} dims={r.dims} bodyId={build.body}><BuildModel build={build} wireframe={wireframe} drive /></ProDrive></Suspense>
  </Canvas>;
  if (drive) { const t = world === 'county' ? vehicleType(game.active) : vehicleType('bug'), truck = t.kind === 'truck';
    return <Canvas shadows key={`drive-${world}`} camera={{ position: [0, 4, -16], fov: 60, near: 0.1, far: 5200 }} dpr={canvasDpr()}>
      <Suspense fallback={null}><DriveWorld hud={hud} dims={truck ? t.dims : r.dims} worldId={world} bodyId={build.body} vehKey={truck ? t.id : `${t.id}-${physicsKey(build, r)}`}>{truck ? <TruckModel /> : <BuildModel build={build} wireframe={wireframe} drive />}</DriveWorld></Suspense>
    </Canvas>; }
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
  // after Save and update / Import: skip the title and land back in the game; one click re-captures the mouse (browsers need a gesture)
  useEffect(() => { startUpdateWatch(); if (takeResumeFlag()) { startStory(true); setPanel('continue'); } }, []);
  const resume = () => { setPanel(null); try { document.querySelector('canvas')?.requestPointerLock()?.catch?.(() => {}); } catch {} };
  const toggleFs = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch {} };
  const startPlay = (kind, w) => { if (w === 'county') game.active = 'bug'; Object.assign(game, { dev: true, onFoot: false, start: w === 'county' ? 'garage' : 'plaza', walkStart: null, walkPose: null, pose: null, target: null, fueled: false }); game.keepPose = false; game.prompt = ''; setPlay({ kind, world: w }); setMode('play'); setPanel(null); try { document.documentElement.requestFullscreen?.().catch?.(() => {}); } catch {} };
  const startStory = cont => {
    // new game: grandma's Bug sits in grandpa's garage, half apart — the flat rear-right wheel off, the driver's seat out (battery's in; she just hasn't run since '09)
    game.dev = false;   // a story session writes the save (dev sessions never do)
    if (!cont) { newGame(); seedWorld(); setBuildRaw(normalize({ ...defaultBuild(), stripped: ['wheelRR'], hidden: ['seatDriver'] })); } else if (game.build) setBuildRaw(normalize(game.build));
    migrateGrid(); ensureStarterFixtures(); ensureShopTires(); ensureLetterItem();   // Walt's wall shelving: movable props, seeded once per save
    if (game.job && !jobById[game.job.id]) game.job = null;   // a customer from a job that no longer exists
    const saved = cont ? game.fleet[game.active]?.pose : null, at = saved || GARAGE_DRIVE, gh = at.h, rs = cont && saved ? game.resume : null;   // rs: resume exactly (on foot at the saved spot, or in the car)
    const besideCar = { x: at.x + Math.cos(gh) * 2.6, z: at.z - Math.sin(gh) * 2.6, yaw: gh + Math.PI };
    game.live = true; game.resume = null; flushSaveNotices();
    Object.assign(game, { dev: false, onFoot: rs ? rs.onFoot : true, open: new Set(), start: 'garage', walkStart: rs?.onFoot ? { ...rs.walkPose } : cont ? besideCar : WALK_START, walkPose: null, pose: saved ? { ...saved } : null, keepPose: !!saved, prompt: '', target: null, buildMode: null });   // fueled is kept from the save
    setPlay({ kind: 'drive', world: 'county' }); setMode('play'); setPanel(null); try { document.documentElement.requestFullscreen?.().catch?.(() => {}); } catch {}
  };
  // the 3D scene is rebuilt when the car changes; keep the mouse captured through it
  const rebuild = nb => { game.rebuilding = true; update(nb); setTimeout(() => { game.rebuilding = false; try { document.querySelector('canvas')?.requestPointerLock()?.catch?.(() => {}); } catch {} }, 900); };
  // ---- restoration at the car (blueprint §3): fit from hands/pack, detach into hands/pack, open lids ----
  const doFit = uidN => {
    const it = game.items.find(i => i.uid === uidN); if (!it) return;
    const b = buildRef.current, plan = planFit(it, b, panelRef.current === 'workshop' ? undefined : game.carZone);
    if (!plan.ok) { if (plan.openCover) toggleCover(plan.openCover); return say(plan.why); }
    const before = isDriveable(DEF, b), res = plan.apply(b), nb = normalize(res.build);
    transact(() => {   // canon: the item leaves your hands and goes on the car in ONE save write
      game.items = game.items.filter(x => x !== it); res.drops.forEach(([k, id]) => dropNearPlayer(k, id)); dropRemoved({ ...b, parts: Object.fromEntries(Object.entries(b.parts).filter(([, id]) => !res.drops.some(d => d[1] === id))) }, nb);
      game.build = nb;
    });
    say(!before && isDriveable(DEF, nb) ? `Fitted the ${plan.slotName.toLowerCase()} — she's all there. Get in and try the key.` : `Fitted: ${plan.slotName}`); rebuild(nb);
  };
  const doDetach = (slotId, zone) => {
    const b = buildRef.current, plan = planDetach(slotId, b, zone);
    if (!plan.ok) { if (plan.openCover) toggleCover(plan.openCover); return say(plan.why); }
    if (plan.toYard) { const n = game.items.filter(i => i.kind === 'shell' && i.loc === 'world').length, y = yardSpot(n), nb = normalize(plan.apply(b)); transact(() => { spawnItem('shell', b.body, y.x, y.z, 0, GARAGE_DRIVE.h + Math.PI / 2); game.build = nb; }); say('The hoist lifts the body off — the shell is out in the yard. The chassis rolls on its own now.'); return rebuild(nb); }
    const [k, id, extra] = plan.item, name = nameOfItem({ kind: k, id, ...(extra || {}) });
    const where = canCarry(k, id) ? 'hands' : inGarageZone(game.pos.x, game.pos.z) ? 'shelves' : null;
    if (!where) return say(sizeOf(k, id) === 1 ? 'Pack is full and your hands are busy.' : 'Hands full — put that down first.');
    const nb = normalize(plan.apply(b));
    transact(() => { if (where === 'hands') giveToPlayer(k, id, extra); else giveToGarage(k, id, extra); game.build = nb; });   // off the car and into your hands in one write
    say(where === 'hands' ? `Took off: ${name}` : `Took off: ${name} — hands full, so it went on the garage shelves.`);
    rebuild(nb);
  };
  const doDetachUpgrade = catSlot => {
    const b = buildRef.current, plan = planDetachUpgrade(catSlot, b);
    if (!plan.ok) return say(plan.why);
    if (!canCarry(...plan.item)) return say('Hands full — put that down first.');
    const nb = normalize(plan.apply(b));
    transact(() => {
      giveToPlayer(...plan.item);
      for (const id of Object.values(b.parts)) if (id !== plan.item[1] && !Object.values(nb.parts).includes(id)) dropNearPlayer('part', id);   // things bolted to it come off too
      game.build = nb;
    });
    say(`Took off: ${nameOf('part', plan.item[1], b.body)}`); rebuild(nb);
  };
  const storeBuy = (what, price) => {
    if (game.cash < price) return say('Not enough cash.');
    if (what === 'wash') return interact('wash');
    const [k, id] = what.split(':'); if (!canCarry(k, id)) return say('Your hands are full.');
    addCash(-price); giveToPlayer(k, id); say(`Bought: ${nameOfItem({ kind: k, id })}`);
  };
  const buyBoxed = (kind, id) => { const c = priceOf(kind, id); if (game.cash < c) return; addCash(-c); boxAtShop(kind, id); say(`Bought: ${nameOf(kind, id, build.body)} — boxed at the pickup area outside the shop.`); };
  const worldInteract = id => {
    if (id === 'shop') setPanel('shop');
    else if (id === 'bug') setPanel('dealer');
    else if (id.startsWith('item:')) { const it = game.items.find(i => i.uid === +id.slice(5)); if (it?.kind === 'shell') setPanel('shell:' + it.uid); else if (it?.kind === 'memento' && it.id === 'letter') { game.home = { ...game.home, letter: true }; setPanel('letter'); } }   // loose items are picked up with a left click now (see `click`), never E
    else if (id.startsWith('box:')) { searchBox(id.slice(4)); setPanel(id); }
    else if (id === 'car:fit') doFit(game.carPlan?.uid);
    else if (id === 'car:cover') toggleCover(game.carPlan.id);
    else if (id === 'car:enter') { game.open = new Set(); interact('enter'); }
    else if (id === 'car:why') say(game.carPlan?.why || '');
    else if (id === 'store') setPanel('store');
    else if (id.startsWith('veh:')) { const v = id.slice(4), drive = vehicleType(v).kind === 'truck'; game.rebuilding = true; switchTo(v, drive); if (drive) interact('enter'); setTimeout(() => { game.rebuilding = false; try { document.querySelector('canvas')?.requestPointerLock()?.catch?.(() => {}); } catch {} }, 1200); }
    else if (id === 'dealer') setPanel('dealer');
    else if (id === 'letter') { game.home = { ...game.home, letter: true }; setPanel('letter'); }
    else if (id === 'breaker') flipBreaker();
    else if (id === 'openSwitch') toggleOpen();
    else if (id === 'racecar') uncoverRaceCar();
    else if (id === 'crank') crankBug();
    else if (id === 'job') setPanel('job');
    else if (id === 'trailer') setPanel('trailer');
    else if (id.startsWith('junk:')) clearJunk(id.slice(5));
    else if (id === 'bench') setPanel('fab');
    else if (id === 'peg') pegInteract();
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
      const bm = game.buildMode;
      if (p === 'wiki') {   // the game index: typing goes to its search box; I / Esc close it
        if (e.target?.tagName === 'INPUT' && e.code !== 'Escape') return;
        if ((e.code === 'KeyI' || e.code === 'Escape') && !e.repeat) { e.preventDefault(); resume(); }
        return;
      }
      if (e.code === 'KeyI' && !e.repeat && p === null) { setPanel('wiki'); return; }
      if (e.code === 'KeyU' && !e.repeat && p === null && game.onFoot && !bm) { setPanel('upgrades'); return; }
      if (p === 'upgrades') { if (e.code === 'Escape' && !e.repeat) resume(); return; }
      if (p === 'build') {   // the build menu: it handles its own keys (search, 1-8, N, Enter); B / Esc close it
        if (e.target?.tagName === 'INPUT' && e.code !== 'Escape') return;
        if ((e.code === 'KeyB' || e.code === 'Escape') && !e.repeat) { e.preventDefault(); resume(); }
        return;
      }
      if (p === null && game.onFoot && !bm && placementKey(e)) return;   // ?placement=1: Q / E / R / T turn a held item while it's aimed at a vehicle surface
      if (bm && p === null && !e.repeat) {   // build mode keys (you keep walking around while building)
        const i = BUILD_ITEMS.findIndex(b => b.id === bm.item), cyc = d => { game.buildMode = { ...bm, item: BUILD_ITEMS[(i + d + BUILD_ITEMS.length) % BUILD_ITEMS.length].id }; say(buildById[game.buildMode.item].name); };
        if (furnishing(bm)) {   // Stage 4b: Q / E turn 15 deg (Shift 90), R +90; E never picks up. Click picks up / sets down.
          const k = e.code === 'KeyQ' ? 'q' : e.code === 'KeyE' ? 'e' : e.code === 'KeyR' ? 'r' : null;
          if (k) { game.buildMode = { ...bm, ry: turnRy(bm.ry || 0, k, e.shiftKey) }; return; }
        }
        if ((e.code === 'KeyB' || e.code === 'Escape') && bm.moving) { game.buildMode = { ...bm, moving: null }; say('Move cancelled: it stays where it was'); return; }
        if (e.code === 'KeyB') { setPanel('build'); return; }
        if (e.code === 'Escape' || e.code === 'KeyQ') { game.buildMode = null; say('Build tool put away'); return; }
        const slot = /^Digit([1-8])$/.exec(e.code);
        if (slot && !bm.moving) { const h = hotbar()[+slot[1] - 1]; if (h) { game.buildMode = { ...bm, item: h.id, ...(h.mat ? { mat: h.mat } : {}) }; say(buildById[h.id].name.replace(/ \(.*\)/, '')); } return; }
        if (e.code === 'KeyN') { if (buildById[bm.item]?.struct) { game.buildMode = { ...bm, mat: nextMat(bm.mat || DEFAULT_MAT, e.shiftKey ? -1 : 1) }; say(`Material: ${matName(game.buildMode.mat)}`); } else say('Materials are for building pieces: foundations, floors, walls, doors, roofs.'); return; }
        if (e.code === 'KeyV') { if (!bm.moving && bm.x !== undefined) startMove(bm.x, bm.z); return; }
        if (e.code === 'BracketRight') return cyc(1); if (e.code === 'BracketLeft') return cyc(-1);
        if (e.code === 'Period' || e.code === 'Comma') { game.buildMode = { ...bm, item: nextCatItem(bm.item, e.code === 'Period' ? 1 : -1) }; say(`${buildById[game.buildMode.item].cat}: ${buildById[game.buildMode.item].name}`); return; }
        if (e.code === 'KeyR') { game.buildMode = { ...bm, ry: ((bm.ry || 0) + Math.PI / 4) % (Math.PI * 2) }; return; }
        if (e.code === 'KeyE') { if (bm.x !== undefined) { if (bm.moving) { if (movePropTo(bm.moving.uid, bm.x, bm.z, bm.ry || 0)) game.buildMode = { ...game.buildMode, moving: null }; } else placeProp(bm.item, bm.x, bm.z, bm.ry || 0, bm.mat); } return; }
        if (e.code === 'KeyX' && e.shiftKey) { const n = game.props.map(q => [q, Math.hypot(q.x - bm.x, q.z - bm.z)]).sort((a, b) => a[1] - b[1])[0]; if (n && n[1] < 3) storeProp(n[0].uid); else say('Nothing to store here.'); return; }
        if (e.code === 'KeyX') { const o = nearestOpening(bm.x, bm.z), n0 = game.props.map(q => Math.hypot(q.x - bm.x, q.z - bm.z)).sort((a, b) => a - b)[0]; if (o && o.d < 2.5 && (n0 === undefined || o.d <= n0)) { closeOpening(o.key); return; } const n = game.props.map(q => [q, Math.hypot(q.x - bm.x, q.z - bm.z)]).sort((a, b) => a[1] - b[1])[0]; if (n && n[1] < 3) removeProp(n[0].uid); else say('Nothing built here.'); return; }
      }
      if (p === null && game.onFoot && !e.repeat && e.code === 'KeyB' && !bm) { if (game.canBuild) setPanel('build'); else if (game.onProperty) say('Clear the junk out of the garage first.'); return; }
      if (e.code === 'KeyM' && !e.repeat && play.world === 'county' && (p === null || p === 'map')) { if (p === 'map') resume(); else setPanel('map'); return; }
      if (e.code === 'Escape' && p === 'settings') { setPanel('pause'); return; }
      if (e.code === 'Escape') { if (p === null || p === 'shop' || p === 'garage') setPanel('pause'); else if (p === 'pause' || p === 'map' || p === 'dealer' || p === 'letter' || p === 'fab' || p === 'job' || p === 'trailer' || p === 'inv' || p === 'workshop' || p === 'store' || p?.startsWith('shell:') || p?.startsWith('box:')) resume(); }
      else if (e.code === 'Tab') { e.preventDefault(); if (p === 'inv') resume(); else if (p === null && game.onFoot) setPanel('inv'); }
      else if (p === null && game.onFoot && !e.repeat && e.code === 'KeyG') dropHeld();
      else if (p === null && game.onFoot && !e.repeat && e.code === 'KeyF') { if (game.nearCar) { if (held()) loadHeld(); else takeFromCar(); } }
      else if (p === null && game.onFoot && !e.repeat && e.code === 'KeyX' && game.nearCar) setPanel('workshop');
      else if (p === null && game.onFoot && !e.repeat && e.code === 'KeyR' && game.nearCar && game.aim && !held()) doDetach(game.aim, game.carZone);
      else if (p === null && game.onFoot && !e.repeat && e.code === 'KeyQ' && game.nearCar && (game.carZone === 'driver' || game.carZone === 'passenger') && isFitted(DEF, game.build, game.carZone === 'driver' ? 'doorL' : 'doorR')) toggleCover(game.carZone === 'driver' ? 'doorL' : 'doorR');
      else if (e.code === 'KeyG' && !e.repeat && p === null && !game.onFoot && game.target === 'crank') interact('exit');
      else if (e.code === 'KeyE' && !e.repeat && p === null) { if (game.target) worldInteract(game.target); else if (game.prompt.startsWith('Press E')) setPanel('shop'); }
    };
    const shiftT = e => { furn.shift = e.type === 'blur' ? false : e.shiftKey; }; window.addEventListener('keydown', shiftT); window.addEventListener('keyup', shiftT); window.addEventListener('blur', shiftT);
    const wheel = e => { const bm = game.buildMode; if (!bm || panelRef.current !== null) return; if (furnishing(bm)) { game.buildMode = { ...bm, ry: turnRy(bm.ry || 0, 'wheel', e.shiftKey, e.deltaY > 0 ? 1 : -1) }; return; } if (bm.moving) return; game.buildMode = { ...bm, item: nextInCat(bm.item, e.deltaY > 0 ? 1 : -1) }; };
    const click = e => { const bm = game.buildMode; if (bm && panelRef.current === null && e.button === 2 && document.pointerLockElement) { if (bm.moving) { game.buildMode = { ...bm, moving: null }; say('Move cancelled: it stays where it was'); } else { game.buildMode = null; say('Build tool put away'); } return; }
      if (bm && panelRef.current === null && e.button === 0 && document.pointerLockElement && bm.x !== undefined) { if (furnishing(bm) && !bm.moving) { const hit = aimedProp(game.props.filter(q => !isPiece(q.id)).map(q => ({ uid: q.uid, x: q.x, z: q.z, r: buildById[q.id]?.pickR ?? buildById[q.id]?.r })), furn.cx, furn.cz, game.face, 7, furn.aim); if (hit) { const q = game.props.find(o => o.uid === hit.uid); game.buildMode = { ...bm, item: q.id, ry: q.ry || 0, moving: { uid: q.uid, x: q.x, z: q.z, ry: q.ry || 0 } }; say(`Picked up the ${buildById[q.id].name.toLowerCase()}: click to set it down, Esc to cancel`); return; } } if (bm.moving) { if (movePropTo(bm.moving.uid, bm.x, bm.z, bm.ry || 0)) game.buildMode = { ...game.buildMode, moving: null }; } else placeProp(bm.item, bm.x, bm.z, bm.ry || 0, bm.mat); }
      // left click on foot = pick up the loose item you're looking at (was E). Only while the pointer is locked: the click that re-grabs a lost lock picks nothing up.
      if (!bm && panelRef.current === null && e.button === 0 && game.onFoot && document.pointerLockElement) { if (placementClick()) return; const t = game.target; const it = t?.startsWith('item:') && game.items.find(i => i.uid === +t.slice(5)); if (it && it.kind !== 'shell') pickUp(it.uid); else if (t?.startsWith('heap:')) takeHeap(t.slice(5)); } };   // (a scrap heap is picked through with a click too)
    document.addEventListener('pointerlockchange', lockChange); window.addEventListener('keydown', key); window.addEventListener('wheel', wheel); window.addEventListener('mousedown', click); const ctx = e => { if (game.buildMode || panelRef.current === 'build') e.preventDefault(); }; window.addEventListener('contextmenu', ctx);
    return () => { document.removeEventListener('pointerlockchange', lockChange); window.removeEventListener('keydown', key); window.removeEventListener('keydown', shiftT); window.removeEventListener('keyup', shiftT); window.removeEventListener('blur', shiftT); window.removeEventListener('wheel', wheel); window.removeEventListener('mousedown', click); window.removeEventListener('contextmenu', ctx); };
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
  useEffect(() => { buildRef.current = build; if (mode === 'play') saveBuild(build); try { history.replaceState(null, '', `#${encodeBuild(build)}`); } catch {} }, [build, mode]);   // only a build you're playing is saved (the title/customizer must not overwrite your car)

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

  const stageEl = <Stage build={build} drive={drive} pro={pro} world={world} hud={hud} wireframe={wireframe} autoRotate={spin} showGrid={grid && mode !== 'title'} resetKey={resetKey} onSelect={setSelected} />;
  if (mode === 'title') return <div className="full title-bg">{panel === 'settings' && <SettingsPanel onClose={() => setPanel(null)} />}{panel === 'wiki' && <WikiPanel onClose={() => setPanel(null)} />}<TitleScreen onSettings={() => setPanel('settings')} onWiki={() => setPanel('wiki')} onNew={() => { if (confirmNewGame()) startStory(false); }} onContinue={() => startStory(true)} onDev={(k, w) => (k === 'garage' ? setMode('garage') : startPlay(k, w))} /></div>;
  if (mode === 'play') return <div className="full">
    {stageEl}
    <LoadingScreen />
    <div className="hud"><div ref={hud} className="speed">0 km/h</div></div>
    <Crosshair />
    <KeyHints driving={!game.onFoot} pro={pro} cabLabel={body.cabLabel} />
    <HudOverlay />
    <UpdateToast />
    {panel === 'continue' && <div className="overlay" onClick={resume} style={{ cursor: 'pointer' }}><div className="card"><h2>Back in the game</h2><p>Click to continue</p></div></div>}
    <Compass />
    {panel !== 'build' && <BuildHud />}
    {panel === 'build' && <BuildMenu onClose={resume} onPick={(id, mat) => { const bm = game.buildMode; game.buildMode = { ...(bm || {}), item: id, ry: bm?.ry || 0, mat: mat || bm?.mat, moving: null }; resume(); }} />}
    {pro && <ProDebug />}
    {panel === 'settings' && <SettingsPanel onClose={() => setPanel('pause')} />}
    {panel === 'wiki' && <WikiPanel onClose={resume} />}
    {panel === 'upgrades' && <UpgradesPanel onClose={resume} />}
    {panel === 'pause' && <PhonePanel canMap={play.world === 'county'} onMap={() => setPanel('map')} onResume={resume} onSettings={() => setPanel('settings')} onWiki={() => setPanel('wiki')} onUpgrades={() => setPanel('upgrades')} onCustomize={() => setPanel('garage')} onExit={toTitle} fullscreen={fs} onFullscreen={toggleFs}
      teleports={!game.dev ? [] : play.kind === 'drive' && play.world === 'test' ? TEST_SPAWNS : play.world === 'county' ? COUNTY_SPAWNS : []} onTeleport={k => { resume(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit' + k })); }} />}
    {panel === 'shop' && <ShopPanel bodyId={body.id} build={build} story={!game.dev} onBuy={game.dev ? equip : buyBoxed} onUnequip={unequip} onClose={resume} previewOf={previewOf} renderPreview={(pb, close) => <Stage build={pb} cam={close ? { pos: [2.3, 0.9, 3.0], target: [0, 0.45, 0.5] } : null} autoRotate showGrid={false} resetKey={0} onSelect={() => {}} />} />}
    {panel === 'dealer' && <DealerPanel onBuy={id => buyVehicle(id)} onClose={resume} />}
    {panel === 'letter' && <LetterPanel onClose={resume} />}
    {panel === 'map' && <MapPanel onClose={resume} />}
    {panel === 'fab' && <FabPanel onMake={id => { fabricate(id, giveToPlayer, canCarry); resume(); }} onDev={() => setPanel('garage')} onClose={resume} />}
    {panel === 'job' && <JobPanel onDo={() => { doJob(); resume(); }} onClose={resume} />}
    {panel === 'trailer' && <TrailerPanel onUpgrade={upgradeTrailer} onSleep={() => { sleep(); resume(); }} onClose={resume} />}
    {panel?.startsWith('box:') && <ContainerPanel id={panel.slice(4)} onClose={resume} />}
    {panel === 'inv' && <InventoryPanel onClose={resume} />}
    {panel?.startsWith('shell:') && <ShellPanel uid={+panel.slice(6)} onFit={u => { setPanel(null); doFit(u); }} onScrap={u => { game.items = game.items.filter(i => i.uid !== u); addCash(150); say('Scrapped the shell: +$150'); resume(); }} onClose={resume} />}
    {panel === 'workshop' && <WorkshopPanel build={build} onFit={doFit} onDetach={doDetach} onDetachUpgrade={doDetachUpgrade} onCover={toggleCover} onClose={resume} />}
    {panel === 'store' && <StorePanel onBuy={storeBuy} onClose={resume} />}
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

const PlacementLab = import.meta.env.DEV && new URLSearchParams(location.search).get('lab') === 'placement' && React.lazy(() => import('./placement/Lab.jsx'));   // test scene, only with ?lab=placement (not even loaded otherwise)
createRoot(document.getElementById('root')).render(PlacementLab ? <Suspense fallback={null}><PlacementLab /></Suspense> : <App />);
