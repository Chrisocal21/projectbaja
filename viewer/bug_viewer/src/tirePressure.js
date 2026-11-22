// Tire pressure by hand: a gauge that reads and bleeds air, an air chuck that fills from the compressor. PURE (no game store).
// Pressure is one number for the car's tires (game.home.tirePsi, used by vehiclePhysics.pressureEffect). PROPOSAL: rates and limits are guesses.
export const PSI = { min: 8, max: 45, street: 30, bleedPerSec: 4, pumpPerSec: 6 };

/** hand tools for the job (TOOLS entries are merged in game/items.js) */
export const PRESSURE_TOOLS = {
  gauge: { name: 'Tire gauge', size: 1, verb: 'Letting air out' },
  airchuck: { name: 'Air chuck', size: 1, verb: 'Filling' },
};
export const isPressureTool = id => !!PRESSURE_TOOLS[id];
export const PRESSURE_TOOL_ITEMS = Object.fromEntries(Object.entries(PRESSURE_TOOLS).map(([id, t]) => [id, { name: t.name, size: t.size }]));

const round = x => Math.round(x * 10) / 10;
/** one tick of holding `dt` seconds. hasAir = a compressor is in the garage. Returns { ok, psi, why? } (ok false: nothing changed). */
export function stepPressure(toolId, psi, dt, hasAir = false) {
  if (toolId === 'gauge') {
    if (psi <= PSI.min) return { ok: false, psi, why: `Down to ${PSI.min} psi: that is as low as the tire will sit on the rim.` };
    return { ok: true, psi: round(Math.max(PSI.min, psi - PSI.bleedPerSec * dt)) };
  }
  if (toolId === 'airchuck') {
    if (!hasAir) return { ok: false, psi, why: 'The air chuck needs the air compressor in the garage.' };
    if (psi >= PSI.max) return { ok: false, psi, why: `${PSI.max} psi is the most this tire will take.` };
    return { ok: true, psi: round(Math.min(PSI.max, psi + PSI.pumpPerSec * dt)) };
  }
  return { ok: false, psi, why: 'That tool does not change tire pressure.' };
}
/** the line shown while aiming at a wheel with a pressure tool in hand */
export function pressureLine(toolId, psi) {
  const read = `Tires ${Math.round(psi)} psi`;
  if (toolId === 'gauge') return `${read}. Hold left click to let air out`;
  return `${read}. Hold left click to fill`;
}
/** what the number means for driving (for the gauge) */
export const pressureHint = psi => (psi >= 28 ? 'street' : psi <= 14 ? 'sand / rock' : 'dirt');
