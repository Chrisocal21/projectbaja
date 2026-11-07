import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Grid, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import DriveWorld from './DriveWorld.jsx';
import './style.css';

const BASE_ASSET = 'VEH_001_Beetle_Imported';
const CAMERA_POSITION = [3.4,2,4.3];
const UPGRADE_NOTICE = 'Stage 2 is a full-bodied static Baja preview. Full race suspension, cage bracing and remaining prototypes are not fitted.';
const fittedUpgrades = new Set(['PART_001_AllTerrainWheelSet','PART_007_CutBajaFenders','PART_008_ShortenedFrontHood','PART_009_RearEngineOpening','PART_010_FiberglassWideFenders']);
const stage2Upgrades = new Set([...fittedUpgrades,'PART_002_FrontTubeBumper','PART_003_RearEngineCage','PART_006_TrailShockSet','PART_011_RockerGuards','PART_012_AirCooledRearEngine']);
const stage2Labels = {
  PART_001_AllTerrainWheelSet: '30-inch all-terrain wheels',
  PART_006_TrailShockSet: 'Raised running gear',
  PART_007_CutBajaFenders: 'High-cut Baja fenders',
  PART_008_ShortenedFrontHood: 'Rounded Baja nose',
  PART_009_RearEngineOpening: 'Open rear deck',
};
function availableUpgrades(profile) {
  return profile==='stage2'?stage2Upgrades:fittedUpgrades;
}
function assetLabel(asset,profile) {
  return profile==='stage2'?(stage2Labels[asset.id]||asset.label):asset.label;
}
const ASSETS = [
  ['PART_001_AllTerrainWheelSet', 'All-terrain wheels', 'Wheels'],
  ['PART_002_FrontTubeBumper', 'Front tube bumper', 'Protection'],
  ['PART_003_RearEngineCage', 'Rear engine cage', 'Protection'],
  ['PART_004_BumperAuxLights', 'Auxiliary lights', 'Lighting'],
  ['PART_005_FrontSkidPlate', 'Front skid plate', 'Protection'],
  ['PART_006_TrailShockSet', 'Trail shocks', 'Mechanical'],
  ['PART_007_CutBajaFenders', 'Cut Baja fenders', 'Body'],
  ['PART_008_ShortenedFrontHood', 'Shortened front hood', 'Body'],
  ['PART_009_RearEngineOpening', 'Rear engine opening', 'Body'],
  ['PART_010_FiberglassWideFenders', 'Wide fiberglass fenders', 'Body'],
  ['PART_011_RockerGuards', 'Rocker guards', 'Protection'],
  ['PART_012_AirCooledRearEngine', 'Rear air-cooled engine', 'Mechanical'],
  ['PART_013_SuspensionAssembly', 'Suspension assembly', 'Mechanical'],
  ['PART_014_InteriorRollCage', 'Interior roll cage', 'Cage'],
  ['PART_015_FrontCageReinforcement', 'Front cage reinforcement', 'Cage'],
  ['PART_016_RearCageBracing', 'Rear cage bracing', 'Cage'],
].map(([id,label,category])=>({id,label,category}));
const categories = ['Wheels','Body','Protection','Mechanical','Cage','Lighting'];
const empty = {};
const builds = {
  'Stock': {},
  'Body prototype': Object.fromEntries(['PART_007_CutBajaFenders','PART_008_ShortenedFrontHood','PART_009_RearEngineOpening'].map(id=>[id,true])),
  'Stage 2 Baja': Object.fromEntries(['PART_001_AllTerrainWheelSet','PART_002_FrontTubeBumper','PART_003_RearEngineCage','PART_006_TrailShockSet','PART_007_CutBajaFenders','PART_008_ShortenedFrontHood','PART_009_RearEngineOpening','PART_011_RockerGuards','PART_012_AirCooledRearEngine'].map(id=>[id,true])),
  'Trail': Object.fromEntries([0,1,3,4,5,6,7,10].map(i=>[ASSETS[i].id,true])),
  'Baja': Object.fromEntries([0,1,2,3,4,7,8,10,11,12,13,14,15].map(i=>[ASSETS[i].id,true]))
};
const stockMasks = {
  PART_001_AllTerrainWheelSet: ['B_FLWheel','B_FRWheel','B_BLWheel','B_BRWheel'],
  PART_002_FrontTubeBumper: ['B_FrontBumper'],
  PART_003_RearEngineCage: ['B_BackBumper'],
  PART_007_CutBajaFenders: ['B_Body_Fender_','B_HeadlightGlass','B_HeadlightTrim','B_TurnSignal','B_Tailights'],
  PART_008_ShortenedFrontHood: ['B_Body_Hood_Front','B_Body_Nose_Front','B_FrontBumper','B_HoodTrim','B_HoodHandle','B_HoodLogo'],
  PART_009_RearEngineOpening: ['B_Body_Engine_Lid_Rear','B_Body_Tail_Rear','B_BackBumper','B_BackTrim','B_BackHandle','B_LicensePlate'],
  PART_010_FiberglassWideFenders: ['B_Body_Fender_','B_HeadlightGlass','B_HeadlightTrim','B_TurnSignal','B_Tailights'],
  PART_011_RockerGuards: ['B_SideBumper'],
};
function activeAssets(enabled,profile) {
  return ASSETS.filter(a=>enabled[a.id] && availableUpgrades(profile).has(a.id));
}
function canApplyPreset(name) {
  return Object.keys(builds[name]).every(id=>availableUpgrades(name==='Stage 2 Baja'?'stage2':'stock').has(id));
}
function maskFor(enabled,profile) {
  return activeAssets(enabled,profile).flatMap(a=>stockMasks[a.id]||[]);
}
function sourceNameFor(object) {
  for(let node=object;node;node=node.parent) {
    if(node.userData.source_name) return node.userData.source_name;
  }
  return object.name;
}
function Model({file, mask=[], wireframe, onSelect, isBase=false}) {
  const {scene} = useGLTF(`/models/${file}.glb`);
  const clone = useMemo(()=>{
    const c = scene.clone(true);
    c.traverse(o=>{ if(o.isMesh) {
      o.material = Array.isArray(o.material) ? o.material.map(m=>m.clone()) : o.material?.clone();
      const raycast = o.raycast;
      o.raycast = function(raycaster,intersections) {
        if(this.visible) raycast.call(this,raycaster,intersections);
      };
    }});
    return c;
  },[scene]);
  useEffect(()=>{
    clone.traverse(o=>{if(!o.isMesh)return;
      o.visible = !(isBase && mask.some(prefix=>sourceNameFor(o).startsWith(prefix)));
      const mats = Array.isArray(o.material) ? o.material:[o.material];
      mats.forEach(m=>{if(m) m.wireframe=wireframe;});
    });
  },[clone,mask.join('|'),wireframe,isBase]);
  return <primitive object={clone} onClick={e=>{
    e.stopPropagation();
    const m=e.object; const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    onSelect({name:m.name||'(unnamed mesh)',sourceName:sourceNameFor(m),asset:file,triangles:Math.round((m.geometry?.index?.count||m.geometry?.attributes?.position?.count||0)/3),size:[size.x,size.y,size.z].map(n=>n.toFixed(2))});
  }}/>
}
function CameraReset({resetKey}) {
  const {camera,controls} = useThree();
  useEffect(()=>{camera.position.set(...CAMERA_POSITION); controls?.target.set(0,0.8,0);controls?.update();},[camera,controls,resetKey]);
  return null;
}
function Stage({enabled,profile,wireframe,autoRotate,resetKey,onSelect,showGrid,drive,hud}) {
  const masks = useMemo(()=>maskFor(enabled,profile),[enabled,profile]);
  const prefix = profile==='stage2'?'STAGE2_':'';
  const vehicle=<>
      <Model file={`${prefix}${BASE_ASSET}`} mask={masks} wireframe={wireframe} onSelect={onSelect} isBase/>
      {activeAssets(enabled,profile).map(a=><Model key={`${prefix}${a.id}`} file={`${prefix}${a.id}`} wireframe={wireframe} onSelect={onSelect}/>)}
    </>;
  if(drive) return <Canvas key={`drive-${profile}-${activeAssets(enabled,profile).map(a=>a.id).join()}`} camera={{position:[0,4,-16],fov:60,near:0.1,far:700}} dpr={[1,2]}>
    <Suspense fallback={null}><DriveWorld hud={hud}>{vehicle}</DriveWorld></Suspense>
  </Canvas>;
  return <Canvas key="view" shadows camera={{position:CAMERA_POSITION,fov:43,near:0.05,far:100}} dpr={[1,2]} onPointerMissed={()=>onSelect(null)}>
    <color attach="background" args={['#172124']}/>
    <ambientLight intensity={1.25}/><hemisphereLight args={['#e6e9d5','#384348',1.7]}/>
    <directionalLight position={[5,9,4]} intensity={2.3} castShadow shadow-mapSize={[1024,1024]}/>
    <directionalLight position={[-4,3,-4]} intensity={1.2}/>
    <Suspense fallback={null}>
      <Environment resolution={128}>
        <Lightformer intensity={2} color="#fff2dc" position={[0,5,0]} rotation={[-Math.PI/2,0,0]} scale={[8,4,1]}/>
        <Lightformer intensity={1} position={[-4,2,0]} rotation={[0,Math.PI/2,0]} scale={[6,3,1]}/>
      </Environment>
      {vehicle}
    </Suspense>
    {showGrid && <Grid position={[0,-0.035,0]} args={[30,30]} cellSize={0.5} sectionSize={2} cellColor="#546365" sectionColor="#748587" fadeDistance={22} fadeStrength={2} infiniteGrid/>}
    <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={1.2} minDistance={2.7} maxDistance={18} maxPolarAngle={Math.PI/2.05} target={[0,0.8,0]}/>
    <CameraReset resetKey={resetKey}/>
  </Canvas>
}
function App(){
 const [enabled,setEnabled]=useState({}); const [mode,setMode]=useState('Stock');
 const [profile,setProfile]=useState('stock');
 const fitted=availableUpgrades(profile);
 const [wireframe,setWireframe]=useState(false),[spin,setSpin]=useState(false),[grid,setGrid]=useState(true);
 const [drive,setDrive]=useState(false),hud=useRef(null);
 const [resetKey,setResetKey]=useState(0),[selected,setSelected]=useState(null),[filter,setFilter]=useState('All');
 const turnOn=(id)=>{
   if(!fitted.has(id)){console.warn(`${id}: ${UPGRADE_NOTICE}`);return;}
   setMode('Custom');setSelected(null);setEnabled(old=>{
   const next={...old,[id]:!old[id]};
   // These alternative panel sets should not appear together.
   if(next[id]&&id==='PART_007_CutBajaFenders')next.PART_010_FiberglassWideFenders=false;
   if(next[id]&&id==='PART_010_FiberglassWideFenders')next.PART_007_CutBajaFenders=false;
   if(next[id]&&id==='PART_013_SuspensionAssembly')next.PART_006_TrailShockSet=false;
   if(next[id]&&id==='PART_006_TrailShockSet')next.PART_013_SuspensionAssembly=false;
   if(profile==='stage2'&&next[id]&&id==='PART_012_AirCooledRearEngine')next.PART_009_RearEngineOpening=true;
   if(profile==='stage2'&&!next[id]&&id==='PART_009_RearEngineOpening')next.PART_012_AirCooledRearEngine=false;
   return next;
 });};
 const applyPreset=(name)=>{
   if(!canApplyPreset(name)){console.warn(`${name}: ${UPGRADE_NOTICE}`);return;}
   setMode(name);setProfile(name==='Stage 2 Baja'?'stage2':'stock');setEnabled(builds[name]);setSelected(null);
 };
 const active=activeAssets(enabled,profile).length;
 return <div className="shell">
   <aside className="sidebar">
     <header><span className="eyebrow">PROJECT: BAJA — VEHICLE ASSET LAB</span><h1>VEH_001 <span>/ Classic Bug</span></h1><p>Modular 3D inspector · Three.js / R3F</p></header>
     <div className="section"><div className="section-title">BUILD PRESETS</div><div className="presets">{Object.keys(builds).map(b=><button key={b} className={mode===b?'active':''} disabled={!canApplyPreset(b)} title={canApplyPreset(b)?(b==='Stock'?'Imported stock vehicle':b==='Stage 2 Baja'?'Classic rounded Baja kit, 30-inch tires and 140 mm body lift':'Earlier body-only prototype on stock running gear'):UPGRADE_NOTICE} onClick={()=>applyPreset(b)}>{b}</button>)}</div><p className="compatibility-note">{UPGRADE_NOTICE}</p></div>
     <div className="section parts-head"><div className="section-title">UPGRADE PARTS <span>{active} active</span></div><div className="filters"><button className={filter==='All'?'current':''} onClick={()=>setFilter('All')}>All</button>{categories.map(c=><button className={filter===c?'current':''} key={c} onClick={()=>setFilter(c)}>{c}</button>)}</div></div>
     <div className="parts">{ASSETS.filter(a=>filter==='All'||a.category===filter).map(a=><label key={a.id} className={`part${fitted.has(a.id)?'':' unavailable'}`} title={fitted.has(a.id)?assetLabel(a,profile):UPGRADE_NOTICE}><span><strong>{assetLabel(a,profile)}</strong><small>{a.id.replace('PART_','').slice(0,3)} · {a.category}{fitted.has(a.id)?'':' · Refit needed'}</small></span><input type="checkbox" disabled={!fitted.has(a.id)} checked={fitted.has(a.id)&&!!enabled[a.id]} onChange={()=>turnOn(a.id)}/></label>)}</div>
     <div className="aside-foot">{profile==='stage2'?'Stage 2: classic body, raised stance, simple protection':'Imported Stock / earlier body prototypes'}<br/>Model units: meters · +Z forward</div>
   </aside>
   <main className="main"><div className="topbar"><div><strong>3D VEHICLE VIEW</strong><span>Drag rotate · Scroll zoom · Right-click pan · Click mesh inspect</span></div><div className="toolbar"><button className={drive?'toggled':''} onClick={()=>setDrive(d=>!d)}>{drive?'Exit drive':'Drive'}</button><button onClick={()=>setResetKey(k=>k+1)}>Reset camera</button><button className={spin?'toggled':''} onClick={()=>setSpin(s=>!s)}>Auto rotate</button><button className={wireframe?'toggled':''} onClick={()=>setWireframe(w=>!w)}>Wireframe</button><button className={grid?'toggled':''} onClick={()=>setGrid(g=>!g)}>Grid</button></div></div>
     <div className="viewport"><Stage drive={drive} hud={hud} enabled={enabled} profile={profile} wireframe={wireframe} autoRotate={spin} showGrid={grid} resetKey={resetKey} onSelect={setSelected}/>{drive&&<div style={{position:'absolute',left:16,bottom:16,color:'#fff',font:'600 13px/1.5 system-ui',textShadow:'0 1px 3px #000',pointerEvents:'none'}}><div ref={hud} style={{fontSize:28}}>0 km/h</div>W/S throttle · A/D steer · Space brake · R reset · C cab view · Mouse look · Scroll zoom · Esc free cursor</div>}<div className="view-label">{profile==='stage2'?'STAGE 2 BAJA':BASE_ASSET} <span>STATIC ASSET PREVIEW</span></div></div>
     <div className="details"><div><span className="eyebrow">MESH INSPECTOR</span>{selected?<><h2>{selected.sourceName||selected.name}</h2><p>Node: {selected.name} · Source: {selected.asset}.glb</p><div className="statline"><span>{selected.triangles.toLocaleString()} tris</span><span>Bounds {selected.size.join(' × ')} m</span></div></>:<><h2>Select a component</h2><p>Click any visible mesh to inspect its name, source and dimensions.</p></>}</div><div className="status"><span className="eyebrow">ASSEMBLY STATUS</span><strong>{active} / 16</strong><p>Upgrades enabled</p><small>{profile==='stage2'?'Classic Stage 2: 140 mm body lift, optional 30-inch tires, simple torsion-beam-inspired running gear and refitted flat-four visual blockout. Not a long-travel/Class 1 build or physics validation.':enabled.PART_001_AllTerrainWheelSet?'Stock-size all-terrain tires on original rims; remaining mechanical prototypes are gated.':'Original Stock or earlier body-only prototype. Use Stage 2 Baja for the reference-based conversion.'}</small></div></div>
   </main>
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
