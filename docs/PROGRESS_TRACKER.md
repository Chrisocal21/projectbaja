# Project: Baja — PROGRESS_TRACKER

**Canon arrived November 8, 2026:** read [CANON](./CANON.md) first. Phase 1 / Slice A is the only open work; see "Direction" below.

**Breakpoint: November 7, 2026 (night).** Everything under "Completed" builds (`npx vite build`), passes tests (32/32 then; 38/38 after the November 8 Slice A work, `npm test`) and was checked in a real browser (headless Chromium on the GPU). Items marked *not played* were built and tested but nobody has played them yet. Code is in `viewer/bug_viewer`; it deploys to Vercel from GitHub `main`.

**Not committed yet:** everything since commit `5c019e8` (doors, battery start, loading screen, the 6 km map) is uncommitted on branch `racer-items-fitglow`.

Related docs:
- [STORY_AND_WORLD](./STORY_AND_WORLD.md): story, map and vehicles.
- [BUILD_MODE](./BUILD_MODE.md): building up the property.
- [VEHICLE_ASSEMBLY_GUIDE](./VEHICLE_ASSEMBLY_GUIDE.md): how-to for parts and holograms.
- [SYSTEMS_BLUEPRINT](./SYSTEMS_BLUEPRINT.md) and [BLUEPRINT_GAP_PLAN](./BLUEPRINT_GAP_PLAN.md): the base spec and the plan against it.
- [ART_PROMPTS](./ART_PROMPTS.md): ChatGPT prompts for the logo, landing page, family photos and cars.
- [PROJECT_LOG](./PROJECT_LOG.md): what happened, in order.

## Completed

### Story and progression
- [x] **New-game start:** you inherit grandpa Walt's run-down garage. You clear the junk (it pays scrap money and scrap metal), flip the breaker (the lights come on) and find grandpa's letter on the bench.
- [x] **Grandma's Bug** is in the garage, half apart.
  - The flat rear-right wheel is off, with that corner on a stand, and the driver's seat is out. The battery is fitted.
  - Put her back together and get in. The tank is near empty, so E turns the key: the first try cranks, the second coughs and dies, the third fires.
  - From then on she starts normally. G gets you out while she's not running. *Not played.*
- [x] **Grandpa's #7 desert racer** is in the back-right corner of the garage, under a tarp, with junk piled on and around it so it reads as clutter from the door.
  - Pull the tarp, then take its coilover shocks, race tires and beadlock rims. They're meant for the Bug.
  - The car is a procedural model matched to the concept art. Each part disappears from the car when you take it.
- [x] **Shock hoops quest:**
  1. Collect 10 scrap metal: from the yard junk, scrap heaps at the barn, shacks, warehouse and Proving Grounds, and in containers.
  2. Build a **welder** and a **tube bender** in the garage (build mode).
  3. Fabricate the hoops at the **workbench**.
  4. Weld them onto the Bug.
  5. Only then do the race shocks and big tires fit.
- [x] **Odd jobs:** now and then a local pulls into the yard with a small job. The power must be on, there's one job at a time and no timer.
  - Jobs: dead battery, oil change, headlight, flat, wipers, fan belt, tune-up.
  - Supplies come from Dusty's store. Jobs pay $35–110.
- [x] **Grandpa's trailer can be fixed up:** roof, porch, paint, A/C, string lights. Once the roof is patched you can sleep, which skips ahead to the next customer.

### World
- [x] **Baja County, 6 × 6 km**, with the garage at the centre. It was 3 × 3 km until November 7; the distances between places doubled.
  - Places: Dry Wells town, Hollis farm, Red Rock Canyon, Sidewinder Dunes, Bitter Lake, the Proving Grounds, the salvage warehouse, three shacks. A mountain range (the Sierra) rings the edge.
  - Roads, poles and signs. Roads are graded (smoothed climbs, clean junctions), and hills ease off along them.
- [x] **Real terrain:** an eroded desert heightmap (from the Unity terrain pack) instead of sine waves, with low ridges and dry washes inside and real mountains at the edge. Flats are levelled for the places. Tiles are 300 m, with a coarse mesh everywhere and a fine one near you.
- [x] **Real ground textures:** 8 photo layers with normal maps (sand, desert ground, dirt, red soil, gravel, rock, grass, concrete).
  - Washes fill with sand and steep slopes show rock.
  - The heightmap's own shading darkens the gullies on far hills.
