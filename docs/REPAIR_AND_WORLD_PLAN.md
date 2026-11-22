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

## Roadside loot (Nov 21, Group A step 1)
Every rest area and gas station on the real highways (36 of them: 8 rest, 28 gas) now has two containers (a cardboard box and a crate, or a tool chest for some) and a loose-part spot (gas: on the ground; rest: on the picnic table, ~75% of stops). Pure data in `game/roadsideLoot.js` (tested), merged into `game/loot.js` containers/spots, so they use the same search, cash, scrap, and "site cleared" code as the barn and warehouse. New games stock them in `seedWorld`; old saves get them once (`home.roadV`, `ensureRoadsideLoot`). Containers more than 260 m from you are not drawn. Not done yet: map markers for roadside stops, and richer stocks (the same random table as the shacks for now).

**Roadside wrecks and far-stop bonus (Nov 21, Group A step 2).** Four donor Bugs stand at every other rest area (`ensureRoadsideWrecks`, `home.projectsV` 2; three kinds in `WRECKS`: shell with seats and glass, engine and battery, wheels but no motor). They are ordinary projects, so hold-click strips them like the farm donors. Containers carry `far` (0 to 2, by distance from the garage over 8 km): cash is multiplied by 1 + far and the chance of an extra item is far / 2, so the long drive pays. Map markers were left alone: the map layout belongs to ChatGPT's WestCoastMap. Loot buildings (salvage yard, swap meet) wait for the cities step so they sit where the layout puts them.

## Group B: controls and storage (Nov 21)
- **L = headlights.** `rules/lights.js` (pure, tested): a vehicle's lights work when its battery and headlights are fitted (Bug: `battery` + `headlights`; El Cajon: `ecBattery` + `ecHeadlights`; the pickup is always whole); the toggle is `game/lights.js` and the beams are two spot lights in `DriveWorld.jsx` (`Headlights`, only mounted while on, so the shader pays only then). `game.lights` is not saved and resets when you swap vehicles. PROPOSAL numbers: intensity 300, 90 m, 0.5 rad cone.
- **Tab = one inventory for every vehicle.** The panel lists your hands, pack, then the storage of the vehicle you drive plus any parked one within 6 m (`vehiclesNear()` in `game/items.js`); "Put in car / Put in El Cajon" and "Take" work per vehicle (`stowInCar(uid, veh)`), and F uses the nearest vehicle. Walking away greys the rows ("walk to it").
- **Bug storage is already rich** (front trunk, luggage shelf, roof rack are grid surfaces in `placement/vehicleSurfaces.js`; the quick-stow cab and roof are the legacy spots). A legacy trunk I tried would have overlapped the grid one, so it was dropped.
- **Tire racks on the Cajon bed:** four tire mounts (5-8) like the pickup's, two on the floor and two on the well tops, tested against the placement rules. Crates use the bed's grid as before.
- **Bug found on the way:** tools showed as "Wrenchfalse" (a helper returned `false` and it was glued onto the name). Fixed.

## Group C: ordering (Nov 21)
Garage supplies and tools can be ordered from the phone's Internet app and the office PC (new Supplies and Tools tabs, order kind `garage`, same 3 game hour delivery to the shop pickup). Prices match Dusty's store. See CONTROLS_AND_STORAGE_PLAN.

