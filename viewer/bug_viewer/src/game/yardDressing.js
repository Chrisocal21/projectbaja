// Fixed junk around Walt's yard (PURE: loads under node): the dumpster by the scrap tire pile and old truck tires by the side bay.
// Garage-local metres like yardTires.js (roller door at z = 6, the yard runs out to +z); ry is local too. Spots are PROPOSALs.
// circles = what you bump into, local [x, z, r] offsets before turning by ry.
export const DRESSING = [
  { file: 'PROP_Dumpster', lx: 19.2, lz: 24, ry: -Math.PI / 2, circles: [[0, -0.45, 0.62], [0, 0.45, 0.62]] },
  { file: 'PROP_TruckTireStack', lx: 15.4, lz: 0.9, ry: 0.4, circles: [[0, 0, 0.55]] },
  { file: 'PROP_TruckTireStack', lx: 15.5, lz: -0.3, ry: 1.3, circles: [[0, 0, 0.55]] },
  { file: 'PROP_TruckWheel', lx: 16.5, lz: 0.4, ry: 0.7, circles: [[0, 0, 0.52]] },
];
/** the bump circles in garage-local metres: [lx, lz, r] */
export const dressingCircles = () => DRESSING.flatMap(d => d.circles.map(([x, z, r]) => {
  const c = Math.cos(d.ry), s = Math.sin(d.ry);
  return [d.lx + x * c + z * s, d.lz - x * s + z * c, r];
}));