- [x] **Desert scenery:**
  - Real rock models for about 2,600 boulders, with the same collisions as before.
  - About 520 dead desert trees and 2,600 dry shrubs.
  - Cacti, yuccas and the supplied trees and grass field.
- [x] **Map (M):** the whole county with roads, places, you, your parked vehicles and any waiting customer; zoom in or out.
- [x] **Floors:** wheels and feet stand on the garage, warehouse and shack slabs and on the lot and gas-station paving.
- [x] **Garage look pass:**
  - Textured concrete slab, corrugated walls with rust streaks, plywood wainscot and steel rafters.
  - A red two-post lift with yellow bay lines, a pegboard and a compressor, and an engine stand with a real flat-four on it.
  - Shelves of oil, cans, paint and parts.
  - These props are decoration only; they don't do anything yet.

### Vehicles and parts
- [x] **Restoration:** every Bug part comes off, lids swing and the shell lifts off to the yard. The flat-four is procedural and takes step-by-step mods.
- [x] **Doors really open:** the doorway is cut out of the body behind each door, and the side trim swings with the door. The hinges sit right.
- [x] **Physical items:** hands, pack, vehicle storage, garage shelves and loot inside containers. Scrap metal is a stack.
- [x] **Held and loose items show the real thing:** parts with a model, tires (lying flat), rims, body pieces cut from the Bug, the engine and the battery. Supplies, tools and stock materials are still labelled crates.
- [x] **Fleet:** one active vehicle, with the rest parked with their cargo. The **'84 4x4** is bought at Al's ($4,800), is drivable, and has cab and bed storage.
- [x] **Fit glow (assembly guide §9):** hold a part near the Bug and its spot glows.
  - Green means bolt it on and red means not yet.
  - Whatever is in the way (another part, or a shut lid) glows amber.
- [x] **Detach glow (guide §9.3c):** empty-handed, aim at a body piece or wheel. The real part pulses white if it can come off (R removes it), or red with the blockers in amber. The engine and battery can't be aimed at yet.

### Building your place
- [x] **Build mode** (B on your property, after the garage is clean): 21 items including the welder and bender, grid snap, rotate, sell back, saved, solid.
- [x] **Build hologram (guide §7):** a glowing body, edges that show through walls, a footprint, and green or red with the reason.
- [x] More detailed prop models, using wood and metal textures.

### Tech and repo
- [x] **Loading screen** for the first load only: title art, a progress bar and a tip.
- [x] **No black screens:** fitting or removing parts no longer rebuilds the 3D canvas. Only the car is rebuilt, and only for changes to wheels, steering, tires, ride height, shell, engine or hoops.
- [x] **Asset scripts in `assets/pipeline`:**
  - `build_world_assets.py`: heightmap, macro shading and ground textures.
  - `export_desert.py`: rocks, dead trees and shrubs.
  - `preview_county.mjs`: renders the map top-down without starting the game.
  - `cut_door_openings.mjs` and `split_door_trim.mjs`: Bug door fixes.
- [x] Large source packs stay out of git (truck zips, the 2.3 GB plant pack, the Unity and texture libraries in sibling folders); only trimmed GLBs and baked textures are committed.

## Direction: Phase 1, the first playable (from the Forge canon, November 7)

