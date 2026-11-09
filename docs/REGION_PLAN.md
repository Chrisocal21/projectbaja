# FIRST NEW REGION: PLAN (Nov 8, 2026) - PROPOSAL, nothing built

Chris said "whichever makes sense to the expansion". These are my picks. **PROPOSAL** = design guess. No new lore: picks are geography only, names are plain descriptive and changeable. See [CANON](./CANON.md).

## My picks (change any)
- **Direction: south**, along the highway. The highway already runs north-south, so the road simply keeps going. South also fits the game's Baja theme. (Compass note: -z is north, +z is south in this game.)
- **Biome #1: "Scrubland"** (PROPOSAL name): dry brush, low rolling hills, gravel and dirt tracks. Plain and descriptive, no invented places or people. It uses the existing procedural biome system (`biomes/registry.js`: rolling height, ground patches, scatter, trails), so it needs no new art pipeline.
- **Size: one step first.** Move the wall out by a fixed strip (PROPOSAL: 2 km), not a whole new world.

## Why this is not a quick edit (found by reading the code)
- `SIZE = 6000` in `worlds/county.js` is baked into:
  - the **heightmap**: a fixed 1025x1025 file `public/terrain/height.bin` that covers exactly 6 km,
  - the **surface/road grid**: `createRaster(SIZE, CELL)` = 3000x3000 cells at 2 m,
  - the **terrain tiles** (`County.jsx`: 300 m tiles, `NT = SIZE / TILE`),
  - the **map panel** (`MapPanel.jsx`), **flora scatter** (`flora.js`) and the mirror-tiled noise (`warp`/`mirror`).
- So "enlarge the grid" means changing how height and surface are looked up, not just a number.

## Staged approach (each stage is committed on its own and verified in a browser)
1. **Stage 1: make the world rectangle data.** Replace the single `SIZE`/`HALF` with `WORLD = { x0, x1, z0, z1 }` read from one place (`boundary.js` already holds the wall). Nothing visible changes. Tests: all existing numbers identical.
2. **Stage 2: height and surface beyond the old square.** Outside the old 6 km, height comes from the biome registry (procedural), not `height.bin`; the raster and tiles extend by the new strip only. Check memory and frame rate.
3. **Stage 3: Scrubland in the registry** (data only), plus the highway continuing south.
4. **Stage 4: move the hologram wall** to the new edge (data change in `boundary.js`), update the map panel and the `Map` app extent, add number-key teleport.
5. **Stage 5:** hand-test: drive the new strip end to end, check save/load position beyond the old edge, frame rate on the phone/laptop.

## Risks
- Memory and load time: the surface grid is 9 million cells today; a 2 km strip adds about 3 million.
- Saves: positions beyond the old edge must load (the save envelope already stores the position; verify the clamp).
- Biome edges: the new strip must blend into the Canyon on the south side (Red Rock Canyon is at z about +2160).

## Needs from Chris
- OK on **south + Scrubland + a 2 km first strip**, or change them.
- OK to start Stage 1 (invisible refactor, safe) when tokens allow.

## STATUS (Nov 8, end of session)
- Stage 1 DONE (650e29b): world size constants in `worlds/world.js`.
- Stage 2 DONE (6fe6d47): world is 9 km; old square unchanged; unbuilt terrain tiles are skipped (cheaper).
- Stages 3+4 DONE (this commit): the SOUTH side is open 1.5 km (`DRIVE.z1 = 4440`); walls are a rectangle; Highway 9 continues south to the new wall; edge mountains follow the rectangle (`ringMetric`); height relief mirrors beyond the file; Scrubland biome in the registry; teleport key `;`.
- NOT DONE: the map screen still shows only the old 6 km square (needs a centre offset, so the south strip and your marker there are not on it); the road climbs a mountain pass at the new wall like the old edges do; no places or buildings in the strip (empty on purpose, no lore); no Scrubland trails.
- Hand-test: press `;` (or the phone teleports) and drive south to the wall; check the pass, the bushes, the wall, and frame rate.
