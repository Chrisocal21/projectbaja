import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { game, setPrompt } from './store.js';
import { OBSTACLES, TARGETS } from '../worlds/siteData.js';
import { held, nameOfItem, sizeOf, inGarageZone, boxItems, carItems } from './items.js';
import { containers, containerById, CONTAINER_RULES } from './loot.js';
import { partById, partState, bodyById, wheelSetFits, wheelById } from '../build.js';
import { carLocal, fitCandidate, driveable, whyNotDrive, DEF, openCovers } from './workshop.js';
import { isFitted } from '../rules/restore.js';

const PROMPTS = {
  shop: 'Press E — Baja parts shop', enter: 'Press E — Get in', exit: 'Press E — Get out', tarp: 'Press E — Peek under the tarp', al: 'Press E — Talk to Al',
  bench: 'Press E — Workbench: fit your parts', pump: 'Press E — Fill the tank ($25)', store: 'Press E — Corner store',
};
export const promptText = id => {
  if (!id) return '';
  if (id === 'bug') return `Press E — Look over the Classic Bug ($1,800)`;
  if (id.startsWith('box:')) { const c = containerById[id.slice(4)], b = game.boxes[c.id]; return `Press E — ${b?.searched ? (boxItems(c.id).length ? 'Look in' : 'Empty:') : 'Search'} the ${CONTAINER_RULES[c.type].label}`; }
  if (id.startsWith('item:')) { const it = game.items.find(i => i.uid === +id.slice(5)); return it ? `Press E — Pick up ${nameOfItem(it)}` : ''; }
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
function carAction(zone) {
  const b = game.build; if (!b) return { type: 'none', text: '' };
  const fc = fitCandidate(b, zone), h = held();
  const where = zone === 'driver' || zone === 'passenger' ? '' : '';
  if (fc?.plan.ok) return { type: 'fit', uid: fc.it.uid, text: `Press E — Bolt on the ${fc.plan.slotName.toLowerCase()}${fc.it.loc === 'pack' ? ' (from pack)' : ''}` };
  if (fc?.plan.openCover) return { type: 'cover', id: fc.plan.openCover, text: `Press E — Open the ${DEF.covers[fc.plan.openCover].name} to fit the ${fc.plan.slotName.toLowerCase()}` };
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
const SHOP = { x: 16, z: 18 }, PUMPS = TARGETS.filter(t => t.id === 'pump');

/** First-person player on foot. Active while `game.onFoot`; otherwise the car is driven. Also decides what "Press E" would do right now. */
export default function Walker({ world, sun }) {
  const { camera, gl } = useThree();
  const st = useRef({ x: 0, z: 0, y: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, t: 0, keys: {}, on: false });
  useEffect(() => {
    const s = st.current, el = gl.domElement;
    window.__walk = s;   // test hook
    const move = e => { if (!game.onFoot || document.pointerLockElement !== el || game.paused) return; s.yaw -= e.movementX * 0.0022; s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch - e.movementY * 0.0022)); };
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
        s.x = at.x; s.z = at.z; s.yaw = at.yaw; s.y = world.height(s.x, s.z); camera.rotation.order = 'YXZ'; camera.fov = 70; camera.updateProjectionMatrix();
      }
      const k = s.keys, fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), side = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      const hs = held() ? sizeOf(held().kind, held().id) : 0, load = hs >= 4 ? 0.55 : hs >= 3 ? 0.75 : hs ? 0.9 : 1;
      const speed = (k.ShiftLeft || k.ShiftRight ? 6 : 3.2) * load, len = Math.hypot(fwd, side) || 1;
      const wx = (-Math.sin(s.yaw) * fwd + Math.cos(s.yaw) * side) / len * speed, wz = (-Math.cos(s.yaw) * fwd - Math.sin(s.yaw) * side) / len * speed;
      s.vx += (wx - s.vx) * Math.min(1, dt * 10); s.vz += (wz - s.vz) * Math.min(1, dt * 10);
      s.x += s.vx * dt; s.z += s.vz * dt;
      const car = game.pose;
      for (let pass = 0; pass < 2; pass++) {
        for (const [cx, cz, r] of OBSTACLES) { const dx = s.x - cx, dz = s.z - cz, rr = r + 0.3; if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue; const d = Math.hypot(dx, dz); if (d < rr && d > 1e-4) { s.x += dx / d * (rr - d); s.z += dz / d * (rr - d); } }
        if (car) for (const o of [-1.3, 0, 1.3]) { const cx = car.x + Math.sin(car.h) * o, cz = car.z + Math.cos(car.h) * o, dx = s.x - cx, dz = s.z - cz, rr = 1.3 + 0.3, d = Math.hypot(dx, dz); if (d < rr && d > 1e-4) { s.x += dx / d * (rr - d); s.z += dz / d * (rr - d); } }
      }
      s.x = Math.max(-world.half, Math.min(world.half, s.x)); s.z = Math.max(-world.half, Math.min(world.half, s.z));
      s.y += (world.height(s.x, s.z) - s.y) * Math.min(1, dt * 16);
      s.t += Math.hypot(s.vx, s.vz) * dt * 2.1;
      const bob = Math.sin(s.t) * 0.028 * Math.min(1, Math.hypot(s.vx, s.vz) / 3);
      camera.position.set(s.x, s.y + 1.72 + bob, s.z); camera.rotation.set(s.pitch, s.yaw, 0);
      game.pos.x = s.x; game.pos.z = s.z; game.walkPose = { x: s.x, z: s.z, yaw: s.yaw };
      game.face.x = -Math.sin(s.yaw); game.face.z = -Math.cos(s.yaw);
      if (sun.current) { sun.current.position.set(s.x + 30, s.y + 45, s.z + 20); sun.current.target.position.set(s.x, s.y, s.z); sun.current.target.updateMatrixWorld(); }
    } else s.on = false;

    // ---- what would E do right now? ----
    const px = game.pos.x, pz = game.pos.z, foot = game.onFoot, pose = game.pose;
    let best = null, bd = 1e9;
    const consider = (id, x, z, r, face, bonus = 1) => {
      const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz); if (d > r) return;
      if (face && foot && (dx * game.face.x + dz * game.face.z) / (d || 1) < 0.3 && d > 1.2) return;
      if (d * bonus < bd) { bd = d * bonus; best = id; }
    };
    if (Math.hypot(px - SHOP.x, pz - SHOP.z) < 11) consider('shop', SHOP.x, SHOP.z, 11, false);
    let nearPump = false;
    for (const t of TARGETS) {
      if (t.id === 'pump') { if (Math.hypot(px - t.x, pz - t.z) < 14) nearPump = true; if (!foot && game.fueled) continue; }
      if (!foot && !t.car) continue;
      consider(t.id, t.x, t.z, t.r, t.face);
    }
    if (!nearPump) game.fueled = false;
    const cl = foot && pose ? carLocal() : null;
    game.nearCar = !!cl?.near; game.carZone = cl?.zone || null;
    game.inGarage = !!pose && inGarageZone(px, pz) && inGarageZone(pose.x, pose.z);
    if (foot) for (const it of game.items) if (it.loc === 'world') consider('item:' + it.uid, it.x, it.z, 2.4, true, 0.5);
    if (foot) for (const c of containers) consider('box:' + c.id, c.x, c.z, 2.2, true, 0.55);
    if (pose) {
      if (foot && cl?.near && (!best || bd > 0.9)) {
        if (!(game.owned.has('car:bug') || game.dev)) best = 'bug';
        else { game.carPlan = carAction(cl.zone); best = 'car:' + game.carPlan.type; }
      }
      else if (!foot && !best && Math.abs(game.speed) < 4) best = 'exit';
    }
    game.target = best; setPrompt(promptText(best));
  });
  return null;
}
