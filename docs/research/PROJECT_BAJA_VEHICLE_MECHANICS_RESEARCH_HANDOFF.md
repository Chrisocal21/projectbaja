# PROJECT: BAJA — VEHICLE MECHANICS, RESTORATION & CUSTOMIZATION

**Research-backed design and Claude Code/VS Code implementation handoff**  
**Prepared:** 2026-11-22  
**Status:** PROPOSAL — preserve existing Project: Baja canon; systems below are recommended architecture, not already-approved canon.  
**Audience:** Claude in VS Code, Forge engineering/product/design team, solo developer.

> **North star:** Any supported vehicle can be inspected, diagnosed, partly or fully dismantled, repaired, rebuilt, upgraded, fabricated, customized, driven, tested, damaged, recovered, and rebuilt again. The *same* component data drives the garage UI, 3D assemblies, mechanical constraints, economics, failure behavior, and driving simulation.

---

## EXECUTIVE OVERVIEW — THE COMPLETE RECOMMENDATION

**Project: Baja should be a fully interactive vehicle-building ecosystem, not simply a garage inventory screen.** The player can buy or recover a wreck, diagnose the cause of a problem, dismantle it into individual mechanical components, refurbish or fabricate parts at dedicated workstations, rebuild the *same* vehicle, change its specification, and feel the mechanical consequences when driving across different terrain. Eventually, this must work across supported vehicle families by adding component definitions and assets rather than rewriting the game.

### What we are combining from reference games

- **Car Mechanic Simulator 2021:** approachable part-by-part disassembly, shop workflow, work orders, inspections and station-based repair.
- **Wrench:** detailed mechanical assembly and service operations, real fastener concepts, torque and system-level cause-and-effect.
- **My Summer Car:** construction of an engine and vehicle from loose parts, tuning, mistakes and ongoing maintenance.
- **My Garage:** physical damage, material condition, worn suspension, fluids and wreck sourcing.
- **Revhead:** meaningful component swaps, salvage-to-race-car progression and gearing/performance choices.
- **BeamNG.drive:** hierarchical vehicle configuration, slot dependency, tuning and the principle that broken or replaced parts affect behavior. **Do not promise BeamNG soft-body deformation.**
- **Automation:** engineering trade-offs between power, mass, fuel use, durability, packaging and expense.
- **Offroad Mechanic Simulator:** terrain-specific upgrades, lifts, snorkels and practical test drives.
- **Mon Bazou:** the long-term emotional satisfaction of upgrading an initially humble car.

**Creative target:** the accessible shop loop of *Car Mechanic Simulator*, the depth of *Wrench*, and meaningful driving feedback reminiscent of *BeamNG*, built to the practical limits of a browser game. These references are design inspiration, not a request to clone protected game content. Section 1 separates documented reference-game mechanics from Baja proposals; Section 21 provides sources.

### The most important engineering decision

**Parts, repairs and driving behavior must share one source of truth.** A repair action cannot merely swap a visible mesh or add a green "repaired" label. It must update the component instance (identity, condition, location, attachments and history), its compatibility and operating state, the 3D presentation, and the aggregate mechanical outputs consumed by driving physics. Otherwise replacing a differential, curing a misfire or fitting larger tires produces a pretty but fake simulation. The five linked graphs and sample TypeScript architecture in Sections 4 and 13 are intended to prevent that failure.

### Start with these three milestones, in this order

1. **Make grandma's starter car mechanically functional.** Implement battery, starter/ignition, fuel delivery, engine-start prerequisites, part ownership and persistent condition. A specific real failure must explain why the engine will not start.
2. **Make one teardown-to-repair loop genuinely work.** Remove components with prerequisites, send a specific part to the correct bench, use a rule-driven repair recipe or install a replacement, and reinstall the same surviving component instance. Save and reload without losing it.
3. **Make the fix affect driving.** Connect mechanical output to vehicle behavior; then introduce tires, gearing, suspension, engine tuning and upgrades, each with believable performance trade-offs that can be observed through a test course and telemetry.

Do not work on fifty beautifully rendered components before one complete part is selectable, removable, repairable, reinstallable, functional and persistent.

### What is and is not automatic in the technology stack

- **React Three Fiber / three.js:** renders and organizes detachable 3D assemblies, interaction targets, effects and scene UI; it does **not** generate mechanical relationships from an arbitrary GLB.
- **Rapier or comparable browser physics:** supports rigid bodies, collision and queries that can underpin aggregate/raycast-style vehicle approaches; it does **not** automatically provide a realistic complete vehicle-teardown simulator or BeamNG soft-body damage. Verify the actual physics package/APIs in the repo before adopting a controller.
- **Individual 3D assets:** need separately modeled meshes, consistent pivots, mount transforms, interaction/collision proxies and named parts. A merged vehicle mesh cannot be treated as a complete serviceable engine merely by assigning data.
- **Universal vehicle support:** means a shared schema, parts library, compatibility contracts and repeatable content pipeline. **Each vehicle still requires prepared content and validated fitment.** It does not mean one generic mesh automatically becomes every make, model, engine and chassis.
- **All design and balance values in this document are illustrative** unless explicitly tied to a cited source; they are not real-world torque specifications, safety standards or measured physical validation.

### Deliverable expectations for Claude in VS Code

First **audit the repository** and compare existing features to the systems here. Respect the most recent project canon, live implementation and locked decisions. Treat this document as a comprehensive **research + engineering proposal**, not a statement of features already implemented or permission to rebuild existing functionality. Then produce a file-by-file, testable plan for the smallest working mechanical vertical slice; implement in independently verifiable increments with explicit save/load and performance checks. The longer-term architecture should allow engines, transmissions, brakes, suspensions, differentials, electrical networks, bodywork, fabrication, tuning and off-road components to share the same interaction rules.

**Ready-to-paste instruction to Claude:**

> Read this entire `PROJECT_BAJA_VEHICLE_MECHANICS_RESEARCH_HANDOFF.md` file and compare it with our existing systems before making changes. Preserve established Project: Baja canon and working features. Inventory what's implemented, missing or technically blocked. Propose the smallest playable, mechanically connected slice using grandma's 1971 Bug-style starter car: inspect a no-start condition, diagnose the actual failure, remove the necessary component, repair or replace it at the appropriate workstation, reinstall it, start the engine, test-drive it and save/reload everything. Define reusable catalogs, persistent part instances, attachment/access dependencies, compatibility, mechanical simulation and 3D asset contracts. Give the exact files, test plan, asset requirements and constraints before writing code. Do not build the entire roadmap at once or rewrite unrelated systems.

## 0. CLAUDE: READ THIS FIRST

1. **Inspect the existing repository before changing anything.** Identify engine, R3F scene, parts assets, state management, physics, persistence, and any established mechanic systems. Do not assume an empty codebase.
2. **Preserve locked story/canon**: Walt's Garage (repairs/welding, established 1968), Iron Flats/Baja County desert, starter with $1,500, grandma's worn 1971 rounded *Bug-style* car, not running since 2009, grandfather Walt, initial modest tune-up, grounded semi-realism, weathered/salvaged-to-race-ready materials. Do not introduce real car trademarks or logos in assets.
3. **Do not implement this entire specification in one shot.** Start with a vertical slice of one starter vehicle, one subsystem, one repair station, one diagnosis, one installation/removal chain, one test drive, one persistence cycle. Expand by data, not branching vehicle-specific code.
4. **Consult existing canonical architecture and Forge docs first.** If this handoff conflicts, flag conflict and follow newest canon/project code. Sections marked `PROPOSED` require user/Forge confirmation if they change gameplay decisions.
5. **Respect actual version/API details in `package.json`.** Never invent imports, pretend Rapier gives BeamNG soft-body physics, or assume an asset contains separate serviceable meshes. Use placeholders with honest labels where art does not yet exist.
6. **Acceptance:** an action must be reflected consistently in part ownership/location, 3D visibility, install state, vehicle function, economy, work order, save/load, and undo/recovery behavior.

### Copy/paste mission for Claude

> Read `PROJECT_BAJA_VEHICLE_MECHANICS_RESEARCH_HANDOFF.md` as a **design and engineering specification**, not a command to build everything. Audit the current repo and list existing capabilities versus missing ones. Propose the smallest playable vertical slice using grandma's 1971 Bug-style car: inspect no-start -> diagnose battery/ignition/fuel -> remove a part with its actual prerequisites -> repair or replace it at the correct station -> reinstall -> start engine -> test drive -> save/reload. Define a data-driven part catalog + instance inventory + attachment/access graph first. Present exact files to edit, test plan, and known limitations before implementing. Build in small verified increments. Do not change unrelated features, story canon, or visual identity.

---

## 1. WHAT EXISTING GAMES TEACH US (RESEARCH, NOT CLONING)

