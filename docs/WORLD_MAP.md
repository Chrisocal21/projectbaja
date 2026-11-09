# WORLD MAP: the big picture (Nov 9, 2026) - PROPOSAL, nothing built

Chris's goal: a stylized (not compressed) map with decent-size regions: Mojave high desert, the coast (SoCal and Baja coast), the Baja peninsula, Arizona and so on. Baja County stays the home base.
Everything below is a **design guess to edit**. It is real-world geography only. No new places, people or lore. Names of regions are plain and descriptive and changeable. See [CANON](./CANON.md) (locked): canon only says "remote Baja County", so nothing here changes it.

## The shape (PROPOSAL)
Baja County is the hub. Each region grows out of it in the real compass direction, joined by the highway.

```
                 NORTH: Mojave high desert
                          |
WEST: Coast  ----  BAJA COUNTY (home)  ----  EAST: Arizona / Sonoran
(SoCal + Baja coast)      |             (the lakebed strip leads here)
                 SOUTH: Baja peninsula
                 (the scrubland strip leads here)
```

- Each region is its own map about the size of today's county (6 to 9 km across), with its own height and ground. "Decent size" = you spend real time driving in each one.
- Today's strips are the first steps: the **south scrubland** leads toward the Baja peninsula and the **east dry lakebed** leads toward Arizona.
- Regions load one at a time. You drive to the edge on the highway, a short load, and you arrive on the other side (PROPOSAL: not one giant world, which the game's tech cannot stream yet).

## Regions and what each needs
| Region | Look | New biomes | Tech needed (beyond today) |
|---|---|---|---|
| **Baja County** (home, exists) | Dry high desert, canyon, forest mountain, grassland | exist | none |
| **Coast** (west) | Ocean, beaches, sea cliffs, cooler hazy light, coastal highway | Beach, sea cliff, coastal scrub | **Water** (ocean plane, shoreline, wet sand), slow or stop in deep water, sea sound, haze. Biggest new work. Ties to the boat idea |
| **Mojave high desert** (north) | Joshua trees, rocky hills, cooler air, wide flats | Joshua flats, boulder hills | New plants and rocks only |
| **Baja peninsula** (south) | Cardon cacti, red rock, long road with the sea on one side | Cardon desert, red mesa | New plants; reuses the coast water |
| **Arizona / Sonoran** (east) | Saguaro cactus, mesas, big skies, monsoon storms | Saguaro desert, mesa | New plants; storm weather later |
| **Mexico side** | Just the south end of the peninsula (geography only) | reuse | none; nothing here is canon |

## Build order (PROPOSAL, one at a time)
1. **Region system first:** a way to hold several maps, travel between them on the highway, and save which region you are in. Nothing visible, tested hard. (Needed before any new region.)
2. **Coast** (your pick): water and shoreline, then beach and cliffs, then a coastal highway.
3. **Baja peninsula** (reuses the water).
4. **Mojave**, then **Arizona** (plants and ground only, cheaper).
5. Weather per region (cool coast haze, desert heat, monsoon) once the weather system exists.

## Travel between regions (decision, Nov 9)
- **Drive through with a hidden load** (PROPOSAL, Chris leaned seamless): no loading screen. The highway climbs a mountain pass at the region edge (the edges already have one). Over the crest the next region loads in the background, the game swaps maps and moves the car a few km, keeping speed. One clean drive.
- Why not one giant continuous world: physics jitter far from the origin, huge height and ground grids, and saves/roads tied to one grid.

## Coast art inventory (art is UNPARKED for the coast)
Searched Desktop/assets, projectbaja/assets and supplyline-unity/Assets.
- **Have, usable as meshes:** rocks (FJG_Rock_A_01-03 with LODs, Rock_1-3, FJG_TobiIshi), reeds (CommonReed), grass and shrub sets, crab.glb, shipping container.
- **Have, but Unity-only (need an export step):** Coconut Palm Tree Pack (12 palms as Unity .asset/.prefab, no FBX), the ALP Gerstner water shader (idea reference only).
- **Missing:** ocean surface (build it in code, no asset needed), beach and sea-cliff ground (ground layers plus the rocks), boats, pier, driftwood, seagulls, beach props. Candidates for Meshy (900 credits left, ~30 per part).

## Open questions for Chris
- How long should the highway between regions feel (a short loading hop, or a long empty road)? PROPOSAL: a short hop with a sign.
- Should each region have its own garage or shop later, or is everything run from Walt's Garage? (Lore question: not decided here.)
- Do you want the vehicle shop and parts suppliers to change by region (coast = marine parts)? PROPOSAL: later.
- The plants, rocks and water need art. Art is on hold: do you want to unpark it for the coast?

## STATUS: region system, step 1 DONE (Nov 9)
- `src/game/regions.js`: region table and exits (drive into an exit circle, next region loads, you keep your speed). `DriveWorld` checks exits each physics step and places the car on arrival; `main.jsx` swaps the world and records `home.region` (real regions only).
- Checked in a browser with the DEV-ONLY stand-in exit (county to test center and back): speed kept (19.1 and 18.6), no errors. Real regions will use highway exits at a mountain pass; the mountain-pass fade/hide is NOT built yet.
- NOT done: saving and restoring the current region on Continue, on-foot travel, hiding the cut behind a pass.

## STATUS: coast, step 1 DONE (Nov 9, PROPOSAL; option 1 = grow the one world, no swap)
- Measured: world grid 9 km to 12 km costs nothing noticeable (heap 210 to 199 MB, same load time; the raster only stores painted cells).
- West side opened to x -5940. The old west rim is now a coastal RANGE (crest about 140 m at x -2950) that falls to the sea by x about -4600. Biome `coast` (kind `shore`): sand beach, scrub, rocks. Sea plane at y 0 (`Ocean` in biomes/Biomes.jsx, simple blue), new `water` surface (heavy drag). Map is now 10.5 km wide (a bit coarser). Dev teleport key: Backslash.
- Checked in a browser: beach at x -4200 with the sea on the horizon. Known rough edges: no road over the range yet (off-road only, steep), walking into deep water puts the camera under the plane (no swim or block or underwater look), no waves/foam/shore blend, no palms or beach props yet, ocean is flat blue.
- NEXT: a coastal highway over a pass, shoreline blend (wet sand, foam), then art (palms, rocks, boats).

## BIG MAP DECISION (Nov 9): the real border slice
Chris picked: the drivable world is the real border slice (LA to Cabo San Lucas, Pacific to the Arizona edge), Baja County (Walt's Garage) sits in the Imperial Valley / Salton Sea area, and the land shape comes from real public elevation data, smoothed. This replaces the hand-sketched region plan above where they disagree.
- Data: AWS Terrain Tiles (terrarium; SRTM, ETOPO1 and other open sources, sea floor included). Attribution: "Terrain Tiles: Mapzen / AWS Open Data; sources include SRTM (NASA), ETOPO1 (NOAA), USGS NED". The reference images Chris shared are stock images and are NOT traced.
- Pipeline: `assets/pipeline/west_dem.py` (step 1, preview only). Scales PROPOSAL: horizontal 1:50 (1 real km = 20 game m), vertical 1:12. Result: about 19.8 x 26.5 km of game world, heights -407..282 m, 60% sea. Preview: `assets/mockups/west_preview.png`.
- Problem to solve next: at 1:50 the real coast (San Diego) is only about 3 km from the garage, inside today's hand-built 6 km county.

### Update (Nov 9, Chris): bigger scale and real land everywhere
- Scale is now 1:25 horizontal (1 real km = 40 game m), vertical 1:8 (PROPOSAL). World about 39.6 x 53.1 km, heights -623..425 m (deep sea floor flattened at -30 m). The hand-built county ground is replaced by real land; its places move onto matching real spots (PROPOSAL, Chris picks).
- Built as a NEW world (id `border`, dev only) next to today's county, swapped in only when it is good. Today's game keeps working.
- Step 2 DONE: `public/terrain/border.png` (2.8 MB: height + sea/Salton Sea mask) and `border.json`.
- Next steps: 3) the `border` world in the game (height from the file, sea + Salton Sea planes, terrain tiles built only near the player); 4) place the garage and the hand-built sites on real spots; 5) real highways (I-8, CA-86/111, Mex 1/5); 6) biomes by real area, map screen, then swap it in.

