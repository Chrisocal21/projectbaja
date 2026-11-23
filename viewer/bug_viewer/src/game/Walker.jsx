import { useEffect, useRef } from 'react';
import { WEAR_PARTS, FRESH, serviceJob, SERVICE_VERB, partCost } from '../wear.js';
import { useFrame, useThree } from '@react-three/fiber';
import { game, setPrompt } from './store.js';
import { lookScale, settings } from './settings.js';
import { TARGETS } from '../worlds/siteData.js';
import { SITES } from '../worlds/county.js';
import { activeType, vehicleType, localTo, standingVehicles } from './fleet.js';
import { nearestProp, benchSpot, PEG } from './fixtures.js';
import { aimedProp } from './furnish.js';
// what the crosshair is on comes from the real mesh under it (BuildModel's DetachGlow sets game.look), not from guessed boxes
/** looking at a seat through the cage tubes: the mesh ray hits the tubes first, so a seat also answers to a plain look-at box */
const seatAim = (eye, look, pose, y) => {   // two roomy boxes over each seat (floor to roof, with a cage and lift in the way)
  const c = Math.cos(pose.h), sn = Math.sin(pose.h);
  for (const [id, lx] of [['seatL', 0.4], ['seatR', -0.4]]) if (aimsAtBox(eye, look, { x: pose.x + c * lx - sn * 0.1, z: pose.z - sn * lx - c * 0.1, y: y + 0.1, hx: 0.5, hz: 0.75, h: 1.9, yaw: pose.h }, 4.5)) return id;
  return null;
};
const AIM_AP = { hoodPanel: 'hood', engineLid: 'lid', doorL: 'doorL', doorR: 'doorR', seatDriver: 'seatL', seatPassenger: 'seatR' };
import { buildById } from './home.js';
import { isPiece } from '../worlds/structures.js';
import { binText } from './bins.js';
import { isBin } from './binRules.js';
import { haulPrompt } from './junkRules.js';
import { junkWorld, isCleared, garageClean, onProperty, raceCarWorld, raceCarStage, SCRAP_HEAPS, heapTaken, bugAsleep, homeLocal } from './home.js';
import { jobById } from './jobs.js';
import { STANDS } from './stock.js';
import { standText } from './standActions.js';
import { toWorld as toW } from '../worlds/county.js';
import { CAMPER, walkingLevel, STAIRS, LOFT, inOffice, inWing, wingLevel } from '../worlds/office.js';
import { hasStage } from './upgrades.js';
import { sunDirection } from '../worlds/clock.js';
import { clockHour, SUN_FOLLOW } from './clock.js';
import { aimsAt, aimsAtBox, lookDir, wallBlocks } from './aim.js';   // one rule
import { pad } from './gamepad.js';
import { FEEL } from './restPose.js';
import { carFitReady } from './carSnap.js';
import { pickWork } from './workTarget.js';
import { workVehicles } from './projects.js';
import { zoneAt, isDriveable, missingToDrive } from '../rules/restore.js';
import { machineNear, planAtMachine } from './tireMachine.js';
import { aimingHeld } from '../placement/input.js';   // ?placement=1: Shift snaps (not runs) while a held item is aimed at a vehicle surface
const TRAILER_DOOR = (() => { const [x, z] = toW(SITES.garage, CAMPER.doorX, CAMPER.doorZ); return { x, z }; })();
import { finishPrompt } from './finishWork.js';
import { pressurePrompt } from './pressureWork.js';
import { aimDist } from './aim.js';
import { held, toolInHand, nameOfItem, sizeOf, inGarageZone, boxItems, carItems } from './items.js';
import { containers, containerById, CONTAINER_RULES } from './loot.js';
import { partById, partState, bodyById, wheelSetFits, wheelById } from '../build.js';
import { carLocal, fitCandidate, driveable, whyNotDrive, DEF, openCovers, planRemove } from './workshop.js';
import { isFitted } from '../rules/restore.js';

