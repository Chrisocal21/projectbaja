# PROJECT: BAJA — GARAGE, PROPERTY, SALVAGE, CONSTRUCTION & BUSINESS HYBRID SIMULATION

**Self-contained game research + world-system design + Claude/VS Code implementation handoff**  
**Prepared:** November 22, 2026  
**Status:** RESEARCH + PROPOSALS, **not an authorization to overwrite canon or current features**  
**Audience:** Forge planning, Claude in VS Code, solo developer, 3D/content pipeline.  
**Scope:** House Flipper-style renovation, Ranch Simulator-style property growth, Gas Station Simulator-style service business, Junkyard Simulator-style salvage economy, Construction Simulator/Builder Simulator-style construction, inventory, storage, utilities, NPCs, weather, time, contracts, logistics, fabrication and the interactions that connect **inside the garage and outside on the land**.  
**Companion documents:** `PROJECT_BAJA_VEHICLE_MECHANICS_RESEARCH_HANDOFF.md` (specific mechanical parts/repair benches) and `PROJECT_BAJA_DRIVING_PHYSICS_RESEARCH_HANDOFF.md` (vehicle handling/damage/terrain). **Everything necessary to understand this proposal is repeated or summarized here; nothing depends on conversation-only notes.**

> **Design north star:** Walt's Garage begins as a believable, run-down working property, not an empty building-editor grid. Clear junk to reach tools; restore the electricity; recover components; clean and organize a workshop; take honest jobs; build useful upgrades from sourced materials; move heavy things with vehicles you repaired; and watch the garage, land, local economy and your fleet improve together. Every new property feature should make **mechanical work, vehicle building, exploration or the business** better.

---

## 0 — CLAUDE: READ THIS BEFORE ANY CODE CHANGES

1. **Audit the current repository** (scene organization, prefab/asset pipeline, input and selection, inventory, garage scene, parts/vehicle state, physics, money, jobs, weather, time, database/local save, existing construction systems and tests) and summarize what's already implemented.
2. **Respect Project: Baja canon:** fictional Baja County / Iron Flats desert; **one starting property** at Walt's Garage (repairs & welding, est. 1968), inherited from grandpa Walt; initial **$1,500**; grandma's worn **1971 rounded Bug-style** car, unused since 2009; cluttered and powerless garage until player manually restores the breaker/wiring; a **1966 trailer, windmill and water tank** on site. Later property expansion is **next-door DLC/upgrades**, not arbitrary starting ownership. The original garage may eventually become storage/museum. Modular buildings and **full material refund on deconstruction** are preselected canon. Keep grounded semi-realism, dusty sand/clay/sage palette, repaired/salvaged authenticity; not post-apocalyptic. Use original generic makes, businesses, logos and assets.
3. **Do not import all these games at once.** The other sims are *mechanics libraries*. Their loops must feed one vehicle-and-garage progression, not create mandatory pet farming, unrelated house flipping, or a second tycoon game. Features labeled `OPTIONAL` or `PARKED` are not canon.
4. **Build the tiniest end-to-end property slice first:** pick up one junk item, inspect it, store/sell/reuse it; restore one electrical service; clean a specific garage zone; place one functional repair bench from an inventory item; remove/relocate it; record ownership, time, inventory/money, save/reload. Have exactly one source of truth for each item and ledger event.
5. **Preserve the vehicle mechanic and driving handoff contracts.** Parts bought/salvaged are the same persistent instances installed in cars. A workbench operates on those instances. Trailers carry those objects by ID; driving physics reads installed mechanical state; contracts pay against completed requirements.
6. **Don't simulate every loose bolt and trash fragment as a permanent dynamic body.** Use selected physics props in proximity and data-backed stored items elsewhere. Infinite build complexity and terrain deformation are late-stage features.
7. **Before editing, deliver** a capability gap audit, minimum vertical slice, feature flags, exact code modules, scene/asset requirements, save migration plan, acceptance tests, performance risks and rollback strategy. Implement incrementally.

### Ready-to-paste instruction to Claude

> Read `PROJECT_BAJA_WORLD_PROPERTY_BUSINESS_HYBRID_RESEARCH_HANDOFF.md` completely. Also read the companion vehicle-mechanics and driving handoffs if available. This document is a research-backed **proposal**; existing code and locked Project: Baja canon win. Audit the actual repository and report existing systems. Propose a small but complete Walt's Garage vertical slice: navigate the neglected property, inspect and pick up one salvage item, clean a garage zone, restore breaker-powered workbench access, move one item into persisted storage, place one functional workbench using paid/found resources, repair/replace one vehicle component, and complete one paid job or sale. The same item IDs must persist from world pickup to inventory, bench, vehicle or sale. Preserve initial $1,500, one-property start, full material refund on deconstruction, source-of-truth vehicle state and current visual direction. Show exact files, transactions, tests, performance checks and rollback before implementation. Do not build an entire city, farm or construction sim at once.

---

## 1 — WHAT THE REFERENCE GAMES ACTUALLY OFFER (RESEARCH VS ORIGINAL BAJA DESIGN)

The game features in this table are from developer/publisher/store descriptions and relevant interviews. **Baja recommendations are original synthesis**; do not copy level art, proprietary gameplay text, copyrighted brands or assets.

| Reference | Publicly documented feature set | Best mechanic to adapt to Project: Baja | What to leave out |
|---|---|---|---|
| **House Flipper 2** | Renovation tasks, cleaning, decoration, wall/floor improvements; separate sandbox mode for more involved construction/custom jobs. Developer interview describes sandbox as intentionally separate for players wanting extra building depth. [H01] | Physical task feedback: clear clutter, scrape, wash, paint, replace wall panel, lay concrete floor, repair roof, organize workshop; optional design-mode planning. | Becoming a house-sale real estate game; constant furnishing microtasks. |
| **Ranch Simulator** | Restore a neglected property, renovate house, construct buildings, maintain a ranch economy. [H02] | Restore a neglected homestead/garage and develop yard space, sheds, workshop and trailer utility; day-to-day pride in property. | Mandatory livestock, animal survival/hunting unrelated to vehicles. |
| **Gas Station Simulator** | Desert-highway abandoned station renovation, equipment maintenance, business expansion, service/customer pressure; employees and workshop systems in updates. [H03] | Walk-in customers, service bays, service orders, stock replenishment, cleanliness/reputation, optional staff shifts, practical business progression. | Full petrol forecourt/cashier minigame unless it directly serves a shop-based expansion. |
| **Junkyard Simulator** | Salvaging/renovating found objects and cars, metal processing, selling scrap, heavy equipment and scrap market. [H04] | In-world salvage, graded condition, materials sorting, remove/rebuild/resell, compact scrap, special finds. | Pure garbage-hoarding loop or dozens of single-use collectibles. |
| **Construction Simulator (2022)** | Contract jobs, heavy equipment, excavation, road and bridge works, load/transport activities, difficulty-scaled jobs. [H05] | Modular construction process and meaningful machine support: site prep, foundation, load/transport, build useful garage additions, deliver contracts. | Full fleet-of-heavy-machinery civil engineering initially. |
| **Builder Simulator** | Build from foundation, walls and windows/doors, material/process steps. [H06] | Building stages as dependencies, tool choice and material BOM; make improvements feel constructed, not purchased as instant meshes. | Brick-by-brick placement for every single wall. |
| **PowerWash Simulator** | Satisfying surface cleaning as a repeatable job and progression mechanic. [H07] | Dirt/rust/grease cleaning with clear visible coverage; cars, bay floors, parts, signage. | Forcing players to individually clean every square inch before progress. |
| **RoadCraft** | Reopen roads/bridges, move materials using construction machinery, restore regional access. [H08] | Later repair access roads/trails with practical gameplay result: unlock salvage zone, business delivery route or race staging area. | Giant destructible world and elaborate bridge stress sim. |
| **Pacific Drive** | Car-centered garage as preparation hub between trips; repairs, upgrades, planned excursions; developer commentary emphasizes vehicle as primary survival focus. [H09] | Garage/home as emotional center; every trip needs preparation, resources and maintenance; optional comfort/survival without hunger meters dominating. | Paranormal hazards or zone mythology—it conflicts with grounded Baja. |
| **Mon Bazou** | Hand-install car upgrades, junkyard sourcing, developing small businesses/garage; vehicles and investments compete for cash. [H10] | Organic growth where small jobs fund bigger projects and mechanical upgrades. | Reproducing its unrelated regional business activities. |
| **Farming Simulator 25** | Construction, shops and production chains connected to material logistics and economy. [H11] | Simple sourcing → processing → consumption → delivery production loops for scrap, timber, metal, supplies. | Agriculture as a required profession. |
| **My Summer Car / My Garage / Car Mechanic Simulator** | Mechanical repairs, parts acquisition, workshop stations, persistent vehicle. | Itemized mechanical continuity and work orders; see mechanical companion. | Separate inventories/duplicate workbench implementations. |
| **Teardown** | Fully destructible voxel world and physics construction/destruction sandbox. [H12] | Inspiration for tactile impact and rearrangeable site debris. | Do not try generalized voxel destruction of every building. |
| **SnowRunner / Expeditions** | Off-road hauling and recovery with terrain challenges. [H13] | Material deliveries, moving wrecks, winching, trailer sourcing, road access. | Full mud simulation before real service/transport loop. |