### Step 3 DONE (Nov 9): the real map drives, dev only
- Title screen with `?dev` > Show developer tools > "Real border map (dev, WIP)". `worlds/border.js` (loads border.png, height/water/surface lookups, unit-tested), `worlds/Border.jsx` (400 m terrain tiles built only near the player: coarse to 5.2 km, fine within 0.9 km, dropped behind you; ocean and Salton Sea sheets masked by the data). `DriveWorld` world `border`; the sky now travels with the camera.
- Pipeline despikes bad source pixels (10 cells, e.g. a 260 m needle on the San Diego shore).
- Checked in a browser: Imperial Valley spawn with real ranges on the horizon, Pacific beach near San Diego, Gulf of California with Baja on the horizon 20 km south. Heap about 265-335 MB.
- Rough edges: you can drive on the sea floor (no water physics), ground is plain (one PROPOSAL rule set: sand, scrub, rock, high dirt), no roads, no places, no garage, no map screen for it yet, the dev shop stand-in sits at (40, 30).

### Step 4 DONE (Nov 9): the county on the real land, behind `?realmap`
- Add `?realmap` to the address (e.g. `/?realmap`): the normal game, garage and story, but standing on the real border slice. Without the flag nothing changed.
- Built places keep the home layout (garage, Dry Wells, Al's lot, Dusty's, Baja Parts, Hollis farm, Salvage & Surplus, Proving Grounds, shacks) and are levelled into the real ground. Natural places moved (PROPOSAL): Sidewinder Dunes = the Algodones Dunes (east), Bitter Lake = Laguna Salada (south, Mexico), Red Rock Canyon = by the Sierra Cucapah. Made-up land is off: edge rim, mesas, grassland, forest mountain, scrubland, lakebed and coast strips.
- Terrain is streamed near the player (county tiles), the ocean and Salton Sea come from the data; the Salton Sea bed is sunk 1.5 m so it is really under water; no plants in water.
- Checked in a browser: garage, Dry Wells highway, the dunes, Laguna Salada, the Salton Sea (about 1 km north of the garage). Heap about 330-460 MB (higher than the normal 220 MB: watch it).
- Not done: roads only exist near home (step 5 real highways), map screen still draws the old county, the dev teleports, signs and area names still use the old names, no frame-rate check on a real machine.

