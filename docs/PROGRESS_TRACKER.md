# Project: Baja — PROGRESS_TRACKER

**Breakpoint: November 7, 2026.** A clean stopping point: everything below "Completed" builds, passes tests (31/31) and was checked in headless screenshots. Code is in `viewer/bug_viewer`; it deploys to Vercel from GitHub `main`.

Related docs:
- [STORY_AND_WORLD](./STORY_AND_WORLD.md): story, map and vehicles.
- [BUILD_MODE](./BUILD_MODE.md): building up the property.
- [VEHICLE_ASSEMBLY_GUIDE](./VEHICLE_ASSEMBLY_GUIDE.md): how-to for parts and holograms.
- [SYSTEMS_BLUEPRINT](./SYSTEMS_BLUEPRINT.md) and [BLUEPRINT_GAP_PLAN](./BLUEPRINT_GAP_PLAN.md): the base spec and the plan against it.
- [ART_PROMPTS](./ART_PROMPTS.md): ChatGPT prompts for the logo, landing page, family photos and cars.

## Completed

### Story and progression
- [x] New-game start: you inherit grandpa Walt's run-down garage. Junk to clear (pays scrap money and scrap metal), the breaker to flip (the lights come on), and grandpa's letter on the bench.
- [x] Grandma's Bug is in the garage, half apart: dead battery, a wheel off and on a stand, the driver's seat out. The parts lie nearby.
- [x] **Grandpa's #7 desert racer** sits under a tarp in the side yard. Pull the tarp, then strip its coilover shocks and beadlock race tires; they're for the Bug.
- [x] **Shock hoops quest:**
  1. Collect 10 scrap metal: from the yard junk, scrap heaps at the barn, shacks, warehouse and Proving Grounds, and in containers.
  2. Build a **welder** and a **tube bender** in the garage (build mode).
  3. Fabricate the hoops at the **workbench**.
  4. Weld them onto the Bug.
  5. Only then do the race shocks and big tires fit.
- [x] **Odd jobs:** now and then a local pulls into the yard with a small job. The power must be on; one at a time; no timer.
  - Jobs: dead battery, oil change, headlight, flat, wipers, fan belt, tune-up.
  - Supplies come from Dusty's store. Pays $35–110.
- [x] **Grandpa's trailer can be fixed up:** roof, porch, paint, A/C, string lights. Once the roof is patched you can sleep, which skips ahead to the next customer.

### World
- [x] **Baja County**, 3 × 3 km, with the garage at the centre.
  - Places: Dry Wells town, Hollis farm, Red Rock Canyon, Sidewinder Dunes, Bitter Lake, the Proving Grounds, the salvage warehouse, three shacks.
  - Roads, poles and signs; terrain with level of detail.
- [x] Trees and a grass field that follows you, from the supplied plant packs.
- [x] **Map (M):** the whole county with roads, places, you, your parked vehicles and any waiting customer; zoom in or out.
- [x] **Floors:** wheels and feet stand on the garage, warehouse and shack slabs and the lot and gas-station paving. This fixed tires sinking into the floor indoors.

### Vehicles and parts
- [x] Every Bug part comes off; lids and doors swing; the shell lifts off to the yard; a procedural flat-four with step-by-step mods.
- [x] Physical items: hands, pack, vehicle storage, garage shelves; loot inside containers. Scrap metal is a stack.
- [x] Fleet: one active vehicle, the rest parked with their cargo. The **'84 4x4** is bought at Al's ($4,800), drivable, with cab and bed storage.
- [x] **Fit glow (assembly guide §9, first slice):** hold a part near the Bug and its spot glows. Green means bolt it on, amber means open a lid first, red means not yet. It works for body pieces, wheels, bolt-ons and the shock hoops.

### Building your place
- [x] Build mode (B on your property, after the garage is clean): 21 items including the welder and bender, grid snap, rotate, sell back, saved, solid.
- [x] **Build hologram (guide §7):** a glowing body, edges that show through walls, a footprint, and green or red with the reason.
- [x] More detailed prop models, using wood and metal textures.

### Repo
- [x] Large source packs are git-ignored (truck zips, the 2.3 GB plant pack); trimmed GLBs only.

## Still to be completed

### Next (musts)
1. **Purge the truck zips from git history.** It needs a force-push; waiting on your OK.
2. **Play-test on a real machine:** frame rate, terrain tiles loading in, grass density, the truck's cab view. Headless testing only runs at about 2 fps.
3. **Amber blockers in the fit glow** (guide §9.3): `checkFit` should return `blockers` so the parts that must go first glow amber.
4. **Detach glow** (guide §9.3c): with empty hands, the part you aim at glows white (it can come off) or red with amber dependents.
5. **Held parts as real models** (guide §5): carry a clone of the real part, not a labelled crate.
6. **The truck as a restorable VehicleDef:** tailgate, hood and wheels as slots; cargo weight affects handling.
7. **Make build items do things:** racks add storage, the lift and engine stand speed up jobs, the PC orders parts.

### Story and economy
- More odd jobs that need the jack or the welder; customers who come back; a reputation that slowly grows the garage's business.
- Selling cars: your own car lot spaces, price signs and buyers (the marketplace).
- Al's roster over time: the '78 half-ton becomes buyable, more project cars, availability by money and story beats.
- The high-power rear engine swap; buggy bodies for the bare pan.

### Systems (blueprint phases)
- Phase 2: condition and wear. Phase 4: paint (the guide's §10.2 grind, paint, buff). Phase 5: towing, real fuel and recovery, donor wrecks.
- A junkyard with a gate; Proving Grounds race events.

### Art
- Logo, landing page, family photos and car references from the ChatGPT prompts in [ART_PROMPTS](./ART_PROMPTS.md).
- Final 3D for the vehicles and parts from Meshy, plus touch-up. Today's buildings, race car and props are procedural placeholders.
- Licences for the supplied Hilux and plant packs need confirming before release.

## Not started
- Marketplace and classifieds, NPC buyers.
- Racing events, bikes.
- Night, weather, time of day.