### The essential design choice

**Project: Baja is not a farming simulator plus a car sim plus a decorating game.** It is a **garage-builder and vehicle life simulator**. All borrowed features should answer one of five questions:

1. Does this help the player **repair/build/customize** vehicles?
2. Does this improve the **functional garage or property**?
3. Does this create **believable sourcing, jobs, trade or income**?
4. Does this make **driving, hauling or exploration** more meaningful?
5. Does this reveal **story and identity** through place, objects and people?

If none of those, mark it OPTIONAL or PARKED, however popular the reference game is.

## 2 — THE CORE LOOP: A PHYSICAL BUSINESS, NOT MENUS

```
Discover need / take job / find wreck
  ↓
Diagnose, inspect property/vehicle, estimate materials and labor
  ↓
Source parts + building supplies (buy, recover, trade, scrap, fabricate)
  ↓
Transport goods and vehicles to Walt's Garage (haul weight + damage risk)
  ↓
Clean, sort, store, repair, fabricate and build using actual stations
  ↓
Deliver repaired car / sell restored part / open property upgrade
  ↓
Collect payment/reputation/skill/progress
  ↓
Improve shop capacity, tools, roads, utilities, storage and vehicle fleet
  ↓
Access higher-level jobs, events, construction and story
```

The game should offer *parallel paths*, not a single checklist. A player can be a repair specialist, salvage trader, fabricator, racing builder or a balanced general mechanic. Different income activities can accelerate progression but cannot trivially print infinite money.

### Three cycles with distinct purpose

- **Minute-to-minute:** grab wrench, drag a part, clean a bench, toggle breaker, inspect damage, move tools, load trailer.
- **Day-to-day:** source a wreck, handle jobs, make delivery, decide on stock, pay costs, repair a race vehicle, restore a room.
- **Long-term:** refurbish Walt's Garage, expand work zones, staff business, race/field-build team, buy advanced fabrication equipment, transform property while preserving history.

## 3 — STARTING PROPERTY: CANON BUILDING AND SITE STATE

**Site:** Walt's Garage (repairs · welding · est. 1968); neglected but believable southern desert working property; battered sign, interior clutter and repair tools, missing functioning electricity pending manual breaker/wiring; adjacent **1966 trailer**, **windmill**, **water tank**, outside yard, initial work area. The rear-engine, rounded 1971 Bug-style car is sun-faded blue with a mismatched primer-gray front fender, not driven since 2009. Player inherits this property and starts with **$1,500**. Story context involving Walt's accident is established separately; this design may reveal environmental clues but should not invent or revise locked narrative.

**Not the style:** abandoned apocalypse, unrealistic rust on every item, instant neon showroom, branded real-world automaker signs, impossible garages or cartoon-proportion repair tools.

### Initial zone map (proposal; adapt actual level)

| Zone ID | Physical area | Start state | Gameplay and first unlock |
|---|---|---|---|
| `garage.mainBay` | covered repair bay | clutter, limited access, no power | clear vehicle work footprint, inspect starter |
| `garage.electrical` | breaker/service corner | power off, wiring unsafe/incomplete in-game | controlled interactive breaker restoration |
| `garage.toolWall` | tools + consumable racks | partial tools/missing inventory | access tools, sort/craft beginner kit |
| `garage.workbench` | existing basic bench position | dirty/unusable or minimal | clean and repair one station, service first part |
| `yard.staging` | hardpack staging area | tires, scrap, planks, old parts | pickup, storage, loading, sorting |
| `yard.parking` | one or more parking spots | obstructed access | place and store repaired vehicles/wreck |
| `yard.water` | water tank + piping | limited or inactive service | wash/clean and workshop utility support |
| `yard.windmill` | inherited windmill | scenic and/or conditional mechanical system | wind-powered pumping/utility only if supported and approved |
| `lot.trailer1966` | old trailer | worn, non-workshop | rest, notes, storage/living upgrade later |
| `road.access` | driveway/dirt entrance | passable but rutted | drive to jobs; grade/repair later |
| `lot.nextDoor` | future adjacent parcel | unavailable | future optional DLC/locked expansion, **not owned at start** |

Build/placement must respect lot ownership, existing architecture, access lanes, doors, vehicle clearance, service hazards and known saved geometry. Later, the original garage can become a **museum or storage space** without deleting meaningful work/player history.

## 4 — PLAYER MOVEMENT AND CONTEXTUAL INTERACTION

A single player can transition coherently among `onFoot`, `vehicleDriving`, `garageService`, `itemCarry`, `constructionPlacement`, `powerTool`, `UI`, `sleep/transition`. Explicit transitions prevent holding a component while driving or operating a saw while in a menu. Inputs are remappable and avoid mode overlap.

### Interaction grammar (make it reusable)

1. **Look/select** with raycast from camera and suitable interaction range.
2. **Inspect** reveals item name, condition, material, weight, value estimate and functional classification, with discoverability depending on skills/tools.
3. **Pick up/carry** if within safe weight/size envelope; large items require cart/forklift/hoist/vehicle.
4. **Move/rotate/place** with collision, snap or freehand rules and surface support.
5. **Use correct tool/workstation** for cleaning, disassembly, cutting, service, painting, assembly.
6. **Store/sort/label** persistent object into location-aware inventory.
7. **Sell/trade/recycle** with an explicit transaction and confirmation for valuable/sentimental items.
8. **Repair/upgrade** exact persistent instance; condition changes are durable and auditable.
9. **Build/deconstruct** staged structures using itemized materials and retained salvage rules.

**Interaction discovery:** highlight under crosshair, short title and verb, radial actions where multiple choices, contextual warnings with actionable messages (`Requires electricity`, `Move car out of lift zone`, `Cannot place: door clearance`). A preview must never commit the world change until the player approves and resources are available.

### Weight classes (tuning proposals)

- Handheld: hand tools, bolts, consumables, light components.
- Two-hand carry: rim/tire, battery, small engine parts, crate.
- Wheeled aid: transmission, stacked tires, heavy machine, fuel drums.
- Vehicle/hoist only: assembled engine, chassis, steel beam, large appliance, salvage car.

**Carry volume, mass, reach and grip** matter, but avoid tedious real-world hand micromanagement. Provide hand trucks, dollies, carts, hoists, forklift/pallet options as believable progression. Support accessible auto-place/drop where safe.

## 5 — CORE ITEM TYPES, OWNERSHIP AND STABLE IDENTIFIERS

Design one polymorphic **item world**, not unrelated loot, construction, garage and vending systems.

| Type | Examples | Persistent data |
|---|---|---|
| `mechanicalPart` | carb, damper, tire, crank, radiator | unique part instance ID; catalog ID; condition; fault history; installed slot |
| `tool` | wrench, multimeter, impact gun | tool ID, quality, wear/charge, location, unlocked ability |
| `consumable` | oil, solvent, primer, paint, hardware | quantity, type, condition/shelf state, unit of measure |
| `materialBatch` | lumber, steel, plywood, gravel, concrete mix | material ID, unit quantity, batch condition, origin |
| `salvageObject` | scrap frame, appliance, sheet metal, old furniture | salvage instance ID, yield table, disassembly plan |
| `placeableEquipment` | workbench, shelf, compressor, lift, paint booth | unique instance ID, placement, utilities, wear, available capabilities |
| `buildingModule` | wall, roof, gate, door, foundation | module ID, geometry/grid anchors, materials paid, state |
| `vehicle` | grandma's car, pickup, trailer | unique vehicle ID, part composition, fuel, placement |
| `cargoManifest` | haul contract supplies | references actual owned objects, mass and volume |
| `worldFixture` | breaker, water tank, windmill, garage door | world fixture ID, state, circuit/functional graph |

**Identity invariant:** an object exists in exactly one storage/installation/transport/world location at a time; item instances are not duplicated by picking up, detaching from vehicle, placing on bench, selling or reloading. Material *stacks* need stable stack ownership and safe splitting/merging operations. Inventory counts should be projections of the object registry, not independent mutable copies.

### Location types

`inWorld(position)`, `carried(playerId)`, `inContainer(containerId,slot)`, `onWorkbench(benchId,slot)`, `installed(vehicleId,mountId)`, `inCargo(vehicleOrTrailerId,bayId)`, `allocatedToBuild(siteId)`, `inTransit(deliveryId)`, `inCustomerOwnership`, `soldOrConsumed(ledgerId)`.

Transitions must validate capacity/compatibility and be **atomic**: a failed transfer leaves the item where it was. Include monotonically increasing revision and command IDs to prevent accidental double-click duplication.

## 6 — CLEANING, RESTORING, DEMOLISHING AND RENOVATING

**The emotional payoff of House Flipper 2 and PowerWash Simulator** is visible transformation. In Baja, use it purposefully: players make a place usable, not merely prettier. The effort should be tactile but not a constant chore.

### Surface jobs (proposed tools)

