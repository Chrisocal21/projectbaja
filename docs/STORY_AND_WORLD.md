# Project: Baja — STORY_AND_WORLD

Last updated: November 7, 2026 (night). The story setup, the official open-world map (Baja County), the vehicles you can own, and the world dressing (terrain, plants, trees, assets).

Code:
- `viewer/bug_viewer/src/worlds/county.js`: map data and terrain.
- `worlds/County.jsx`: the 3D world.
- `worlds/terrainMaterial.js`: ground textures.
- `worlds/Desert.jsx`: rocks, dead trees, shrubs.
- `game/home.js`: grandpa's place.
- `game/fleet.js`: vehicles.

> **Lore is locked in [CANON](./CANON.md)** (the Forge canon, November 7). That covers the opening, Walt, the #7 accident, the family, the co-driver's son in Iron Flats, the story rules and what stays UNKNOWN. CANON wins wherever this page disagrees. This page describes **what is in the game today**; mismatches are listed in OPEN_QUESTIONS C1–C9.

## The story

You just finished college. Your grandfather **Walt** has died and left you **Walt's Garage**, a repair and welding shop established in 1968, out in the middle of nowhere in Baja County. You drive out to see it and decide to stay and fix it up. There is no main quest: the inheritance is context, not a route.

**Background (canon, not shown in the game yet):**
- Walt was a well-liked mechanic with a hidden off-road racing past.
- Racing the #7, he survived an accident that killed his co-driver and childhood best friend. The car was repaired and never raced again.
- Your parents kept this from you. Grandma co-drove too, and stepped away when you were born.
- The co-driver's son runs his late father's engine shop in Iron Flats.
- All of this comes out only through letters, photos, objects, local talk and records. It's never forced, and it never runs on a timer.

- **It starts run-down.** The garage is full of junk (rotten boxes, paint cans, decades of newspapers). The yard has bald tires, scrap metal, a dead fridge and tumbleweeds. The power is off, and the lights only come on once you flip the main breaker.
- **Grandma's old Bug is inside.** It hasn't run since 2009. The rear-right wheel is off after a flat, with that corner on a stand, and Walt had started dealing with rust (canon). The game also has the driver's seat out to fix the runner (not canon, see OPEN_QUESTIONS C5). Both parts are lying in the garage, and the battery is still in. Getting it running is the first goal and the tutorial:
  1. Fit the seat and put the wheel back on.
  2. Get in and turn the key (E). The gas is nearly gone and she's sat for years: the first try cranks, the second coughs and dies, and the third fires.
  3. After that she starts normally.
- **Grandpa left a letter** on the workbench. *The text in the game is a placeholder; canon says Chris writes it (OPEN_QUESTIONS F10). Only its last line is canon.* The placeholder points you at Al (car lot), Dusty (gas station, "good people") and the closed Proving Grounds ("nobody checks the fence"). It ends: "Fix her up. Then fix the place up. Then go fast."
- **Grandpa's old #7 desert race car** is in the back-right corner of the garage, under a tarp with junk piled on and around it, so from the door it looks like more clutter. Its coilover shocks, race tires and beadlock rims were set aside for the Bug, but they won't clear the stock body. You have to:
  1. Gather scrap metal.
  2. Build a welder and a tube bender in the shop.
  3. Fabricate shock hoops at the workbench.
  4. Weld them in.

  Only then do the shocks and tires go on. *Canon makes the #7 optional and never forced. Whether its parts should go to the Bug is OPEN_QUESTIONS C2.*
- **Odd jobs** keep you going. Once the lights are on, a local now and then pulls into the yard with something small: a dead battery, an oil change, a headlight, a flat, wipers, a fan belt, a tune-up. You buy the supply at Dusty's, do the job and get paid. There's no timer and no stress: just enough to keep chipping away at the garage, then the whole property (the trailer, the yard), and later building cars to sell.
- **Grandpa's 1966 trailer** is yours to fix up: patch the roof (then you can sleep there), build a porch, paint it, add A/C and string lights.
- **Honest Al's lot in Dry Wells sells the bigger, pricier vehicles.** The Bug isn't for sale there any more; it's yours from the start.
- **The arc:** clean the garage → get the Bug running → buy a truck to haul big parts → build up your property → turn the Bug (and later other vehicles) into race machines → race at the Proving Grounds and beyond.

You start with $1,500. Clearing junk pays a little scrap money.

## Baja County: the official map

