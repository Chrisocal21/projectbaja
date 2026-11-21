# Repair gameplay, more parts, and a living world: plan

Written November 21, 2026 from Chris's list: fix parts, replace tires on rims, add parts by hand, more parts all over the world, a cleaner and more realistic desert and west-coast world that feels liveable, more places to pick up parts. Labels: **PROPOSAL** = design guess. **CANON?** = needs Chris's OK. Reads with [MECHANIC_SIM_DESIGN](./MECHANIC_SIM_DESIGN.md), [CONTROLS_AND_STORAGE_PLAN](./CONTROLS_AND_STORAGE_PLAN.md), [WORLD_MAP](./WORLD_MAP.md).

## Where the El Cajon is right now

**It is not in Project Baja.** It exists only in the Salvage Road repo (`salvageroad/src/render/elCajon.ts` and `rules/carParts.ts`), as code that draws the truck from boxes, not as a model file. In Baja it is only mentioned in docs (OPEN_QUESTIONS #15, the merge and controls plans). Bringing it in means rebuilding it as a second restorable vehicle (merge plan, step 3), delivered in pieces to Walt's shop. The "gifted by a neighbor business" story is **CANON?**.

## What exists today

- **Tires:** loose tires and sets are items with tread (`game/tires.js`: good/half-worn/worn/bald). Rims are separate items. A "wheel" is bought or found as a whole; **you cannot take a tire off a rim, mount one, patch a flat or inflate**.
- **Fitting parts by hand:** works for body pieces, wheels, engine, battery, bolt-ons (hold-click, snap to the spot).
- **Part sources:** toolboxes, drawers, boxes and crates in the garage, barn, warehouse, shacks, gas station and Proving Grounds (`game/loot.js`), scrap heaps, Al's lot, Dusty's, the Baja Parts shop, phone orders.
- **World:** a 6 km county with real eroded terrain, Dry Wells, two biomes, highways; behind `?realmap` a real border slice from Los Angeles to Cabo with real roads. Chris noted visuals are being handled elsewhere (RESUME_HERE: "ChatGPT is handling visuals"); performance is tight (FPS 35 to 46 in your screenshots).

## 1. Repair gameplay (the mechanic first)

### 1a. Wheels as assemblies: tire on rim (PROPOSAL, build this first)
A wheel becomes `{ rim, tire, tread, air, damage }`. At a **tire machine** (a buyable garage prop with a hold bar):
1. Hold on a wheel in the machine: tire comes off the rim (bar). Tire and rim become two items in your hands/ground.
2. Hold a rim, then a tire, to mount (bar). Tire size must match the rim (`tireSizeOf` already gives diameter and width).
3. **Flat or damaged tires:** a plug/patch kit repairs a puncture (hold bar), then inflate with the compressor already in the garage.
4. Balance (optional later): small bar, changes vibration.
This gives the "replace tires on rims" loop and a reason to hunt rims and tires separately.

### 1b. Fix instead of replace (blueprint sections 5.4 and 6)
Parts carry **condition**; at a bench you can repair in place (scrap or a repair item raises it, capped below 100% in the field), clean rust (grinder), and later paint. This needs the part-as-object data change in MECHANIC_SIM_DESIGN step 4, and is the largest data change here.

### 1c. Adding parts by hand
Already built for the Bug. Extend with: fit **multiple units** (the four wheels, lug nuts), the back seat and roof rack as slots, and the second vehicle.

## 2. More parts all over the world

PROPOSAL, in order of fit with the new stripping mechanic:
1. **Donor wrecks.** Rusted cars in the desert, a junkyard and farm fields, using the same hold-to-remove mechanic on real parts. Each wreck is a VehicleDef with some slots present, some damaged, some missing. This is the biggest multiplier for parts: every wreck is a parts source with real condition.
2. **More buildings with loot:** the Proving Grounds, farm, abandoned gas stations, roadside shacks, a salvage yard, a swap meet. Reuse the existing container and spot system (data only).
3. **Roadside finds:** a tire by the road, a bumper in a ditch (rare, cheap to add), on the highways of `?realmap`.
4. **Shops:** a tire shop (sells rims and tires, has the tire machine), a junkyard that sells pulled parts by condition.
5. Phone ordering: new categories (see CONTROLS_AND_STORAGE_PLAN section 5).
Economy rule (canon): no magic stock; start $1,500.

## 3. A world that feels lived in

Split by what is cheap and what is heavy:

| Layer | Work | Cost |
|---|---|---|
| Desert dressing | Rocks, brush, cacti, tumbleweeds, dirt tracks, fences, power poles, billboards, abandoned vehicles, signs. Mostly instanced and data-driven | low to medium |
| Town life | More building variety, parked cars, props, street furniture, lights at night, more shops in Dry Wells | medium |
| Clean-up | Remove placeholder shapes, fix floating or clipping props, consistent materials | medium, needs a world walk-through |
| West-coast cities | Los Angeles and others on the real map (`?realmap` step 6: biomes by real area, map screen, teleports). Needs building footprint data and heavy streaming | **large**; plan with the big-map steps, not now |
| Performance budget | Instancing and distance culling first, or each addition costs FPS (already 35 to 46) | required |

**Coordination:** visuals may be owned by another tool or person (RESUME_HERE). Say who does the look so I do the data, mechanics and placement and do not collide.

## Order of work (PROPOSAL)

1. Wheel assembly data and tire machine (1a). Smallest complete new repair loop.
2. Donor wreck as a VehicleDef in the desert (reuses the strip mechanic), then 3 to 5 wrecks in different places.
3. More loot buildings and roadside finds (data only).
4. Condition on parts and repair at the bench (1b).
5. Desert dressing pass, then town life, each with a performance check.
6. West-coast cities with the real-map steps.
7. El Cajon as the second vehicle (needs the story decision).

## Questions for Chris

1. Start with the tire machine and wheel assemblies (1a)? That is my recommendation.
2. Are donor wrecks a good idea for the parts hunt?
3. Who owns the world's look (you, ChatGPT, me)? I can do dressing as data and instances if it is me.
4. West-coast cities: is that the `?realmap` direction (real LA to Cabo), or made-up towns in the county first?
5. El Cajon: who gifts it and why (**CANON?**)?

---

## Decisions (Chris, Nov 21)

- Yes to: tire machine and wheel assemblies first; donor wrecks for parts; ChatGPT owns the world's *look*, with Claude using the **unused assets in both projects** and doing data, placement and mechanics.
- World direction: the **real map (LA, San Diego, Cabo)**, and its **coastline has to look like a coast** (sand, surf line, cliffs), not a flat mask.
- **El Cajon story (CANON? Chris proposed, needs locking into CANON):** Dusty, the gas station owner, has it as a scrap car, just the shell. He brings it to Walt's shop and sets it in the yard. It is a gift because he notices the Bug carries very little. That nudges the player to start building out the Bug (storage, rack, trunk). It arrives in pieces, so it is rebuilt by finding and buying parts.

## Unused assets worth using

| Where | What | Use |
|---|---|---|
| Baja `assets/nissan frontier/` | 2004 Nissan Frontier (GLB, FBX, OBJ, blend) | a real-model **donor wreck** / found truck |
| Baja `assets/plants/` | Realistic trees GLB, plant assets, forest texture pack | desert and coast dressing (only `ENV_Plants/Trees/Desert` are used now) |
| Baja `assets/Tires/` | `TIRE_AllTerrain_Normalized`, three Meshy rugged wheels, a generic 35" AT tire | more tire and wheel items for the tire machine |
| Baja `assets/bug/`, `generated/` (buggy7 split) | more Beetle and buggy models (30 files) | **donor Beetle wrecks** and buggy bodies |
| Baja `assets/archive/unused-models/` | 17 models | check for props |
| Baja `assets/truck/` | truck source scripts and archives | the '84 truck as a restorable |
| Salvage Road `public/models/salvage-vehicles/` | `unfinished_pickup.glb`, `delivery_step_van.glb` (named parts, blockout quality) | **donor wrecks** with parts already split per slot |
| Salvage Road `public/textures/world/` | asphalt, brick (3), concrete, sand, rock, wood, bark, grass | town and desert ground and building textures |
| Salvage Road `shipping-container.glb` | container | backburnered; a roadside prop at most |

## Efficient order (recommended)

The cost that matters is that the game holds **one** vehicle's restoration state (`game.build`). Donor wrecks, the El Cajon and the restorable '84 truck all need *many vehicles, each with its own parts state*. Build that once and three features come with it. So:

1. **Tire machine and wheel assemblies.** Self-contained, no refactor. *Rules built and tested (`game/wheelAssembly.js`, 7 tests); next is the machine prop, hold bars, wheels as items, fitting checks.*
2. **Many-vehicle restoration state** (the enabling refactor): each vehicle instance carries its own build, definition and position. One careful change to `game.build`, `workshop.js` and `fleet.js`, with tests.
3. **El Cajon via Dusty** (second restorable vehicle, delivered to the yard in pieces) *and* **donor wrecks** from existing models (Frontier, Salvage Road pickup and van, spare Beetles), on the same machinery.
4. **Loot buildings, roadside finds** (data only) in parallel with 3.
5. **Coast look** on `?realmap`: sand band and surf line from the sea mask, cliff shading, rocks. Cheap, high impact.
6. **Dressing from the unused assets** (trees, plants, textures), each pass with a performance check.
7. **Cities** (LA, San Diego, Cabo) with the real-map steps. Heavy; last.

## Progress: tire machine (Nov 21)

Built, not yet seen in the game (288 tests pass, build ok):
- **Rules** `game/wheelAssembly.js`, `game/machineRules.js` (pure, tested). A tire only fits a rim of its size (15/16/17 inch classes, a guess); a hole must be patched (uses a $10 plug kit from Dusty's, in your pack) before it takes air; inflating needs the garage compressor; flat or punctured wheels can't be fitted to the car (the prompt says why).
- **The machine:** "Tire machine" ($350) in the B-menu under Garage. Hold a **wheel** up to it and hold left click: punctured -> patch, flat -> inflate, good -> tire comes off the rim (rim stays in hand, tire lands on the floor with its tread). Hold a **rim** (or a **tire**) and it mounts the matching tire (or rim) lying on the floor beside the machine; the new wheel starts with no air.
- **New item kind `tire`**; wheels gain optional `rim`, `hole`, `air` fields (old saves read as steel rim, no hole, full air). The bald worn tire in Walt's garage now comes punctured.
- Known gaps: the machine's model is a placeholder; a fitted wheel's rim is not remembered on the car (build.rim is still global); tire sets (4 at once) are not dismountable; no sound; the Bug's own starting leaning wheel is NOT made flat (canon letter mentions a flat; needs Chris's call).

## Progress: many restorable vehicles (Nov 21)

Built, not yet seen in the game (293 tests pass, build ok):
- **Work target.** The game no longer works on "the one car". `game.work` is the restorable vehicle you stand at (Bug, or any project), picked each frame by `game/workTarget.js` (pure, tested). Hold-click remove / fit, covers, the aim glow, the fit hologram and the fly-in snap all use it. The Bug keeps its old path (`game.build`, scene rebuild) exactly.
- **Projects** (`game/projects.js`): `game.projects = [{ uid, name, def, build, pose }]`, saved with the game (optional key; old saves have none and are seeded once, `home.projectsV`). Each has its own parts, its own open lids, and is drawn with the existing `BuildModel`, so a donor needs no new art.
- **Two donor Bugs** seeded just outside the barn pad (body donor: panels, seats and glass but no engine or wheels) and the salvage warehouse pad (running-gear donor: engine, battery and wheels, body picked clean). Positions are guesses; check they sit clear of buildings and the ground.
- Removed parts never drop under any vehicle; donors are solid for the car.
- Limits: the engine and the body shell need the garage hoist, so donors in the field give up everything else first; no part condition yet (all donor parts are "as new"); donors look like the Bug, not rusted; you cannot drive or enter a project.
- Next: the El Cajon as a project (needs its own VehicleDef and model), then promote a finished project to a driveable vehicle.

## Progress: the El Cajon (Nov 21)

Built and **driven through the real game in headless Chrome** (not yet by Chris's hands). 318 tests pass, build ok. What the browser run showed: Dusty's delivery makes the project and the six-part pile; picking a part from the pile and holding it to the truck shows "Hold left click - Bolt on the ..."; the dashboard, bench seat, steering wheel, driver's door and hood each fitted in dependency order; the crosshair identifies the fitted part from its mesh and holding takes it off into your hands; E opens and shuts the hood and the driver's door (they swing); no console errors; 23-41 FPS with the Bug, the garage and the truck in view (headless, with the GPU).
**A bug found and fixed on the way:** hold-to-remove only worked on the car you were driving (it checked `game.nearCar`). It could never have worked on the donor Bugs from the last step either; it now uses the work target (`game.work`). The story is Chris's proposal and is still **CANON?** (OPEN_QUESTIONS #15 records the answer; nothing is in CANON.md). Dusty's lines are placeholders.

- **The trigger.** The first time you open Dusty's corner store once your Bug runs (it has to be your active vehicle), he makes the offer ("that Bug won't haul much..."). 4 game hours later (`GIFT_HOURS`) a truck comes (the existing delivery truck shows on the road, the Orders app lists "El Cajon, from Dusty") and the El Cajon is set down in Walt's yard at garage-local (-7, 12.5), nose toward the garage (so the engine is nearest the hoist, which only reaches 20 m), with a pile of its parts along its left side. Never in test sessions, never twice. `window.__cajon.deliver()` skips the wait for testing.
- **What it is.** A second `VehicleDef` (`CAJON` in `rules/vehicles.js`): 14 parts + 4 wheels, ids all start `ec` so a loose El Cajon hood can never be fitted to the Bug. Same rules as the Bug: dash before steering wheel and glass, engine before battery and grille, grille before headlights, hood open to reach the engine, the engine needs the garage hoist (the yard is inside the garage's reach), wheels need a jack. It runs when it has engine, battery, bench seat, steering wheel and four wheels (body panels are optional, like the Bug).
- **The model.** Salvage Road's procedural truck (`render/elCajon.ts`) ported to JS with its numbers untouched (`cajon/model.js`, `cajon/rust.js`): rusted paint, 14 separate part groups, hinged hood, doors and tailgate. 104k triangles for the body plus about 10k per wheel (builds in 0.2 s). `cajon/instance.js` makes each truck its own copy (own materials so one part can glow, parts tagged by slot, jack stands under bare hubs, hinge animation). Because `CAJON.mounts` and the model agree (tested), the same aim, glow, hologram and clip-in code as the Bug works on it.
- **Parts.** Dusty's pile: bench seat, dashboard, steering wheel, hood, both doors. Everything else is to find or buy: phone and office PC, Parts online, new "El Cajon" tab once it is in the yard (engine $420, battery $85, grille $60, headlights $70, bumpers $90 each, tailgate $120, windshield $150, stock wheel $55; **all prices PROPOSAL**; about $1,300 for the lot). Orders arrive boxed at the shop pickup like other parts.
- **What changed under it.** `workshop.js` takes the definition from the build (`build.def`, absent = Bug), so the Bug path is unchanged; `main.jsx` no longer runs the Bug-only `normalize` on a Cajon build; `items.js` knows every vehicle's parts; the office PC lists its status.
- **Limits, honestly:**
  - ~~You cannot drive it yet~~ **Done (see "El Cajon drivable" below).**
  - Wheels are the plain stock wheel; the tire machine works on them, but the model's own alloy wheel is what shows on the truck.
  - It is heavy (about 145k triangles with wheels). With the Bug and the garage in view the frame rate will drop; there is no level of detail yet.
  - Positions of the truck and its pile are guesses: check it clears the fridge at (9, 15) and the fence, and that the ground under 5.5 m of truck is level enough.
  - No sound, no part condition (all parts as new), no paint (it stays rusted), no storage in the bed yet.

## Performance pass (Nov 21)
Chris reported 7-15 FPS. Measured in headless Chrome with the in-game `?perf` HUD, the Chrome CPU profiler and "hide one thing, re-measure" experiments (scratchpad scripts, not in the repo; `window.__perfScene` is a test hook in `PerfHud.jsx`).
- **Finding:** the El Cajon was a small part (about 5% of triangles). About **40% of every frame** was the Bug's suspension physics running while the car sat parked and you walked: 4 wheels x 4 passes x 39 ground samples per step, each a costly real-map height query (`county.js` `dist`/`warp`, `highways.js` `nearAll`/`pavedSurfaceAt`).
- **Fix:** `DriveWorld.jsx` `simGuarded`: once the car is parked on foot and has not moved more than 2 cm for 20 physics steps, the physics step is skipped; it wakes the moment you get in or anything moves it. FPS at the garage, same spots: about 30 -> 53 looking away, 27 -> 42 at the truck.
- **Also done:** projects hidden beyond 140 m; the El Cajon's small parts no longer cast shadows.
- **Still open:** driving costs the same ground queries every frame (about 1,500 per frame): cache or thin the tire samples. The world is about 4.4M triangles and 1,700 draw calls, with 1,900 shadow casters (shadows off gave about +15%). Terrain tile streaming makes the first seconds after loading slow (150 ms frames).

## El Cajon drivable (Nov 21)

Driven in headless Chrome: deliver, fit every driving part, E at the truck, reverse out, accelerate and steer at 20+ m/s, brake, get out, walk back, re-enter, and the save holds it. 325 tests pass, build ok. Not yet by Chris's hands.
- **Promotion.** Once the project has every start / drive / steer / grip part (`isDriveable(CAJON, build)`), looking at it with empty hands shows "Press E - Get in the El Cajon". `promoteCajon(uid)` (`game/cajonGift.js`) then turns the project into a fleet vehicle in one save write: `game.fleet.cajon = { pose, build }`, the project is removed, any cargo keyed to it moves over. If it is not drivable the prompt says what is missing.
- **As a vehicle.** `VEHICLE_TYPES.cajon` (kind 'truck', `CAJON_DIMS`: wheelbase 3.1, track 1.8, top speed 31 m/s, accel x0.75, driver on the left). PROPOSAL numbers, a heavier and slower coupe-ute than the Bug. The model is the same procedural one (`CajonCar` in `cajon/CajonModel.jsx`) with its wheels named `Wheel_FL..` so the existing suspension rig steers and spins them.
- **Cargo.** Cab (3 spots, max size 2) and bed (12) like a smaller pickup. The bed is a real placement surface (`placement/vehicleSurfaces.js` `cajon`: floor y 0.60, 1.8 x 1.65 m, two wheel wells 0.26 high), numbers ray-cast from the model. Legacy crates use `CAJON_LOAD` in `Items.jsx`. Storage rebalance is still open.
- **Bug fixed on the way.** Swapping vehicles spawned the new one at the garage spawn: the old vehicle kept writing `game.pose` until it unmounted. `switchTo` now carries `game.spawnAt`, which `DriveWorld` reads first. This probably affected the '84 pickup too.
- **Limits.** A promoted truck is finished: you cannot strip or refit it (the work-in-place mechanic only covers projects and the Bug). It spawns nose-in toward the garage, so you reverse out first. Entering from the seat/door look is not separate: any empty-hand look at the truck works.

## Driving cost (Nov 21)
`tireSupport`/`wheelContact` (suspension.js) made ~1,500+ ground queries per frame. Two safe cuts: the 4-pass hub solve now stops once it moves under 0.2 mm, and each tire arc is sampled 9 times instead of 13 (still 3 across). El Cajon, reversing at 9 m/s on the real map, headless Chrome: **24 -> 36 FPS**. 325 tests pass. Not yet felt by hand: check grip, bumps and landings feel the same. Left: world triangles (4.4M), ~1,900 shadow casters, terrain tile streaming hitches.