| Game | Verified features relevant to Baja | Take / avoid |
|---|---|---|
| **Car Mechanic Simulator 2021** | 4,000+ unique parts advertised; 72+ cars; work orders, repair/rebuild/paint/tune, garage expansions, auctions/barn finds. Community documentation identifies workbench for parts, body table, brake lathe, battery charger, engine crane/stand, spring puller, tire mount/balancer. | **Take:** clear disassembly UX, satisfying completion, work-order loop, stations. **Avoid:** every repair becoming the same abstract minigame. |
| **Wrench** | Race-car service with detailed thread pitch and fastener torque. Developer updates describe component-linked electrical, fuel, compression and driving simulation. | **Take:** authentic causal diagnosis, optional torque detail, tuning measured on-track. **Avoid:** making the first playthrough hundreds of invisible bolts. |
| **My Summer Car** | Hundreds of loose parts; entire car/engine assembly; maintenance, tuning and vehicle inspection. | **Take:** assembly ownership and mistakes that matter. **Avoid:** opaque install dependencies and punishment without feedback. |
| **My Garage** | Body-panel damage/repair, paint, suspension wear affecting handling, oil condition affecting wear, specialized tools, junkyards/barn finds. | **Take:** persistent material condition, consumables, parts sourcing. |
| **Revhead** | Dozens of swappable components, used wreck sourcing, car performance and drivetrain ratios tied to build. | **Take:** salvage economy + track-specific tuning. |
| **BeamNG.drive** | Tree-based parts selector, dependent slots, part-dependent tuning settings, saved configurations. High-detail soft-body simulation is **not** trivial to reproduce. | **Take:** hierarchical compatibility/configuration system and meaningful damage outcomes. **Avoid:** promising BeamNG-level deformation in browser. |
| **Automation** | Engine/car designer with engine architectures and trade-offs; exports into BeamNG. | **Take:** engineering choices affecting power, weight, efficiency, reliability, costs. |
| **Offroad Mechanic Simulator** | Jobs with lift kits/snorkels, budgets, terrain tests across cliffs, mud, water. | **Take:** modifications whose value is demonstrated on terrain. |
| **Mon Bazou** | Install your own upgrades and develop a cheap car into a racer; salvage sourcing. | **Take:** garage-to-road progression and personal attachment. |

**Important qualification:** Publisher pages and official docs support the described feature sets; exact UI/repair thresholds below are sourced from community guides rather than developer specifications. The mechanics proposed for Baja are original design proposals, not claims that existing games implement them identically.

### Relevant shortcomings to design around

- Player feedback on CMS often asks for bulk operations, repairability indicators, multi-engine-stand workflow, smarter inventory management, and a shopping list directly from known bad parts rather than tedious re-entry.
- Mechanical fidelity must be adjustable. A novice needs useful hints, not a hidden 7 mm bolt hunt; an expert can enable manual fastener/torque mode.
- A part replacement should only be “good” if it fits, is installed correctly, connects to required systems and behaves appropriately during testing.

---

## 2. DESIGN PILLARS AND SIMULATION BOUNDARIES

**P1 — One physical vehicle, many representations.** A car is not a static GLB. It is an assembly of part *instances*, connected by mount points and physical/service constraints, rendered as detachable meshes, simulated through functional subsystems.

**P2 — Player choice matters.** Two visually similar parts can differ in weight, durability, gearing, efficiency, traction, heat, electrical demand, cost and future compatibility.

**P3 — Mechanical cause and effect.** A no-start may be a flat battery, wiring fault, absent fuel pressure, bad ignition, low compression or mechanical seizure—not just a random damage score.

**P4 — Complexity unfolds.** Basic service first, then accessible tear-down, then full engine and drivetrain, then fabrication/tuning. All depth exists behind a familiar interaction grammar.

**P5 — No fake universal compatibility.** Installing a V8 in a compact rear-engine chassis is a *major project*, not an arbitrary slot replacement. Mounts, space, cooling, driveline, electrical capacity, budget and handling must matter.

**P6 — Browser-scaled fidelity.** Simulate each important component as *data*; do not simulate every nut as its own live rigid body while driving.

### Three depth presets (PROPOSED)

- **Guided:** show needed tools, highlighted dependencies, aggregate obvious fasteners, simplified timing/correct-torque checks; no surprise permanent part loss.
- **Standard (recommended):** individual major fasteners and connectors, failure diagnosis, fluids, required special tools, meaningful assembly errors, manual tuning.
- **Expert:** full bolt groups, torque sequence/values *from fictionalized spec sheets*, alignment and clearance checks, tighter calibration windows, limited hints. **Never claim these values are actual service specifications.**

These are UX options, not separate vehicle architectures or incompatible save formats.

### Simulation resolution

| Level | Examples | Engine implementation |
|---|---|---|
| **Visual-only** | decorative zip tie, stamped metal lettering | attached static mesh/material |
| **Logical assembly** | bolts, gaskets, bushings, hoses, relays, wiring plugs | stateful instances, prerequisite checks; optional click interaction |
| **Functional subsystem** | fuel, air, ignition, compression, oil, coolant, electrical, brakes, gearing, suspension | domain models evaluated at startup and during driving |
| **Driving physics** | chassis, spring travel, grip, steering, torque distribution | aggregate physics bodies, raycast wheels or equivalent |
| **Damage/event model** | rock strike, overheat, poor weld, worn bearings, hard landing | discrete failure/wear events modify component state |

---

## 3. UNIVERSAL VEHICLE ASSEMBLY TAXONOMY

A vehicle has **(a) a blueprint**, **(b) one or more saved configurations**, and **(c) individual persistent part instances**. Model these categories even when they are empty. Not every vehicle uses every category.

```text
VEHICLE (VIN-like fictional ID)
├── Structure
│   ├── chassis/frame/unibody, crossmembers, subframes, roll cage
│   └── mounts, skid plates, bumper/crash structures
├── Exterior and cabin
│   ├── hood, panels, fenders, doors, glass, lights, seals
│   └── seats, belts/harnesses, controls, gauges, cargo, paint/livery
├── Power unit
│   ├── engine block/case, rotating assembly, heads, timing/valvetrain
│   ├── intake/fueling/ignition, exhaust, lubrication, cooling (if applicable)
│   └── alternator/starter/accessories; OR electric motor/inverter/battery
├── Drivetrain
│   ├── clutch/torque converter, gearbox/transaxle, driveshafts/CV axles
│   ├── transfer case (optional), differentials, axle shafts, hubs
│   └── 2WD/4WD/AWD hardware, final drive, locking mechanism
├── Front/rear suspension
│   ├── arms, springs, dampers, anti-roll bar, bushings, joints
│   └── geometry adjusters, bump stops, limiting straps
├── Steering
│   └── rack/box, column, tie rods, knuckles, power assist
├── Braking
│   └── master cylinder, lines, calipers/wheel cylinders, discs/drums, pads/shoes
├── Wheels and tires
│   └── rims, tires, valves, balancing weights, spare wheels
├── Fluids, pipes and electrical
│   ├── fuel tank/pump/filter/lines, intake/air filter, coolant/oil/gear oil
│   ├── battery, alternator, starter, fuse box, harness, ECU/sensors
│   └── service connectors, hoses, switches, relays
└── Off-road and utility options
    └── winch, lighting, snorkel, recovery points, compressor, roof rack,
        tow gear, spare carrier, auxiliary power/fuel, shocks/bypass,
        long-travel suspension, underbody armor
```

### Vehicle archetypes and exceptions

| Archetype | Special topology / design implications |
|---|---|
| **Starter rear-engine Bug-style car** | horizontally opposed four, rear engine/transaxle layout, air cooling if chosen, compact rear bay, RWD, compact suspension geometry; verify actual in-game blueprint before hardcoding |
| **Pickup / prerunner** | body-on-frame, separate bed, front steering, high-clearance suspension, possible 4WD conversion |
| **Dune buggy** | tube frame, exposed drivetrain, light body, high travel, possible rear/transaxle layout |
| **Trophy-style race truck** | cage, long travel, serviceable shocks, big cooling/fuel demands, gear ratios, spare tires |
| **UTV / side-by-side** | CVT/belt drive, small turbo motor, independent suspension, compact subassemblies |
| **Heavy diesel utility vehicle (later)** | turbo/intercooler, injection complexity, heavy gearbox/axles, auxiliary systems |
| **Electric vehicle (later)** | traction battery + inverter + motor + reduction gear, thermal management, high-voltage isolation; completely different service safety model |
| **Trailer / camper (later)** | wheels, suspension, tow interface, lights, water/electrical systems; usually **no engine** |

**Do not equate “all vehicles” with “all vehicles have engines.”** The same framework should support trailers, multiple axles, unusual drive arrangements, and future hybrid/electric systems through capabilities.

---

## 4. THE FIVE GRAPHS — MOST IMPORTANT ENGINEERING DECISION

Don't implement all dependencies as one `parentId` tree. Real cars have overlapping relationships:

1. **Assembly containment graph:** which part/subassembly belongs to which assembly; wheel assembly = rim + tire + valve + weights.
2. **Mounting/fastener graph:** physical connection, bolts, clamps, welds, clips, adhesives, service fluids, required torque/fastener group.
3. **Access/obstruction graph:** what must be moved before another part can be reached. Example: remove a rear housing before accessing an internal fastener. These dependencies vary by vehicle.
4. **Compatibility/capability graph:** mounting interface, geometry, dimensions, connector type, voltage, displacement envelope, drivetrain format, tire/rim specs, load rating, skill/tool constraints.
5. **Functional network graph:** fuel flows to engine, power flows battery->starter, torque engine->gearbox->driven wheels, brake fluid pressure->calipers, cooling/thermal path. **These networks can have cycles**; do not try to make them removal DAGs.