const PROMPTS = {
  shop: 'Press E — Baja parts shop', enter: 'Press E — Get in', exit: 'Press E — Get out', tarp: 'Press E — Look over the pickup', al: 'Press E — Talk to Al',
  peg: 'Press E — Pegboard: hang a tool, or take one', pc: 'Press E — Use the office PC', pump: 'Press E — Fill the tank ($0.80 a litre)', store: 'Press E — Corner store',
  letter: "Press E — Read the letter on the bench", breaker: 'Press E — Flip the main breaker', racecar: 'Press E — Pull the tarp back', trailer: "Press E — Grandpa's trailer", bench: 'Press E — Workbench (fabricate)', dealer: "Press E — Look over the '84 4x4 ($4,800)",
};
export const promptText = id => {
  if (id === 'racecar') return raceCarStage() === 0 ? 'Press E — Pull the tarp halfway back' : 'Press E — Pull the tarp off completely';
  if (!id) return '';
  if (id.startsWith('stand:')) return standText(id.slice(6));
  if (id === 'warehouse') return 'Press E — Salvage & Surplus: sell scrap, tires and parts';
  if (id === 'bug') return `Press E — Look over the Classic Bug ($1,800)`;
  if (id === 'openSwitch') return game.home?.open ? 'Press E — Turn the OPEN light off (close up)' : 'Press E — Turn the OPEN light on (open for business)';
  if (id === 'crank') return game.cranking ? 'Cranking…' : `Press E — Turn the key${game.crankTries ? ' again' : ''}  ·  G — Get out`;
  if (id === 'box:racecar') return boxItems('racecar').length ? "Press E — Strip grandpa's race car (shocks, rims, race tires)" : "Grandpa's old #7 — nothing left worth taking";
  if (id.startsWith('box:')) { const c = containerById[id.slice(4)], b = game.boxes[c.id]; return `Press E — ${b?.searched ? (boxItems(c.id).length ? 'Look in' : 'Empty:') : 'Search'} the ${CONTAINER_RULES[c.type].label}`; }
  if (id === 'job') { const j = game.job && jobById[game.job.id]; return j ? `Press E — Talk to ${j.who} (${j.title.toLowerCase()})` : ''; }
  if (id.startsWith('bin:')) return binText(+id.slice(4));
  if (id.startsWith('furn:')) { const q = game.props.find(o => o.uid === +id.slice(5)); return q ? `Press V — Move the ${(buildById[q.id]?.name || 'furniture').replace(/ \(.*\)/, '').toLowerCase()}` : ''; }
  if (id === 'tirem') { const p = planAtMachine(); return p ? (p.ok ? `Hold left click — ${p.verb}` : p.why) : ''; }
  if (id.startsWith('heap:')) return 'Click — Pick through the scrap heap';
  if (id.startsWith('junk:')) { const j = junkWorld.find(x => x.id === id.slice(5)); return j ? haulPrompt(game.home, j) : ''; }
  if (id.startsWith('veh:')) { const t = vehicleType(id.slice(4)); return t.kind === 'build' ? `Press E — Work on the ${t.name}` : `Press E — Get in the ${t.name}`; }
  if (id.startsWith('item:')) { const it = game.items.find(i => i.uid === +id.slice(5)); return it ? (it.kind === 'shell' ? `Press E — ${nameOfItem(it)}` : it.kind === 'memento' ? `Press E — Read ${nameOfItem(it)}  ·  Click — Hold it` : `Press E — Pick up ${nameOfItem(it)}  ·  Click — Hold it`) : ''; }   // left click picks up (main.jsx), E never does
  const h = held();
  if (id === 'install') return `Press E — Install ${h ? nameOfItem(h) : ''}`;
  if (id === 'load') return `Press E — Load ${h ? nameOfItem(h) : 'it'} into the car${game.build?.parts?.roofRack ? ' (or roof rack)' : ''}`;
  if (id.startsWith('car:')) { const c = game.carPlan || {}; return c.text || ''; }
  if (id === 'enter' && game.inGarage) return 'Press E — Get in';
  if (id === 'enter' && carItems().length) return 'Press E — Get in  ·  F — Take from the car  ·  Tab — Inventory';
  return PROMPTS[id] || '';
};
const fitsCar = it => { const b = game.build, body = b && bodyById[b.body]; if (!body) return false; return it.kind === 'part' ? partState(partById[it.id], body) === 'ok' : it.kind === 'wheel' ? wheelSetFits(wheelById[it.id], b.body) : true; };
/** what E does at the car from this side (blueprint §2.2 + §3.4) */
/** what the car offers right now, plus "R — Take off …" for the part you're aiming at (empty hands) */
function carAction(zone, ap, W) {   // W = the restorable vehicle you stand at (game/projects.js workVehicles via game.work); none = the active vehicle as before
  const a0 = carAction0(zone, ap, W), tl = toolInHand(), wr = game.home?.wear?.[game.active] || FRESH(), job = tl && (!W || W.active) && activeType().kind === 'build' ? serviceJob(wr, tl.id) : null;   // a tool in hand and something worn: hold T services it (wear.js)
  const worn = WEAR_PARTS.some(p => wr[p] > 0.05), a = job ? { ...a0, part: job, text: (a0.text ? a0.text + '  ·  ' : '') + `Hold T — ${SERVICE_VERB[job]} ($${partCost(wr, job)})` } : !tl && worn && (!W || W.active) && activeType().kind === 'build' && !held() ? { ...a0, look: true, text: (a0.text ? a0.text + '  ·  ' : '') + 'Hold T — Look the car over' } : a0;
  { const pp = pressurePrompt(); if (pp) return { ...a, text: pp }; }   // tire gauge or air chuck in hand: the prompt is the tire pressure
  { const fp = finishPrompt(); if (fp) return { ...a, text: fp }; }   // a grinder, spray can, buffer or hose in hand: the prompt is about the panel finish, not taking parts off
  if (game.aim && toolInHand() && (W || activeType().kind === 'build') && (W ? W.build : game.build)) {
    const pd = planRemove(game.aim, W ? W.build : game.build, zone), n = pd.name;
    const D = W?.def || DEF, t = pd.ok ? `Hold left click — Take off the ${n}` : pd.openCover ? `Hold left click — Open the ${D.covers[pd.openCover].name} to get at the ${n}` : pd.why;
    return { ...a, text: t + (a.text ? '  ·  ' + a.text : '') };
  }
  return a;
}
function carAction0(zone, ap, W) {   // ap = the part of the car the crosshair is on (game/carAim.js): doors, hood and lid only react to a precise look
  if (!W && activeType().kind !== 'build') return held() ? { type: 'why', why: '', text: `F — Load ${nameOfItem(held())} into the ${activeType().name}` } : { type: 'enter', text: `Press E — Get in  ·  F — Unload  ·  Tab — Inventory` };
  const b = W ? W.build : game.build; if (!b) return { type: 'none', text: '' };
  const D = W?.def || DEF, canEnter = !W || W.active;   // D: this vehicle's own definition (the Bug or the El Cajon); you can only sit in the car you drive
  const fc = fitCandidate(b, zone), h = toolInHand() ? null : held(), fcName = fc && (fc.plan.slotName || nameOfItem(fc.it) || 'part').toLowerCase();   // bolt-on upgrades blocked by a lid carry no slotName
  const where = zone === 'driver' || zone === 'passenger' ? '' : '';
  if (fc?.plan.ok) return { type: 'fit', uid: fc.it.uid, text: `Hold left click — Bolt on the ${fcName}${fc.it.loc === 'pack' ? ' (from pack)' : ''}` };
  if (fc?.plan.openCover) return { type: 'cover', id: fc.plan.openCover, text: `Press E — Open the ${D.covers[fc.plan.openCover].name} to fit the ${fcName}` };
  if (h) return { type: 'why', why: fc?.plan.why, text: `${fc?.plan.why || ''}${canEnter ? '  ·  F — put it in the car' : ''}` };
  const cover = D.covers[game.look] ? game.look : ap === 'lid' ? 'engineLid' : ap === 'hood' ? 'hoodPanel' : null;   // anything the crosshair is on that opens: lid, hood, doors, tailgate
  if (cover && isFitted(D, b, cover)) { const o = openCovers().has(cover); return { type: 'cover', id: cover, text: `Press E — ${o ? 'Close' : 'Open'} the ${D.covers[cover].name}` }; }
  if (ap === 'doorL' || ap === 'doorR') {   // look at the handle: E opens or closes that door
    const hasDoor = isFitted(D, b, ap), o = openCovers().has(ap);
    if (hasDoor) return { type: 'cover', id: ap, text: `Press E — ${o ? 'Close' : 'Open'} the ${D.covers[ap].name}` };
    return { type: 'none', text: 'No door on this side' };
  }
  if ((ap === 'seatL' || ap === 'seatR') && !canEnter && game.fleet?.[W.id]?.pose) return { type: 'veh', id: W.id, text: `Press E — Take the ${vehicleType(W.id).name} out (you're driving the ${activeType().name})` };   // a parked car of yours: E makes it the one you drive, then the seat works as usual
  if ((ap === 'seatL' || ap === 'seatR') && !canEnter) return { type: 'why', why: '', text: `This isn't the car you're driving (${W.name || W.id}). Park the ${activeType().name} and take this one out first.` };
  if ((ap === 'seatL' || ap === 'seatR') && canEnter) {   // look at a seat: E sits
    const door = ap === 'seatL' ? 'doorL' : 'doorR', hasDoor = isFitted(D, b, door);
    if (driveable(b)) return { type: 'enter', door: hasDoor ? door : null, text: `Press E — Sit in the ${ap === 'seatL' ? "driver's" : 'passenger'} seat` };
    return { type: 'why', why: whyNotDrive(b), text: `${whyNotDrive(b)}` };
  }
  if (W && !W.active && D.id === 'cajon' && !h) {   // the El Cajon project: once it runs, E takes it as your truck (game/cajonGift.js promoteCajon)
    if (isDriveable(D, b)) return { type: 'drive', uid: W.uid, text: 'Press E — Get in the El Cajon' };
    return { type: 'none', text: `Can't drive yet: ${missingToDrive(D, b).map(s => (s.name || s.id).toLowerCase()).slice(0, 3).join(', ')}` };
  }
  return { type: 'none', text: '' };
}
// PROPOSAL (design guesses): aim volumes for fixed targets. r = how far the crosshair may be from the centre line, h = height, dy = height of the base above the floor.
const AIM_DEFAULT = { r: 1.0, h: 1.8 };
const ITEM_AIM = { 1: { r: 0.17, h: 0.3 }, 2: { r: 0.25, h: 0.4 }, 3: { r: 0.34, h: 0.5 }, 4: { r: 0.42, h: 0.6 } };   // an item's hit volume by its size: about the size of the crate it is drawn as
const AIM_TARGET = { tarp: { r: 1.4, h: 0.8 }, al: { r: 1.0, h: 1.8 }, bench: { r: 1.3, h: 1.2 }, letter: { r: 0.4, h: 0.2, dy: 0.98 }, breaker: { r: 0.5, h: 1.0, dy: 0.9 }, openSwitch: { r: 0.6, h: 1.2, dy: 0.5 }, pump: { r: 0.8, h: 1.8 }, store: { r: 2.5, h: 3.0 } };
const SHOP = SITES.shop, PUMPS = TARGETS.filter(t => t.id === 'pump');