[CANON](./CANON.md) holds the locked story and rules. **Only Phase 1 is open, and inside it only Slice A.** Do not start a slice until the one before it passes. A lot of what is listed under "Completed" above was built *ahead of phase* (odd jobs, build mode, the trailer, Al's truck, the 6 km map, the Proving Grounds). It stays in, because we don't rewrite working code or erase saves, but it doesn't get extended until its phase opens (OPEN_QUESTIONS C3).

### The four slices (PROPOSED by the Forge)
1. **Slice A, the wheel (OPEN).** Spawn in the garage, flip the breaker, find the letter, and put a bald tire on the rear-right wheel. One part, one tool, one atomic install, nothing else. **Passes when the wheel stays on after a save and reload.**
2. **Slice B, the drive.** Get in and drive a short loop where pavement and dirt clearly differ. The bald tire should feel worse on dirt. Passes when the drive feels good with placeholder boxes.
3. **Slice C, the engine.** Add battery, fuel and one ignition part. Starting depends on the real state of those parts, and a failed start tells the player why. Passes when the player can diagnose and fix it without a hint.
4. **Slice D, the money.** Haul scrap to Salvage & Surplus, get paid, buy one better part from a single parts source, and install it. Passes when the whole loop works from a new save with no cheats.

The slices deliberately skip customer NPCs, dialogue, a full store catalogue, garage construction, weather, day and night, the frontier, employees, racing and finished art. All of that is still canon; none of it is Phase 1.

### Slice A against the code (checked November 8, 2026)
| Step | In the code today | Gap |
|---|---|---|
| Spawn in the garage | New game puts you in the yard, about 15 m in front of the roller door (`WALK_START`, `worlds/siteData.js`) | Inside or outside the door? Flagged as a question, not changed |
| Flip the breaker | `flipBreaker()` in `game/home.js` saves `home.power`, which turns the garage lights on. Odd jobs only arrive with the power on | The welder and bender ignore the power (acceptance test 2) |
| Find the letter | On the workbench, opens a letter panel (`LETTER` in `game/home.js`) | The text is a placeholder Claude wrote. Canon says Chris writes it (Q F10) |
| Bald tire on the rear-right | The rear-right hub is empty on a new game. A loose **stock wheel** (no condition) leans by the car; fitting it needs the jack | No tire condition yet, so "bald" can't exist. The yard's bald tires are junk to clear. The jack is an invisible tool you get anywhere inside the garage zone, not a physical object (canon rule 6). The driver's seat is a second missing part (Q C5) |
| One atomic install | `planFit` checks rules and `withSlot` applies them. **Fixed November 8:** fit and remove are now one save write (`transact`) | Before the fix, the item list and the car were written separately, so a save could briefly hold the wheel in two places |
| Survives save and reload | Autosave on every change to `localStorage` key `baja-save-v1`; `Continue` restores the car and items | No manual save, no version field or migration, no backups, one slot (canon: versioned, atomic, rotating backups, slots) |

### Acceptance tests (Canon #127 milestone, kept)
Status key: ✅ in code and tested, 🟡 partly there, ❌ missing, ❔ needs a person to play it.
- 🟡 A new save starts with $1,500 combined and the correct starting property. `newGame()` sets $1,500; there's no test yet.
- 🟡 The breaker changes the actual powered state of lights and equipment. Lights yes; equipment no.
- ✅ The Bug can't drive normally with required parts missing or failed. `isDriveable`, tested. "Failed" parts need condition (Slice C).
- ✅ The player can pick up, carry or store, remove and install the chosen parts.
- 🟡 Parts never duplicate or teleport on install or remove. The single-write fix landed on November 8, and the Bug's wheels are tested. There are no per-part IDs yet, so a spare battery and the fitted one can't be told apart.
- ✅ A missing, wrong or incompatible part can't be mounted. `checkFit` and `planFit`, tested.
- 🟡 Correct repairs give an explainable start and drive. Missing parts are named. The first start is a scripted three-crank sequence, not real fuel, battery or ignition state (Slice C).
- 🟡 The player can inspect why the car won't start and act on it. "Won't start, missing: …" covers missing parts only.
- 🟡 At least one clear difference between pavement and dirt. The county surfaces have their own grip; there's no tire wear effect (Slice B).
- ❌ Paid work gives an understandable payment, debits spending and allows another purchase. Odd jobs pay, but that's the customer-job version; the Forge proposes a scrap haul (Q F7).
- 🟡 Manual save and autosave work, and reload keeps part states and item locations. Autosave yes; manual save no.
- ✅ No racing and no hidden lore cutscene when the car is repaired.
- ❔ The first 10–30 minutes communicate purpose without forcing story.
- ❔ Performance feels responsive on the development machine. The FPS target is TBD until profiling.

### Housekeeping musts (carried over)
1. **Commit and merge.** All the work since `5c019e8` is uncommitted on `racer-items-fitglow`. It includes about 15 MB of new runtime assets (heightmap, ground textures, `ENV_Desert.glb`). Waiting on your OK.
2. **Purge the truck zips from git history.** It needs a force-push; waiting on your OK.
3. **Play-test on your machine:**
   - Frame rate on the 6 km map, including shadows from the batched rocks and trees.
   - Load time (about 20 s in testing).
   - The battery start, the doors and the held-item models, none of which have been played yet.
4. **Decide what happens to old saves** (OPEN_QUESTIONS 10e). Vehicles parked away from the garage keep their old coordinates, which now land on different ground.
5. **Licensing check for a public web build** (OPEN_QUESTIONS 17). The Unity Asset Store terrain and rock packs are licensed for use embedded in a game. A browser game serves the files openly, so confirm that's allowed before deploying publicly.

## Queued by Chris (November 8), after the current step

Direction given while building the structure kit. Nothing here is built yet; mark each PROPOSAL until Chris confirms.

1. **A newer, less rusted look for player-built construction.** The building pieces should not look like Walt's rusty garage. Skin work only (`worlds/StructureModels.jsx`); sizes and ids stay fixed.
2. **Material choice when building.** The player picks the material for a piece (for example corrugated metal, wood, block, concrete, painted panel). PROPOSAL: a `material` field on each placed piece, with prices per material, and the skin draws it. The kit's piece ids and sizes do not change.
3. **Garage and yard upgrades, levelled up over time. DONE (first pass).** The Upgrades panel (key **U**, or Pause → Upgrades) lists three levelled upgrades bought with cash, separate from the building kit: **Second car lift** (garage, 1 level, $2,200 — a second two-post lift beside the first), **Parking lot expansion** (yard, 2 levels, $650/$950 — +2 bays per level, 12 → 14 → 16), and **Office expansion** (garage, 1 level, $1,600 — a back room cut into the office's west wall, through a real doorway with real wall collision; a bare desk is the only furniture so far). Data lives in `worlds/upgrades.js` (pure, tested) with `game/upgrades.js` as the stateful half (`upgradeLevel`, `buyUpgrade`); levels persist in `game.home.upgrades`. A second office level (more furniture, or more room) is queued.
4. **Building expansions are a different thing.** Putting up new structures with the kit (rooms, sheds, extra buildings) is free-form building; upgrades are bought progression. Keep the two systems separate. Done: the two systems don't overlap — the Upgrades panel has no placement step, and the build menu (B) has no levels.

How this settles the open build-mode questions:
- **Buyable car lift:** done — replaced by the "Second car lift" upgrade; the old $1,800 loose `lift` build item is gone.
- **"Car lot space":** done — replaced by the "Parking lot expansion" upgrade; the old $200 loose `carSpot` build item is gone (the real customer lot already auto-parks cars, so a standalone decorative pad was redundant).
- **Old PC / parts ordering:** still undecided.

## Inbox: parked until their phase opens

These were the next steps before the canon arrived. They wait now unless a slice needs them; the phase is noted where it's clear.

### World polish (Phase 3 world, small)
- Replace or remove the low-poly banded mesas on the horizon; they look fake next to the real mountains.
- Real asphalt and gravel textures on the road ribbons, and proper ends on dead-end roads (they end in flat squares today).
- The dev free-drive camera starts inside the garage wall.
- Fill the extra space: the bigger map has room for the parked map ideas (junkyard, donor wrecks, barn finds) in STORY_AND_WORLD.

### Vehicles and building (Phase 2)
1. **The truck as a restorable VehicleDef:** tailgate, hood and wheels as slots; cargo weight affects handling.
2. **Make build items do things:** racks add storage, the lift and engine stand speed up jobs, the PC orders parts. The proposals in BUILD_MODE need your sign-off.
3. Make the engine and battery aimable for the detach glow; show supplies and tools as real models.
4. The high-power rear engine swap; buggy bodies for the bare pan.

### Story and economy (Phase 2–3)
- **Lore:** done. The Forge canon is in [CANON](./CANON.md), and STORY_AND_WORLD follows it.
- More odd jobs that need the jack or the welder; customers who come back; a reputation that slowly grows the garage's business.
- Selling cars: your own car lot spaces, price signs and buyers (the marketplace).
- Al's roster over time: the '78 half-ton becomes buyable, plus more project cars, gated by money and story beats.

### Systems (blueprint phases)
- Phase 2: condition and wear. Phase 4: paint (the guide's §10.2 grind, paint, buff). Phase 5: towing, real fuel and recovery, donor wrecks.
- A junkyard with a gate; Proving Grounds race events.

### Art
- Logo, landing page, family photos and car references from the ChatGPT prompts in [ART_PROMPTS](./ART_PROMPTS.md).
- Final 3D for the vehicles and parts, plus touch-up. Today's buildings, race car and props are procedural placeholders.
  - Meshy is good for solid parts and panels.
  - Meshy is bad for tube cages: the #7 attempt was reverted, so keep cages procedural.
- Licences still to confirm: the Hilux, plant and tree packs, the Unity terrain, rock and tree packs, and the texture packs (Poly Haven is CC0 and needs nothing).

## Not started
- Marketplace and classifieds, NPC buyers.
- Racing events, bikes.
- Night, weather, time of day.
