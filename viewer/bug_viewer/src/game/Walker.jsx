import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { game, setPrompt } from './store.js';
import { lookScale, settings } from './settings.js';
import { TARGETS } from '../worlds/siteData.js';
import { SITES } from '../worlds/county.js';
import { activeType, vehicleType, localTo, standingVehicles } from './fleet.js';
import { nearestProp, benchSpot, PEG } from './fixtures.js';
import { aimedProp } from './furnish.js';
import { buildById } from './home.js';
import { isPiece } from '../worlds/structures.js';
import { junkWorld, isCleared, garageClean, onProperty, raceCarWorld, raceCarStage, SCRAP_HEAPS, heapTaken, bugAsleep, homeLocal } from './home.js';
import { jobById } from './jobs.js';
import { toWorld as toW } from '../worlds/county.js';
import { CAMPER, walkingLevel, STAIRS, LOFT, inOffice } from '../worlds/office.js';
import { sunDirection } from '../worlds/clock.js';
import { clockHour, SUN_FOLLOW } from './clock.js';
import { aimsAt, aimsAtBox, lookDir } from './aim.js';   // one rule for prompt, E and click: the crosshair must be on the thing
import { aimingHeld } from '../placement/input.js';   // ?placement=1: Shift snaps (not runs) while a held item is aimed at a vehicle surface
const TRAILER_DOOR = (() => { const [x, z] = toW(SITES.garage, CAMPER.doorX, CAMPER.doorZ); return { x, z }; })();
import { held, nameOfItem, sizeOf, inGarageZone, boxItems, carItems } from './items.js';
import { containers, containerById, CONTAINER_RULES } from './loot.js';
import { partById, partState, bodyById, wheelSetFits, wheelById } from '../build.js';
import { carLocal, fitCandidate, driveable, whyNotDrive, DEF, openCovers, planDetach } from './workshop.js';
import { isFitted } from '../rules/restore.js';