| Task | Gameplay action | State change | Functional reward |
|---|---|---|---|
| Sweep / shovel | clear a zone or pile | debris coverage decreases | reveals work area and small loot |
| Shop-vac | target garage floor patches | dust/grime mask decreases | improves cleanliness/reputation; small parts revealed |
| Pressure wash | remove dirt from vehicle/fixture | dirt mask decreases, original finish visible | enables inspection or paint prep |
| Degrease | parts/bench/workshop | oil contamination decreases | precision repair/finish requirements met |
| Scrape/sand | remove failing finish/rust surface | paint/rust layer state changes | prep for coating, repair durability |
| Patch/plaster | repair damaged wall/panel | wall condition and appearance update | weatherproof work zone |
| Repaint | roller/brush or spray job | material/color and coverage change | identity/appearance/customer rating |
| Replace roof sheets | remove damaged module, install new | structure weather protection | keeps shop dry / protects inventory |
| Lay floor | place appropriate panels or concrete | surface appearance and load rating | enables larger equipment placement |
| Install lighting | connect approved in-game circuit | functional light entity | safe night work and equipment operation |
| Replace garage door | remove/fit module | clear opening and security state | admits larger vehicles and locks up shop |

### Implementation: use layers, not millions of unique decals

- Cleanable surfaces get `cleanliness01` and optional low-res dirt mask/region grid; render shader blends clean/dirty textures or decals.
- Rust severity, base coating, protective coating and structural condition are **different properties**. Cleaning rust stains is not a free structural metal repair.
- For wall paint/floor coverage, represent discrete cells/polygons for task completion, then bake or update region textures; persistent per-pixel data only if performance justifies it.
- Material color changes are cosmetic; structural repairs require resources and the valid repair recipe.
- Tasks should have a satisfying completion threshold, optional snapping or guided paint regions, and sensible accessibility shortcuts. Requiring 99.99% exact dirt removal is not meaningful depth.
- Cleaning may reveal a Walt-era photograph, service manual, part number or hidden stash; use preapproved story hooks only.

### Demolition

Use **module removal**, not free-form destruction of every polygon. A wall marked removable can be detached after mounted props/circuits are dealt with, supplies refunded per canon rules, doors/windows reparented or detached safely, access/navigation updated, and save state migrated. For unsupported structures, give a specific `Cannot remove: supports roof` message; offer safe planning-mode previews before committing.

**Important canon: full material refund when deconstructing a player-built module.** Preserve that even if individual returned material quality or labor time is later modeled. No arbitrary material loss from deconstruction unless the user changes canon. Avoid trivial profit exploits: refund **materials paid**, not duplicated extra objects or construction labor/purchase value.

## 7 — BUILDING AND PROPERTY CONSTRUCTION: SCALED FOR A SOLO DEV

**Three build modes** use the same durable modules; they differ in UI and required interaction.

1. **Quick placement:** preview valid prefab/shelf/station → approve → subtract or reserve materials → spawn and persist. Best first implementation.
2. **Guided build:** site blueprint → place foundation → deliver resources → complete work stages → visible progression and usable structure. Best gameplay target.
3. **Manual detail mode (OPTIONAL):** measure, cut individual panels, pour/level, drill fasteners, weld support members. Best for high-value custom projects, not every wall.

### Building stages as a dependency graph

```
Select design / blueprint / shop layout
  → Check lot ownership / zoning / clearance
  → Survey and prepare site
  → Foundation or footing module
  → Structural frame / walls
  → Roof and weather enclosure
  → Door/windows/security
  → Electrical/water/air interfaces (as required)
  → Floor finish, benches, storage, signage
  → Inspection/usable status
```

**Dependency checks:** support for roof, accessible door width, clear bay/exit path, non-overlapping workstations, service aisle width, lift ceiling height, hoist load rating, safe electrical work states and permitted lot footprint. These are simplified **game rules**, not real-world structural or electrical safety certification.

### Modular snap system

- `GridSnap`: optional foundation/floor cell snapping (design grid e.g. 0.5 m); `AnchorSnap`: door-to-wall, roof-to-frame, lift-to-floor; `FreePlacement`: furnishings, workbenches, small fixtures with collision checks.
- Placement preview communicates `valid`, `missingMaterials`, `insufficientSpace`, `unsupported`, `blockedAccess`, `needsUtility`, `wrongParcel`.
- Use a consistent local pivot, unit scale, rotation increments, local bounding boxes, anchor IDs, connector IDs and collider proxy per module.
- World coordinates and module transforms saved as numbers and parent IDs; reconstruct with stable order and no physics explosion.
- Important retroactive change: installing a new wider garage door affects actual vehicle pathfinding/clearance; it cannot be cosmetic-only.

### Example module catalog

| Module | Material inputs (concept only) | Unlock/use |
|---|---|---|
| Small shelf | wood/fasteners | storage bins and tool rack |
| Garage lamp | lamp fixture/wiring | nighttime task visibility |
| Bench upgrade | salvage metal/wood/bench parts | repairs eligible by station capability |
| Outdoor canopy | framing/roof panels | sheltered service or parking |
| Sliding vehicle gate | steel/hinges | yard access/security |
| Garage roof patch | roof sheets/fasteners | leak protection |
| Level dirt pad | soil/gravel, compacted surface | park/jack/drive with stable collision |
| Concrete lift pad | aggregate/concrete mix | safe heavy lift placement |
| Fabrication shed | framed prefab + utility hookups | larger welding/machining projects |
| Vehicle wash pad | ground/base + plumbing | efficient cleaning, materials recovery |
| Storage containers | container prefab + level ground | organized multi-vehicle parts inventory |
| Trailer work area | serviced 1966 trailer modules | living/storage/story functions |

Construction work uses **real material quantities and costed transactions** but not real construction formulas. This is entertainment, not a procedural building manual.

## 8 — PROPERTY UTILITIES: ELECTRICAL, WATER, AIR AND LIGHT

This is a high-value distinction: the garage must genuinely work, not be an aesthetic backdrop.

### Utility graphs

Use a directed/circuit graph: `producer/source → distributor/control → line/pipe → load/consumer`.

- **Electricity:** source/meter, main breaker, panel/circuit, compatible wire/cable run, switch, lamp, lift, compressor, welding station. Track `powered`, `capacity`, `load`, `fault`, `tripState`, `isolation` as game-level states.
- **Water:** tank/well/pump (only if defined), pipes, valve, wash pad/cleaning station. Track `availableLiters`, `flowCapacity` and whether water use is authorized.
- **Compressed air:** compressor, line/receiver, pneumatic tools. Track power, pressure available and compressor service.
- **Lighting:** power-dependent and tied to night usability/UI, garage tasks and property atmosphere.
- **Windmill:** canonical world object. *Proposal:* it supports water pumping if appropriate; otherwise keep as meaningful landmark until its engineering/story role is defined. Don't quietly invent it as an electrical generator.
- **Waste disposal:** scrap bins, fluids, trash; environmental fees/clean-up costs as optional simplified mechanics, not an elaborate municipal system.

### Electrical sequence for opening (game-safe)

The player inspects a powerless garage, identifies the appropriate breaker/repairable *game fixture*, completes a clearly tutorialized simplified game interaction, then restores one circuit. No user-facing instructions should imply the virtual sequence is safe guidance for repairing real mains wiring. Use symbolic circuits, state checks and licensed-machine warnings, not real-world wiring details/voltages.

Power capacity is a meaningful upgrade: basic lights and one tool are possible first, but compressor/large lift/welder together may exceed capacity until a shop upgrade. Equipment has a truthful powered/unpowered state, and UI reports why it cannot operate.

### Utility access example

```
Circuit OFF → workbench lamp unpowered → low light inspection only
Player completes in-game panel repair → breaker ON → circuit load validated
→ lamp comes on → powered bench accepts correct repair recipe
Player adds compressor → load exceeds circuit capacity
→ circuit trips with explanation → player upgrades service or separates loads
```

No instant unlock that bypasses required repair tools/materials; when a player is stuck, give an alternate paid electrician NPC service to avoid softlocks if the design permits.

## 9 — SALVAGE AND JUNKYARD ECONOMY

A salvage object must be an object with a **choice**, not a random loot box:

`recover intact → evaluate → clean → use as-is / refurbish / dismantle → store / sell / recycle / fabricate into new material`.

### Source locations

- Walt's starting yard, broken household/garage equipment, forgotten shelves.
- Neighboring legal salvage yards, towing impounds, auctions, barn/field finds, shop overstocks, farm equipment, contractor surplus and trade leads in Iron Flats.
- Customer vehicles and work orders that explicitly authorize salvage/replacement.
- Remote recovery of broken-down vehicles using tow truck/trailer/flatbed.
- Later business suppliers and repeat industrial contracts.

Avoid implied theft: abandoned is not synonymous with unowned. Salvage listing must specify owner/permission, purchase, finder terms or clearly marked legal access. The player may negotiate trade or pay yard entry/lot fees rather than stealing every object.

### Quality, material and valuation