## Group D, step 1: coast and dressing from unused assets (Nov 21)
ChatGPT's coast and region art (ART_PROMPTS Group D) has not arrived yet, so this step is data and mechanics only; the look gets restyled when it does.
- **Coast water** (`worlds/Border.jsx` `WaterSheet`, ocean only): the sheet now carries a half-resolution seabed height texture, so the shader tints shallow turquoise to deep blue by depth, draws a white lip at the waterline and faint surf lines on the shelf. The heights in game metres are scaled down 8x (border.json vScale 0.125), so the depth ranges are small (full deep colour at 2.2 m). PROPOSAL values; they will want tuning against ChatGPT's D2 references. Costs one 1.3M-sample texture built at load.
- **Scenery wrecks from Salvage Road's vehicle pack** (the two unused blockout models, 77 and 80 KB, copied to `public/models/WRECK_*.glb`): an unfinished pickup and a step van stand at the roadside stops that have no Bug wreck (every rest area the project wrecks skip and about half the gas stops; 20 in all). They are dressing, not parts sources: solid (three collision circles each) but nothing to strip. Each file's ~100 parts are merged into one mesh (the files have no normals and 8-bit RGBA vertex colours, so flat normals are computed and colours flattened), one draw call per wreck, drawn only within 500 m. Data and tests in `game/roadsideLoot.js`.
- Still unused: the 2004 Frontier (19 MB GLB, too big to ship as is; needs a decimated copy), the spare Beetle models, `ENV_*` packs beyond what the scatter already uses.

## Build narrowed to decorations; Walt's place in stages (Nov 21)
Chris's direction: building is for decorations only, and the player upgrades Walt's place in stages (garage, office, camper, property).
- **Build menu (B) is decorations and furnishings only**: fences, yard, storage, garage equipment, fabrication tools, office, decor (27 items). Foundations, walls, floors, roofs, doors, windows and the wall-cut tool are no longer for sale and `placeProp` refuses them. Pieces already built stay standing and can still be moved, stored or sold (`buildById` still knows them); saves are untouched. The default hotbar is now furniture, and the material key (N) and Materials wiki tab are gone from the help.
- **Staged upgrades (U)**: `worlds/upgrades.js` (pure, tested) has four tracks of stages with prerequisites:
  - Garage: Air tools ($900, hold-to-fit 30% faster), Second car lift ($2,200, the old upgrade), Pro tool wall ($2,400, half time; needs both).
  - Office: Business phone line ($500, orders arrive in 2 h), Office back room ($1,600, the old annex), Supplier account ($1,500, orders in 1 h).
  - Camper: the five trailer fixes in order (roof first, porch needs roof, lights need porch) plus a new Gear locker ($300, +2 pack slots).
  - Property: customer lot, first and second expansion (the old parking upgrade).
  All prices and effect sizes are PROPOSAL. Old saves still read right: stages map onto the old keys (`home.upgrades.lift2/parking/office`, `home.trailer`); only new stages use `home.stages`. The trailer door panel follows the same rules (`trailerWhy`).
- **Effects are live**: `effects()` in `game/upgrades.js` feeds the hold bar length (`startHold`), order delivery time (`orders.js`, the phone and PC text) and pack size (`packCap()` in `items.js`, hud, inventory).
- **Not built, ideas for more stages**: more yard land for decorations, a second office level, camper furniture that does something (a bunk that saves, a mini-fridge), more garage bays. Property has only the lot for now.

## Perf pass 2 (Nov 21)
Headless numbers (your GPU is faster, these are for comparison): standing in the yard 46 to 57 FPS (draw calls 1,705 to 1,335), looking away 52 to 63, driving the El Cajon 36 to 40.
- **`consider()` in Walker.jsx** asked for the terrain height of every candidate target (now 96 containers, many kilometres away) before checking distance. That was 7% of the frame. The distance check now comes first.
- **`MergedStatic`** (`worlds/MergedStatic.jsx`): wrap a static thing and its boxes and cylinders are baked into one mesh per material (the originals stay in the tree, hidden). A supply shelf was 160 draw calls plus 160 in the shadow pass. Used for placed props in `Home.jsx` (not the pegboard, which has tools hanging on it, and not structure pieces). It is a one-shot at mount, so only wrap things that never change after they appear.
- **`Near`** (`DriveWorld.jsx`) now also stops three from walking the hidden far project cars' matrices every frame (about 1,300 objects).
- **Not done, and why:** the 785-mesh road group (about 900k triangles) and the terrain tile streaming hitches live in `County.jsx`, `Border.jsx` and `RealScenery.jsx`, which are being worked on elsewhere; the garage and other site buildings re-render with game state (power, doors), so a one-shot merge would go stale. Both are the next big levers, in that order.

