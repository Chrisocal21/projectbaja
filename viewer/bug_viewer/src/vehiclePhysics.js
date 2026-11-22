// Real-world numbers for the drive sim (catalog/physics.json) turned into what the physics reads.
// Everything here is an [estimate] until checked against a named source (see the _source notes in the json).
import data from './catalog/physics.json' with { type: 'json' };

export const SURFACE_DATA = data.surfaces;
export const TIRE = data.tire;
export const STD_ROLL = 0.03;   // rigid.js rolling resistance is STD_ROLL * rr * load: rr = rrCoef / STD_ROLL

/** mass, centre-of-mass height and fore/aft position from the fitted parts. zFrac = 0 at the rear axle, 1 at the front axle (can lie outside). */
export function massModel(build, wheelbase, vehicle = 'bug') {
  const V = data.vehicle[vehicle]; if (!V) return null;
  let m = V.baseMassKg, my = V.baseMassKg * V.baseCgHeightM, mz = V.baseMassKg * V.baseFrontFraction * wheelbase;   // z measured from the rear axle
  const rearAxle = -wheelbase / 2;
  const parts = build?.parts || {};
  for (const slot of Object.keys(parts)) { const p = V.partMass[slot]; if (!p || !parts[slot]) continue; m += p.kg; my += p.kg * p.y; mz += p.kg * (p.z - rearAxle); }
  return { mass: m, cgY: my / m, cgFromRear: mz / m };
}

/** what the tire pressure does on this surface: grip and rolling-resistance multipliers, plus steering lag and a pinch-flat risk flag */
export function pressureEffect(psi, surfaceKey) {
  const s = SURFACE_DATA[surfaceKey] || SURFACE_DATA.dirt, t = TIRE;
  const low = Math.max(-0.5, Math.min(1, (t.streetPsi - psi) / (t.streetPsi - 12)));   // 0 at street pressure, 1 at 12 psi, negative when over-inflated
  const grip = 1 + low * (s.soft * t.softGripGain - (1 - s.soft) * t.hardGripLoss);
  const rr = 1 - low * s.soft * t.softRrCut + (low < 0 ? -low * 0.2 : 0);
  return { grip, rr: Math.max(0.2, rr), steerLag: Math.max(0, t.streetPsi - psi) * t.steerLagPerPsi, pinch: psi < t.pinchBelowPsi && surfaceKey === 'rock' };
}

/** the roll threshold: lateral acceleration (in g) at which a car tips, about track / (2 x CG height) */
export const tipLimitG = (track, cgY) => track / (2 * cgY);