Each salvage object has: `id`, category, source, ownership/permission, mass, volume, contamination, structuralCondition01, surfaceCondition01, repairability, recoverableComponentIDs, materialYield` and estimate-confidence. The *same* engine block or shock from salvage uses the actual mechanical `PartInstance` model in the mechanic handoff.

Value should depend on functional condition, rarity/demand, compatibility, quality of repair, market, size/transport effort and processing cost. A valuable recoverable component may be worth more intact than raw scrap; conversely a destroyed part may only produce metal weight.

**Example decision:** cracked rusty vehicle exhaust = (a) used functional muffler repair candidate; (b) cut scrap steel; (c) sell as poor-condition untested assembly; (d) fabricate original custom exhaust section later. Each path consumes time and resources and changes item state; no arbitrary duplication.

### Scrap processing progression

- Manual sorting: `ferrous`, `nonFerrous`, `wood`, `rubber`, `glass`, `plastic`, `electronics`, `hazardousOrRestricted`.
- Hand disassembly from large object to eligible material batches/parts; avoid guaranteed 100% yield on careless destruction **unless deconstructing player-built structures**, which retains full refund canon.
- Cleaning/stripping of contaminated scrap where appropriate, separated from actual machine-shop repairs.
- Scrap market price quote, sale, material receipt; transportation changes economics.
- Crusher/compactor/industrial shredder as a later *station with recipe/yield*, not a live high-detail destruction solver.
- Enforce conservation: inputs consumed equal outputs plus documented processing loss; don't sell the same object as part and as scrap.

## 10 — STORAGE, LOGISTICS, LOADING AND PHYSICAL ORGANIZATION

An organized garage should tangibly outperform a cluttered one. Storage features:

- Shelves, drawers, bins, pegboard, tire racks, labeled tool chests, parts washer baskets, material pallets and outdoor stockpile.
- Container capacity by `slots`, `volume` and optionally `mass`, with filters and item grouping by compatible part family.
- Physical store/withdraw action with useful auto-sort; novice players can use `Store All Eligible` while enthusiasts drag items by hand.
- Searchable inventory terminal or notebook showing location: **"Rear damper — yard shelf B3"**, not just global stack quantity.
- Cargo manifests for pickup bed/trailer: stable references to inventory item IDs, loaded mass and CoM; straps, tie-down and transfer receipts when needed.
- Delivery scheduling with a lead time and a real in-game loading point; freight cost can undercut margins.
- Anti-loss: important story parts and unique tools cannot disappear silently beneath the terrain.
- Limited workshop working area: a scattered engine teardown needs a table, bins and free floor space, but not pixel-perfect placement.

### Transport ties directly into driving physics

Put heavy steel on rear trailer → rear axle and hitch load change → braking/turning on washboard changes → arrival/condition checked → unload by tool class → materials consumed by building or vehicle fabrication. This route is the **reason** to implement believable hauling physics, not mere trucking for its own sake.

## 11 — WORKSTATIONS AND FUNCTIONAL GARAGE PROGRESSION

**Do not create a second workbench system** if the companion vehicle handoff already specifies a station catalog. Reuse station interfaces and expand to property-level capabilities and utility requirements.

| Station/fixture | Primary function | Capability/resources |
|---|---|---|
| Basic mechanics bench | inspect, small hand repair | hand tools, open work zone |
| Parts washer | remove contamination | solvent/water/power as defined |
| Tire mounting/balancing | swap tires, configure wheels | tire/rim compatibility and equipment |
| Spring compressor | service strut/shock unit | specialized tooling, game safety rules |
| Engine stand/crane | engine assembly/lift | space, correct supports and tools |
| Battery charge/test | electrical service | powered station and compatible battery |
| Bench vise/press | bushings/bearings | tool capability and required setup |
| Welding/fabrication bench | fabricate steel brackets/cage/modules | power, welding consumables, material batch |
| Cutting/metalworking | cut stock and sheet | material yield, blade/wear |
| Paint booth / spray area | coatings | ventilation/paint stock in game rule |
| Diagnostic bay | measure faults | probes, scanner for equipped vehicle |
| Alignment bay | set wheel geometry | level pad, wheel sensor tooling |
| Hydraulic lift / jack | underside access | level rated pad, working clearance |
| Wash/detail zone | wash cars and body | water/chemicals, storage |
| Compressor | air tools | electricity, pressure, condition |
| Forklift/hoist/dolly | moving heavy objects | rated loads/collision/path |
| Storage/parts terminal | track stock/job needs | sorted bins, bookkeeping UX |

Each station is a **persistent placeable equipment instance** with a capability set, operating state, condition, utility connectors, required clearance and station-specific UI. A job recipe asks for `capability tags` (e.g. `repair.damper.basic`) rather than hardcoding a named bench. That allows equivalent stations/upgrades without rewriting all recipes.

## 12 — ECONOMY, BUSINESS SERVICES AND CUSTOMER JOBS

### Financial ledger (not magic cash updates)

Every cash movement has `transactionId`, time, reason, payer/payee, amount, tax/fees if present, linked job/item/vehicle and result. Examples: `partPurchase`, `scrapSale`, `customerDeposit`, `laborPayment`, `towingFee`, `supplierDelivery`, `constructionMaterial`, `stationUpgrade`, `utilityBill`, `staffWage`, `vehicleResale`, `racePayout`, `insurance` (optional). Refunds are explicit reversals and must not create infinite profit.

Profit example (conceptual):

```
Quoted labor + quoted parts + disclosed disposal/tow/delivery - discounts
  = customer charge

Margin = customer charge - actual parts cost - consumables - freight
         - wages / labor overhead - applicable business fees
```

Avoid excessive administrative simulation. A simple daily ledger, clearly priced jobs and monthly/periodic operating costs are enough to make a $1,500 start feel meaningful. Keep pricing relative, not arbitrary real-dollar automotive market claims.

### Job order lifecycle

`available → inspected → quoted → customerApproved → inProgress → awaitingParts → readyForInspection → completed → customerPickup/payment → archived`; alternate `cancelled`, `abandoned`, `disputed` with safe refund/inventory rules.

- Job includes customer, target vehicle/object, fault symptoms, **authorization** to work on exact items, budget, deadline if any, required quality threshold, parts policy (`new/used/refurbished`), reward, condition on return and optional notes.
- Diagnose honestly: a work order may start from symptoms rather than an exact damage list. Early jobs give hints; deeper ones use inspection/test equipment.
- Customer approval locks a quote for basic jobs, with change orders for unexpected faults; avoid punishing player for hidden impossible terms.
- Parts from customer vehicles are **customer-owned** unless contract permits replacement/disposal. Never allow selling a customer's engine for free.
- Success is checked from real part installation/function and test (when relevant), not UI tickboxes.
- Optional tip/reputation for fast, clean, dependable service; no arbitrary star spam.

### Proposed job families

| Job family | Player action | Why it belongs |
|---|---|---|
| Basic service | inspect fluids, battery, tires | accessible tutorial cash |
| Fault diagnostics | identify no-start/charging/brakes | links to part simulation |
| Trail recovery | locate, tow home, repair | ties driving to workshop |
| Salvage sourcing | find specific compatible used part | trading/inspection knowledge |
| Buyer vehicle prep | refurbish, clean, document | repair and resale choices |
| Off-road build | install lift, tires, cage, alignment | upgrades alter driving performance |
| Race support | preflight/repair between stages | ties to motorsport pillar |
| Metal fabrication | make bracket, bumper, rack | uses material stocks and benches |
| Farm/utility equipment repair | service generator, trailer axle | expands mechanic families carefully |
| Shop cleaning contract | pressure wash/detail | tactile side income |
| Contractor delivery | haul pallets to site | transport and route decisions |
| Yard clearing | sort and remove abandoned equipment | salvaging/space unlocked |
| Small shed assembly | material BOM + build stages | property skills rewarded |
| Driveway grading | improve hardpack and clearance | actual terrain path improved |
| Emergency weather service | secure repair, drain/wash zone | seasons create useful responses |
| Community event prep | setup lighting/parking/vehicle support | town identity and story |

**Avoid** randomly generated impossible part orders, constant micro-penalties, mandatory repetitive mopping, inflated payouts that trivialize the garage, or jobs disconnected from existing systems.

## 13 — PROPERTY DEVELOPMENT, SERVICE BAYS AND BUSINESS SCALE

**Stage A: inherited garage** — one working bay after power restoration, hand tools, mess, limited storage, no hired staff.

**Stage B: organized working shop** — storage, lighting, active workbench, tire/diagnostic equipment, customer service area, fenced secured yard, clean vehicle pad.

**Stage C: fabrication and vehicle builds** — welding bay, engine stand, suspension/alignment, expanded service bays, parking, trailer prep and inventory terminal.

**Stage D: racing/expedition support** — full race prep, radio/logistics, customer queue, recovery service, advanced fabrication, quality inspections and optional staff.

**Stage E: future adjacent expansion/DLC only** — neighboring property builds, specialty service, scrap processor, museum/showcase. This **does not** retroactively alter the single starting property rule.

All improvements must have **benefits**: more simultaneous jobs, new repair recipes, dry/protected storage, faster organization, improved power/air/water capacity, safer vehicle access, customer trust, staff autonomy, or advanced upgrades. Cosmetic changes remain valuable but optional.

## 14 — WORKFORCE, NPCS AND IRON FLATS COMMUNITY (LATER)

The world feels inhabited through people with roles rather than hundreds of simulated private lives.

- Supplier: has limited catalog, ordering lead times and occasional surplus stock.
- Tow operator: retrieves stuck cars with a quoted fee and arrival behavior.
- Scrapyard owner: offers parts lots, inspection and negotiation.
- Customer: provides symptoms, budgets, trust, future work/repeat referrals.
- Contractor: pays for site prep, vehicle hauling and fabrication.
- Racing team/race organizer: demands tech inspection and race support.
- Neighbor/mentor: delivers context and potential story triggers, but lore choices stay under Forge control.
- Future worker: mechanic, inventory clerk, fabricator, tow driver or front desk; wage/shift/skill/reliability and task queue.

### Staff autonomy without annoying AI

A task record includes `jobId`, priority, needed skills, required station, input material IDs, owner, status, estimated duration, output/quality. Workers can perform known repeatable tasks only if equipment, parts and money are available. They **must not** secretly duplicate items or deliver instant high-quality repairs. Staff should be useful once repetition is established, not necessary in first hour.

**Narrative integration:** historic tools, invoices, photos and a repaired garage sign can reveal Walt's personality without forcing narration. Specific crash/family secrets belong to the existing story documents and must not be improvised here.

## 15 — TIME, SLEEP, SEASONS, WEATHER AND PROPERTY CONDITION

Project: Baja canon already calls for a **seasonal world and hybrid weather**, and player travel/sleep/mobile-base mechanics are in scope. Use one `WorldClock` and `WeatherService` shared across garage, business and driving.

Possible mechanisms:

- Day/night: lighting, NPC hours, delivery schedules, open/closed suppliers, fatigue/rest and camping/trailer utility.
- Weather: rain fills ruts, changes roads and water pressure/availability, introduces shop leaks if roof unrepaired, cools/contaminates parts storage, changes wash/paint conditions.
- Seasons: heat, rain patterns, dust, desert vegetation, event schedules, special salvage access and terrain restrictions.
- Player rest: primarily a **time-management choice**, not unmanageable hunger/thirst/illness simulation. If existing canon includes thirst, preserve the actual rules; do not make survival punishing without an explicit decision.
- Property durability: untreated roof leak worsens storage conditions; lights/doors/fixtures wear only when sufficiently used; maintenance tasks must be predictable and optional upgrades can reduce chores.

**Important:** don't use real background timers to process hours while browser tab is closed without an explicit offline-progression design. Store game time and process defined simulated intervals; never award infinite money/material from elapsed wall time alone.

## 16 — MATERIALS, FABRICATION, RECIPES AND BUILD QUALITY

Use one general processing interface from the vehicle-mechanics architecture. Inputs are part instances and/or material quantities; output can be a repaired item, newly crafted part, a structure or a material batch. Every recipe has required tool/station capability, costs, prerequisites, an operation time and resulting quality/condition.

### Material taxonomy

`mildSteel`, `alloySteel`, `aluminum`, `stainless`, `sheetMetal`, `timber`, `plywood`, `glass`, `rubber`, `plastic`, `electricalComponent`, `copperWire`, `aggregate`, `concreteMix`, `paintPrimer`, `paintTopcoat`, `fasteners`, `lubricant`, `solvent`, `fabric`, `reclaimedHardware`.

Material qualities: `salvaged`, `refurbished`, `new`, `raceGrade` where relevant. Distinguish source quality from current condition and fabrication skill. A proper weld/fabricated component should have **fitment and quality grades**, but do not supply real-world dangerous welding/electrical engineering procedures through gameplay text.

### Example build recipes (illustrative, not real construction ratios)

```
Recipe: OUTDOOR_TIRE_RACK_A
Input: 4 units steel_stock, 1 unit fastener_set
Station: fabrication.basic
Checks: material stock exists, placement space clear, no utility required
Actions: reserve inputs -> construct rack entity -> check/commit
Output: Placeable tire rack with 8 game-defined storage slots

