# Project: Baja — STORY_AND_WORLD

Last updated: November 7, 2026. The story setup, the official open-world map (Baja County), the vehicles you can own, and the world dressing (plants, trees, assets). Code lives in `viewer/bug_viewer/src/worlds/county.js` (map data), `worlds/County.jsx` (3D), `game/home.js` (grandpa's place), `game/fleet.js` (vehicles).

## The story

You just finished college. Your grandfather **Walt** has died and left you his garage, **Walt's Garage**, out in the middle of nowhere in Baja County. You drive out to see it and decide to stay and fix it up.

- **It starts run-down.** The garage is full of junk (rotten boxes, paint cans, decades of newspapers). The yard has bald tires, scrap metal, a dead fridge and tumbleweeds. The power is off, and the lights only come on once you flip the main breaker.
- **Grandma's old Bug is inside.** It hasn't run since 2009. The battery is dead, grandpa had the rear-right wheel off to do the brakes, and the driver's seat is out to fix the runner. Every part is still lying around the garage. Getting it running is the first goal and the tutorial: fit the seat, put the wheel back on, then buy or find a battery.
- **Grandpa left a letter** on the workbench. It points you at Al (car lot), Dusty (gas station, "good people") and the closed Proving Grounds ("nobody checks the fence"). It ends: "Fix her up. Then fix the place up. Then go fast."
- **Grandpa's old #7 desert race car** sits under a tarp in the side yard. Its race shocks and four beadlock tires were set aside for the Bug, but they won't clear the stock body. You have to:
  1. Gather scrap metal.
  2. Build a welder and a tube bender in the shop.
  3. Fabricate shock hoops at the workbench.
  4. Weld them in.

  Only then do the shocks and tires go on.
- **Odd jobs** keep you going. Once the lights are on, a local now and then pulls into the yard with something small: a dead battery, an oil change, a headlight, a flat, wipers, a fan belt, a tune-up. You buy the supply at Dusty's, do the job and get paid. There's no timer and no stress: just enough to keep chipping away at the garage, then the whole property (the trailer, the yard), and later building cars to sell.
- **Grandpa's 1966 trailer** is yours to fix up: patch the roof (then you can sleep there), build a porch, paint it, add A/C and string lights.
- **Honest Al's lot in Dry Wells sells the bigger, pricier vehicles.** The Bug isn't for sale there any more; it's yours from the start.
- **The arc:** clean the garage → get the Bug running → buy a truck to haul big parts → build up your property → turn the Bug (and later other vehicles) into race machines → race at the Proving Grounds and beyond.

You start with $1,500. Clearing junk pays a little scrap money.

## Baja County: the official map

3 × 3 km, with grandpa's garage in the middle. Roads lead out to every biome. The old Test Center tracks now live inside the map as the **Proving Grounds**, so testing and story share one world. The Test Center stays as a dev-only map.

```
                         N (+z)
        ┌──────────────── mountains ────────────────┐
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
| Walt's Garage (home) | 0, 0 | Garage, grandpa's trailer, windmill, water tank, junk to clear; your build-mode property (60 × 50 m) |
| Old Mill Rd | z ≈ 80, east–west | Gravel; links home to Highway 9 (east) and the dunes (west) |
| Highway 9 | x ≈ 420, north–south | 2-lane blacktop with telephone poles; leaves the map through mountain passes |
| Dry Wells | 680, 300 | Main street: Honest Al's (vehicles), Dusty's Fuel (gas, batteries, tools, wash), Baja Parts (part shop, boxed pickup), diner, post office, feed & supply, motel, sheriff, The Rusty Piston, laundromat |
| Hollis farm | −480, 480 | Barn with loot, green fields, a windbreak row of trees |
| Red Rock Canyon | −180, 1080 | Banded mesas, red dirt, a rock trail loop, a spring with trees and an old shack |
| Sidewinder Dunes | −990, 250 | Rolling sand dunes, a dune loop trail, a staging shack |
| Bitter Lake | −460, −860 | Dry lakebed (fast, flat "playa" surface), a shack on the shore |
| Proving Grounds | 950, −880 | The old test center: paved circuit + pit lane, off-road track (jumps, whoops, rock garden, mud), washboard dirt strip, HQ building with loot |
| Salvage & Surplus | 482, −320 | Run-down warehouse off Highway 9 with racks of loot |

**Surfaces:** asphalt, concrete, gravel, packed dirt, loose dirt, scrub, sand, red dirt, rock, mud, dry lakebed, grass. Each has its own grip and rolling resistance.

**Terrain tech:** analytic base height, plus biome shaping (dunes, mesas, lakebed, flattened town and proving grounds, mountains round the edge), plus roads and pads painted into a 2 m raster. The terrain is drawn in 250 m tiles. Every tile has a coarse mesh, and tiles within about 430 m get a fine one, built one per tick so it never hitches. Skirts hide any cracks between them.

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
- **Also:** yuccas, cacti, boulders, scrub bushes (instanced), telephone poles, green junction signs, horizon mesas.
- **Pipeline:** `assets/pipeline/export_plants.py` (run per source file), `assets/pipeline/inspect_scene.py` (list a scene's objects and triangle counts), `assets/pipeline/check_glb_images.py`.

## Ideas parked for the map

- Junkyard with a paid gate near Dry Wells (walk the rows, pull parts off wrecks).
- Donor wrecks around the map that you can strip.
- A second town past the highway passes, and a coastal or Baja region beyond.
- Real race events at the Proving Grounds and a lakebed speed trap.
- Night, weather and time of day.