## Keybinds in Settings, Admin app (Nov 21)
- **Key hints moved.** The bottom-of-screen key bar is off by default (setting `screenHints`, replaces `keyHints`, so old saved "on" values do not bring it back). Every key is listed in the phone's Settings under the new **Controls** tab (`game/controls.js`, also used by the Index); Settings is now two tabs on one screen.
- **Admin app on the phone** (`game/AdminApp.jsx`): a test tool that spawns any part free at your feet: Bug parts by section (Engine, Exhaust, Roof & racks, Lights, Bumpers & cage, Underbody & guards, Suspension), Tires, Rims, El Cajon parts, Supplies and tools, plus cash, time of day and scrap. The first spawn sets `home.adminUsed` on the save. It is always on the phone for now; hide it before a public build.

## Race courses and their dirt roads (Nov 21)
Chris: "dirt side roads that are part of each race track: all SCORE races, all MDR races and all races in this area". MDR = **Mojave Desert Racing** (Ocotillo, Plaster City, the Flats): big all-dirt **loops**, not point to point. SCORE (Baja 1000, 500, 400, San Felipe 250) **mixes** dirt legs with the paved highways. Chris chose approximate routes over the real areas, roads only (no race rules yet).
- **`worlds/raceCourses.js`** (pure, tested): the course list as lat/lon waypoints, each marked `D` (dirt) or `P` (paved, runs on the highway that is already there). MDR: Ocotillo, Plaster City and The Flats loops. SCORE: San Felipe 250, Baja 400, Baja 500, Baja 1000 (Ensenada to La Paz). **These are approximate real corridors drawn from memory, not the official courses** (SCORE changes its course every year and publishes GPS files); refine by editing the lists. The map is the real peninsula squeezed about 25 to 1, so MDR loops carry a `spread: 3` to be proper big tracks (about 4 to 6 km round).
- **Router** (`routeLeg`, `routeEasy`): each dirt leg is laid over the real ground by A* on a 200 m grid that avoids water and steep ground (along and sideways, so it follows valleys and flats, not wash canyons) and only climbs if it has to. Dirt legs of SCORE routes snap onto the nearest real highway at a paved join, so the dirt meets the concrete.
- **In the world**: `county.js` builds the courses and adds their dirt roads (39 of them, none dropped) to the same graded network as the highways, so they are drawn, graded and drivable like any road. `raceCourses()` exposes them. Build cost 15 ms.
- **Markers** (`worlds/RaceMarkers.jsx`, mounted in DriveWorld): a start arch (and a finish arch on point to point), an orange flag every 1.2 km along the route; baked into a few meshes per course and drawn only within 900 m.
- **Admin > Races** on the phone lists every course (series, loop or point to point, km of dirt and paved) and has **Go to start / finish** (`game.teleportTo`, picked up by the walker or the vehicle).
- **Not done**: the map overlay (the map is codex's), race rules (timer, checkpoints in order, results; canon puts races in a later phase), and more courses (Baja Sur 500, other Imperial Valley events). Official SCORE GPX files would replace the approximate waypoints.

## Explorer: things to find on the map (Nov 21)
- Phone app **Explorer** lists what you have found and nudges toward what you have not ("a wreck, north-east of Ensenada", never a pin). Found by getting close: towns 450 m, roadside stops 55 m, wrecks 30 m, race course starts 80 m, the places already named in the game 45 m. Saved in `game.home.found`; a "Discovered: ..." message shows on each find. Test sessions do not count.
- Code: `game/discoveries.js` (pure, tested), `game/explorer.js` (runtime list + marking), `game/Discoveries.jsx` (builds the list from the real map, checks every 0.7 s), `game/ExplorerApp.jsx`.
- **No lore was invented**: every entry is a real place name, or something already in the world. Rewards, rumours and NPC leads are NOT built (they would need story decisions from Chris, see CANON).

## Finds you can use: supply stands, selling (Nov 21)
Chris: finds should help the vehicle, be sold (Dusty or another buyer), or be used on customers' cars; the garage should stock each supply to about 10 on its own stand you can walk past.
- **Supply stands** (`game/stock.js`, `worlds/SupplyStands.jsx`): six stands on the garage's +x wall (oil, bulbs, plug kits, wiper blades, fan belts, 12V batteries), each holds up to 10, one box per unit, a sign with the count (red at 0, yellow under 3, green otherwise). Stock lives in `game.home.stock`. E at a stand takes one, or stocks the matching item you carry. Paid phone/PC orders for those supplies go straight onto the stand (a full stand: the box waits at the pickup). Customer jobs use stand stock first, so you do not have to carry the part. Stands start EMPTY (canon: no magic stock).
- **Selling** (`game/selling.js` pure, `game/sell.js`): Dusty's store has a "Sell to Dusty" list for what is in your hands and pack: parts, wheels and rims 40% of the shop price ($5 steps), supplies and tools about half, tires $20, junk a few dollars. Keepsakes and shells are not sold. Prices are PROPOSALS. "A different buyer" (the warehouse scrap buyer) is not built.
- **Finds**: roadside stops now also hold supplies (oil, bulbs, plugs, wipers, belts) so a long drive can stock the stands.

## One Dusty's, knock-off brands, and buyers whose prices move (Nov 21)
- **Gas brands** (`worlds/brands.js`): there is one Dusty's Fuel (near Walt's). Every highway gas station is PEMAX or EXXAN, alternating along the road: pole sign by the road, sign on the store front (drawn within 900 m), and the Explorer names them ("PEMAX station"). Change the two names in one place.
- **Buyers** (`game/market.js` pure, `game/sell.js`): Dusty buys everything; the **Salvage & Surplus warehouse** (counter by its bench, E) pays 1.8x for junk and 1.4x for tires, 0.9x for parts, nothing for supplies. Each buyer's price for a category moves with how much of it they already hold (x1.35 bare ... x0.5 at 8 units); their shelves empty 0.5 unit per GAME hour (the world does not move while the game is closed). All numbers are PROPOSALS. Saved in `game.home.market`.