Recipe: GARAGE_LIGHT_CIRCUIT_A
Input: lamp_fixture, wire_kit, switch_kit
Station/skill: property.electrical.basic
Checks: player completed symbolic de-energize/repair game step; breaker service ready
Actions: validate utility graph -> consume materials -> create connected load
Output: powered garage lamp if circuit capacity available

Recipe: BASIC_WINCH_MOUNT
Input: compatible fabricated bracket, mounting hardware, rated winch kit
Station: fabrication + vehicle installation
Checks: vehicle hardpoint exists, clearance/mass budget; correct tools
Output: mount and installed winch with rated force and physical vehicle mass increase
```

**Transaction policy:** reserve material IDs and quantities → validate placement/recipe → commit all outputs/ownership in one transaction. Failure must restore reserved inputs. **Player-built structures refund all material input quantities on deconstruct** (canon); consumption and wear of unrelated salvaged objects follows its own processing policy.

## 17 — OPTIONAL SIDE SYSTEMS: RANKED BY THEIR FIT WITH BAJA

| Proposal | Priority | Why or why not |
|---|---|---|
| Wash/detail and body cleanup | **HIGH** | directly supports vehicle restoration and sell value |
| Vehicle/trailer hauling | **HIGH** | turns driving and salvage into functional logistics |
| Garage organization and storage labels | **HIGH** | makes deep mechanical teardown manageable |
| Property power, lighting, water, air | **HIGH** | meaningful unlocks for repair benches |
| Metal fabrication and shop modules | **HIGH** | deeply linked to off-road upgrades |
| Small renovation jobs for neighbors | MEDIUM | reuses cleaning/build tools, additional cash |
| Contractor hauling/site grading | MEDIUM | driving + vehicles + dirt terrain |
| Salvage auctions and trading | MEDIUM | vehicle acquisition and valuation |
| Recovery/tow dispatch business | MEDIUM | strong vehicle-game identity |
| Landscaping/driveway improvement | MEDIUM | meaningful property/handling linkage |
| Generic construction contracts | MEDIUM-LATE | reusable tools, but risks sprawling content |
| Staff and customer scheduling | MEDIUM-LATE | useful when player has actual workload |
| Production chains for scrap/metal | MEDIUM-LATE | advanced fabrication economics |
| Town-wide commercial property purchase | PARKED | violates start premise / scope unless new canon |
| Ranch livestock, farming, hunting | OPTIONAL/PARKED | useful only if town/story demands it; not core |
| Gas station fueling/cash register business | OPTIONAL/PARKED | possible adjacent service idea; not core garage focus |
| House flipping multiple houses for resale | PARKED | distracts from vehicle-building and one-property promise |
| Full voxel excavation/demolition | PARKED | severe rendering/physics/performance complexity |
| Complex resident needs/relationships | PARKED | important only if separately approved by story team |
| Co-op/multiplayer economy | FUTURE | duplication, networking, authority and save complexity |

**Original hybrid opportunity:** the player's first profitable piece of land improvement is not decorative—it is a **level, powered, sheltered bay** that lets them safely lift a recovered car and service its suspension. The renovation acts as a gameplay unlock, business investment and visual transformation simultaneously.

## 18 — ARCHITECTURE FOR WORLD, PROPERTY AND BUSINESS SERVICES

Use well-scoped systems and stable references. Proposed names, adapt to repo:

```
WorldRegistry
 ├── EntityRegistry (persistent IDs / serialized state)
 ├── SceneStreaming / SpatialIndex / InteractionQueries
 ├── PropertyService (ownership, zones, build permissions)
 ├── ConstructionService (modules, anchors, BOM, rollback)
 ├── UtilityNetworkService (power/water/air graphs)
 ├── InventoryService (items, containers, manifests, reservations)
 ├── SalvageService (source, dismantle, yields, permits)
 ├── WorkstationService (operations and capability tags)
 ├── EconomyLedger (immutable transaction records)
 ├── JobService (order state, quotas, acceptance)
 ├── NPCService (schedules/queues; later)
 ├── WorldClock + WeatherService (shared environment)
 ├── Travel/VehicleIntegration (stable vehicle IDs and cargo)
 └── SaveManager (versioned snapshots + migrations)
            │
            ▼
     React/R3F rendering & UI observes read models
```

### Event examples

`item.inspected`, `item.transferred`, `salvage.authorized`, `part.diagnosed`, `part.repaired`, `bench.placed`, `bench.powered`, `construction.started`, `construction.completed`, `structure.deconstructed`, `utility.circuitTripped`, `vehicle.loaded`, `vehicle.delivered`, `job.approved`, `job.completed`, `ledger.entryCreated`, `world.timeAdvanced`.

**Command vs event:** commands are validated requests (`PlaceWorkbench`) that may fail; events record successful outcomes (`WorkbenchPlaced`). Never treat UI emitted events as financial proof. Use deterministic operation IDs; a repeated command must be idempotent or rejected.

### One source of truth for every domain

- Vehicle assembly and part condition: companion mechanic system.
- Vehicle driving transform/dynamics when active: physics service, persisted on transitions/checkpoints.
- World item location and material stacks: Inventory/Entity services.
- Cash: Ledger/balance derived from authoritative transactions.
- Structure placement and paid BOM: Construction/Property service.
- Energy/water status: UtilityNetwork, which equipment queries.
- Job requirements and completion: JobService, based on real items and function.
- Climate/time: global clock/weather, not independent minigame timers.

If architecture already implements equivalent state management, **extend it**. Don't create duplicate Zustand stores, localStorage blobs, or SQLite tables for the same identity.

## 19 — TYPESCRIPT ENTITY AND DATA CONTRACTS (ILLUSTRATIVE)

```ts
type EntityId = string;
type ItemId = string;
type VehicleId = string;
type PropertyId = string;
type StationId = string;
type JobId = string;
type TransactionId = string;