/** First-person player on foot. Active while `game.onFoot`; otherwise the car is driven. Also decides what "Press E" would do right now. */
let promptErr = false;
let wallCache = { src: null, list: [] };
export default function Walker({ world, sun }) {
  const { camera, gl } = useThree();
  const st = useRef({ x: 0, z: 0, y: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, t: 0, keys: {}, on: false });
  useEffect(() => {
    const s = st.current, el = gl.domElement;
    window.__walk = s;   // test hook
    const move = e => { if (!game.onFoot || game.flyMode || document.pointerLockElement !== el || game.paused) return; const [kx, ky] = lookScale(); s.yaw -= e.movementX * 0.0022 * kx; s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch - e.movementY * 0.0022 * ky)); };
    const kd = e => { s.keys[e.code] = true; }, ku = e => { s.keys[e.code] = false; }, blur = () => { s.keys = {}; };
    window.addEventListener('mousemove', move); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); camera.rotation.order = 'XYZ'; };
  }, [camera, gl]);

  useFrame((_, rawDt) => {
    const s = st.current, dt = Math.min(rawDt, 0.05);
    if (game.paused || game.flyMode) return;
    if (pad.on && game.onFoot && (pad.lookX || pad.lookY)) { const [kx, ky] = lookScale(); s.yaw -= pad.lookX * dt * 2.6 * kx; s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch - pad.lookY * dt * 2.0 * ky)); }   // right stick looks
    if (game.teleportTo && game.onFoot) { const t = game.teleportTo; game.teleportTo = null; s.x = t.x; s.z = t.z; if (!t.keepYaw) s.yaw = t.h + Math.PI; s.y = world.height(t.x, t.z) + 0.3; s.vx = s.vz = 0; }   // Admin > Races: go to a course
    if (game.onFoot) {
      if (!s.on) {   // just stepped out (or the scene was rebuilt): take the saved spot
        s.on = true; s.vx = s.vz = 0; s.pitch = 0;
        const at = game.walkStart || game.walkPose || { x: 0, z: 0, yaw: 0 }; game.walkStart = null;
        s.x = at.x; s.z = at.z; s.yaw = at.yaw; s.y = at.y ?? world.height(s.x, s.z); camera.rotation.order = 'YXZ'; camera.fov = settings().fov; camera.updateProjectionMatrix();
      }
      const k = s.keys, fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), side = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      const hs = held() ? sizeOf(held().kind, held().id) : 0, load = hs >= 4 ? 0.55 : hs >= 3 ? 0.75 : hs ? 0.9 : 1;
      const speed = ((k.ShiftLeft || k.ShiftRight) && !aimingHeld() ? 6 : 3.2) * load, len = Math.hypot(fwd, side) || 1;
      const wx = (-Math.sin(s.yaw) * fwd + Math.cos(s.yaw) * side) / len * speed, wz = (-Math.cos(s.yaw) * fwd - Math.sin(s.yaw) * side) / len * speed;
      s.vx += (wx - s.vx) * Math.min(1, dt * 10); s.vz += (wz - s.vz) * Math.min(1, dt * 10);
      const oldX = s.x, oldZ = s.z;
      s.x += s.vx * dt; s.z += s.vz * dt;
      const car = game.pose;
      for (let pass = 0; pass < 2; pass++) {
        for (const [cx, cz, r, top, bottom] of world.trunks ? [...world.obstacles, ...world.trunks(s.x, s.z)] : world.obstacles) { if (Number.isFinite(top) && top !== 99 && s.y >= top - 0.05) continue; if (bottom != null && s.y < bottom) continue; const dx = s.x - cx, dz = s.z - cz, rr = r + 0.3; if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue; const d = Math.hypot(dx, dz); if (d < rr && d > 1e-4) { s.x += dx / d * (rr - d); s.z += dz / d * (rr - d); } }
        if (car) for (const o of (activeType().length > 4.5 ? [-1.9, -0.65, 0.65, 1.9] : [-1.3, 0, 1.3])) { const cx = car.x + Math.sin(car.h) * o, cz = car.z + Math.cos(car.h) * o, dx = s.x - cx, dz = s.z - cz, rr = 1.3 + 0.3, d = Math.hypot(dx, dz); if (d < rr && d > 1e-4) { s.x += dx / d * (rr - d); s.z += dz / d * (rr - d); } }
      }
      { const bd = world.bounds || { x0: -world.half, x1: world.half, z0: -world.half, z1: world.half }; s.x = Math.max(bd.x0, Math.min(bd.x1, s.x)); s.z = Math.max(bd.z0, Math.min(bd.z1, s.z)); }
      let floor = world.height(s.x, s.z);
      if (world.id === 'county') {
        const before = homeLocal(oldX, oldZ), next = homeLocal(s.x, s.z), level = s.y - SITES.garage.y;
        const onStairs = before.lx >= STAIRS.x0 && before.lx <= STAIRS.x1 && before.lz > STAIRS.z0 && before.lz < STAIRS.z1;
        const rail = onStairs && (next.lx < STAIRS.x0 || next.lx > STAIRS.x1)
          || level > 2.6 && before.lz <= LOFT.z1 && next.lz > LOFT.z1 && (next.lx < STAIRS.x0 || next.lx > STAIRS.x1);
        const target = walkingLevel(next.lx, next.lz, level);
        if (rail || inOffice(next.lx, next.lz) && target > Math.max(0.12, level) + 0.4) { s.x = oldX; s.z = oldZ; s.vx = 0; s.vz = 0; }
        // the wing's second floor (stage office3): the stair and upstairs floor; a step too high or a drop off the edge is a wall
        const up = hasStage('office3');
        if (up && inWing(next.lx, next.lz)) { const t = wingLevel(next.lx, next.lz, level); if (t > Math.max(0.12, level) + 0.4 || t < level - 0.5) { s.x = oldX; s.z = oldZ; s.vx = 0; s.vz = 0; } }
        const at = homeLocal(s.x, s.z);
        floor = world.height(s.x, s.z);
        if (inOffice(at.lx, at.lz)) floor = Math.max(floor, SITES.garage.y + walkingLevel(at.lx, at.lz, level));
        if (up && inWing(at.lx, at.lz)) floor = Math.max(floor, SITES.garage.y + wingLevel(at.lx, at.lz, level));
      }
      s.y += (floor - s.y) * Math.min(1, dt * 16);
      s.t += Math.hypot(s.vx, s.vz) * dt * 2.1;
      const bob = Math.sin(s.t) * 0.028 * Math.min(1, Math.hypot(s.vx, s.vz) / 3);
      camera.position.set(s.x, s.y + 1.72 + bob, s.z); camera.rotation.set(s.pitch, s.yaw, 0);
      if (camera.fov !== settings().fov) { camera.fov = settings().fov; camera.updateProjectionMatrix(); }
      game.pos.x = s.x; game.pos.z = s.z; game.walkPose = { x: s.x, y: s.y, z: s.z, yaw: s.yaw };
      game.face.x = -Math.sin(s.yaw); game.face.z = -Math.cos(s.yaw);
      if (sun.current) { const [dx, dy, dz] = sunDirection(clockHour()); sun.current.position.set(s.x + dx * SUN_FOLLOW, s.y + dy * SUN_FOLLOW, s.z + dz * SUN_FOLLOW); sun.current.target.position.set(s.x, s.y, s.z); sun.current.target.updateMatrixWorld(); }
    } else s.on = false;

    // ---- what would E do right now? ----  (guarded: an error here must never stop the frame, or the whole screen goes black)
    try {
    const px = game.pos.x, pz = game.pos.z, foot = game.onFoot, pose = game.pose;
    let best = null, bd = 1e9;
    const eye = { x: camera.position.x, y: camera.position.y, z: camera.position.z }, look = lookDir(s.yaw, s.pitch);
    // shape = { r, h, dy } vertical post (radius, height, offset above the floor you stand on) or { box:{hx,hz,h,yaw} }. On foot the view ray must pass through it.
    if (wallCache.src !== world.obstacles) wallCache = { src: world.obstacles, list: world.obstacles.filter(c => c[3] === 99) };   // solid walls only: nothing can be reached through them
    const consider = (id, x, z, r, face, bonus = 1, shape = AIM_DEFAULT) => {
      const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz); if (d > r) return;
      if (foot && wallBlocks(eye, x, z, shape.own ? wallCache.list.filter(w => Math.hypot(w[0] - x, w[1] - z) > w[2] + 0.7) : wallCache.list)) return;   // own: a bin or chest is solid itself, so its own circle must not block the view of it
   // (cheap distance first: the terrain height below is costly and most targets are far away)
      if (foot && world.id === 'county' && s.y > world.height(x, z) + 1.4) return;
      if (foot && !(shape.box ? aimsAtBox(eye, look, { x, z, y: s.y, ...shape.box }, r) : aimsAt(eye, look, { x, z, y: s.y + (shape.dy || 0), h: shape.h, r: shape.r }, r))) return;
      if (d * bonus < bd) { bd = d * bonus; best = id; }
      return d;   // reached and aimed at: how far
    };
    if (Math.hypot(px - SHOP.x, pz - SHOP.z) < 11) consider('shop', SHOP.x, SHOP.z, 11, false, 1, { r: 3.5, h: 4 });
    let nearPump = false;
    for (const t of TARGETS) {
      if (t.id === 'pump') { if (Math.hypot(px - t.x, pz - t.z) < 14) nearPump = true; if (!foot && game.fueled) continue; }
      if (!foot && !t.car) continue;
      if (t.id === 'bench') { const b = nearestProp(game.props, 'workbench', px, pz); if (!b) continue; const [bx, bz] = benchSpot(b); consider('bench', bx, bz, t.r, t.face, t.bonus || 1, AIM_TARGET.bench); continue; }   // Stage 4d: the workbench is a prop, E works wherever it stands
      consider(t.id, t.x, t.z, t.r, t.face, t.bonus || 1, AIM_TARGET[t.id]);
    }
    if (!nearPump) game.fueled = false;
    if (foot) { const [wx, wz] = toW(SITES.warehouse, -9.4, 0); consider('warehouse', wx, wz, 3.2, false, 0.8, { r: 0.9, h: 1.5 }); }   // the scrap buyer's counter
    if (foot) for (const st of STANDS) { const [sx, sz] = toW(SITES.garage, st.lx, st.lz); consider('stand:' + st.id, sx, sz, 3.0, false, 0.7, { r: 0.55, h: 1.7 }); }   // Walt's supply stands
    if (foot) for (const q of game.props) if (isBin(q.id)) consider('bin:' + q.uid, q.x, q.z, 2.4, false, 0.85, { r: 0.6, h: 1.1, own: true });   // bins, tool chests and racks hold things
    if (foot) { const pc = nearestProp(game.props, 'computer', px, pz); if (pc) consider('pc', pc.x, pc.z, 2.2, false, 0.9, { r: 1.1, h: 1.2 }); }
    if (foot && held()) { const tm = machineNear(); if (tm && planAtMachine()) consider('tirem', tm.x, tm.z, 2.8, false, 0.8, { r: 1.0, h: 1.6 }); }   // a wheel, rim or tire in hand, at the tire machine
    if (foot) { const pb = nearestProp(game.props, 'pegboard', px, pz); if (pb) consider('peg', pb.x, pb.z, 4.5, false, 0.9, { box: { hx: PEG.w / 2, hz: 0.6, y: s.y + PEG.y - PEG.h / 2, h: PEG.h, yaw: pb.ry || 0 } }); }
    const cl = foot && pose ? carLocal() : null;
    game.nearCar = !!cl?.near; game.carZone = cl?.zone || null;
    const wv = foot && !game.buildMode ? pickWork({ x: px, z: pz }, workVehicles()) : null;   // the restorable vehicle you stand at: the Bug, or a donor / project
    game.work = wv ? { id: wv.id, active: wv.v.active, uid: wv.v.uid, name: wv.v.name, build: wv.v.build, pose: wv.v.pose, width: wv.v.width, length: wv.v.length, def: wv.v.def, lx: wv.lx, lz: wv.lz, zone: zoneAt(wv.v.def, wv.lx, wv.lz) } : null;
    game.inGarage = !!pose && inGarageZone(px, pz) && inGarageZone(pose.x, pose.z);
    // loose items: the hit volume is the size of the item, and the pick is the FIRST item the view ray reaches (not the nearest to your feet, not one behind the thing you look at)
    let aimedItem = null, aimedD = 1e9;
    if (foot) for (const it of game.items) if (it.loc === 'world') {
      if (it.kind === 'shell') { consider('item:' + it.uid, it.x, it.z, 3.6, true, 0.5, { r: 0.9, h: 0.9, dy: it.y || 0 }); continue; }
      const dx = it.x - px, dz = it.z - pz; if (dx * dx + dz * dz > 5.76) continue;   // 2.4 m
      const sz = ITEM_AIM[sizeOf(it.kind, it.id)] || ITEM_AIM[2], onTop = (it.y || 0) > 0.5;   // onTop: lying on a bench or shelf, so the furniture's own solid circles must not hide it
      if (wallBlocks(eye, it.x, it.z, onTop ? wallCache.list.filter(w => Math.hypot(w[0] - it.x, w[1] - it.z) > w[2] + 0.7) : wallCache.list)) continue;
      const d = aimDist(eye, look, { x: it.x, z: it.z, y: s.y + (it.y || 0), h: sz.h, r: sz.r }, 2.4);
      if (d !== null && d < aimedD) { aimedD = d; aimedItem = 'item:' + it.uid; }
    }
    if (aimedItem && !(best && !best.startsWith('item:') && best !== 'bench' && bd < aimedD * 0.5)) { best = aimedItem; bd = Math.min(bd, aimedD * 0.5); }
    if (foot) for (const c of containers) { if (c.id === 'racecar' && raceCarStage() < 2) continue; consider('box:' + c.id, c.x, c.z, c.type === 'car' ? 3.4 : 2.2, c.type !== 'car', 0.55, c.type === 'car' ? { r: 1.3, h: 1.5 } : { r: 0.8, h: 1.1 }); }
    if (foot && raceCarStage() < 2) consider('racecar', raceCarWorld.x, raceCarWorld.z, 3.6, false, 0.6, { r: 1.6, h: 1.5 });
    if (foot) for (const h of SCRAP_HEAPS) if (!heapTaken(h.id)) consider('heap:' + h.id, h.x, h.z, 2.6, true, 0.6, { r: 1.2, h: 1.0 });
    if (foot && game.job) consider('job', game.job.x, game.job.z, 4.6, false, 0.5, { r: 1.0, h: 1.9 });
    if (foot) consider('trailer', TRAILER_DOOR.x, TRAILER_DOOR.z, 2.6, false, 0.8, { r: 0.9, h: 2.0 });
    if (foot) for (const j of junkWorld) if (!isCleared(j.id)) consider('junk:' + j.id, j.x, j.z, 2.8, true, 0.6, { r: 0.8, h: 0.9 });
    if (foot) for (const v of standingVehicles()) { const t = vehicleType(v.id), l = localTo(v.pose, px, pz); if (Math.abs(l.lx) < t.width / 2 + 1.9 && Math.abs(l.lz) < t.length / 2 + 1.6) consider(v.forSale ? 'dealer' : 'veh:' + v.id, v.pose.x, v.pose.z, 9, false, 0.7, { box: { hx: t.width / 2, hz: t.length / 2, h: 1.7, yaw: v.pose.h } }); }
    const W = game.work, wAimed = !!W && aimsAtBox(eye, look, { x: W.pose.x, z: W.pose.z, y: s.y, hx: W.width / 2 + 0.1, hz: W.length / 2, h: 1.7, yaw: W.pose.h }, 4.5);
    if (W && (wAimed || carFitReady()) && (!best || bd > 0.9) && (W.id !== 'bug' || game.owned.has('car:bug') || game.dev)) {
      game.carPlan = carAction(W.zone, AIM_AP[game.look] || seatAim(eye, look, W.pose, s.y), W); best = 'car:' + game.carPlan.type;   // work in place on this vehicle (its own parts)
    } else if (pose) {
      const bt = activeType(), carAimed = foot && cl?.near && aimsAtBox(eye, look, { x: pose.x, z: pose.z, y: s.y, hx: bt.width / 2 + 0.1, hz: bt.length / 2, h: 1.7, yaw: pose.h }, 4.5);   // the car itself (door/hood/boot zone still comes from where you stand)
      if ((carAimed || carFitReady()) && (!best || bd > 0.9)) {   // holding a part that fits: the car is the target even when the crosshair is on the empty hub
        if (!(game.owned.has('car:bug') || game.dev)) best = 'bug';
        else { game.carPlan = carAction(cl.zone, activeType().kind === 'build' ? AIM_AP[game.look] || seatAim(eye, look, pose, s.y) : null); best = 'car:' + game.carPlan.type; }
      }
      else if (!foot && bugAsleep()) best = 'crank';
      else if (!foot && !best && Math.abs(game.speed) < 4) best = 'exit';
    }
    if (game.buildMode) best = null;
    game.onProperty = foot && onProperty(px, pz); game.canBuild = game.onProperty && garageClean();
    if (foot && !best && !game.buildMode && game.canBuild) {   // Stage 4f: furniture is picked up by clicking it, no build menu needed
      const fp = aimedProp(game.props.filter(q => !isPiece(q.id)).map(q => ({ uid: q.uid, x: q.x, z: q.z, r: buildById[q.id]?.pickR ?? buildById[q.id]?.r })), px, pz, game.face, 5, { origin: eye, dir: look });
      if (fp) { const q = game.props.find(o => o.uid === fp.uid); if (!q || !wallBlocks(eye, q.x, q.z, wallCache.list)) best = 'furn:' + fp.uid; }
    }
    game.target = best; setPrompt(game.buildMode ? '' : promptText(best));
    } catch (err) { if (!promptErr) { promptErr = true; console.error('[walker] prompt failed (game keeps running):', err); } game.target = null; setPrompt(''); }
  });
  return null;
}