const PROMPTS = {
  shop: 'Press E — Baja parts shop', enter: 'Press E — Get in', exit: 'Press E — Get out', tarp: 'Press E — Look over the pickup', al: 'Press E — Talk to Al',
  peg: 'Press E — Pegboard: hang a tool, or take one', pc: 'Press E — Use the office PC', pump: 'Press E — Fill the tank ($25)', store: 'Press E — Corner store',
  letter: "Press E — Read the letter on the bench", breaker: 'Press E — Flip the main breaker', racecar: 'Press E — Pull the tarp back', trailer: "Press E — Grandpa's trailer", bench: 'Press E — Workbench (fabricate)', dealer: "Press E — Look over the '84 4x4 ($4,800)",
};
export const promptText = id => {
  if (id === 'racecar') return raceCarStage() === 0 ? 'Press E — Pull the tarp halfway back' : 'Press E — Pull the tarp off completely';
  if (!id) return '';
  if (id === 'bug') return `Press E — Look over the Classic Bug ($1,800)`;
  if (id === 'openSwitch') return game.home?.open ? 'Press E — Turn the OPEN light off (close up)' : 'Press E — Turn the OPEN light on (open for business)';
  if (id === 'crank') return game.cranking ? 'Cranking…' : `Press E — Turn the key${game.crankTries ? ' again' : ''}  ·  G — Get out`;
  if (id === 'box:racecar') return boxItems('racecar').length ? "Press E — Strip grandpa's race car (shocks, rims, race tires)" : "Grandpa's old #7 — nothing left worth taking";
  if (id.startsWith('box:')) { const c = containerById[id.slice(4)], b = game.boxes[c.id]; return `Press E — ${b?.searched ? (boxItems(c.id).length ? 'Look in' : 'Empty:') : 'Search'} the ${CONTAINER_RULES[c.type].label}`; }
  if (id === 'job') { const j = game.job && jobById[game.job.id]; return j ? `Press E — Talk to ${j.who} (${j.title.toLowerCase()})` : ''; }
  if (id.startsWith('furn:')) { const q = game.props.find(o => o.uid === +id.slice(5)); return q ? `Click — Move the ${(buildById[q.id]?.name || 'furniture').replace(/ \(.*\)/, '').toLowerCase()}` : ''; }
  if (id.startsWith('heap:')) return 'Click — Pick through the scrap heap';
  if (id.startsWith('junk:')) { const j = junkWorld.find(x => x.id === id.slice(5)); return j ? `Press E — Clear out ${j.label}` : ''; }
  if (id.startsWith('veh:')) { const t = vehicleType(id.slice(4)); return t.kind === 'build' ? `Press E — Work on the ${t.name}` : `Press E — Get in the ${t.name}`; }
  if (id.startsWith('item:')) { const it = game.items.find(i => i.uid === +id.slice(5)); return it ? (it.kind === 'shell' ? `Press E — ${nameOfItem(it)}` : it.kind === 'memento' ? `Press E — Read ${nameOfItem(it)}  ·  Click — Pick up` :`Click — Pick up ${nameOfItem(it)}`) : ''; }   // left click picks up (main.jsx), E never does
  const h = held();
  if (id === 'install') return `Press E — Install ${h ? nameOfItem(h) : ''}`;
  if (id === 'load') return `Press E — Load ${h ? nameOfItem(h) : 'it'} into the car${game.build?.parts?.roofRack ? ' (or roof rack)' : ''}`;
  if (id.startsWith('car:')) { const c = game.carPlan || {}; return c.text || ''; }
  if (id === 'enter' && game.inGarage) return 'Press E — Get in  ·  X — Take a part off';
  if (id === 'enter' && carItems().length) return 'Press E — Get in  ·  F — Take from the car  ·  Tab — Inventory';
  return PROMPTS[id] || '';
};
const fitsCar = it => { const b = game.build, body = b && bodyById[b.body]; if (!body) return false; return it.kind === 'part' ? partState(partById[it.id], body) === 'ok' : it.kind === 'wheel' ? wheelSetFits(wheelById[it.id], b.body) : true; };
/** what E does at the car from this side (blueprint §2.2 + §3.4) */
/** what the car offers right now, plus "R — Take off …" for the part you're aiming at (empty hands) */
function carAction(zone) {
  const a = carAction0(zone);
  if (game.aim && !held() && activeType().kind === 'build' && game.build) {
    const pd = planDetach(game.aim, game.build, zone), n = DEF.slots.find(s => s.id === game.aim)?.name.toLowerCase();
    const t = pd.ok ? `R — Take off the ${n}` : pd.openCover ? `R — Open the ${DEF.covers[pd.openCover].name} to get at the ${n}` : pd.why;
    return { ...a, text: t + (a.text ? '  ·  ' + a.text : '') };
  }
  return a;
}
function carAction0(zone) {
  if (activeType().kind !== 'build') return held() ? { type: 'why', why: '', text: `F — Load ${nameOfItem(held())} into the ${activeType().name}` } : { type: 'enter', text: `Press E — Get in  ·  F — Unload  ·  Tab — Inventory` };
  const b = game.build; if (!b) return { type: 'none', text: '' };
  const fc = fitCandidate(b, zone), h = held(), fcName = fc && (fc.plan.slotName || nameOfItem(fc.it) || 'part').toLowerCase();   // bolt-on upgrades blocked by a lid carry no slotName
  const where = zone === 'driver' || zone === 'passenger' ? '' : '';
  if (fc?.plan.ok) return { type: 'fit', uid: fc.it.uid, text: `Press E — Bolt on the ${fcName}${fc.it.loc === 'pack' ? ' (from pack)' : ''}` };
  if (fc?.plan.openCover) return { type: 'cover', id: fc.plan.openCover, text: `Press E — Open the ${DEF.covers[fc.plan.openCover].name} to fit the ${fcName}` };
  if (h) return { type: 'why', why: fc?.plan.why, text: `${fc?.plan.why || ''}  ·  F — put it in the car` };
  const cover = zone === 'rear' ? 'engineLid' : zone === 'front' ? 'hoodPanel' : null;
  if (cover && isFitted(DEF, b, cover)) { const o = openCovers().has(cover); return { type: 'cover', id: cover, text: `Press E — ${o ? 'Close' : 'Open'} the ${DEF.covers[cover].name}  ·  X — Workshop` }; }
  if (zone === 'driver' || zone === 'passenger') {
    const door = zone === 'driver' ? 'doorL' : 'doorR', hasDoor = isFitted(DEF, b, door), dn = DEF.covers[door].name, o = openCovers().has(door);
    const q = hasDoor ? `  ·  Q — ${o ? 'Close' : 'Open'} the door` : '';
    if (driveable(b)) return { type: 'enter', door: hasDoor ? door : null, text: `Press E — Get in${q}  ·  X — Workshop${where}` };
    if (hasDoor) return { type: 'cover', id: door, text: `Press E — ${o ? 'Close' : 'Open'} the ${dn}  ·  ${whyNotDrive(b)}` };
    return { type: 'why', why: whyNotDrive(b), text: `${whyNotDrive(b)}  ·  X — Workshop` };
  }
  return { type: 'none', text: 'X — Workshop' };
}
// PROPOSAL (design guesses): aim volumes for fixed targets. r = how far the crosshair may be from the centre line, h = height, dy = height of the base above the floor.
const AIM_DEFAULT = { r: 1.0, h: 1.8 };
const AIM_TARGET = { tarp: { r: 1.4, h: 0.8 }, al: { r: 1.0, h: 1.8 }, bench: { r: 1.3, h: 1.2 }, letter: { r: 0.4, h: 0.2, dy: 0.98 }, breaker: { r: 0.5, h: 1.0, dy: 0.9 }, openSwitch: { r: 0.6, h: 1.2, dy: 0.5 }, pump: { r: 0.8, h: 1.8 }, store: { r: 2.5, h: 3.0 } };
const SHOP = SITES.shop, PUMPS = TARGETS.filter(t => t.id === 'pump');

