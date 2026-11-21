// The El Cajon in the world: the same hold-click mechanic as the Bug, on the model ported from Salvage Road.
//   - parts show or hide from its build (cajon/instance.js), hood / doors / tailgate swing open on E (the project's own open set)
//   - empty hands: the part under the crosshair glows (BuildModel's DetachGlow reads the userData.slot tags) and hold-click takes it off
//   - holding a fitting part near it: the spot shows as a hologram (green go, red no, amber "do this first") and the part clips in (SnapPair)
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { game, useGame } from '../game/store.js';
import { held } from '../game/items.js';
import { holoMaterials, ghostify, HOLO } from '../hologram.js';
import { fitCandidate } from '../game/workshop.js';
import { projectOpen } from '../game/projects.js';
import { CAJON, slotById } from '../rules/vehicles.js';
import { isFitted } from '../rules/restore.js';
import { DetachGlow, SnapPair, selfOf } from '../BuildModel.jsx';
import { makeCajon, applyBuild, stepCovers, partCopy, disposeCajon, HUBS } from './instance.js';
import { GROUND_Y } from './model.js';

/** what the crosshair code needs to know about this vehicle (DetachGlow was written for the Bug: wheels are found by hub position and named by wheelSlot) */
const SHIM = { mounts: Object.entries(CAJON.mounts).map(([name, m]) => ({ name, ...m })), body: { pieces: [] }, wheelSlot: n => 'ecWheel' + n };

/** one part as a hologram, standing where it goes on the truck (inside the lift group) */
function GhostPart({ slotId, mats }) {
  const obj = useMemo(() => ghostify(partCopy(slotId), mats), [slotId, mats]);
  const hub = CAJON.slots.find(s => s.id === slotId)?.wheel;
  return <group position={hub ? HUBS[hub] : [0, 0, 0]}><primitive object={obj} /></group>;
}
/** the real part, the one that flies in from your hands and sits in its spot */
function SolidPart({ slotId }) {
  const obj = useMemo(() => { const c = partCopy(slotId); c.traverse(o => { if (o.isMesh) o.castShadow = false; }); return c; }, [slotId]);
  const hub = CAJON.slots.find(s => s.id === slotId)?.wheel;
  return <group position={hub ? HUBS[hub] : [0, 0, 0]}><primitive object={obj} /></group>;
}

/** assembly guide §9: while you hold a part near the truck, its spot glows, and what has to happen first glows amber */
function FitGhost({ build, vehId }) {
  useGame();
  const mats = useMemo(() => holoMaterials(), []), amber = useMemo(() => { const m = holoMaterials(); m.set(HOLO.amber); return m; }, []);
  useEffect(() => () => { mats.dispose(); amber.dispose(); }, [mats, amber]);
  useFrame(({ clock }) => { mats.pulse(clock.elapsedTime, game.work?.id === vehId); amber.pulse(clock.elapsedTime + 0.6, true); });
  const { v, mine, dist } = selfOf(vehId);
  if (!v || dist > 10 || !held()) return null;
  const fc = fitCandidate(build, mine ? game.work.zone : undefined); if (!fc) return null;
  const it = fc.it, plan = fc.plan;
  mats.set(plan.ok ? HOLO.ok : HOLO.bad);
  let slotId = null;
  if (it.kind === 'stock' && it.id === 'wheel') {   // a loose wheel goes on the bare hub nearest to you
    const cl = mine ? game.work : null, d = s => { const c = CAJON.mounts[s.wheel].center; return cl ? Math.hypot(c[0] - cl.lx, c[2] - cl.lz) : 0; };
    slotId = CAJON.slots.filter(s => s.wheel && !isFitted(CAJON, build, s.id)).sort((a, b) => d(a) - d(b))[0]?.id || null;
  } else if (it.kind === 'stock' && slotById(CAJON, it.id)) slotId = it.id;
  if (!slotId) return null;
  return <group position={[0, GROUND_Y, 0]}>
    {plan.blockers?.filter(id => slotById(CAJON, id)).map(id => <GhostPart key={id} slotId={id} mats={amber} />)}
    <SnapPair mine={mine} ghost={<GhostPart slotId={slotId} mats={mats} />} solid={<SolidPart slotId={slotId} />} />
  </group>;
}

export default function CajonModel({ build, drive = false, vehId, uid }) {
  const inst = useMemo(makeCajon, []), carRef = useRef();
  useEffect(() => () => disposeCajon(inst), [inst]);
  useEffect(() => { applyBuild(inst, build); }, [inst, build]);
  useFrame((_, dt) => { stepCovers(inst, uid != null ? projectOpen(uid) : null, Math.min(dt, 0.05)); });
  return <group ref={carRef}>
    <primitive object={inst.root} />
    {drive && <FitGhost build={build} vehId={vehId} />}
    {drive && <DetachGlow build={build} r={SHIM} carRef={carRef} vehId={vehId} />}
  </group>;
}