**6 × 6 km** (drivable to ±2,940 m), with grandpa's garage in the middle. *Canon targets a core of about 3 × 3 km (OPEN_QUESTIONS C1), and sets a phase for each place (see CANON, World bible). For Phase 1 only the garage, one parts source and one scrap buyer matter. Canon also adds **Iron Flats** (a racing and fabrication town, Phase 3, not on the map yet) and names the diner **Rosa's**.* It was 3 × 3 km until November 7, when the distances between places doubled. Dry Wells, the Proving Grounds, Hollis farm and the canyon trail moved as whole clusters, so their own layouts didn't change. Roads lead out to every biome. The old Test Center tracks live inside the map as the **Proving Grounds**, so testing and story share one world. The Test Center stays as a dev-only map.

```
                         N (+z)
        ┌─────────────── THE SIERRA ────────────────┐
        │        RED ROCK CANYON (mesas,            │
        │        rock trail, spring + shack)        │
        │               ▲ Canyon Rd                 │
        │  HOLLIS FARM ◄┤ (barn, fields,       H    │
        │  (barn)       │  windbreak)          I    │
        │               │                      G    │
        │ SIDEWINDER ◄──┴── Old Mill Rd ──────►H ── DRY WELLS (town:
        │ DUNES (sand,   ★ WALT'S GARAGE       W      Al's lot, Dusty's Fuel,
        │  dune loop)    │ (you start here)    A      Baja Parts, diner, motel)
        │               ▼ Lakebed Rd           Y    │
        │                                      9 ─► warehouse (salvage)
        │     BITTER LAKE (dry lakebed:        │    │
        │     flat-out speed runs, shack)      ▼    │
        │                               PROVING GROUNDS (circuit, off-road
        │                               track, washboard strip, HQ)
        └───────────────────────────────────────────┘
```

| Place | Where (x, z) | What's there |
|---|---|---|
| Walt's Garage (home) | 0, 0 | Garage (with the #7 under its tarp), grandpa's trailer, windmill, water tank, junk to clear; your build-mode property (60 × 50 m) |
| Old Mill Rd | z ≈ 120–260, east–west | Gravel; links home to Highway 9 (east, about 850 m) and the dunes (west, about 1.7 km) |
| Highway 9 | x ≈ 800–910, north–south | 2-lane blacktop with telephone poles; leaves the map through mountain passes |
| Dry Wells | 1360, 600 | Main street: Honest Al's (vehicles), Dusty's Fuel (gas, batteries, tools, wash), Baja Parts (part shop, boxed pickup), diner, post office, feed & supply, motel, sheriff, The Rusty Piston, laundromat |
| Hollis farm | −960, 940 | Barn with loot, a patchwork of fields, a windbreak row of trees along the lane |
| Red Rock Canyon | −360, 2160 | Banded mesas, red dirt, a rock trail loop, a spring with trees and an old shack |
| Sidewinder Dunes | −1980, 500 | Rolling sand dunes, a dune loop trail (about 300 m across), a staging shack |
| Bitter Lake | −920, −1720 | Dry lakebed (fast, flat "playa" surface with cracks), a shack on the shore |
| Proving Grounds | 1900, −1760 | The old test center: paved circuit + pit lane, off-road track (jumps, whoops, rock garden, mud), washboard dirt strip, HQ building with loot |
| Salvage & Surplus | ≈ 900, −640 | Run-down warehouse off Highway 9 with racks of loot |
| The Sierra | beyond ±2,350 m | The mountain range round the edge; Highway 9 leaves through passes |

**Surfaces:** asphalt, concrete, gravel, packed dirt, loose dirt, scrub, sand, red dirt, rock, mud, dry lakebed, grass. Each has its own grip and rolling resistance.