/** First-person player on foot. Active while `game.onFoot`; otherwise the car is driven. Also decides what "Press E" would do right now. */
let promptErr = false;
export default function Walker({ world, sun }) {
  const { camera, gl } = useThree();
  const st = useRef({ x: 0, z: 0, y: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, t: 0, keys: {}, on: false });
  useEffect(() => {
    const s = st.current, el = gl.domElement;
    window.__walk = s;   // test hook
    const move = e => { if (!game.onFoot || document.pointerLockElement !== el || game.paused) return; const [kx, ky] = lookScale(); s.yaw -= e.movementX * 0.0022 * kx; s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch - e.movementY * 0.0022 * ky)); };
    const kd = e => { s.keys[e.code] = true; }, ku = e => { s.keys[e.code] = false; }, blur = () => { s.keys = {}; };
    window.addEventListener('mousemove', move); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); camera.rotation.order = 'XYZ'; };
  }, [camera, gl]);

  useFrame((_, rawDt) => {
    const s = st.current, dt = Math.min(rawDt, 0.05);
    if (game.paused) return;
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
        for (const [cx, cz, r, top] of world.trunks ? [...world.obstacles, ...world.trunks(s.x, s.z)] : world.obstacles) { if (Number.isFinite(top) && top !== 99 && s.y >= top - 0.05) continue; const dx = s.x - cx, dz = s.z - cz, rr = r + 0.3; if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue; const d = Math.hypot(dx, dz); if (d < rr && d > 1e-4) { s.x += dx / d * (rr - d); s.z += dz / d * (rr - d); } }
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
        const at = homeLocal(s.x, s.z);
        floor = world.height(s.x, s.z);
        if (inOffice(at.lx, at.lz)) floor = Math.max(floor, SITES.garage.y + walkingLevel(at.lx, at.lz, level));
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
    const consider = (id, x, z, r, face, bonus = 1, shape = AIM_DEFAULT) => {
      if (foot && world.id === 'county' && s.y > world.height(x, z) + 1.4) return;
      const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz); if (d > r) return;
      if (foot && !(shape.box ? aimsAtBox(eye, look, { x, z, y: s.y, ...shape.box }, r) : aimsAt(eye, look, { x, z, y: s.y + (shape.dy || 0), h: shape.h, r: shape.r }, r))) return;
      if (d * bonus < bd) { bd = d * bonus; best = id; }
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
    if (foot) { const pc = nearestProp(game.props, 'computer', px, pz); if (pc) consider('pc', pc.x, pc.z, 2.2, false, 0.9, { r: 1.1, h: 1.2 }); }
    if (foot) { const pb = nearestProp(game.props, 'pegboard', px, pz); if (pb) consider('peg', pb.x, pb.z, 4.5, false, 0.9, { box: { hx: PEG.w / 2, hz: 0.6, y: s.y + PEG.y - PEG.h / 2, h: PEG.h, yaw: pb.ry || 0 } }); }
    const cl = foot && pose ? carLocal() : null;
    game.nearCar = !!cl?.near; game.carZone = cl?.zone || null;
    game.inGarage = !!pose && inGarageZone(px, pz) && inGarageZone(pose.x, pose.z);
    if (foot) for (const it of game.items) if (it.loc === 'world') consider('item:' + it.uid, it.x, it.z, it.kind === 'shell' ? 3.6 : 2.4, true, 0.5, it.kind === 'shell' ? { r: 0.9, h: 0.9, dy: it.y || 0 } : { r: 0.45, h: 0.5, dy: it.y || 0 });
    if (foot) for (const c of containers) { if (c.id === 'racecar' && raceCarStage() < 2) continue; consider('box:' + c.id, c.x, c.z, c.type === 'car' ? 3.4 : 2.2, c.type !== 'car', 0.55, c.type === 'car' ? { r: 1.3, h: 1.5 } : { r: 0.8, h: 1.1 }); }
    if (foot && raceCarStage() < 2) consider('racecar', raceCarWorld.x, raceCarWorld.z, 3.6, false, 0.6, { r: 1.6, h: 1.5 });
    if (foot) for (const h of SCRAP_HEAPS) if (!heapTaken(h.id)) consider('heap:' + h.id, h.x, h.z, 2.6, true, 0.6, { r: 1.2, h: 1.0 });
    if (foot && game.job) consider('job', game.job.x, game.job.z, 4.6, false, 0.5, { r: 1.0, h: 1.9 });
    if (foot) consider('trailer', TRAILER_DOOR.x, TRAILER_DOOR.z, 2.6, false, 0.8, { r: 0.9, h: 2.0 });
    if (foot) for (const j of junkWorld) if (!isCleared(j.id)) consider('junk:' + j.id, j.x, j.z, 2.8, true, 0.6, { r: 0.8, h: 0.9 });
    if (foot) for (const v of standingVehicles()) { const t = vehicleType(v.id), l = localTo(v.pose, px, pz); if (Math.abs(l.lx) < t.width / 2 + 1.9 && Math.abs(l.lz) < t.length / 2 + 1.6) consider(v.forSale ? 'dealer' : 'veh:' + v.id, v.pose.x, v.pose.z, 9, false, 0.7, { box: { hx: t.width / 2, hz: t.length / 2, h: 1.7, yaw: v.pose.h } }); }
    if (pose) {
      const bt = activeType(), carAimed = foot && cl?.near && aimsAtBox(eye, look, { x: pose.x, z: pose.z, y: s.y, hx: bt.width / 2 + 0.1, hz: bt.length / 2, h: 1.7, yaw: pose.h }, 4.5);   // the car itself (door/hood/boot zone still comes from where you stand)
      if (carAimed && (!best || bd > 0.9)) {
        if (!(game.owned.has('car:bug') || game.dev)) best = 'bug';
        else { game.carPlan = carAction(cl.zone); best = 'car:' + game.carPlan.type; }
      }
      else if (!foot && bugAsleep()) best = 'crank';
      else if (!foot && !best && Math.abs(game.speed) < 4) best = 'exit';
    }
    if (game.buildMode) best = null;
    game.onProperty = foot && onProperty(px, pz); game.canBuild = game.onProperty && garageClean();
    if (foot && !best && !game.buildMode && game.canBuild) {   // Stage 4f: furniture is picked up by clicking it, no build menu needed
      const fp = aimedProp(game.props.filter(q => !isPiece(q.id)).map(q => ({ uid: q.uid, x: q.x, z: q.z, r: buildById[q.id]?.pickR ?? buildById[q.id]?.r })), px, pz, game.face, 5, { origin: eye, dir: look });
      if (fp) best = 'furn:' + fp.uid;
    }
    game.target = best; setPrompt(game.buildMode ? '' : promptText(best));
    } catch (err) { if (!promptErr) { promptErr = true; console.error('[walker] prompt failed (game keeps running):', err); } game.target = null; setPrompt(''); }
  });
  return null;
}