**Rule:** an assembly can be visually attached but functionally disconnected (e.g. mounted alternator with unplugged lead). A part can be functionally sound but inaccessible until adjacent hardware is removed. A part can be mechanically compatible but create clearance/heat/load issues.

### Part states

`unseen -> inspected -> diagnosed -> queued -> accessible -> loosened/disconnected -> removed -> inventoried -> cleaning/repairing -> serviced -> installed -> secured -> calibrated -> tested`

These are *activity/UI phases*, not one exclusive part lifecycle enum. Use orthogonal state fields (location, attachment, fasteners, diagnosis, repair and calibration). Otherwise a part cannot be both `installed` and `damaged`.

### Removal validation (atomic domain operation)

```text
requestRemove(partInstanceId, actorContext)
  confirm vehicle not moving / worksite valid / part not reserved
  confirm accessible from current inspection angle and lift position
  evaluate access blockers and removal dependencies
  check installed connections (wires/hoses/shafts/fasteners/fluids)
  check tool, skill, support equipment and safety state
  if denied -> show exact blocker(s), suggested action and focal location
  if allowed -> detach domain instance from mount
                update physical assembly and functional networks
                transfer SAME instance to tray/inventory/hand/bench
                update render and work-order progress
                record event and persist safely
```

Installation is the reverse only in a **limited** sense: it must also check matching interface, orientation, clearance, connectors, fastener reuse, sealing/gasket state, torque, fluid fill, balancing, calibration and functional tests. It should not teleport a broken part into perfect condition.

### Fastener model

Each `FastenerGroup` describes type (`bolt`, `stud`, `nut`, `clip`, `clamp`, `weld`, `adhesive`), count, tightening sequence (if needed), tool drive, size tag, torque band (fictional game spec), access direction, reusability, missing/rounded/stripped/corroded state, and whether it is represented individually or as a group. **Never rely on guessed real-world torque numbers.** `torqueNm` is unit-specific data and must be authored intentionally.

### Mechanical errors that are fun rather than arbitrary

- Loose battery terminal -> intermittent voltage/no-crank.
- Missing engine ground -> starter issues.
- No fan belt on air-cooled engine (where fan is belt-driven) -> severe cooling problem.
- Mismatched wheel/tire dimensions -> fitment/handling problems.
- Worn bushing -> alignment drift/shimmy.
- Incorrect gear ratio -> poor hill climb or insufficient top speed.
- Too much lift with stock brake lines -> line stretch/rupture risk at articulation.
- High-power engine with stock clutch -> slip and heat.
- Unbalanced wheel -> vibration at speed.
- Incorrectly seated gasket / low oil -> leak, overheating/wear.
- Part seated without correct clamps/fasteners -> misfire, leak or mechanical failure according to system.

Use specific, visible symptoms and diagnostic clues. No invisible RNG penalty without evidence.

---

## 5. TEARDOWN INTERACTION DESIGN

### Player modes

- **Walk-around**: hood/trunk/doors, inspect visible parts, look for leaks/noises.
- **Inspect**: hand tools, OBD-like diagnostics if supported by era, multimeter, compression gauge, visual scan; paint/condition overlays.
- **Disassemble**: select an exposed part, see attachment locations and blockers; use appropriate tool; put removed component in tray or carry it.
- **Assemble**: choose a candidate part from inventory, preview ghost fit, validate constraints, install, reconnect and test.
- **Engine stand/bench**: isolate an assembly, orbit/zoom/section camera, explode for *visualization* (does not automatically change installation state), manipulate parts.
- **Tune**: alignment, ride height, spring preload, tire pressure, timing/fueling where appropriate, gearing and differential settings.
- **Test**: stationary start/idle, rollers/dyno, braking test, dirt course or race.

### UX requirements

1. Hover highlight only **currently reachable** component; another color for blocked component with explanation.
2. Small contextual action menu: `Inspect`, `Remove`, `Service`, `Replace`, `Add to list`, `Pin requirement`, `Show blockers`.
3. Add discovered required parts to persistent **work-order shopping list** from any relevant screen; preserve axle/side/size specs. Avoid repeated typing.
4. An **assembly tree** with filter by system, left/right/axle, condition, missing parts, upgradeability, compatibility, work-order relevance.
5. `X-ray/ghost` accessibility overlay; use color + shape/icons (not color alone).
6. `Show last removed`, `Locate missing bolt`, `Return all tools`, `Sort screws/bolts`, `Reinstall last part`, `Preview complete assembly` (not a magical free restore).
7. Fast repeat interaction for routine screws; retain expert precision mode for special jobs.
8. Camera anchors at engine bay, wheel corners, underbody, bench, inside cabin. Avoid camera clipping/hunting.
9. Every required action uses the same interaction grammar regardless of vehicle.
10. Show authenticity through **context**, not by forcing users to wait 20 seconds for every screw.

### Recommended action rhythm

**Select part -> reveal actual requirements -> do tangible action -> hear/see feedback -> update vehicle state -> reveal next layer.** The gratification comes from unlocking access to real subassemblies, not minigame spam.

### Example removal dependency: front brake rotor (illustrative)

Wheel nuts/bolts -> wheel removed -> caliper unmounted/support bracket as required -> rotor retainer removed -> rotor detached; if rotor exceeds runout but thickness too low, replacement only. Actual sequence can vary by vehicle blueprint.

### Example engine tear-down on stand (illustrative, not universal)

Disconnect power/fuel/hoses/controls, support engine, detach drivetrain mounts/fasteners -> extract to stand -> remove external intake/exhaust/ignition/accessory components -> covers -> timing/valvetrain -> cylinder heads -> oil pan/sump (if applicable) -> oil pump/rotating assembly -> bearings/pistons/crank. A rear air-cooled flat-four requires an **engine-specific** sequence, not a generic modern inline-four animation.

---

## 6. GARAGE WORKSTATIONS / TOOL ECOLOGY

Implement each station as a **capability provider + recipe catalog + interaction scene**, not bespoke hardcoded progress bars. Upgrades add supported recipe families, accuracy, throughput or workholding ability.

| Workstation | Inputs and operations | Output / gameplay consequence | Start priority |
|---|---|---|---|
| **Inspection bay & lift / jack stands** | vehicle, lift position, lighting, diagnostic tools | opens underside access, inspection events, clearance checks | **MVP** |
| **General repair bench + vise** | removed housing/brackets, brushes, bushings | clean, measure, restore eligible parts; limits on strength | **MVP** |
| **Battery testing/charger bench** | 12V battery, multimeter, charger | state-of-charge recovered, capacity health diagnosed separately | **MVP** |
| **Engine hoist and rotating stand** | compatible engine, lift hardware and fixtures | remove power unit, assemble at true subassembly level | Phase 2 |
| **Parts washer / degreaser** | dirty parts, solvent/time | reveals cracks/marks; cleanliness does not restore structural wear | Phase 2 |
| **Hydraulic press** | bushings, bearings, bushings sleeves, hub carriers | press in/out with fit and damage risk | Phase 2 |
| **Tire changer** | tire/rim/valve | mount/dismount; enforce bead/diameter/width compatibility | Phase 2 |
| **Wheel balancer** | mounted wheel; weights | reduce vibration; placement minigame or auto-assist | Phase 2 |
| **Spring compressor** | strut, coil, top mount | safely separate coil-over/strut assembly | Phase 2 |
| **Brake lathe** | serviceable discs/drums | machine surface, reduce thickness; blocked under min spec | Phase 2 |
| **Welding/fabrication table** | steel stock, repair piece, welder/fixture | create/reinforce brackets, skid plates, cages, mounts | Phase 3 |
| **Machine/measurement bench** | crank/head/block, micrometers, gauge tools | measure wear, outsource or perform bore/hone/resurface | Phase 3 |
| **Transmission/differential bench** | gearbox/differential assembly | bearings, synchros, seals, ratios and backlash as depth grows | Phase 3 |
| **Paint/body station** | panels, sanding, primers, coatings | scratch/rust protection and aesthetic finish | Phase 3 |
| **Alignment rack** | wheels, tie rods, adjustable suspension | set toe/camber/caster where adjustable; changes tire wear/handling | Phase 3 |
| **Fuel/ECU tuning + dyno** | running vehicle, sensors, ECU (if present) | curves, temperature, load and misfire testing | Phase 4 |
| **Shock service bench** | serviceable shock | oil/seals/valving; adjust damping and rebuild quality | Phase 4 |
| **Wire/electrical bench** | harnesses/relays/connectors, crimper/multimeter | trace faults, repair continuity, build circuits | Phase 4 |
| **Upholstery/interior bench** | seats, trim and cabin items | new materials, stitching, weathered restoration | Optional |