type ItemLocation =
  | { kind: 'world'; zoneId: string; xyz: [number, number, number] }
  | { kind: 'inventory'; containerId: EntityId; slotId: string }
  | { kind: 'carried'; actorId: EntityId }
  | { kind: 'workstation'; stationId: StationId; slotId: string }
  | { kind: 'vehicleInstalled'; vehicleId: VehicleId; mountId: string }
  | { kind: 'vehicleCargo'; vehicleId: VehicleId; bayId: string }
  | { kind: 'buildReservation'; buildSiteId: EntityId }
  | { kind: 'inTransit'; deliveryId: string }
  | { kind: 'consumedOrSold'; transactionId: TransactionId };

interface WorldItemInstance {
  id: ItemId;
  catalogId: string;
  kind: 'mechanicalPart' | 'tool' | 'consumable' | 'materialBatch'
      | 'salvageObject' | 'placeableEquipment' | 'fixture';
  ownerId: EntityId;
  location: ItemLocation;
  condition01?: number;
  massKg: number;
  volumeM3?: number;
  quantity?: number;
  quality?: 'salvaged' | 'refurbished' | 'new' | 'raceGrade';
  revision: number;
}

interface PropertyZone {
  id: string;
  propertyId: PropertyId;
  name: string;
  ownedByPlayer: boolean;
  useTags: string[];
  clearanceLimits?: { heightM?: number; vehicleWidthM?: number };
  cleanliness01: number;
  structureIds: EntityId[];
  placedEntityIds: EntityId[];
}
interface BuildingModuleDefinition {
  id: string;
  category: 'foundation' | 'wall' | 'roof' | 'door' | 'floor'
      | 'fixture' | 'prefab' | 'storage';
  glbAsset: string;
  anchors: Array<{ id: string; connector: string; localXYZ: [number, number, number] }>;
  materialBill: Array<{ materialCatalogId: string; quantity: number }>;
  supportedSurfaceTags: string[];
  utilityPorts: Array<'power' | 'water' | 'air'>;
  clearanceBoundsM: [number, number, number];
}
interface PlacedBuildingModule {
  id: EntityId;
  definitionId: string;
  propertyId: PropertyId;
  zoneId: string;
  parentAnchorId?: string;
  positionXYZM: [number, number, number];
  rotationXYZRad: [number, number, number];
  condition01: number;
  completedStages: string[];
  paidMaterialInputs: Array<{ catalogId: string; quantity: number }>;
}
interface UtilityNode {
  id: EntityId;
  type: 'source' | 'switch' | 'breaker' | 'pipe' | 'wire'
      | 'tank' | 'compressor' | 'consumer';
  network: 'electric' | 'water' | 'air';
  capacity: number;
  demand: number;
  enabled: boolean;
  faultId?: string;
  connectedNodeIds: EntityId[];
}
interface LedgerEntry {
  id: TransactionId;
  gameTimeSeconds: number;
  category: string;
  amountGameCurrency: number; // signed amount
  linkedJobId?: JobId;
  linkedItemIds?: ItemId[];
  idempotencyKey: string;
}
interface JobOrder {
  id: JobId;
  kind: 'vehicleService' | 'recovery' | 'salvage' | 'delivery'
      | 'construction' | 'cleaning' | 'fabrication';
  customerId: EntityId;
  targetEntityId?: EntityId;
  state: 'available' | 'inspected' | 'quoted' | 'approved'
      | 'inProgress' | 'awaitingParts' | 'inspection'
      | 'completed' | 'cancelled';
  requirements: Array<{ type: string; targetId?: EntityId; threshold?: number }>;
  budget: number;
  reward: number;
  deadlineGameSeconds?: number;
  reservedItemIds: ItemId[];
}
```

**Do not use these schemas verbatim without checking existing models.** Example fields need game-appropriate type-safe units and validation. A material batch cannot be simultaneously in `materialBill` and owned inventory unless it was explicitly reserved/consumed. World entity references must be checked during load/migration.

## 20 — PLACEMENT, PERSISTENCE AND SCENE PERFORMANCE

### Rendering and physics

- Static architecture uses merged/instanced render assets and collider meshes only where collision matters. Many repeated props use GPU instancing, LOD and distance culling.
- Large buildings are static/kinematic geometry. Only picked-up, falling, towed or actively manipulated objects need dynamic rigid bodies. Store placed items as inert transforms until interacted with.
- Collision mesh should be simpler than render mesh. Asset units/pivots and tags must be consistent; avoid compound colliders with dozens of sharp concave surfaces on dynamic objects.
- Garage interior can be dense with decals/tools, while outside area streams in chunks by distance. Do not update every scrap item's physics and AI each frame.
- Placement preview colliders can use cheap bounding boxes/overlap queries; final geometry can be checked once on commit.
- Weather, NPCs and production chains should update on coarse timed ticks; only on-foot physics and the active vehicle need 60 Hz or similar physics steps.

### Persistence

Save: `schemaVersion`, global time/weather seed, economy ledger/balance, property IDs/ownership, module transforms and BOMs, fixture/utility graph, zone cleanliness/condition, inventory and exact item locations/quantities, world salvage states, jobs, story flags (through canon-owned state), vehicle references/parking locations, installed part data, staff shifts if built. **Atomic transaction IDs and reconciliation** prevent double sales on save/reload.

Startup/load validation: no duplicate item IDs; no missing anchor parent; no negative material stack; no impossible paid vs built state; valid vehicle ownership; disabled utilities when a breaker is off; inaccessible doors/mounts flagged; no active physics object inside a wall without recovery option. Migration path and backups from previous save versions.

### Full material refund detail (canon)

For player-built structures, save `paidMaterialInputs` at time of construction and deconstruct to return **exact same count/type quantities** to an eligible container or drop zone; delete module in same transaction. If container full, keep pending pickup package and do **not** destroy structure before refund can be retained. Labor/time is not a refundable material. Do not copy resources during relocation: relocate intact module without issuing a refund until deconstruction is actually committed.

## 21 — UI SYSTEMS THAT CAN HANDLE A HYBRID GAME

**Single contextual toolbelt** for on-foot inspection, carry, placement, cleaning, wrenching; **single notebook/tablet** for maps, work orders, inventory, purchase lists, plans, shop finances and construction blueprints. Optional shop computer provides deeper accounting and inventory.

Suggested views:

- **Property map:** zones, owned lot, shop power/water status, garage door/vehicle clearances, planned build areas.
- **Repair planner:** vehicle part tree, diagnosis, tools and station requirements (from mechanic handoff).
- **Job board:** orders, symptoms, budget, time, approvals and payout; no hidden completion conditions.
- **Inventory:** exact part IDs/location/condition, filters, favorites, required jobs, supply reorder suggestions.
- **Build planner:** ghost module, BOM, prerequisites, clearances, utility ports, material source, deconstruct/refund preview.
- **Ledger:** money in/out, job profit, current available cash, deposits and commitments.
- **Utilities panel:** symbolic electricity/water/air circuits, loads, faults, equipment power reasons.
- **Routes/deliveries:** chosen destination, trailer requirements, weather, estimated material load, optional tow rescue.

**Interface discipline:** never show a 30-field engineering sheet for a broom. Keep actions spatial and contextual, let deep viewers reveal advanced details, provide text labels/icon + audio, colorblind-safe states, remappable controls and an accessible assistance mode. Important alerts need repair directions, not just red text (`Lift unavailable: main breaker off`).

## 22 — 40 EXAMPLE ACTIVITIES FROM START TO ADVANCED (PROPOSED CONTENT POOL)

| Tier | Activity | System connections |
|---|---|---|
| Early | Clear garage entrance | carry → sell/sort → use bay |
| Early | Find missing wrench in tool chest | exploration → tool access |
| Early | Trace symbolic garage power fault | inspection → fixture repair → station power |
| Early | Make one shelf from reclaimed wood | salvage → material → placement |
| Early | Drag a spare tire into a rack | item identity → storage → shop organization |
| Early | Clean oil-soaked floor patch | condition map → usability/reputation |
| Early | Recharge/test car battery | station → vehicle functional state |
| Early | Replace starter's damaged component | teardown → bench → installed state |
| Early | Sell unusable scrap responsibly | sorting → ledger → budget |
| Early | First paid battery/no-start customer job | diagnosis → quote → real repair → payout |
| Early | Restock common consumables | stock → delivery → job readiness |
| Early | Wash and inspect salvage vehicle | wash → reveal faults → value decision |
| Early | Replace broken lamp and switch | utility graph → lighting |
| Early | Paint first shop wall/sign | coverage → identity/cosmetics |
| Early | Clear parking pad for second car | clutter/terrain → vehicle storage |
| Mid | Buy and place tire changer | cash → BOM → power → service |
| Mid | Recover wreck with utility trailer | towing → salvage → parts |
| Mid | Build covered parts storage | materials → modules → weather protection |
| Mid | Strip wreck into parts and scrap | mechanical graph → salvage yields |
| Mid | Refurbish shocks at correct station | part condition → driving results |
| Mid | Install wider door for a pickup | construction → clearance → new jobs |
| Mid | Level an outdoor lift pad | materials/site prep → new station |
| Mid | Fit and wire shop compressor | circuits → pneumatic tools |
| Mid | Fabricate trailer rack/bumper | materials → fabrication → vehicle upgrade |
| Mid | Deliver steel pallet for local contractor | cargo mass → route → payout |
| Mid | Repair driveway ruts / grading | construction → terrain → hauling access |
| Mid | Resell tested refurbished component | provenance/quality → market → ledger |
| Mid | Execute off-road race-prep order | upgrades → driving inspection → customer |
| Mid | Paint customer vehicle and final clean | prep/finish → value/reputation |
| Mid | Repair trailer suspension | mechanical parts → cargo dynamics |
| Late | Install engine stand and advanced diagnostic bay | power/capacity → deeper repairs |
| Late | Build steel fabrication annex | modular building → fabrication capability |
| Late | Take remote recovery contract | route → towing → rescue → garage |
| Late | Hire helper to organize stock | staff queue → storage → productivity |
| Late | Create multi-stage race support trailer | fabrication → logistics → race |
| Late | Open advanced scrap processing station | salvage yield → material economy |
| Late | Support seasonal town event | social/jobs → build/lighting/vehicles |
| Late | Renovate the 1966 trailer interior | property comfort/storage/story |
| Late | Preserve the historic garage as showroom/museum | property history → later approved expansion |
| Late | Expand to next-door land after allowed unlock | lot rights → building → services |

These are **proposals**, not guaranteed launch content. The first ten are enough to furnish a convincing initial hour and reveal whether the system architecture has merit.

## 23 — STARTER PLAYER EXPERIENCE: FIRST 30–60 MINUTES

A suggested playable onboarding that respects the $1,500 start and current story:

1. **Arrive and read the site.** See Walt's old garage, faded sign, dead power, worn Bug-style car, trailer, windmill, water tank and clutter; do not retell or retcon story.
2. **Find access.** Move a few scrap objects to clear the entrance; each remains a sale/reuse option, not scenery that deletes forever.
3. **Inspect power.** Locate breaker and complete a guided **in-game symbolic** fix, then toggle a circuit. One light comes on and the bench works.
4. **Sort first useful salvage.** Discover one common tool, one repairable part and a small material stack; organize at shelf or toolbox.
5. **Inspect grandma's car.** Diagnosis finds a specific legitimate no-start cause; use mechanics companion system for exact part dependency.
6. **Repair and reinstall.** Powered workbench/hand tools have meaning; part persists by exact ID; first engine crank works after satisfying prerequisites.
7. **Complete a short driveway shakedown.** Drive onto hardpack, return, recheck engine and repair; the driving physics handoff defines behavior.
8. **Earn modest first income.** Sell unwanted salvage or complete a small diagnostic/cleaning job rather than magically receiving a large payout.
9. **Make a smart investment.** Choose storage, light, tire setup or shop tool. Show the tradeoff between car upgrade and property upgrade.
10. **Save and return.** All cleaned/placed/stored items, property utilities, vehicle state and funds remain intact.

The opening shouldn't require an hour of chores before driving, nor let the player instantly fabricate a full race truck. Optional skips/hints can accelerate repetitive cleanup after it's taught.

## 24 — END-TO-END CROSS-SYSTEM EXAMPLES (THE GAME'S DIFFERENTIATOR)

### Example A: a valuable junkyard find

1. A legal salvage listing offers an abandoned off-road truck, seller terms and cost.
2. Player inspects externally, estimates potential part compatibility and risk.
3. Chosen utility vehicle/trailer has actual cargo/towing capacity; player drives a rough route.
4. Wreck loaded and carried as **one vehicle ID**, with attached parts still attached.
5. At Walt's Garage, player parks, cleans, inspects and strips individual components.
6. Good condition parts are installed in a compatible player car; worn parts are bench repaired; nonrepairable materials sold/recycled.
7. A differentials swap genuinely changes cornering and off-road grip; a new rack requires steel reclaimed from the truck.
8. Ledger records exact costs, parts provenance, profits and persistent storage.

### Example B: garage construction unlocks a mechanical repair

1. A job needs front suspension alignment but the current floor is unsuitable.
2. Player surveys level section of yard and chooses a small pad blueprint.
3. Material BOM reserves purchased/salvaged aggregate/concrete game units.
4. Player transports pallet, installs foundation/pad as staged game activity.
5. Station's anchor, utility and clearance checks pass; alignment bay placed.
6. Vehicle enters, actual installed wheel alignment changes after paid service.
7. Test-drive handling improves; future work orders become available.
8. Deconstructing the player-built pad refunds its paid **material quantities in full**, with safe storage transaction.

### Example C: seasonal rain creates a regional repair opportunity

1. WeatherService marks clay route wet and garage roof seam leaking.
2. Player's loaded trailer traction decreases on clay; different tire choice matters.
3. Garage's exposed storage gets an environmental condition warning.
4. Player repairs roof section from reused panels; inventory stops degrading under exposure.
5. Nearby contractor posts legal road-grading contract, later unlockable.
6. Completion improves access and generates income; no unbounded worldwide terrain changes.

### Example D: customer gets the car back

Customer reports poor stopping; player diagnoses worn rear pads and mismatched tires, prepares transparent quote; receives customer authorization; orders new components, salvages compatible tested used tires under policy, mounts/balances and installs, test-drives on known course, reports changed braking metric, returns vehicle in agreed condition, collects payment and ledger record; used/removed customer parts are disposed/returned exactly as contract says.

## 25 — PHASED IMPLEMENTATION PLAN (SOLO-DEV REALISM)

**H0 — Audit and contracts.** Existing repo and companion handoffs examined; agree on entity IDs, inventory, vehicle, utility, ledger, clock and save ownership. Scene object naming/mounts checked. No large refactor by default.

**H1 — Property + item vertical slice.** One garage room, one yard area, five interacting props, carry/drop/storage/sell and persisted transforms; constrained physics. **Pass:** no duplicate/lost objects across reload.

**H2 — Breaker + station + real car fix.** One utility circuit and lamp/bench, fault state, exact mechanical part instance bench repair; save/reload. **Pass:** a failed circuit actually blocks equipment and a restored circuit enables it.

**H3 — Cleaning/renovation.** One broom/washer, one cleanable garage floor/wall, debris pickup and paint; area usability updates. **Pass:** visible and saved change with finite task completion.

**H4 — Blueprint + storage construction.** One shelf and one shelter module, material reservation, valid placement, collision/clearance, full deconstruction refund. **Pass:** no money/material duplication after repeated build/deconstruct.

**H5 — Customer jobs + accounting.** One service order, budget/quote, approval, inspection from real parts, completion + immutable payout. **Pass:** cannot collect twice or return partially unrepaired car.

**H6 — Salvage + transport.** Legally owned junk object or wreck, dismantle/restore/sell, trailer/cargo manifest and driving-world transfer. **Pass:** exact items conserved in all moves and after interrupted save.

**H7 — Shop upgrades.** Multiple station capabilities, compressor/lift/power capacity, storage search and deliveries, second service bay. **Pass:** new workshop improvements actually unlock operations.

**H8 — Town/events/staff.** NPC schedules, repeat customers, contracts, supplier lead times, optional employee task queue and season events. **Pass:** consistent calendar and funds.

**H9 — Advanced construction and industry.** Yard grading, fabrication annex, scrap processing, adjacent parcel unlock (only if canon permits), museum conversion, complex buildings. **Pass:** meaningful use by real garage/vehicle mechanics, sustainable performance.

### The smallest viable release slice

One truly interactive run-down garage + one driveable/restorable car + one real no-start repair + one broken utility circuit + one repair bench + one cleanable zone + one salvage item + one paid job + one buildable shelf + save/load. **Everything else derives from this foundation.**

## 26 — QUALITY ASSURANCE AND ACCEPTANCE TESTS

| Test ID | Action | Proof of success |
|---|---|---|
| HYB-001 | Pick up same scrap item twice quickly | only one owned item, no clone |
| HYB-002 | Store, move, drop, reload exact item | identical ID/condition/provenance |
| HYB-003 | Clean wall, leave area, reload | coverage and material remain |
| HYB-004 | Breaker off, use powered station | blocked with correct reason |
| HYB-005 | Restore circuit, use same station | operation becomes available |
| HYB-006 | Run overloaded circuit | deterministic trip/feedback, safe recovery |
| HYB-007 | Place bench in doorway | placement denied with clearance hint |
| HYB-008 | Place bench within valid zone | correct cost deducted, persistent collider/nav |
| HYB-009 | Attempt build lacking material | neither structure nor resource changes |
| HYB-010 | Repeated deconstruct/refund cycle | **full materials returned exactly once**, no profit |
| HYB-011 | Move completed module | relocate without free duplicate refund/material consumption |
| HYB-012 | Move vehicle part from yard to bench to car | same unique ID persists and affects car behavior |
| HYB-013 | Scrap a salvage part | actual original item consumed; yield only once |
| HYB-014 | Sell same item using two rapid commands | single sale, single ledger credit |
| HYB-015 | Job approved, target repair incomplete | no completed/payment state |
| HYB-016 | Job complete and customer picks up | payout once, correct vehicle ownership transfer |
| HYB-017 | Customer-owned part sold without permission | prohibited or explicit approved disposal required |
| HYB-018 | Buy supplies/complete construction | balance, reserve, stock and BOM reconcile |
| HYB-019 | Load heavy cargo and drive | vehicle mass/handling changes through physics service |
| HYB-020 | Unload trailer, quit/reload | neither cargo nor trailer duplicates |
| HYB-021 | Construct roof during rain | protected zone behavior updates with weather |
| HYB-022 | Open garage door with car in bay | collider, path, animation and save state agree |
| HYB-023 | Save during half-completed build | stage + reserved material accounting recover |
| HYB-024 | Try to build next-door expansion at start | prohibited by lot rights |
| HYB-025 | Move 100+ repeated props into storage | no physics/render memory leak, responsiveness stable |
| HYB-026 | Leave region / return | deterministic streamed props, no identity loss |
| HYB-027 | Fill every storage slot | no hidden item loss; clear overflow response |
| HYB-028 | Return to garage after driving damage | exact vehicle/part condition persists |
| HYB-029 | Advance day/weather with active jobs | fair timing, NPC schedule/utility state consistent |
| HYB-030 | Attempt upgrade before requirements | exact missing capabilities shown, no cash taken |
| HYB-031 | Revert game to older saved schema | migration or explicit safe error, never silent corruption |
| HYB-032 | 30-minute garage interaction stress test | no runaway object count, stale event handlers, save lag |

**Testing additions:** deterministic fixture builders for inventories/plots; property graph integrity assertion; transaction property-based tests, paired item conservation checks; snapshot + migration tests; debug inspector showing item ID, true owner, location, pending transaction, zone and nearby utility graph.

## 27 — CONSTRAINTS, ANTI-FEATURES AND COMMON FAILURE MODES

- **No giant separate games hidden in one:** focused modules that feed vehicles and shop.
- **No simultaneous physical simulation of every crate/bolt:** offscreen objects become sleeping/static stored instances; active player interactions get physics.
- **No second inventory or cash wallet:** duplicated sources of truth create irreversible save exploits.
- **No one-click full shop at level 2:** shop development must be earned and materially meaningful, but avoid grind.
- **No arbitrary material loss when deconstructing player's build:** full refund is canon.
- **No building anywhere from the start:** one owned property; future adjacency by authorized expansion.
- **No fake functional fixtures:** a lamp uses power, a compressor provides air, a lift needs clearance, a roof protects.
- **No infinite real-world safety detail:** gameplay abstracts dangerous procedures and tools; this is not vocational instruction.
- **No generic junk reappearing in already cleared rooms:** world changes persist.
- **No selling an object twice or stripping customer cars without authorization:** permissions and transaction integrity matter.
- **No obligatory animal care/metabolism/cash register loops:** they're not the core promise.
- **No endless clicking to paint 2,000 square feet:** use meaningful zones and accessible tools.
- **No poor performance from module-by-module live colliders and draw calls:** separate design, visual, and physics representation.
- **No engine rewrite because of a new workbench:** station capability interface and stable asset IDs.
- **No destruction of meaningful Walt-era narrative items without confirmation**, if story canon marks them protected.
- **No invented claims that other simulator games have exact systems described here:** publicly documented mechanics vs Baja proposals stay separated.

## 28 — OPEN FORGE DECISIONS (PROPOSALS, NOT NEW CANON)

1. Whether initial first-person foot movement or third-person character mode is the primary property experience.
2. Whether the 1966 trailer is rest-only, storage, early living space, or later fully renovatable home.
3. Whether the windmill has actual water pumping, power, or only landmark role, and how the water tank obtains refill.
4. How deep electrical/water/air utility planning should go beyond one circuit and capacity model.
5. Which renovation tools should be real minigames versus quick actions.
6. Blueprint build placement grid granularity and whether structural supports block removal.
7. Earliest availability of welding, fabrication, large lifts and staff.
8. Garage jobs versus off-site construction jobs weighting; too much off-site work could distract.
9. Shop recurring costs and whether bills have accessibility difficulty settings.
10. Whether property/weather conditions can passively damage stored items, and how to communicate clearly.
11. Whether player physically shops at suppliers or orders from tablet/delivery.
12. Whether a separate business storefront or attached gas pumps ever belong in world.
13. Whether auctions have bidding AI or simple posted-price listings initially.
14. How the old garage becomes a museum/store room later and timing of adjacent DLC.
15. Degree of time pressure, fatigue/rest and NPC scheduling difficulty.
16. Whether business staff are fully simulated NPCs or offscreen task agents.

Unless user or Forge explicitly locks new choices, choose **reversible, minimally scoped defaults** and label them `PROPOSED`. Preserve source of truth: GitHub/live implementation > latest pasted canon > prior Forge snapshot > this research proposal.

## 29 — VERIFIED RESEARCH SOURCES & TECHNICAL READING

**Research checked November 22, 2026.** Links live in the file so Claude can verify later. Publisher/developer listings support broad feature claims; construction, economy and code structures in this document are **Baja design proposals**, not reverse-engineered game internals.

- **[H01] House Flipper 2 developer interview on renovation/sandbox and separate detailed mode:** https://www.gamedeveloper.com/design/house-flipper-2-interview ; store overview: https://store.steampowered.com/app/1190970/House_Flipper_2/
- **[H02] Ranch Simulator developer listing for renovating/building property:** https://store.steampowered.com/app/1119730/Ranch_Simulator__Build_Farm_Hunt/
- **[H03] Gas Station Simulator developer overview of desert renovation/business:** https://drago-entertainment.com/support/gas-station-simulator/ ; Steam announcements on employee scheduling: https://store.steampowered.com/news/posts/?appids=1149620&enddate=1696003234&feed=steam_community_announcements
- **[H04] Junkyard Simulator developer overview of scrap/renovation:** https://www.rebeliagames.com/junkyard-simulator/ (may redirect) ; Steam listing https://store.steampowered.com/app/671970/Junkyard_Simulator/
- **[H05] Construction Simulator official FAQ, contracts/roadwork/build tasks:** https://www.construction-simulator.com/en/faq-cs2022.php
- **[H06] Builder Simulator store, foundations/walls/windows/doors:** https://store.steampowered.com/app/1120320/Builder_Simulator/
- **[H07] PowerWash Simulator publisher overview:** https://collective.square-enix-games.com/en_US/games/powerwash-simulator
- **[H08] RoadCraft publisher, road/bridge rebuilding and logistics:** https://www.focus-entmt.com/en/games/roadcraft
- **[H09] Pacific Drive developer interview, vehicle-centered garage and preparation:** https://www.unrealengine.com/developer-interviews/pacific-drive-is-a-run-based-driving-survival-game-with-an-ever-changing-mysterious-landscape?lang=en
- **[H10] Mon Bazou store, vehicle upgrades, junkyard, garage/business:** https://store.steampowered.com/app/1520370/Mon_Bazou/
- **[H11] Farming Simulator 25 official overview of production and construction:** https://www.farming-simulator.com/about.php
- **[H12] Teardown store description of voxel destruction:** https://store.steampowered.com/app/1167630/Teardown/
- **[H13] SnowRunner publisher, cargo/mud/winching context:** https://www.focus-entmt.com/en/games/snowrunner
- **[H14] Rapier JavaScript collider/heightfield/overlap reference:** https://rapier.rs/docs/user_guides/javascript/colliders/
- **[H15] Rapier physics controller / raycast vehicle reference:** https://www.rapier.rs/docs/user_guides/javascript/character_controller/#vehicle-controller
- **[H16] Three.js InstancedMesh repeated-object rendering:** https://threejs.org/docs/pages/InstancedMesh.html
- **[H17] react-three-rapier fixed step, joints and performance:** https://pmndrs.github.io/react-three-rapier/
- **[H18] Rapier JS impulse/force handling for physical cargo:** https://rapier.rs/docs/user_guides/javascript/rigid_body_forces_and_impulses/

## 30 — COMPREHENSIVE IMPLEMENTATION ACCEPTANCE CHECKLIST

### Must exist before more features

- [ ] Repo audited; existing canon and systems kept intact.
- [ ] Starter property is Walt's Garage with correct initial equipment, vehicle, trailer, windmill, water tank, power and **$1,500**.
- [ ] First-person/third-person interaction system selects objects with clear verbs.
- [ ] Inventory/world/bench/vehicle/cargo use a consistent item identity and transfer rules.
- [ ] One powered station checks a real utility circuit and supports a real vehicle repair.
- [ ] Cleaning physically/visually changes a saved property zone.
- [ ] Building module can be previewed, validated, placed, saved and removed.
- [ ] Building material bill is consistent with inventory and deconstruction returns **100% materials** without duplication.
- [ ] One legitimate salvage source supports inspect/reuse/recycle/sell choices.
- [ ] One customer job uses real completion criteria and pays exactly once.
- [ ] Vehicle/garage/road state survives movement and save/load.
- [ ] Power/weather/time systems use shared services rather than local random data.
- [ ] Scene performance survives item clutter and build modules without simulating everything at 60 Hz.
- [ ] Every added feature visibly serves repair, build, race, haul, salvage, place or business progression.

### Definition of the hybrid's success

A player should be able to discover an old part behind a workbench, find out what it is, power a bench, restore it, sell it or install it on a specific car, use the profits to build a useful garage improvement, drive the car on terrain whose behavior reflects the installed part, and come home to a workshop that still contains *exactly* what they left there. That continuity is the feature. Every other sim influence is only valuable when it strengthens it.
