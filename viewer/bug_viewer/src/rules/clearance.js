// Tire clearance vs lift (PROPOSAL numbers). Pure: build.js wires it to the catalog, the tests read the JSON directly.
export const SIZE = { min: 0.8, max: 1.35, step: 0.05 };
export const LIFT = { min: 0, max: 0.3, step: 0.025 };
/** Biggest tire (scale against stock) that clears the wheel arches: more lift makes room for more tire. */
export const tireMax = (lift = 0) => Math.min(SIZE.max, 1.12 + lift * 1.3);
/** tire diameter in inches at a given scale (the stock Bug tire is about 27 inches) */
export const tireInches = scale => Math.round(0.345717 * 2 * scale / 0.0254);
/** the smallest kit lift (metres) out of `kitLifts` that clears tires of this scale: 0 = no kit needed, null = no kit is enough */
export function liftNeeded(scale, kitLifts) {
  if (scale <= tireMax(0) + 1e-9) return 0;
  for (const l of [...kitLifts].sort((a, b) => a - b)) if (scale <= tireMax(l) + 1e-9) return l;
  return null;
}