## Baja Bug parts: carbon fiber, roll cage, roof lights; far roads (Nov 21)
- New parts (catalog + `ProcParts.jsx`): **carbon fiber** nose, high-cut fenders, wide fenders and open rear deck (the same models as the fiberglass ones, drawn in glossy black carbon: `material` on the part; no weave texture yet), a **full roll cage** (procedural tubes: main hoop, front hoop, roof bars, rear stays, door bars, cross brace) and **four round roof light pods** (need the roof rack; they count as a light bar for the L key). Both new slots show under Bumpers & cage and Lights.
- Admin > Baja kit + tools: **"FIT a complete Baja Bug right now"** applies the whole concept-art build at once (`game.adminSetBuild`), plus the spawn buttons.
- Far roads: the county's own roads, trails and circuit are now gated by distance like the highway pieces (they were one always-drawn mesh each, so roads showed on the horizon).

### Baja Bug look pass (concept art)
- Carbon panels now have a twill weave (weather.js `carbon`), tubular fender arches over each wheel (`FENDER_ArchTubes`, slot `fenderTubes`), mud on tires, and an orange-and-white worn patch livery (`build.livery`, set by Admin's FIT button; shader `LIVERY` uniform on the Bug's paint).

### Drive physics: real rigid body (rigid.js)
- The car is now one rigid body with a quaternion orientation (was: heading + separate pitch/roll angles that tangled when rolled). Four spring-damper wheels (travel, bump stop, anti-roll), a friction-circle tire at each contact patch (slip-angle lateral, engine/brake/handbrake longitudinal), a body shell of contact points that scrapes and rests on the ground, air drag. Fixed 120 Hz. `suspension.js` keeps the visuals/rig; its old `stepSuspension` is no longer used by the game.
- Rolled cars tumble, come to rest, and the crew stands them up after ~3 s still (or press R). Tests: `src/rigid.test.js`.
- Tuning knobs live in rigid.js (grip caps, `ACC` factor, damping) and DriveWorld.jsx (STEER_FADE).

