# Project: Baja — PROGRESS_TRACKER

Last updated: November 7, 2026, after Baja County, the new story start, the drivable truck, build mode and world plants.

The game is playable in the browser: React + react-three-fiber, deployed on Vercel from GitHub `main`, code in `viewer/bug_viewer`. See [STORY_AND_WORLD](./STORY_AND_WORLD.md), [BUILD_MODE](./BUILD_MODE.md), [SYSTEMS_BLUEPRINT](./SYSTEMS_BLUEPRINT.md) and [BLUEPRINT_GAP_PLAN](./BLUEPRINT_GAP_PLAN.md).

## Done

**Story and world**
- Story start: you inherit grandpa Walt's run-down garage in the middle of Baja County.
  - The garage is full of junk to clear (pays scrap), the power is off (flip the breaker), and his letter is on the bench.
  - Grandma's Bug is in the garage, half apart: dead battery, rear-right wheel off, driver's seat out. The parts are lying nearby.
- Baja County, the official 3 × 3 km map, with the garage at the centre:
  - Roads: Old Mill Rd, Highway 9, Lakebed Rd, Canyon Rd, the farm lane.
  - Biomes: home scrub, the Dry Wells town, Hollis farm, Red Rock Canyon, Sidewinder Dunes, Bitter Lake and the Proving Grounds (the old test tracks moved in).
  - Also the salvage warehouse and three shacks.
  - Tiled terrain with level of detail, telephone poles, junction signs, horizon mesas.
- World plants from the new asset packs: trees (farm, town, yard, canyon spring, washes) and a dense grass and bush field that follows the player.

**Parts, restoration and inventory**
- Physical parts and inventory: hands, pack, vehicle storage, garage shelves.
- Loot sits on benches and shelves or inside containers in buildings. Nothing floats.
- Restoration rules (blueprint phase 1, both slices):
  - Every part comes off; lids and doors swing; the shell lifts off to the yard, leaving a rolling chassis.
  - Procedural flat-four engine with step-by-step mods.
  - Rules are pure functions with tests.

**Vehicles**
- Fleet: one active vehicle, others parked where you left them, with their cargo.
- The '84 4x4 pickup is buyable at Al's ($4,800) and drivable, with cab and bed storage.
- The truck model was trimmed from the downloaded pack: 68k triangles, 5.4 MB, unbranded.

**Build mode (first slice)**
- Unlocks once the garage is clean. Press B on your property: 19 items, grid snap, rotate, sell back.
- Builds save, and solid ones collide.

**Repo and tests**
- Repo size: the truck zips were untracked and git-ignored, the plant pack is git-ignored, and unused models were deleted.
- Tests: 31 pass (`npm test`). The production build passes.

## In progress / known limits

- The 330 MB of truck zips are still in git history from commit `0946b57`. Purging them needs a history rewrite and a force-push. That needs the owner's OK.
- The truck has no restoration slots yet (it isn't a VehicleDef); only the Bug can be worked on.
- The truck's first-person cab eye position is a guess; it needs a look in-game.
- Headless testing runs at about 2 fps, so driving feel and frame rate on the real map need checking on a real machine.
- Most build-mode items are cosmetic so far.

## Next (musts first)

1. Purge the truck zips from git history (needs your go-ahead).
2. Play-test the new start and the county on a real machine: frame rate, terrain tile streaming, grass density.
3. Make the truck a real VehicleDef: tailgate, hood, wheels as slots, cargo mass in handling.
4. Make build items do things: racks add storage, the lift and engine stand speed jobs, the PC orders parts (see BUILD_MODE).
5. A high-power engine swap for the rear bay; buggy bodies for the bare pan.
6. Blueprint phase 2: condition and wear. Phase 4: paint. Phase 5: towing, fuel and recovery.

## Not started

- Marketplace and classifieds, NPC buyers, your own car lot sales.
- Junkyard with a gate, donor wrecks.
- Racing events.
- Bikes.