### Step 5 DONE (Nov 9): real highways on `?realmap` (PROPOSAL)
- Source: Natural Earth 1:10m roads (public domain, naturalearthdata.com), one centre line per highway, USA and Mexico. Pipeline `assets/pipeline/west_roads.py` (needs `pip install pyshp`) writes `public/terrain/highways.json` (241 roads, ~500 game km, 34 kB) and `assets/mockups/west_roads_preview.png`.
- In the game: `src/worlds/highways.js` (pure, tested). Each line is smoothed into bends, graded (long moving average of the ground, cuts/fills capped at 14 m, never under water: causeways), junctions meet at one height, and the ground eases onto the road with banks about 1.5 : 1. Roads that run side by side blend (no walls between them).
- Highways bend round the built places (garage 260 m, Dry Wells, Proving Grounds, Hollis farm, every site): CA-86 and CA-111 really run right past the garage spot, so they bypass it. Hand-built roads cross them at grade.
- Looks: majors (I-8, I-10, I-5, Mex 2D...) are wide with dashed lanes, secondaries (CA-86, Mex 2, Mex 5...) are two-lane blacktop with a double yellow line. Drawn in 400 m pieces near the player only. The HUD area name shows the highway name (I-8, CA-86, Mex 2D...).
- Checked in a browser: I-8 east of home, the CA-86 bypass by the garage, Mex 2 / 2D climbing into the mountains, I-8 winding west into the hills.
- Not done: road signs, poles and exits on the real highways; the Natural Earth lines are only good to about 1 real km, so some roads cut through hills (capped) where the real road follows a pass; no drive test at speed yet; map screen still the old county.