## Physics data pass (Nov 21): mass/CG from parts, surfaces and tire pressure
- `src/catalog/physics.json` holds the real-world inputs (every number an [estimate]; sources to check: Gillespie, Milliken, Bentley/Haynes). `src/vehiclePhysics.js` turns it into mass + CG from fitted parts (`massModel`), tire-pressure effects (`pressureEffect`) and the tip limit.
- rigid.js reads `dims.mass / cgY / cgFromRear` (the Baja Bug only; other vehicles keep old defaults). Engine force and air drag are fixed forces, so a caged, heavier car accelerates slower and tips sooner.
- Surfaces now use real grip and rolling-resistance coefficients (sand bogs at street pressure; aired down it floats). Tire pressure is `game.home.tirePsi` (Admin > Cash/time buttons for now; real UI is Chris's call).
- Taking parts off now needs a tool in hand (`toolInHand()` in game/items.js), like a build hammer; empty hands open doors and sit.
- Not done yet: engine torque curve/gears/diff, heat, stress/failure, diagnosis/tune-up/torque-spec procedures (lesson-plan Steps 5-8).

## Drivetrain pass (Nov 21): torque curve, gears, differential, heat (drivetrain.js)
- Engine torque curve, 5 auto gears, final drive solved from the vehicle's top speed, tire radius acts as gearing (data in catalog/physics.json `engine`). Thrust is scaled so the default car keeps its old pace (0-60 about 5.6 s); the curve and gears shape it.
- Differential (open / lsd / locker, `game.home.diff`, Admin > Cash/time): drive force is split by how much each rear wheel can grip. One wheel in the air: open stalls, locker drives (tested).
- Heat: rises with load, falls with road speed and the fan; warning at 110 C, power derate 120-140 C, damage above 140 C (`engDamage` 0-1, not yet tied to a part's condition). HUD shows gear, rpm and the warning.
- Next: wire engine damage/stress to part condition (wear and failure), stalling, a real oil level, clutch.

## Controller support (Nov 21): game/gamepad.js
Polled every frame; buttons become key presses so every existing system keeps working. Driving: RT throttle, LT brake/reverse, left stick analog steer, A handbrake, Y reset/stand up, X in/out, B F, LB lights, RB cab view. On foot: left stick walks, right stick looks, RT/LT = hold left/right click (bolt on / take off), X interact, B F, Y R, D-pad up Tab, D-pad down I, Back map, Start menu, L-stick click run. Click the game once with the mouse first (pointer lock). Menus/inventory still need the mouse.

## Off-road features (Nov 21): whoops, jumps, berms, mini tracks (worlds/offroadFeatures.js)
- Placed deterministically beside the real roads (`planFeatures`), on flat dry ground only, never on a paved road or built site (`buildField`). About 320 on the real map: whoop sections (8 m rhythm, 0.4-0.75 m), table-top jumps (ramp, lip, gap, landing mound), banked berm turns (an S of two), and small tracks (oval with banked ends, a whoop straight, a jump). About 120 short dirt trails branch off the main roads to them (added to the dirt-road list, graded and drawn like the other dirt roads).
- They are heights added to the ground (`height` in county.js), so the car, terrain mesh, grass and walking all agree. The fine terrain mesh (2.5 m grid, within 430 m) shows them; far tiles don't.
- Admin > Cash/time: "Go to nearest dirt track / jump / whoops / berms".
- Tuning knobs: `FEATURE.spacing` (450 m between spots along a road), shapes at the top of the file, flatness limit `featOk` in county.js.
- Not done: features ON the road itself (paved roads and dirt-road ribbons follow their own graded height), dust/tire-track decals, more density where the ground isn't flat.
- Controller: the right stick orbits the chase camera while driving.