**Station rules:** requirements = {parts, tools, consumables, skills, power, workspace, duration}; process = reproducible recipe with defined checks; results = output instance, quality change, consumables removed, money/time spent, failure possibility, work-order ledger. Some stations operate on vehicle, some on detached assembly, some on part.

### Repair/replace/recondition distinctions

- **Clean:** grime/corrosion removal; inspection visibility and appearance improve, not strength automatically.
- **Service:** refill/reseal/adjust/recharge; often restores function but not base lifespan.
- **Repair:** fix identified failure where reasonable; retain history and residual limits.
- **Recondition/remanufacture:** replacement of wear internals, resurfacing and testing; quality depends on equipment and tolerances.
- **Replace:** installs a separate part instance with its own quality, cost and provenance.
- **Fabricate:** make *new* part from design/material/fixture, with tested strength and fit.
- **Upgrade:** replace with a compatible alternative that changes specs/capabilities, often creates secondary requirements.

**Do not allow casual cosmetic “100% repair” on safety-critical or worn-out parts.** Cracked control arms, severely corroded brake lines, over-thin brake rotors, fatigued bolts, and structurally compromised chassis parts should generally require proper replacement or specialist operations in the game. A shiny finish does not reset fatigue history.

### Concrete bench recipe examples (all values are illustrative game balance, not real-world service data)

```yaml
- recipeId: battery.charge.12v
  station: battery_bench
  accepts: [battery_12v]
  requires: {toolTags: [charger], energy: 1, minutes: 10}
  preconditions: [case_intact, compatible_voltage]
  effects: {chargePct: 95, healthPct: unchanged}
  revealTests: [resting_voltage, capacity_check]

- recipeId: brake_disc.resurface
  station: brake_lathe
  accepts: [serviceable_brake_disc]
  preconditions: [measured_thickness_above_service_margin, not_cracked]
  effects: {surfaceRunout: improved, discThicknessMm: decreased, heatCapacity: slightly_decreased}
  failsWhen: [would_go_below_minimum_thickness]

- recipeId: suspension.bushing_press
  station: hydraulic_press
  accepts: [control_arm_with_replaceable_bushing]
  inputs: [new_bushing]
  effects: {installedBushingInstanceId: new_bushing, alignmentNeedsCheck: true}
  risk: {wrong_fixture: housing_damage}
```

---

## 7. CONDITION, QUALITY, DAMAGE, HISTORY, AND ECONOMY

Never collapse all condition into one `health=87` if that one value must drive failure, visuals, price and repair eligibility. Use independent dimensions:

```text
wearPct          cumulative contact/usage wear
integrityPct     structural strength / cracks / fatigue
corrosionPct     rust/oxidation extent
contaminationPct dirt/debris/water/fuel or oil fouling
calibrationPct   correctness of adjustment
chargePct        state of charge where applicable (not battery health)
fluidAmount      actual quantity where applicable
fluidQuality     aging/contamination of oil/coolant/brake fluid
finishState      cosmetic visual layer (paint, scratches, grease, heat marks)
provenance       OEM-equivalent / aftermarket / salvaged / fabricated / race
qualityGrade     reliability and tolerances of manufactured part
serviceHistory   linked events, previous owners, work receipts
```

A *part definition* holds specifications (mass, dimensions, material, torque map, interface list). A *part instance* holds wear, individual serial ID, history, fluids and calibration. Do not change the canonical definition because one salvaged example is rusty.

### Wear and failure

`new wear = old wear + f(load, temperature, RPM, impacts, lubrication, contamination, material, usage time)`.

For each subsystem, use calibrated game coefficients, upper/lower clamps and event-based damage. Separate normal aging from catastrophic damage. Example conditions: clutch slip from torque overrating; tire puncture after sharp rock strike; hot engine and low oil accelerate bearing damage; shock overheating temporarily degrades damping; loose wire causes intermittent no-start. Only simulate high fidelity while relevant/active.

### Physical economics

Part value should be a function of base price, compatibility/scarcity, provenance, residual service life, documented repair quality and demand—not just `price * healthPct`. Example pseudocode:

```text
resale = baseValue * marketSupplyModifier * conditionModifier * qualityModifier
        - inspectionRiskDiscount + verifiedRestorationPremium
```

Prevent exploit cycles: reconditioning costs parts/materials/labor; refinishing alone has a value cap; repeated repair reduces remaining life for some parts; stripping/rebuilding a car should not conjure money. **Use owner-authorized jobs and quotes**, uncertain diagnostics and a transparent profit ledger. Existing game start cash is **$1,500**: early recipes must respect that constraint.

### Part tiers (not a mandatory linear ladder)

`salvaged -> cleaned/serviceable -> refurbished -> performance -> race-proven` is a *condition/usage journey*, not necessarily a universal power ranking. High-end race parts can be expensive, heat-sensitive, short-lived and unsuitable for a daily utility vehicle. A stock part can be ideal for reliability and cost.

---

## 8. DIAGNOSTICS: MAKE MYSTERIES MECHANICALLY SOLVABLE

### Diagnostic pipeline