**Terrain tech:**
- **Height:** an analytic base, plus relief from a real eroded desert heightmap (`public/terrain/height.bin`, from the Bad Raccoon "3D Realistic Terrain" Unity pack). The relief is low in the open desert, eased off along road corridors and at home, the dunes and the farm, and tall in the mountain ring (2,350–2,900 m out).
- **Biomes:** each one is shaped on top of that (dunes, mesas, lakebed, flattened town and Proving Grounds). Biome edges are ragged, using noise taken from the heightmap itself.
- **Roads and pads:** painted into a 2 m raster stored in sparse 64-cell chunks. Roads get graded profiles that blend into the road they join.
- **Tiles:** 300 m tiles; every tile has a coarse mesh, and tiles near you (430–640 m) get a fine one, built one per tick so it never hitches. Skirts hide cracks between them.
- **Ground material:** 8 photo layers in one texture array with normal maps (`public/textures/ground`), blended per vertex.
  - Washes become sand and steep slopes become rock.
  - Each layer is tinted by the surface colour, so the palette stays ours.
  - A macro map (the heightmap's painted shading and AO) adds erosion detail to the far ground.
- **View distance:** camera far 5.2 km, fog from 420 m to 4.3 km.
- **Rebuilding the assets:** `assets/pipeline/build_world_assets.py`. `assets/pipeline/preview_county.mjs` renders the whole map top-down without starting the game.

**Map:** press **M** anywhere for the county map. It shows roads, places, you, your parked vehicles and any customer waiting.

**Floors:** physics and walking stand on slabs and paving (garage, warehouse, shacks, lot, gas station) through `groundHeight` in `county.js`, so wheels never sink into a floor.

**Dev tools:** add `?dev` to the URL or press backquote on the title screen, then choose "Baja County (free drive)". Number keys 0–9 teleport (dev only).

## Vehicles

| Vehicle | Where | Price | State |
|---|---|---|---|
| '71 Bug (grandma's) | In your garage | Owned from the start | Restorable down to the bare pan: every part comes off, the shell lifts off, and the engine upgrades step by step |
| '84 4x4 Pickup | Al's lot | $4,800 | Runs and drives. Cab holds 3 (medium max), the bed holds 16 (anything up to huge, like an engine). This is what you haul big parts with |
| '78 Half-ton | Al's lot (procedural placeholder) | Not for sale yet | Project truck with no motor, for later |

One vehicle is **active**: the one you drive and work on. Every other vehicle you own stays parked exactly where you left it, with its cargo. Walk up to a parked vehicle and press E to take it. The truck model comes from `assets/truck` (downloaded Hilux source), exported by `assets/truck/export_truck.py`: badge removed, 68k triangles, 1K textures, wheels split out so they spin and steer. In game it's a generic, unbranded '84 4x4.

## World dressing and assets

- **Trees:** two low-poly trees from `assets/plants/Realistic+Trees+.blend`, exported to `public/models/ENV_Trees.glb`. They grow round grandpa's yard, along Dry Wells' main street, as a windbreak and grove at the farm, at the canyon spring, and singly in the low washes. Trunks are solid.
- **Plants:** dead grass, grass bushes, ferns and nettles from `assets/plants/plant_assets_3.6LTS.blend`, exported to `public/models/ENV_Plants.glb`. Grass and bushes grow in a dense field that follows you (about 75 m, the same clump always in the same spot), bleached khaki in the desert and green at the farm. Ferns and nettles grow in the shade under trees.
- **Not used:** the 300k–3M-triangle trees and cherry trees (too heavy, wrong climate) and the forest-floor texture pack (it's a desert). They stay in `assets/plants` (git-ignored, 2.3 GB) in case a greener region comes later.
- **Desert scenery** (`public/models/ENV_Desert.glb`, from `assets/pipeline/export_desert.py`; one BatchedMesh per material, far instances switched off):
  - **Boulders:** about 2,600, favouring slopes and the canyon, using 3 ZNS3D desert rocks and 9 ForestVision boulders. They're tinted red in the canyon and are solid.
  - **Dead trees:** about 520, from 7 sun-bleached Dry_Trees models. Most grow in the washes, with two in grandpa's yard. They're solid.
  - **Shrubs:** about 2,600 dry ZNS3D shrubs.
- **Also:** yuccas, about 1,700 cacti, scrub bushes (instanced), telephone poles, green junction signs, and banded mesas on the horizon. The mesas look low-poly next to the real mountains and are due to be replaced or removed.
- **Skipped from the libraries:** the Coconut Palm pack (Unity-only mesh format) and the cracked old tree (ASCII FBX that Blender can't read).
- **Licences:** the Unity Asset Store items fall under its EULA (embedded in the game, not redistributed on their own); Poly Haven is CC0. Sources are listed in `public/textures/ground/SOURCES.md`.
- **Pipeline:** `assets/pipeline/export_plants.py` (run per source file), `export_desert.py`, `build_world_assets.py`, `inspect_scene.py` (list a scene's objects and triangle counts) and `check_glb_images.py`.

## Ideas parked for the map

- Junkyard with a paid gate near Dry Wells (walk the rows, pull parts off wrecks).
- Donor wrecks around the map that you can strip.
- Barn finds (settled in FEATURE_MAP): abandoned barns in the empty stretches the bigger map opened up, found only by exploring.
- A second town past the highway passes, and a coastal or Baja region beyond.
- Real race events at the Proving Grounds and a lakebed speed trap.
- Weather.
