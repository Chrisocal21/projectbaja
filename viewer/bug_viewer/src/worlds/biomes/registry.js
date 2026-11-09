// Biome registry (data only). Add a biome by adding one object here: where it is, how the ground looks, what grows on it,
// which trails and rivers run through it. Nothing else needs to change (county.js asks the registry; Biomes.jsx draws it).
// NAMES ARE A PROPOSAL: plain descriptive biome names only, no invented places or people. Change `name` freely.
//
// region   { cx, cz, r, inner, wobble, seed }  circle of influence; weight is 1 inside r*inner, fades to 0 at r, edge ragged by `wobble`
// height   { kind:'rolling', base, amp, scale, seed } | { kind:'mountain', peak, radius, power, ridge, ridgeScale, seed }  (a river's own valley carves the ground round it)
// ground   { base: surface key, patches:[{key, scale, seed, above}], steep:{slope,key} }   (keys are kit.js SURFACES)
// scatter  rules: { kind: conifer|broadleaf|bush|rock, density (candidates per hectare), cluster:{scale,seed,above}, scale:[min,max],
//                   maxSlope, maxHeight (treeline, fades over 30 m), minWeight, tints:[...] }
// trails   { id, name, ctrl:[[x,z]...], width, tieStart:true (blend the start into the road it leaves) }
// clearings { id, name, x, z, r, lookout?:{face, proposal} }  levelled flat spot (summit viewpoint)
// rivers   { id, name, ctrl, width, depth, fords:[[x,z]...] }
export const BIOME_DEFS = [
  {
    id: 'grassland', name: 'Grassland', nameIsProposal: true,
    region: { cx: -2050, cz: -2050, r: 800, inner: 0.62, wobble: 0.22, seed: 11 },
    height: { kind: 'rolling', base: 5, amp: 9, scale: 260, seed: 21 },
    ground: { base: 'meadow', patches: [{ key: 'dryGrass', scale: 120, seed: 5, above: 0.5 }, { key: 'looseDirt', scale: 55, seed: 6, above: 0.82 }], steep: { slope: 0.5, key: 'rock' } },
    scatter: [
      { kind: 'broadleaf', density: 0.9, cluster: { scale: 420, seed: 3, above: 0.55 }, scale: [1.0, 1.7], maxSlope: 0.5, minWeight: 0.4, tints: ['#ffffff', '#e6efc8', '#f4ead0'] },
      { kind: 'bush', density: 4.5, cluster: { scale: 180, seed: 4, above: 0.5 }, scale: [0.6, 1.2], maxSlope: 0.5, minWeight: 0.3, tints: ['#ffffff', '#d9e6a8', '#e9d89a'] },
      { kind: 'rock', density: 0.6, cluster: { scale: 300, seed: 9, above: 0.6 }, scale: [0.5, 1.6], maxSlope: 0.8, minWeight: 0.3, tints: ['#ffffff', '#d8d2c4'] },
    ],
    trails: [], rivers: [],
  },
  {
    id: 'forest', name: 'Forest Mountain', nameIsProposal: true,
    region: { cx: 2000, cz: 2000, r: 1150, inner: 0.75, wobble: 0.12, seed: 31 },
    height: { kind: 'mountain', peak: 150, radius: 1000, power: 1.3, ridge: 8, ridgeScale: 220, seed: 41 },
    ground: { base: 'forestFloor', patches: [{ key: 'meadow', scale: 130, seed: 7, above: 0.62 }, { key: 'looseDirt', scale: 70, seed: 8, above: 0.66 }], steep: { slope: 0.55, key: 'rock' } },
    scatter: [
      { kind: 'conifer', density: 48, cluster: { scale: 150, seed: 13, above: 0.15 }, scale: [0.9, 1.9], maxSlope: 0.7, maxHeight: 120, minWeight: 0.25, tints: ['#ffffff', '#d4e4c0', '#c8d8b4'] },
      { kind: 'broadleaf', density: 9, cluster: { scale: 220, seed: 14, above: 0.35 }, scale: [0.9, 1.5], maxSlope: 0.6, maxHeight: 90, minWeight: 0.25, tints: ['#ffffff', '#f0e2b0', '#d6e8a8', '#e8c890'] },
      { kind: 'bush', density: 45, cluster: { scale: 90, seed: 15, above: 0.2 }, scale: [0.6, 1.4], maxSlope: 0.7, maxHeight: 140, minWeight: 0.2, tints: ['#ffffff', '#cfe0a0', '#b8a070'] },
      { kind: 'rock', density: 3, cluster: { scale: 160, seed: 16, above: 0.4 }, scale: [0.6, 2.4], maxSlope: 1.4, minWeight: 0.2, tints: ['#ffffff', '#cfc8b8'] },
    ],
    trails: [
      // climbs round the mountain in a spiral, crossing the river at the ford, ends high on the shoulder
      { id: 'forest-trail', name: 'Mountain trail', width: 3.6, tieStart: true,
        ctrl: [[888, 1985], [1050, 1905], [1250, 1855], [1420, 1905], [1520, 2050], [1570, 2200], [1600, 2300], [1680, 2420], [1800, 2500], [1950, 2540], [2100, 2500], [2200, 2400], [2250, 2250], [2200, 2100],
        // PROPOSAL: gentler switchbacks (about 6-8%) up the last stretch to the summit clearing
        [2160, 2135], [2105, 2145], [2065, 2115], [2085, 2065], [2060, 2035], [2025, 2018]] },
    ],
    // flat clearings: ground levelled to the height at (x, z), blending out over r..r*1.8. `lookout` = a rock/rail viewpoint at the edge facing `face` (radians). NO structures. PROPOSAL (placement and name)
    clearings: [{ id: 'forest-summit', name: 'Summit lookout', x: 2020, z: 2010, r: 15, lookout: { face: 3.9, proposal: true } }],
    rivers: [
      { id: 'forest-river', name: 'Mountain river', width: 10, depth: 1.6, fords: [[1600, 2300]],
        ctrl: [[2050, 2200], [1900, 2260], [1760, 2300], [1600, 2300], [1470, 2350], [1340, 2450]] },
    ],
  },
  {
    // PROPOSAL (name and look): the first new region, south of the old map along Highway 9. Plain descriptive biome, no invented places. docs/REGION_PLAN.md
    id: 'scrubland', name: 'Scrubland', nameIsProposal: true,
    region: { cx: 0, cz: 4250, r: 1700, inner: 0.8, wobble: 0.2, seed: 51 },
    height: { kind: 'rolling', base: 6, amp: 8, scale: 320, seed: 61 },
    ground: { base: 'scrub', patches: [{ key: 'dirt', scale: 140, seed: 17, above: 0.55 }, { key: 'sand', scale: 200, seed: 18, above: 0.78 }], steep: { slope: 0.5, key: 'rock' } },
    scatter: [
      { kind: 'bush', density: 14, cluster: { scale: 160, seed: 19, above: 0.3 }, scale: [0.6, 1.3], maxSlope: 0.6, minWeight: 0.3, tints: ['#ffffff', '#cfc08a', '#b8a874'] },
      { kind: 'rock', density: 1.4, cluster: { scale: 240, seed: 20, above: 0.5 }, scale: [0.5, 1.8], maxSlope: 1.0, minWeight: 0.3, tints: ['#ffffff', '#cfc4b0'] },
    ],
    trails: [], rivers: [],
  },
];