1. **Customer symptom / player observation** (won't start, stalls when hot, pulls left, clunks on bumps, overheats under load).
2. **Initial checks** (fluid levels, leaks, visual failures, battery state, tire conditions, access constraints).
3. **Hypothesis list** based on symptom and vehicle architecture.
4. **Test choice** constrained by tools/cost/skill/access (battery test, voltage drop, compression, timing, ignition spark, fuel pressure, wheel-play, alignment, brake force).
5. **Evidence update** narrows or rules out faults; distinguish test result reliability from certainty.
6. **Repair plan** of eligible actions plus estimated cost and access chain.
7. **Verification**: repeat relevant test, start/idle/test-drive and compare baseline.

### Examples of cause -> symptom -> useful test

| Fault | Symptoms | Tests | Fixes |
|---|---|---|---|
| Discharged battery | slow/no crank, weak lights | resting/load voltage, charge state | charge; repair alternator/ground if recurring |
| Weak/failed starter | click / no crank despite adequate voltage | starter circuit voltage/current | contacts, solenoid or replacement |
| Faulty ignition component | crank-no-start, misfire | spark test, timing checks | restore ignition path/plug/coil/distributor as equipped |
| Blocked fuel filter | weak pull under load, stall | delivery/pressure or flow test | replace filter, check pump |
| Low compression | rough idle, smoke, hard start | compression/leakdown | rings, valves, head gasket, cylinder/head service |
| Low oil / worn bearings | rattle/knock, rising heat | level/pressure/inspection | correct oil then diagnose wear; teardown if needed |
| Sticking brake | pull, overheated wheel | temp/brake test, caliper movement | caliper/line service or replacement |
| Worn suspension bushing | wander, clunk | shake-down, lift inspection | bushing replacement and alignment |
| Bad wheel balance | speed-dependent vibration | balancer | balancing, inspect tire deformation |
| Incorrect gearing | struggles on hill, limited top speed | gear ratio vs torque/speed curve | ratio/gearbox/differential changes |

**Era-aware tools:** starter Bug-style vehicle should not magically support a modern OBD scan tool; use physical gauges, lamp, multimeter and analog diagnosis. Later ECU-equipped cars may expose sensor/diagnostic codes; they should not replace mechanical investigation entirely.

### No-start functional gate (simplified domain model)

```text
engine_can_run = mechanical_rotation_possible
              AND minimum_compression
              AND valid_fuel_air_delivery
              AND valid_ignition_or_combustion_system
              AND correct_timing
              AND adequate_initial_cranking_or_alternative_start
              AND no_critical_engine_interlock
```

A `true` gate only permits the engine model to attempt start; probabilistic rough/weak starts can be derived from marginal conditions. Distinguish **won't crank** vs **cranks but won't fire** vs **fires but stalls**. This is an essential educational distinction.

---

## 9. ENGINE FAMILIES AND EXPANDABLE TEARDOWN

### Level-of-detail tiers

- **Tier 0 (serviceable exterior):** visible fuel/ignition/cooling, belts, starter, fluids, filter, exhaust.
- **Tier 1 (standard workshop):** valve covers, manifolds, oil system, head gasket, timing, accessible accessory assembly.
- **Tier 2 (engine bench):** head/valves/springs/cams (architecture dependent), pistons, rings, rods, bearings, crank, oil pump, case/block, seals.
- **Tier 3 (expert machine work):** bore/hone/resurface, journal measurements, valve jobs, balancing, bearing clearance, torque sequences, precise tolerances.

This is content progression and a camera/UX mode, not four parallel engine systems.

### Core anatomy glossary within engines

- **Block / crankcase:** structural engine body.
- **Cylinder / bore:** the working chamber where piston reciprocates.
- **Piston / rings:** transfers combustion pressure; seals combustion and controls oil.
- **Connecting rod / big-end bearing:** connects piston to crankshaft.
- **Crankshaft / main bearing:** turns reciprocating motion into rotation.
- **Cylinder head:** houses valves/combustion features, sometimes camshaft.
- **Valve train:** valves, springs, rockers/pushrods/cam followers/cam(s), lifters.
- **Camshaft / timing drive:** schedules valve motion relative to crank.
- **Head gasket / sealing surface:** seals head to block on applicable engines.
- **Intake / throttle / carburetor or injectors:** controls fuel-air mixture.
- **Spark plug / coil / distributor or ECU:** ignition on spark-ignition engine.
- **Oil pump / pickup / sump / filter:** lubrication circuit.
- **Water pump / radiator / thermostat:** liquid cooling where fitted.
- **Fan / oil cooler / shrouding:** air-cooled engine heat management as fitted.
- **Exhaust manifold / headers / muffler:** exhaust routing and restriction.
- **Clutch / flywheel:** transmits engine power to manual gearbox.
- **Turbocharger / supercharger:** forced induction; requires supporting cooling/fueling/tuning.

**Starter engine proposal:** one fictional rear-mounted naturally aspirated, air-cooled flat-four with two heads, carbureted fuel delivery and simple distributor ignition. This is **not** a locked spec; verify against the actual modeled car and existing game code. No use of real automaker badges or proprietary naming.

### Swaps: three separate systems

1. **Direct replacement:** same mount interface, same powertrain system, no structural changes.
2. **Compatible-family swap:** differences in displacement, power, cooler/exhaust/fueling/ECU require additions; mounts sometimes adapter kit.
3. **Custom transplant:** measurable bay clearance, altered mounts, custom gearbox/bellhousing, clutch, driveshaft/CV, suspension capacity, cooling and fuel system, exhaust path, battery/alternator demand, ECU or ignition.

**Swap acceptance must be transactional.** Show a bill of materials and blockers, allow buying in stages, and do not destroy the old vehicle config. `Can mount` does not mean `can operate`.

### Engine building learning loop

Inspect block/case -> strip/clean -> measure -> choose repair vs replacement -> lay out internal parts -> assemble correct dependencies -> seal/gasket -> connect ancillaries -> add fluids -> priming/initial crank -> first fire -> monitor temperature/pressure/noise -> tune and test. Use exploded-view instructional overlay, but never mutate the domain state merely by moving a camera slider.

---

## 10. DRIVETRAIN, SUSPENSION, WHEELS, BRAKES, AND OFF-ROAD UPGRADES

### Drivetrain

Parts: clutch/flywheel or torque converter, transmission/transaxle, gear ratios, final drive/differential, transfer case, driveshaft, universal joint, CV axle, axle shafts, hubs, lockers and limited-slip internals. A change must alter **wheel torque, vehicle speed at RPM, traction distribution, efficiency, wear or reliability**. Include mechanically possible but poor combinations (too-tall gears, power > clutch rating, excessive driveshaft angle).

### Suspension

Relevant types: MacPherson strut, double wishbone/short-long arm, solid axle, trailing arm, torsion bar, leaf spring, coil-over, air spring, long-travel/bypass shocks. Parameters: spring rate, preload, damping compression/rebound, travel/bump stop, geometry, caster/camber/toe, roll center (advanced), ride height, control arm strength, unsprung mass. Off-road: bump stops, limit straps, shock fade, articulation and CV-angle limit. Not all parts expose every adjustable parameter.

### Wheels, tires and brakes

Tire: diameter, width, aspect ratio/sidewall, rim diameter, load rating, tread type, compound, pressure, traction-versus-surface table, wear, temperature, puncture resistance. Rim: diameter/width/offset, bolt pattern, center bore, brake clearance. Brake: effective torque, heat capacity/cooling, pad grip, balance, hydraulic integrity. Changes should affect stopping distance and fade, with no fabricated promises of real-world accuracy.

### Baja-specific off-road upgrade dependencies

| Upgrade | Gains | Cost/trade-offs & blockers |
|---|---|---|
| Lift kit | ground clearance | CG/rollover risk, shock/CV/line geometry, alignment |
| Long-travel arms | wheel travel, rough-terrain grip | width/track, mounting, steering links, shocks, brake line length |
| Mud/sand tires | traction on target surface | drag, noise, pavement grip, gearing, mass, clearance |
| Larger tires | clearance/obstacle rollover | effective gearing taller, inertia, brake capacity, fender clearance |
| Skid plate | impact protection | weight, ground clearance, access, heat retention |
| Roll cage | occupant/structural protection | weight, space, welding, inspection |
| Snorkel | elevated intake inlet | only useful if sealing, electronics, exhaust and other limits permit; **not waterproofing** |
| Differential locker | traction when wheels unload | steering trade-off and driveline load |
| Winch / recovery kit | self-recovery capability | power draw, mounting strength, mass |
| Auxiliary fuel | range | mass, center of gravity, packaging and fire/connection safety |
| Performance engine | power/torque | heat, fuel use, clutch/gearbox/axle loads |
| Cooling improvements | sustained thermal capacity | space, airflow, power draw and cost |

### Upgrade fairness

All parts should be buildable if physically feasible, not every combo. Show **Fit / Fit with modifications / Cannot fit** and explain every required modification. Data-driven interfaces make it possible to add many new vehicles without writing custom installation code for each one.

---

## 11. VEHICLE PERFORMANCE & PHYSICS: CONNECT THE GARAGE TO THE ROAD

### Architecture: mechanical solver -> vehicle aggregate -> physics bridge

1. **Mechanical subsystem solver** computes effective engine torque, cooling margin, fluid failures, gear selection, final drive, clutch/slip, axle drive split, braking capacity, wheel/tires and suspension properties.
2. **Vehicle aggregate builder** composes numbers for mass/center of mass, wheel radius, driven-wheel distribution, torque curve, gearing, braking force, suspension stiffness/damping, traction surfaces.
3. **Physics bridge** sends aggregate values to live driving model. Rapier provides a 3D raycast vehicle controller, but it uses a chassis rigid body and raycast wheels, not per-part flexing soft-body deformation. This is a good starting point, **not an instant BeamNG replacement**.
4. **Telemetry** samples speed, RPM, slip, wheel contact, suspension compression, temperature, oil pressure, fuel, consumed energy, damage events. On return to garage, condition and diagnosis use the same persisted part instances.

### Useful physical relationships (illustrative, not a validated car physics model)

```text
power_kW ≈ torque_Nm × RPM / 9549
wheelTorque_Nm ≈ engineTorque × selectedGearRatio × finalDriveRatio × drivelineEfficiency
wheelForce_N ≈ wheelTorque_Nm / tireEffectiveRadius_m
availableTraction_N ≈ normalLoad_N × tireSurfaceFrictionCoefficient
```

Clamp drive force to available traction and model slip. Real suspension/body dynamics are significantly more complex; tune coefficients with known targets/test tracks rather than treating the formulas alone as a simulator.

### Three kinds of damage

- **Visual/cosmetic:** dirt, chips, dents, scratches; can accumulate cheaply.
- **Structural/component:** bent mount, cracked skid plate, damaged radiator, punctured tire, oil pan strike; persistent service required.
- **Operational:** overheated brakes, hot shock fade, fuel starvation, low battery; may recover partially after service/cooling but can cause wear.

**Physics performance constraint:** when driving, do NOT instantiate 300 separately simulated crankshaft bolts and pistons. Render visible assemblies; feed functional aggregates into one vehicle physics model and update persistent health events at controlled frequency. In workshop, precise interaction and detached part handling can use independent rigid bodies where needed.

### Test courses and evaluation

- Static tests: crank, idle, charge, leak, brake, runout, ride-height clearance.
- Micro test loop: start -> drive 100 meters -> rough patch -> small hill -> brake test -> return.
- Later: whoops, sand, rock, muddy climb, water crossing (when mechanically modeled), dunes, desert rally, nighttime lighting test.
- Show **baseline vs after** for power/torque, speed, stopping distance, hill grade pass, tire slip, average temp, suspension travel, damage and wear. Never invent telemetry results; compute from actual runtime events.

---

## 12. CUSTOMIZATION, FABRICATION, AND VISUAL CONDITION

### Four types of customization

1. **Appearance:** paint, patina, body panels, fenders, flares, roof/hood, interior, lights, stickers/decals, wheel finish, tire tread, exhaust outlet.
2. **Mechanical:** engine/drivetrain/brakes/suspension/tires/cooling/electrical.
3. **Utility/off-road:** cage, racks, recovery gear, tools/spares, tanks, lights, armor, winches.
4. **Fabricated geometry:** cut/shape/weld brackets, cages, frames, custom mounts, panels; ideally use **parametric modules and predefined hardpoints** rather than unrestricted CAD initially.

### Fabrication pipeline (later phase)

Design -> choose materials -> fixture/measure -> cut/bend/print template -> join/weld -> inspect dimensions -> optional destructive/reliability test -> mount -> field test. Inputs include material grade, dimensions and wall thickness, shop skill, fixture accuracy, weld quality. Output: new **part instance with its own ID**, mesh/appearance, mounting interfaces, mass/strength specs and provenance `fabricated`. The game must not claim a weld is safe merely because it looks neat.

### Cosmetic materials / art states

Retain project palette: sand `#C4A574`, clay `#A46A4B`, sage `#778571`, graphite `#353B40`, cream `#E5DDD0`, orange `#DC652D`. Starter car: faded blue with primer-gray fender, believable grease, rust, mismatched salvaged pieces. Build parameterized material layers: paint base, oxidized paint, scratches, surface rust, grease, soot, heat marks, powder coat and cleaned metal. Cosmetic dirt can change visually without faking structural failure.

### Recommended unique feature

**Vehicle build journal.** Photograph/record before-and-after, part origin, service log, failures, setup notes and best test runs. A salvaged suspension arm has a story; a swapped differential has a paper trail. Give players a way to compare setups and restore previous tune configurations **without automatically refunding consumed parts**.

---

## 13. DATA ARCHITECTURE — TYPESCRIPT / R3F / BROWSER

Keep data and rule engines in plain TypeScript modules, independent of React and three.js. UI issues *commands*; domain engine validates and produces events; 3D renderer observes the resulting immutable/persisted state. **Never treat GLB node presence as the source of vehicle truth.**

### Entity boundaries

- `PartDefinition` = shared catalog specification (immutable, versioned).
- `PartInstance` = unique owned physical item with condition/history.
- `VehicleBlueprint` = platform geometry, hardpoints, mount slots, service access graph and allowed capabilities.
- `VehicleInstance` = identity, owned installed parts, tuning, history and aggregate stats.
- `AssemblyInstance` = independently detachable assembly with child part instances.
- `ConnectionInstance` = what is bolted/plugged/connected and its condition.
- `ToolDefinition`, `WorkbenchDefinition`, `RecipeDefinition`, `WorkOrder`, `DiagnosisCase`, `EconomyLedger`.
- `GameEvent` = completed state transition used for audit/save and test assertions.

### Starter type contracts (design example, adapt to repo)

```ts
type Id = string;
type SystemTag =
  | 'structure' | 'body' | 'engine' | 'drivetrain' | 'suspension'
  | 'steering' | 'brakes' | 'wheels' | 'fuel' | 'electrical'
  | 'cooling' | 'interior' | 'accessory';

type InterfaceSpec = {
  id: string;                // e.g. engine_mount_rear_A, wheel_hub_4x130
  kind: 'mechanical' | 'electrical' | 'fluid' | 'control';
  tags: string[];
  maxLoadN?: number;
  voltageV?: number;
  dimensionsMm?: [number, number, number];
};

type PartDefinition = {
  id: Id;
  version: number;
  displayName: string;
  system: SystemTag;
  massKg: number;
  baseValue: number;
  interfaces: InterfaceSpec[];
  capabilityTags: string[];
  toolTagsForService: string[];
  repairRecipeIds: Id[];
  assetId: Id;               // mesh/LOD/anchors external to logic
  parameters: Record<string, number | string | boolean>;
};

type Condition = {
  wearPct: number;
  integrityPct: number;
  corrosionPct: number;
  contaminationPct: number;
  calibrationPct: number;
};

type PartInstance = {
  id: Id;
  definitionId: Id;
  definitionVersion: number;
  condition: Condition;
  location:
    | { kind: 'mounted'; vehicleId: Id; slotId: Id }
    | { kind: 'inventory'; storageId: Id }
    | { kind: 'bench'; benchId: Id }
    | { kind: 'world'; worldEntityId: Id };
  provenance: 'new' | 'salvaged' | 'refurbished' | 'fabricated';
  modifications: Id[];
  serviceHistoryEventIds: Id[];
};

type MountSlot = {
  id: Id;
  system: SystemTag;
  required: boolean;
  acceptsInterfaceTags: string[];
  accessBlockerSlotIds: Id[]; // conceptual: per-blueprint overrides possible
  transformAnchor: string;    // named GLB node/empty
  requiredConnectionIds: Id[];
};

type FastenerGroup = {
  id: Id;
  fromSlotId: Id;
  toSlotId: Id;
  type: 'bolt' | 'nut' | 'clamp' | 'clip' | 'weld' | 'adhesive';
  count: number;
  loosenedCount: number;
  toolTag?: string;
  torqueNm?: number;         // specified only for authored fictional hardware
  installed: boolean;
};

type VehicleBlueprint = {
  id: Id;
  version: number;
  name: string;
  slots: MountSlot[];
  baseMassKg: number;
  supportedSystemTags: SystemTag[];
};

type VehicleInstance = {
  id: Id;
  blueprintId: Id;
  partBySlot: Record<Id, Id | null>; // slot -> unique part instance
  fastenerGroups: FastenerGroup[];
  tuning: Record<string, number>;
  mileageKm: number;
  worldPose: { position: [number, number, number]; rotation: [number, number, number, number] };
};

type Blocker = { code: string; message: string; targetSlotId?: Id };
type ActionResult =
  | { ok: true; events: GameEvent[] }
  | { ok: false; blockers: Blocker[] };

type GameEvent = {
  id: Id;
  vehicleId?: Id;
  type: string;
  occurredAtGameTime: number;
  payload: Record<string, unknown>;
};
```

**Production caveat:** these are a starter *shape*, not production-complete types. Real code must model connector instances, part dimension envelopes, fluid networks, inventory reservations, field migration and subassembly handling. An ID is never silently reused across salvaged parts.

### Example install/remove command layering

```text
UI (React) -> commandService.requestRemove(partId, context)
               -> serviceAccess.check(accessGraph)
               -> attachments.check(fastenerGroups, connectors, support)
               -> inventory.checkDestination(tray/storage)
               -> transactionalWorldUpdate(all references + ledger)
               -> publish VehiclePartRemoved event
               -> render adapter update + auto save queue
               -> UI shows actionable feedback
```

`requestInstall` additionally uses `compatibilityService`, `clearanceService`, `connectionService`, `fastenerService`, `tuningInvalidation` and `vehicleAggregateBuilder`.

### Illustrative compatibility algorithm

```ts
function canInstall(candidate: PartDefinition, slot: MountSlot): Blocker[] {
  const blockers: Blocker[] = [];
  if (!candidate.interfaces.some(i =>
    i.kind === 'mechanical' &&
    i.tags.some(tag => slot.acceptsInterfaceTags.includes(tag))
  )) {
    blockers.push({ code: 'MOUNT_MISMATCH', message: 'Mount interface incompatible' });
  }
  // Also call separate geometric clearance, load, network and required-upgrade checks.
  return blockers;
}
```

**Warning:** matching one interface tag is **necessary, not sufficient**; clearance, bolt pattern, drivetrain location, electric/fuel routing, strength and other cross-system constraints remain.

### Persistence and data lifecycle

- Prototype: IndexedDB (preferred for structured persistent gameplay state) or existing storage system; preserve repo conventions. Save **IDs/spec versions/instances**, not GLB scene JSON.
- Future Cloudflare D1/R2 if desired: sync authoritative owned inventories and vehicle snapshots, server validation if economy/multiplayer is introduced.
- Schema migrations are mandatory as part definitions evolve. Unknown definition -> preserve save data as orphan record + display recoverable placeholder, never delete owned item.
- Atomic operations and immutable snapshots prevent money duplication, vanishing parts and double-mounted engines.
- Snapshot at garage exit and major operation; event log helpful for undo/debugging but not necessary for every render frame.
- Record units explicitly: `kg`, `mm`, `Nm`, `kPa`, `L`, `deg`, `rpm`, `km`. Convert in UI, not in catalog.

### Suggested module layout (adapt, don't overwrite repo)

```text
src/game/vehicle/
  catalog/{parts,engines,suspension,blueprints}/
  domain/{types,inventory,assemblies,connections,commands}/
  rules/{access,compatibility,fitment,serviceRecipes,diagnostics}/
  simulation/{engine,drivetrain,electrical,fluids,wear,aggregator}/
  physics/{vehicleAdapter,telemetry}/
  persistence/{schema,migrations,saveLoad}/
  tests/{fixtures,access.test,fitment.test,repair.test,save.test}/
src/components/garage/
  VehicleWorkbench.tsx
  AssemblyExplorer.tsx
  PartInspector.tsx
  WorkOrderPanel.tsx
  BenchInterface.tsx
  VehicleDiagnostics.tsx
src/three/
  VehicleAssembler.tsx
  WorkshopCamera.tsx
  PartSelectionLayer.tsx
  AssetRegistry.ts
assets/vehicles/{vehicle-id}/...
```

---

## 14. ART/ASSET CONTRACT FOR MODELS, GLB AND MESHy

### Critical asset rule

A single beautiful, merged car mesh cannot support physical tear-down. Serviceable parts need **separate meshes or separately addressable nodes**, with explicit anchors/hardpoints. If AI 3D generation produces only a single combined mesh, treat it as a shell/placeholder and manually segment/author parts in Blender before claiming serviceability.

### Standard export contract

- **Coordinates**: choose one game-wide convention and enforce it; document chassis forward, right, up and meters. Never silently rotate individual assets in runtime.
- **Origin**: vehicle at chassis reference point; parts at authored pivot/installation transform; no random offsets.
- **Nodes**: stable semantic names such as `chassis`, `engine_case`, `ignition_coil`, `wheel_FL`, `suspension_RR`, `anchor_engine_mount_L`, `anchor_engine_mount_R`, `anchor_wheel_FL`.
- **Parts and LOD**: high service-visible mesh when close, simplified driving mesh at distance. Body/interior/colliders separated.
- **Metadata**: a sidecar JSON maps `partDefinitionId -> nodeName/anchorName`, attach offsets and service visibility groups. Never infer gameplay behavior from mesh names alone.
- **Material slots**: painted body, metal, rubber, glass, rust/dirt/wear masks separate and consistent.
- **Colliders**: author simplified convex/capsule/box shapes or proxies; don't use each decorative bolt as a collider.
- **Asset pipeline**: GLB/glTF 2.0, texture optimization, optional Draco/Meshopt/KTX2 as supported by current loader. Validate node presence and bounding box.
- **Optimize**: reuse geometry/materials, instance repeated bolts where appropriate, avoid hundreds of draw calls in drive scene, lazy-load high-detail engine components only during service.

### Sample asset request for a 3D artist / generator

> Create an original **fictional** air-cooled rear-mounted flat-four engine assembly for a grounded 1970s-style desert car restoration game. Realistic proportions, clean topology, no real-world car marks or text. Separate **engine case, two cylinder heads, valve covers, intake/carburetor, fan housing, pulley, ignition distributor, alternator, exhaust manifolds, oil sump/cover, flywheel, and mounting interfaces** into separately named movable objects. Provide installation pivots and engine stand mounting point. Textures: used dusty metal, oil grime, faded painted tin, mild corrosion. Use GLB 2.0 with named nodes and a manifest listing every removable piece. **If you cannot provide separated editable meshes and anchors, say so rather than claiming the model supports disassembly.**

### Starter mesh inventory

Minimum MVP: exterior shell with opening rear bay, chassis, battery, distributor, ignition coil, spark wires (may be simplified logical connectors), starter, fuel filter/line, engine fan belt, air cleaner, carburetor, pulley, fuel tank, four wheels, hand tools, repair bench, battery charger, tray, basic gauges. Later: individual engine internals, complete suspension, drivetrain and all underside fasteners.

---

## 15. FIRST PLAYABLE VERTICAL SLICE: GRANDMA'S CAR

**Purpose:** prove a closed causal loop from diagnosed fault to repaired drivable vehicle, not “just click to rebuild a car.”

### Suggested story-compatible first case (PROPOSED)

The old Bug-style car has sat since 2009. Player discovers a low/discharged 12V battery, aged ignition component and degraded fuel delivery. A first start requires diagnosis and modest service using garage tools; the old motor should be capable of running without requiring a total engine rebuild on day one. Later optional rebuilds remain available. Exact failure set should match existing canon/story and agreed economy.

**Starter budget:** $1,500. Include consumables/tools/service costs so players do not need purchases exceeding the starting wallet. Some existing garage tools can be inherited and visibly worn.

### Player sequence with software acceptance tests

1. **Open engine bay:** rear cover visually opens, exposes named systems. Cannot click through closed cover unless inspection mode explicitly enables ghost view.
2. **Inspect battery:** see charge vs battery health as distinct readings; log test.
3. **Attempt crank:** no/weak crank is explained through system voltage rather than scripted generic failure.
4. **Remove battery:** detach accessible mount and terminal connectors, transfer same instance to tray.
5. **Service at charger:** charge value increases, battery health does not magically improve. Update history and time.
6. **Reinstall/reconnect:** a disconnected terminal keeps starting impaired; tighten/attach properly.
7. **Inspect ignition/fuel:** locate one additional fault through real tests. Player can repair or replace with a compatible stock item.
8. **First start:** engine solver checks relevant conditions; sound/idle feedback tied to state.
9. **Short drive:** mass and basic drivetrain/wheel values influence movement; record temperature, voltage and distance.
10. **Return, inspect and save:** repair ledger, installed parts, battery charge, mileage, time/cash and test results persist after reload.

### Definition of done

- No part can simultaneously exist both on vehicle and inventory.
- A removed required part disappears from the correct 3D mount, and vehicle functionality reflects its absence.
- Attempting blocked removal returns exact named blockers.
- An incompatible replacement is rejected with a reason before consuming money.
- Charging does not repair health or structural wear.
- A disconnected lead produces the expected electrical problem.
- A successful repair allows a **computed** start/drive, not an unconditional narrative toggle.
- Save/load retains all state without duplication.
- All errors are recoverable; no silent deletion, softlock or negative inventory.
- Basic interactions work with mouse and keyboard on a midrange desktop browser; keyboard navigation for menus; no inaccessible tiny fasteners.

---

## 16. NEXT PLAYABLE SLICES (ONE AT A TIME)

### Slice B — The wheel and brake corner

Jack/lift -> remove wheel -> inspect disc/pads/caliper -> remove and service/replace -> tire shop/balancer -> install -> torque -> brake/wheel-speed test -> log stopping/vibration difference. This validates nested assemblies, side-specific fitment and safety checks.

### Slice C — Suspension rebuild

Inspect worn bushings -> detach arm/shock/spring -> hydraulic press or spring compressor -> replace and install -> alignment -> off-road test -> compare travel/steering/slip. Proves conditional tool use and handling effect.

### Slice D — Engine on stand

Extract fictional flat-four -> separate peripherals, heads/case internals as authored -> clean/measure -> replace failed items -> assemble with required seals/sequence -> reinstall -> first fire. Proves deep dependency chains and separate engine assembly editing scene.

### Slice E — Custom off-road conversion

Lift, tires, shocks, skid, diff gearing -> propose dependent parts -> buy/salvage -> fit -> weigh vehicle -> test in sand/rocks -> inspect and refine. Proves build creativity/physics trade-offs.

### Slice F — Fabrication and cross-vehicle reuse

Cut/fixture/weld custom bracket (authored parametric family), add interfaces, validate load/clearance, install recovered part from donor vehicle. Proves compatible slot framework beyond one vehicle.

---

## 17. BUILD PHASES AND RECOMMENDED ORDER

| Phase | Deliverable | Prerequisites / exit gate |
|---|---|---|
| **0. Repo audit** | list present models and game systems, risk gaps and baseline screenshot/perf | source of truth preserved; tests/build existing |
| **1. Domain kernel** | definitions, instances, mount/access graphs, inventory, atomic install/remove, deterministic IDs, save/load | headless unit tests pass without 3D |
| **2. Functional starter** | battery/fuel/ignition subsystem, inspection, simple charger/repair, first start | no-start->repair->start->save loop works |
| **3. 3D UX** | separate meshes, camera anchors, actionable highlights, tool/tray feedback, part explorer | visual and logical state always match |
| **4. First test drive** | chassis/wheels aggregate physics, telemetry and condition persistence | repaired car drives and comes back to garage |
| **5. Wheel/suspension systems** | tire mount, balancer, spring compressor, brake service, alignment | measured handling/braking trade-offs |
| **6. Full engine mechanics** | engine stand, internal parts, clear access graph and realistic dependencies | tear down and rebuild with proper failure states |
| **7. Vehicle breadth** | data-driven 2nd/3rd vehicle blueprints, shared parts, donor interchange | no copy-paste per-vehicle logic |
| **8. Custom swaps and fabrication** | upgrade BOM, adapters, custom mount/clearance, workshop quality | major swaps have honest constraints |
| **9. Economy/business depth** | customer work orders, sourcing, valuation, staff, repairs, progression | jobs priced and reliably completable |
| **10. Extended systems** | diesel/EV/UTV/trailer support, deep wiring, paint, dyno, advanced weather/wear | only as content and architecture justify |

**Do not set a deadline or imply all phases are a single sprint.** Use every phase to retire technical risk before widening content.

---

## 18. QA / TEST MATRIX

### Domain property tests

- Conservation: owned item counts invariant across `remove -> store -> install`.
- No duplicate locations/vehicle slots for same part instance.
- Every installed mandatory slot has compatible physical interface(s).
- Access blockers form non-cyclic *removal prerequisite* graph; functional networks may cycle legitimately.
- Removing any critical component invalidates the appropriate functional capability.
- Battery charging alters charge, never accidentally battery health.
- Discs below authored minimum thickness reject resurfacing.
- Custom engine swap without required mount/electrical/cooling support cannot become running.
- Stock vehicle can always be returned to an operable configuration if needed parts are available.
- Inventory/money operations atomic; insufficient funds do not partially consume items.
- Save/load migration preserves ownership and part history.

### End-to-end tests

`inspect -> diagnose -> remove -> bench -> reinstall -> test -> drive -> damage -> diagnose -> save -> load -> verify state`.

### Performance & browser constraints

- Treat consistent 60 FPS at a representative midrange desktop as an **aspirational profiling target**, not a benchmark already achieved.
- Profile draw calls, triangle count, texture memory, WebGL context loss, GC, memory leaks and loading peaks.
- Keep repeated small bolts as batched/instanced renderings with stable selection proxies. Render only service-visible details up close.
- Avoid per-frame React component state churn; update visuals in R3F frame loop and write domain data at controlled simulation/event intervals.
- Test slow devices and long saves with 2–5 vehicles, many inventory instances, and hundreds of work-order events.
- Check no asset assumes real brands/logos.

### Risks and mitigations

| Risk | Response |
|---|---|
| Hundreds of bespoke part meshes per car | share part libraries, reusable mounts, subassemblies, lower LODs |
| “All vehicles” impossible to finish | universal schema + sequential content families |
| Wrench-level physics takes too long | tiered logical fidelity, aggregate dynamics, optional expert detail |
| Impossible assembly/deadlocks | validate removal graph and recoverable state; diagnostics for blockers |
| Arbitrary part fit | explicit interfaces + geometry checks + required upgrades |
| Repair exploits | material costs, life limits, item ownership events |
| AI generated merged meshes | demand separable assets/Blender segmentation; do not fake detachable internals |
| Fastener fatigue/friction | service presets, action batching, hints, accessibility |
| Tuning numbers don't affect driving | single aggregate solver + telemetry assertion tests |
| Save corruption across content updates | schema versions, migrations, orphan placeholders and backups |

---

## 19. MECHANIC AND GAME-SYSTEM TERMINOLOGY

**Assembly / subassembly:** group of parts managed as a unit. **Hardpoint / mount:** authored attachment location. **Interface:** standardized connection geometry or capability. **Fitment:** whether geometry/connection/load requirements are met. **Clearance:** free space allowing installation/motion. **Interference:** collision or working-range conflict between components. **Tolerance:** permitted dimensional or calibration range. **Serviceability:** whether and how a component can be accessed/repaired. **Consumable:** item depleted during service (oil, gasket, welding rod). **Fastener:** bolt, nut, screw, clip or clamp. **Torque (Nm):** turning moment applied by a wrench or generated by an engine. **Torque sequence:** order in which multiple bolts are tightened. **Thread pitch:** spacing between threads. **Preload:** initial compression/tension in spring or bolt. **Runout:** deviation of rotating surface from true alignment. **Backlash:** clearance between meshed gears. **Alignment:** steering/wheel geometry adjustment. **Camber:** wheel lean relative to vertical. **Caster:** steering-axis inclination seen from the side. **Toe:** wheel pointing in or out viewed from above. **Ride height:** body/chassis clearance at rest. **Articulation:** relative wheel movement over uneven ground. **Droop / bump:** wheel travel at extension / compression. **Spring rate:** force per displacement. **Damping:** resistance to suspension motion. **Unsprung mass:** mass not fully supported by suspension springs. **Bump stop:** travel limiter near compression end. **CV joint:** constant velocity driveline joint. **U-joint:** universal joint in rotating shaft. **Differential:** allows/controls left-right wheel speed difference. **Limited-slip differential (LSD):** biases torque when traction differs. **Locker:** locks differential action when engaged. **Final drive:** last major reduction ratio at driven axle/transaxle. **Transfer case:** splits drive to axles in suitable 4WD systems. **Transaxle:** combined transmission and axle final-drive arrangement. **Gear ratio:** relative input/output rotational speeds. **Clutch slip:** torque transmission loss when clutch cannot hold. **Compression:** pressure-sealing capability of engine cylinders. **Leakdown test:** measures cylinder sealing losses. **Ignition timing:** spark timing relative to piston position. **AFR:** air-fuel ratio. **ECU:** engine control unit. **Wiring harness:** bundled vehicle electrical conductors/connectors. **Ground:** electrical return/reference path. **Voltage drop:** electrical loss across cable/connection under load. **State of charge (SoC):** stored battery energy level. **State of health (SoH):** battery's remaining condition/capacity. **Alternator:** generator that powers system and charges battery when driven by engine. **Thermal fade:** loss of performance under heat (e.g. brakes/dampers). **Cavitation:** vapor bubble formation in a fluid pump/damper. **Oil starvation:** inadequate lubricant supply under use. **Bearing clearance:** designed gap between bearing and journal. **Bore / hone:** size/finish a cylinder. **Deck / resurface:** machine flat sealing surface. **Seized engine:** internal resistance prevents normal rotation. **Carburetor:** mixes fuel and air mechanically. **Injector:** meters fuel through controlled nozzle. **Distributor:** routes spark energy in applicable older ignition systems. **Flat-four / boxer:** opposed cylinders horizontally. **Inline / V engine:** cylinders in single row / angled banks. **Intercooler:** cools compressed intake air. **Spool:** turbocharger acceleration to operating boost. **Dyno:** measures engine/wheel output under test. **BOM:** bill of materials for build/repair. **VIN-like ID:** fictional persistent vehicle identity. **Provenance:** origin and prior history of a part. **Serialization:** converting state to saved data. **Migration:** upgrade older save format to current definitions. **Event log:** chronological domain operations. **Vertical slice:** one fully working end-to-end experience. **Data-driven:** systems configured through definitions rather than special-case code. **LOD:** visual level of detail. **GLB:** binary form of glTF 3D asset. **R3F:** React Three Fiber (React renderer for three.js). **Raycast:** query from origin along direction to detect surfaces/objects. **Rigid body:** physics entity with mass/collision and transform. **Soft-body:** deformable physics representation (not included by default). **Telemetry:** recorded operating measurements. **Deterministic:** same input state/actions yield same calculated output. **Idempotent:** repeat command does not duplicate unintended effects. **Atomic transaction:** operation either succeeds fully or changes nothing.

---

## 20. DESIGN QUESTIONS TO RESOLVE THROUGH FORGE AFTER FIRST SLICE

These are *not blockers* to beginning the starter loop:

1. Is the grandma car's power unit the proposed air-cooled flat-four or an existing in-project alternate?
2. Which service interactions are physical mouse manipulation vs timed/context actions by default?
3. Is “Expert mode” a setting or unlockable difficulty?
4. How much of each engine family receives detailed internal 3D modeling? (Suggested: deep fidelity for distinct families, reuse systems elsewhere.)
5. How are custom fabrication failure/quality and service safety represented without unearned realism claims?
6. Are high-voltage EVs and complex diesel injection near-term or expansion content?
7. Which surface types/test tracks must be physically validated before balance decisions?
8. Are customer-repaired vehicles fully instanced with history after job completion, or compacted into summary data outside garage?

---

## 21. SOURCE INDEX (PRIMARY / DOCUMENTED / PLAYER FEEDBACK)

**Primary game pages and official docs**

1. CMS 2021 Steam publisher description: https://store.steampowered.com/app/1190000/Car_Mechanic_Simulator_21/
2. Wrench Steam: https://store.steampowered.com/app/936720/ and developer/community news: https://steamcommunity.com/app/936720/
3. My Summer Car Steam: https://store.steampowered.com/app/516750/My_Summer_Car/
4. My Garage Steam: https://store.steampowered.com/app/1578390/My_Garage/
5. Revhead Steam: https://store.steampowered.com/app/589760/Revhead/
6. Offroad Mechanic Simulator Steam: https://store.steampowered.com/app/1387500/Offroad_Mechanic_Simulator/
7. Automation Steam: https://store.steampowered.com/app/293760/
8. Mon Bazou Steam: https://store.steampowered.com/app/1520370/Mon_Bazou/
9. BeamNG official vehicle configuration/parts selector: https://www.beamng.com/game/support/portal/gameplay/veh-config/
10. Rapier vehicle controller (JS): https://www.rapier.rs/docs/user_guides/javascript/character_controller/#vehicle-controller
11. React Three Fiber performance guidance: https://r3f.docs.pmnd.rs/advanced/pitfalls and https://r3f.docs.pmnd.rs/advanced/scaling-performance
12. Three.js glTF loader: https://threejs.org/docs/pages/GLTFLoader.html
13. Zustand store docs: https://zustand.docs.pmnd.rs/reference/hooks/use-store

**Community documentation and player research (not official publisher mechanics specs)**

14. CMS 2021 repairable parts/bench guide: https://steamcommunity.com/sharedfiles/filedetails/?id=2599847138
15. CMS 2021 tools/wiki: https://car-mechanic-simulator-2021.fandom.com/wiki/Tools
16. CMS player request: inventory/repairability, bulk repair, extra stand: https://www.reddit.com/r/CarMechanicSimulator/comments/panmxo/qol_changes/
17. CMS player request: shopping-list and tire-spec UI: https://www.reddit.com/r/CarMechanicSimulator/comments/qsork7/new_player_here_on_ps5_i_have_one_gripe_with_the/
18. My Summer Car discussion of fidelity vs real mechanic practice: https://www.reddit.com/r/MySummerCar/comments/1qewxup/for_people_who_have_mechanical_experience_with/

**Source fidelity note:** Sources describe what existing games advertise, document or players experience; the numerical/technical design recommendations above are proposals for Baja. This document is not a real automotive service manual and contains no authoritative service torque, capacity or safety-critical fabrication specifications.

---

## 22. FINAL DEVELOPMENT RULE

> **Build one real functioning system before building fifty decorative ones.** A player should be able to remove a real part, understand why it failed, actually service it, put *that same part* back in the car, start it, and feel the difference when driving. Once this loop is trustworthy, expand to every engine, vehicle type, garage station, customization tool, and race build through reusable data and asset contracts.
