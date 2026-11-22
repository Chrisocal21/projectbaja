# PROJECT: BAJA — DRIVING MECHANICS, OFF-ROAD PHYSICS & VEHICLE FEEL

**Self-contained game research + engineering design + Claude/VS Code implementation handoff**  
**Prepared:** November 22, 2026  
**Status:** RESEARCH + PROPOSALS. This is **not** permission to overwrite established canon or existing working code.  
**Scope:** Driving inputs, handling, wheels, tires, suspension, motors, gears, differentials, off-road terrain, weather, damage, towing, recovery, AI traffic, testing, accessibility, physics architecture, save systems, performance and acceptance tests.  
**Companion:** `PROJECT_BAJA_VEHICLE_MECHANICS_RESEARCH_HANDOFF.md` (existing vehicle teardown/repair catalog); `PROJECT_BAJA_WORLD_PROPERTY_BUSINESS_HYBRID_RESEARCH_HANDOFF.md` (property, salvage, businesses, construction, utilities). **This file can be read on its own.**

> **Design north star:** Project: Baja must make the player *feel the vehicle they built*. Bigger tires genuinely change gearing and clearance; a broken damper makes the suspension bounce; a welded cage adds protection and weight; missing power or a bad fuel pump can strand a car; wet clay feels different from hardpack; a misjudged landing might damage a suspension arm. Every physical effect should connect to the exact persistent part, setup, repair or environment that caused it.

---

## 0 — IMMEDIATE INSTRUCTIONS FOR CLAUDE IN VS CODE

1. **Audit the repository before writing or replacing code.** Report current render, R3F/Three, Rapier/other physics, terrain, camera, input, vehicle state, parts catalog, save format, tests, asset naming, performance constraints. Confirm versions from `package.json`; don't invent imports.
2. **Preserve canon.** Project: Baja, Iron Flats in fictional Baja County, grounded semi-realism, warm Southern California/Baja-style desert. Walt's Garage (repairs/welding, est. 1968) begins neglected, electrical breaker off; 1966 trailer, windmill and water tank. Player starts with **$1,500**, grandma's faded-blue, primer-fender, rounded **1971 Bug-style** starter car, not running since 2009; original brands/logos only. No post-apocalyptic art direction, superhero jumps or oversized cartoon tires.
3. **Preserve mechanics handoff invariants.** Part instances have stable IDs, real condition, ownership and installed slots. The **vehicle assembly and component condition** are the source of truth; driving never maintains a contradictory independent upgrade list. Rebuilding a part changes the physics it controls.
4. **Treat everything below as a proposed architecture** unless it matches an existing locked decision. New driving modes, penalties, failure rates, AI systems and specific control mappings are subject to normal Forge approval.
5. **Start with one tested vertical slice** before building many cars or maps: starter Bug-style vehicle, flat testpad and short 4-surface proving loop; accelerate, turn, brake, climb small bump, detect four wheel contacts, skid on gravel, change tires in garage, measure changed grip, break a suspension part, repair it, verify handling and save/reload.
6. **One simulation authority.** The fixed-timestep simulation updates vehicle dynamic state. React renders read/interpolate that state; React components do not independently integrate vehicle motion or derive vehicle torque from animation frames.
7. **No promise of BeamNG-class soft body.** BeamNG uses node/beam soft-body physics; a browser raycast rigid-chassis setup is a different fidelity class. Begin with functional component damage and detachable/damaged meshes.
8. **Technology correction worth knowing:** Rapier **does provide a JavaScript raycast vehicle controller** (`world.createVehicleController(chassis)`, `addWheel`, `setWheelEngineForce`, `setWheelSteering`, `updateVehicle` in the official docs). It is a *foundation*, not a complete drivetrain/terrain/damage model. Verify whether the installed package/wrapper exposes it before choosing your adapter. [R10]
9. **Present plan + files + tests first.** Build in small verified commits, keep save migrations, and demonstrate real vehicle behavior with logged telemetry.

### Ready-to-paste Claude prompt

> Read `PROJECT_BAJA_DRIVING_PHYSICS_RESEARCH_HANDOFF.md` completely as a research-backed **proposal**. Also inspect the vehicle-mechanics and hybrid-world handoffs if present. First audit the actual repository, identify the current physics library/version and existing driving behavior, and map proposed features to existing code. Do **not** rewrite working systems or change canon. Propose one starter-vehicle driving vertical slice: a physical chassis + four raycast wheels, acceleration, braking, steering, suspension over a bump, four surface materials, a real installed-tire/condition modifier, a repairable suspension fault, a short test route, debug telemetry, save/reload. Show precise files, data ownership, tests and performance measurements before implementing. Use the existing parts catalog as input; do not make a second vehicle inventory. Only advance to gearboxes, diffs, deep mud, towing, damage, AI and dynamic weather after the slice passes acceptance criteria.

---

## 1 — COMPARATIVE GAME RESEARCH (DOCUMENTED MECHANICS VS BAJA ADAPTATION)

The games are references for **design patterns, not source code or proprietary formulas**. Sources at end identify publisher/developer documentation or technical docs. Numeric physics parameters proposed later are **tuning placeholders**, never claims about these games' internal parameters.

| Game | Documented/observed public design | Specific Project: Baja lesson | Do NOT copy/overpromise |
|---|---|---|---|
| **Forza Motorsport (2023)** | Turn 10 describes 8 tire surface sampling points at 360 Hz vs a previous 1 point/60 Hz; compounds and wear; suspension, tire heating, weather and upgrade effects. [R01] | Tires/terrain contact is central. Tune grip, load, braking, wear, temperature and surface transitions; make data-driven vehicle setups comparable. | 360-Hz multi-point simulation across a browser world is **not** our initial target; do not copy undisclosed models. |
| **Forza Horizon 5** | Standard versus Simulation steering and adjustable force-feedback/off-road feel. [R02] | Accessible input filters and assists without falsifying underlying part stats. Players can switch between fun and strict controls. | No license for Forza branding or physics code. |
| **Grand Theft Auto V** | Modding documentation shows the `handling.meta` concept: mass, drag, drive bias, drive force, traction curves, suspension and damage multipliers as vehicle configuration data. [R03] | A compact, designer-readable vehicle handling profile allows fast tuning and diverse vehicle personalities. | GTA values are not real SI units; do not implement GTA formulas as authoritative engineering physics. |
| **DiRT Rally 2.0** | Published game description highlights tire choice, revised off-road handling, surface degradation, damage risk, tuning and co-driver. [R04] | Weight transfer, surfaces, meaningful mistakes, variable road state, damage and route-reading; optional co-driver/rally event modes. | Not all vehicles must have punishing rally-sim handling. |
| **EA SPORTS WRC** | Codemasters describes multi-surface Dynamic Handling System and skill-adjustable driving. [R05] | Separate mixed-surface tuning and player accessibility; rallies can be a later discipline. | Don't invent engine implementation details. |
| **Gravel (Milestone)** | Official description explicitly advertises accessible off-road physics, high-speed racing and varied environments. [R06] | Fun, readable steering and spectacle for casual events. | Don't make grounded Baja vehicles float or recover unrealistically. |
| **SnowRunner** | Publisher documents mud/snow/water, heavy cargo, snorkels, tire upgrades, adjustable ride height, open-world contracts. [R07] | Crawling, terrain resistance, recovery, weight/payload, lower gears, real route planning. | Full physically deforming terrain is a separate, expensive technology problem. |
| **Expeditions: A MudRunner Game** | Publisher showcases portable winch anchors, drones and exploration equipment. [R08] | Recovery tools, scouting, planning and off-road traversal challenges. | Avoid redundant gadget systems that overshadow wrenching. |
| **BeamNG.drive** | Developer explicitly documents proprietary node/beam **soft-body** vehicle physics. [R09] | Localized mechanical damage, plausible collision response, part-based vehicle builds; calibrate expectations. | **Do not** promise or attempt 1:1 soft-body destruction as an initial feature. |
| **Wreckfest / demolition racers** | Destruction racing genre motivates persistent collision/handling consequences. | Crashes should change more than a health bar. | Avoid arcade crashes that total a car every minute. |
| **RoadCraft** | Publisher describes rebuilding roads/bridges using heavy equipment and logistics. [R17] | In a later hybrid-world phase, new routes can be *built* and used to reach more locations. | Don't expand into a full civil engineering game first. |
| **Car Mechanic Simulator / Wrench / My Summer Car / My Garage** | Covered in the companion mechanical handoff. | Connect diagnosed flaws, exact repaired parts, and drivetrain geometry to handling. | No disconnected 'repair +10 speed' abstractions. |

### Chosen original handling identity

**Grounded arcade-simulation hybrid:** the intuitive accessibility of Horizon/GTA/Gravel; the tires, damage and setup consequences of Forza/DiRT; the crawl, traction and recovery satisfaction of SnowRunner; and **mechanical continuity** with the workshop. The vehicle's physical personality must dominate the feel, not an invisible arcade boost. Opt-in driver assists should be available for players who want to enjoy building more than technical driving.

## 2 — DRIVING EXPERIENCE: THE PLAYER'S 30-SECOND TEST

Within 30 seconds of entering a repaired car, the player should notice:

1. Starter motor and engine catch, idle and exhaust sound consistent with engine condition.
2. Pressing throttle increases RPM, develops torque, and produces axle-specific wheel motion.
3. Wheelspin on loose dirt but controlled launch on compacted hardpack.
4. Braking transfers load forward; a worn rear damper or uneven tires are observable.
5. Hitting a bump compresses/rebounds the relevant corners, not a global car-bob animation.
6. Handbrake changes yaw only through affected wheels; the vehicle retains inertia.
7. Turning on clay or gravel produces a **progressive** loss of grip; steering alone doesn't rotate the chassis.
8. Weathered/incorrect tires and poor alignment feel worse than a fresh, well-matched setup.
9. Damage creates a persistent diagnosable consequence, not just visual sparks.
10. Returning to the garage and fixing the actual part restores its specific behavior.

**Priority hierarchy:** controllability > believable feedback > visible upgrades > precise modeling > high-end realism. Fidelity is earned through tests, not adjectives.

## 3 — GAME FEEL CONTRACT: THREE OPTIONAL ASSIST PROFILES

Profiles affect **input processing and safety aids**, not installed parts or raw physics definitions.

| Rule | Casual Explorer | Balanced (default proposal) | Simulation |
|---|---|---|---|
| Steering smoothing | Strong at high speed | Moderate | Minimal; steering ratio still physical |
| Traction control | Optional mild | Optional, on by default | Manual/off unless vehicle equipped |
| ABS | Optional mild | Enabled on equipped builds | Only where parts provide it |
| Stability assistance | Helpful, visible indicator | Limited | Off unless equipped |
| Gear shifting | Automatic | Auto/manual toggle | Manual clutch option |
| Stall / poor starts | Reduced inconvenience | Modeled if enabled | Fully modeled |
| Recovery | Simple tow/garage fallback | Physical recovery + fallback | Recovery emphasized |
| Tire/fuel/damage cost | Adjustable | Designed costs | Optional strict economy |
| Camera | Third-person prioritized | All supported | Cockpit/hood and optional FFB |

**Hard rule:** assists cannot invent traction out of thin air, exceed a sensible force budget or erase mechanical damage. `AssistController` may reduce input or apply restrained yaw correction; it must be telemetry-visible and disabled/adjustable. A real-world car without ABS may receive an optional **gameplay assist** in Casual, but distinguish that from installed hardware.

## 4 — PLAYER CONTROLS, INPUT AND STATE MACHINES

Recommended keyboard defaults (remappable): **W/S** throttle/brake, **A/D** steer, **Space** handbrake, **E** enter/exit (when stopped), **R** reset camera, **C** cycle cameras, **Q/E or assigned gear controls** manual shift (avoid overlapping Enter/Exit; use configurable bindings), **F** lights, **H** horn, **V** low-range/4WD controls on equipped vehicles; gamepad with analog throttle/brake, stick steering, rumble, and full rebinding. **Never hardcode overlapping controls.** Separate `onFoot`, `inVehicle`, `garage`, `construction`, `UI` contexts.

Driver states: `parked → ignitionOn → cranking → idle → driving → coasting → stopped`; branches `stalled`, `overheated`, `disabled`, `rolledOver`, `towing`, `recovering`. Every transition checks part/function prerequisites. Example: starter/battery healthy + fuel and ignition available + engine capable of rotating. Engine stalled in gear can be restarted only when compatible with clutch/neutral safety mode.

Inputs are normalized `throttle:[0,1]`, `brake:[0,1]`, `steer:[-1,1]`, `clutch:[0,1]`, `handbrake:[0,1]`; with toggles `gearRequest`, `transferCase`, `diffLock`, `ignition`. Sample controls at frame boundary, hold for fixed physics steps, log input for regression replays. Debounce toggles and avoid double-firing in React rerenders.

## 5 — VEHICLE DYNAMICS VOCABULARY (USE CORRECT TERMINOLOGY)

| Term | What it means in this design |
|---|---|
| **Rigid body** | Chassis simulated as a mass with position, velocity and angular motion. |
| **Center of mass (CoM/CG)** | Effective location of mass; raised or shifted by cargo/parts/build. |
| **Moment of inertia** | Resistance to changes in rotation; depends on mass distribution. |
| **Wheelbase / track width** | Axle-to-axle and side-to-side wheel distances; affect turning/roll. |
| **Sprung / unsprung mass** | Supported body mass versus wheel/hub/axle/some suspension components. |
| **Wheel load / normal force** | Force pressing a tire against surface; changes dynamically. |
| **Load transfer** | Redistribution of tire loads during accel/brake/turning. |
| **Spring rate / damping** | Suspension resistance to displacement / movement speed. |
| **Compression / rebound** | Suspension moving inward / extending after impact. |
| **Bump stop / droop** | End-of-travel constraints when compressed / extended. |
| **Camber / toe / caster** | Wheel tilt, wheel pointing and steering-axis angle; alignment settings. |
| **Contact patch** | Effective tire-ground contact region, simplified by raycasts. |
| **Longitudinal slip ratio** | Mismatch between tire surface speed and ground velocity. |
| **Slip angle** | Angle between wheel heading and movement direction. |
| **Friction circle/ellipse** | Shared grip budget between cornering and acceleration/braking. |
| **Understeer / oversteer** | Front / rear grip exhausted first relative to demanded turn. |
| **Yaw / pitch / roll** | Rotation about vertical / lateral / longitudinal axes. |
| **Torque curve** | Engine output torque by RPM, not a fixed acceleration number. |
| **Final drive / gear ratio** | Mechanical multiplication from engine to driven wheels. |
| **Open / LSD / locked diff** | Different strategies for distributing torque across wheels. |
| **Transfer case / low range** | 4WD distribution and slow-speed gear reduction on suitable vehicles. |
| **Ground clearance / approach / breakover / departure** | Geometry controlling obstacle traversal and scraping. |
| **Rolling resistance / sinkage** | Resistance moving across a surface / sinking into loose ground. |
| **Fording depth / hydrolock** | Water-crossing limits; liquid entering intake can damage engine. |
| **Ackermann steering** | Inside/outside wheel angles differ to follow turning radii. |
| **Torque steer** | Unwanted steering pull under acceleration in some drivetrains. |
| **Clutch slip / stall / wheelspin** | Distinct failures of coupling, combustion speed and traction. |
| **CCD** | Continuous collision detection for fast rigid bodies. |
| **Fixed timestep** | Physics advances in uniform increments independent of render FPS. |

## 6 — PHYSICS ARCHITECTURE: DATA, FORCES AND PRESENTATION

### Required separation

```
MechanicalPartsStore (persistent part instances, faults, condition, installation)
          │ read-only physical spec projection
          ▼
VehicleAssemblyCompiler (fitment, mounts, stats, warnings)
          │ returns immutable VehiclePhysicalSpec at defined rebuild points
          ▼
VehicleSimulation (fixed-timestep world, chassis, wheel contacts,
     powertrain, tires, assists, damage events, wheel telemetry)
          │ state snapshots + events
          ├─────────────► 3D vehicle mesh, wheel animation, particles, audio
          ├─────────────► gauges, inspection HUD, lap/test telemetry
          └─────────────► game event/repair/economy integrations
```

**Never:** component mesh visibility directly toggles grip; `useFrame` adds velocity every render frame; setup changes overwrite original part data; damage permanently mutates catalog templates. 

### Three levels of fidelity (recommended)

- **Tier 0 (prototype):** one dynamic chassis, four raycast wheels, slope/bumps, simple traction, torque curve, braking and steering, basic damage. All vehicle classes share API.
- **Tier 1 (gameplay target):** axle/drive layouts, individual sprung/wheel contact data, load-sensitive grip, slip curves, torque/gearbox/differentials, surface/weather, mechanical faults, cargo shift, basic towing, temperature/wear.
- **Tier 2 (optional):** richer slip transients, multi-contact wheel sampling on obstacles, sophisticated alignment, articulated axles, deformable rut proxy, advanced tire heat, differential behaviors, aero and detailed failure models.

Do not run several independent physics worlds for garage and driving unless there's a well-defined transfer of transform/state. A shop vehicle can have a *kinematic/immobile representation*; entering driving mode compiles the same assembly into active dynamics.

### Engine options — assess actual repo first

| Approach | Best use | Constraints |
|---|---|---|
| **Rapier JS dynamic raycast vehicle controller** [R10] | **First candidate** if current project uses Rapier: supported chassis, wheels, suspension, forces. | Wheel friction is an approximation; custom tire/terrain/drivetrain can require adapter or lower-level force application; verify runtime APIs/version. |
| **cannon-es `RaycastVehicle`** [R11] | Established JS raycast alternative if existing project already depends on it. | Don't add a second physics engine just for wheels if Rapier is already adopted without profiling first. |
| **Custom tire force per wheel + Rapier rigid chassis** | Deeper slip/load/water/terrain response after proof. | Significant engineering and stability/test responsibility; physics quality is not free. |
| **Separate C++/WASM solver** | Much later, if demonstrated browser bottleneck/fidelity need. | Size, maintenance and cross-platform complexity; premature for one developer. |

**Rapier JS documented sequence:** dynamic chassis → `world.createVehicleController(chassis)` → `addWheel` → set wheel engine/brake/steering → `updateVehicle(dt, query flags)` **before** `world.step()`; exclude chassis from wheel rays; render wheel transforms from controller state. This is a conceptual flow taken from official docs. Integration details in `@react-three/rapier` and installed Rapier release must be verified. [R10]

## 7 — BASIC FORCES, UNITS AND NUMERICAL SAFETY

Use **SI units** in simulation: meters, seconds, kilograms, Newtons, Newton-meters, radians; display mph/km/h or PSI/kPa via formatting only. Standard gravity approximately `9.81 m/s²`; `1 mph = 0.44704 m/s`; `1 hp ≈ 745.7 W` (imperial mechanical horsepower). Tuning data may use real-scale values *only after* the handling pipeline is tested.

Useful approximations (for implementation and sanity checking, not a complete tire model):

```text
speed_from_wheel = angular_wheel_speed_rad_s * rolling_radius_m
wheel_torque_Nm ≈ engine_torque_Nm * selected_gear_ratio * final_drive_ratio * efficiency
wheel_force_N ≈ wheel_torque_Nm / effective_tire_radius_m
rolling_resistance_N ≈ Crr * supported_wheel_normal_force_N
aero_drag_N = 0.5 * air_density * Cd * frontal_area_m2 * speed_m_s^2
suspension_force_N ≈ max(0, spring_N_per_m * compression_m + damper_Ns_per_m * compression_speed_m_s)
approx_tire_grip_limit_N ≈ effective_mu * wheel_normal_force_N
```

- Actual delivered longitudinal force must be **limited by combined traction**, slip, wheel load, mechanical drivetrain losses, brake force and surface state, not simply wheel torque.
- For a stable prototype, start with a smooth tire slip curve with finite peak and slide values. Clamp combined lateral/longitudinal forces to an ellipse, not independent full grip for both.
- Use a continuous, smooth low-speed slip formula with epsilon near zero speed; otherwise stopped vehicles can numerically explode.
- Clamp **maximum physics catch-up steps** after tab backgrounding; do not simulate 45 seconds in a single render frame. Keep gameplay time/persistence separate.
- If normal force is zero (airborne), there is no tire-ground traction; wheel may spin freely but chassis cannot accelerate magically from wheels.
- Steering should be geometrically plausible; tune limited high-speed steering angle and rate, not velocity-clamping teleport turns.

**Fixed-step candidate:** `dt = 1/60 s`, at most 4–6 substeps per render frame with interpolation and controlled debt dropping. This is a *design default*, **not** Forza's simulation rate. When 60 Hz fails high-speed curb/bump tests, profile selected substeps rather than increasing all world physics globally. Rapier and react-three-rapier document fixed steps. [R12]

## 8 — ENGINE, THROTTLE, CLUTCH, GEARBOX AND FINAL DRIVE

### Separate five different concepts

1. **Driver request:** pedal amount and shift selection.
2. **Combustion/electric power source:** available torque and rotational speed as a function of installed engine/powertrain components and mechanical condition.
3. **Transmission:** gear engagement, clutch coupling, ratios, shift delays and potential grinding/failure.
4. **Final drive/differentials:** torque distribution to actual driven wheels.
5. **Tire/terrain:** how much of that torque becomes motion.

### Engine state values

`rpm`, `idleRPM`, `redlineRPM`, `torqueCurve`, `throttleResponse`, `inertia`, `coolantC`, `oilC`, `oilPressure`, `fuelL`, `fuelFlow`, `airIntakeSubmersion`, `misfireFactor`, `damage`, `batteryState`, `starterStatus`, `running/stalled`.

Use piecewise torque curve points with interpolation; support naturally aspirated, turbo/supercharged and eventual electric by a common `PowerUnit` interface. Do not model each combustion event initially. Components modify measurable parameters: clogged air filter reduces available air/torque, worn plugs cause intermittent miss, poor oil raises wear/temperature, broken radiator reduces cooling, low fuel starves engine, misadjusted carb affects idle. Project: Baja starter should remain consistent with its original period-inspired architecture and fitment; a new engine is a physically checked swap, not any item in any slot.

### Gear systems

- Manual: neutral, reverse, first to N, clutch engagement, engine braking, gear selection and stall threshold; optional shift-assist for playability.
- Automatic: shift-up/down RPM thresholds, hysteresis and kickdown; shift time and converter simplification.
- Sequential: up/down request, very short disengagement; appropriate later race equipment.
- Transfer case: `2H`, `4H`, `4L` only if supported by hardware; changing modes can have speed/safety limits. No low-range button on every car.
- Torque multiplication is **gear ratio × final drive × transfer case ratio**; acceleration/travel rate depend on tire effective radius. Larger tires improve clearance but worsen effective gearing without regear. This is a signature upgrade tradeoff.
- Engine braking follows drivetrain coupling and current gear, distinct from service brakes.

### Differential modeling phases

- Open differential: distributes torque in a way that makes one low-traction wheel a limiting factor; not simply `50% traction` always.
- Limited-slip differential (LSD): partially resists wheel-speed differences; configurable preload/bias in advanced mode.
- Locked differential/spool: wheel speeds constrained together; great low-speed traction, poorer turning behavior and added stress on high-grip surfaces.
- AWD center/transfer split: may be fixed or variable based on installed hardware; model front/rear axles separately.
- Drivetrain damage: cracked axle, worn CV/U-joint, broken driveshaft and clutch slip can disable a wheel/axle while engine still runs.

## 9 — WHEELS, TIRES, BRAKES, STEERING AND SUSPENSION

### Per-wheel minimum simulated data

Each wheel has stable slot ID (`FL`,`FR`,`RL`,`RR` initially), mount transform, axle ID, radius, width, pressure, compound/tread type, wear, damage, temperature (later), normal force, contact material, suspension travel, slip ratio, slip angle, steer angle, brake torque, drive torque, spin speed, whether grounded, sinkage and puncture status.

### Tire categories (Baja-specific)

- **Street/all-season:** reliable hard surfaces, poor deep loose sand.
- **All-terrain (A/T):** compromise for mixed hardpack, graded dirt and gravel.
- **Mud-terrain (M/T):** effective mud/rock tread, tradeoffs on pavement, noise/rolling resistance.
- **Sand/paddle:** sand/silt traction at appropriate vehicles, poor pavement durability.
- **Race desert:** improved high-speed desert grip at cost, wear or setup constraints.
- **Rock crawler:** low-speed grip and sidewall resilience for rocks, weak high-speed handling.
- **Spare or worn mismatched:** asymmetry, vibration and limits where appropriate.

**Tire setup affects:** longitudinal and lateral grip by surface, rolling radius, effective gearing, unsprung mass, contact patch proxy, puncture risk, noise, rolling resistance, stability, ground clearance and visible tire geometry. Tire pressure changes deflection/contact proxy: reduced pressure may help some low-speed loose ground conditions but worsen heat, cornering support, bead retention and high-speed durability. No universally best tire.

### Simplified tire force model phases

A tire should not have a single scalar `grip = 1.0` across all conditions. Use:

```
base tire compound/surface response
  × wear and damage modifiers
  × pressure modifier
  × weather moisture / contamination modifier
  × load sensitivity curve
  × temperature modifier (later)
  → smooth longitudinal/lateral slip force curves
  → combined grip clamp
```

PhysX technical docs describe slip, load, lateral stiffness and force-generation parameters; Unity WheelCollider documents spring/damper suspension and slip-based tire friction. These are conceptual models to learn from, **not algorithms to paste**. [R13][R14]

### Suspension

- Independent front/rear, trailing arm, beam axle, solid axle and leaf-spring archetypes as *data*, not full physical link simulation initially.
- `springRate`, `rideHeight`, `restLength`, `compressionDamping`, `reboundDamping`, `bumpStop`, `droopLimit`, `antiRoll`, wheel `sprungMass`.
- Short travel bottoms out earlier; long travel absorbs whoops but can increase roll and dynamic complexity. Raising the car raises CoM and rollover risk; stiff springs can improve support while reducing rough-surface compliance.
- Worn damper: lowered damping, oscillation after bumps. Broken spring: lower corner ride height/handling. Bent control arm: alignment drift. Faults must persist in installed part instances.
- Refit and adjust suspension alignment after major component changes; don't let a visual lift animate without changing wheel collision/contact geometry.

### Steering & brakes

- Steering rack ratio, max lock, turning circle, response rate, Ackermann (approximate), power-steering assist dependent on equipment, alignment pull.
- Service brakes use applied torque, bias, heat/wear/fade (progressively). Handbrake acts on configured wheels, independent of engine torque.
- ABS, traction/stability systems are separate installed hardware/optional accessibility assists. A damaged brake line reduces braking and can leak fluid; tire grip still limits deceleration.
- Parking brake holds parked vehicle on modest slopes using grounded wheel torque and conditions; do not freeze rigid body every time brake is held.

## 10 — OFF-ROAD SURFACES, GRIP AND TOPOGRAPHY

Use physical ground material IDs separate from graphics/PBR material IDs:

`asphaltDry`, `asphaltWet`, `hardpack`, `gradedDirt`, `looseGravel`, `sandFirm`, `sandDeep`, `silt`, `clayDry`, `clayWet`, `mudShallow`, `mudDeep`, `rock`, `wetRock`, `wash`, `grassScrub`, `shallowWater`, `deepWater`, `concrete`, `metalRamp`.

Each surface definition can supply `baseLongitudinalGrip`, `baseLateralGrip`, `rollingResistance`, `sinkageCoefficient`, `deformationResistance`, `wetnessSensitivity`, `splashType`, `particleFX`, `audioSurfaceId`, `rutResistance`, `dustiness`. **These are relative game tuning coefficients, not measured friction coefficients.** Tire+suspension+load+water determine actual result.

| Surface | Driving personality | Important upgrade/choice |
|---|---|---|
| Dry asphalt | predictable and grippy | road tires, brake capability, alignment |
| Graded dirt | usable grip, washboard vibration | shocks and mixed-terrain tires |
| Loose gravel | sideways slip, longer braking | progressive steering, rally tread |
| Firm sand | moderate resistance, momentum important | correct pressure, all-terrain tires |
| Deep sand/silt | sinkage, high rolling resistance, easy bogging | large footprint/appropriate tires, low range, avoid stop |
| Dry rocky wash | uneven impacts, articulating suspension | ground clearance, tire sidewall |
| Mud/clay after rain | lateral sliding, ruts, pull difficulty | tread type, 4WD, winch |
| Wet rock | low predictable grip despite hard surface | tire selection, careful throttle |
| Shallow water | splash and resistance | vulnerable electronics/exhaust, safe route |
| Water above intake | possible engine failure | intake height, snorkel only if correctly installed |

**Terrain data pipeline:** render layer(s) + collision shape/heightfield + `SurfaceMaterialId` + moisture map + optional deform/rut state + semantic tags (`road`, `creek`, `restricted`, `race`). Terrain collider and displayed surface must align. Verify raycast hit returns the correct surface classification; don't infer physics from mesh color alone.

### Development tiers for soft ground

- **Tier 0:** static terrains with friction/resistance/sinkage approximation; particles and tracks as decals.
- **Tier 1:** per-tile wheel-rut memory (depth, moisture, compaction) modifying traversal resistance; bounded local wheel track meshes or decals.
- **Tier 2:** selected mud/sand patches with localized visible mesh displacement, cost-limited, no arbitrary infinite real-time terrain rebuilding.

**Ruts are not automatically real-time mesh carving.** Start as gameplay state that changes wheel contact behavior and is visually represented by lightweight effects. Time/weather may fill or dry ruts, subject to performance.

## 11 — WEATHER, DAY/NIGHT AND SEASONAL WORLD INTERACTIONS

Project: Baja's established world concept includes seasons and hybrid weather. Driving must sample **the same WeatherService** as world, property, environment and race systems—no vehicle-local random storm generator.

Inputs: air temperature, rain intensity, recent rainfall, wetness, standing-water map, wind, dust storm visibility, time of day, seasonal dry/wet state. Exposed mechanics: changing hardpack to slick clay, dampening dust after rain, wet braking changes, deeper wash crossings, hot-day engine cooling burden, night visibility from functional lights, wind side force on light trailers, local flood closure warnings.

**Weather cannot magically turn everything into deep mud at once.** Use material permeability, drainage and rainfall accumulation by terrain tile. Traffic and vehicle tracks can disturb limited high-value areas. First create **dry**, **after light rain**, **wet clay/wash** presets, all deterministic by seeded schedule in tests.

## 12 — DAMAGE, FAULTS AND MECHANICAL CAUSE/EFFECT

Damage is an event routed into existing persistent parts, not just `vehicle.health -= N`.

| Impact or cause | Mechanical consequences (depending on severity and hit) | Visible/audible feedback | Repair loop |
|---|---|---|---|
| Wheel strikes rock | tire sidewall cut, rim bend, tie rod/alignment | wheel wobble, slow leak, steering pull | lift, diagnose, tire/rim or steering repair |
| Hard landing | shock overheating, bent arm, bottomed spring, chassis risk | clank, bounce, corner sag | damper/arm/structure repair |
| Front impact | radiator leak, fan damage, body dent | steam, rising temp, nose deformation | inspect, fluid service, replace/repair |
| Rear impact | exhaust damage, rear body/engine area impact | exhaust noise, reduced flow, mesh dents | inspect appropriate layout/parts |
| Underside strike | oil pan leak, gearbox housing damage | oil warning, trail, heat | recover before destroying engine |
| Submersion | shorted electronics or intake-water failure | warning/engine stop | dry/inspect/repair actual affected parts |
| Over-rev/mis-shift | clutch/gearbox/engine wear based on severity | tach warning, mechanical noise | rebuild/replace affected component |
| Brake overheating | reduced brake effectiveness, pad wear | fade, warning smell/sound cues | cooldown/service |
| Too much cargo | CoM and braking change, suspension wear | extra roll/sag | redistribute load, upgrade springs/brakes |

**Impact routing proposal:** read physics collision impulse/contact point/normal → convert into safe, game-balanced local impact severity relative to mass and approach velocity → select spatially overlapping *installed* component zones → apply condition delta and optional fault event → persist affected instance IDs → UI/audio/VFX → diagnosis. Damage severity should distinguish a scraped panel from a disabled axle. Avoid fake fixed collision-damage percentages across all masses/speeds.

**Fairness rules:** show damage source; prevent random invisible failures; tune low-speed garage collisions to be forgiving; give a reachable recovery path for immobilized cars; no save-breaking cars fused into terrain. Panel deformation can initially be variant meshes, offsets, decals, cracked lenses and detachable parts—**not BeamNG node deformation**. [R09]

## 13 — TOWING, TRAILERS, RECOVERY AND CARGO

Driving and property gameplay meet here. Support hitch mount points and ratings, trailers as separate rigid bodies with coupler/joint constraints, cargo mass and center of gravity, straps/securement rules, loading ramps, basic towing controls, jackknife risk, reverse stability, trailers with their own tires, and persisted cargo ownership/location.

Progression:

1. Flatbed/trailer is a station-placed cargo object, not physics.
2. Hook/unhook a single light trailer, tow it on paved and dirt test courses.
3. Load one salvaged part and one vehicle; weight changes steering/braking.
4. Winch with valid anchors, line length, force limits, recover vehicle; safe fallback if no anchor.
5. Multiple trailer classes (utility, car hauler, recovery, enclosed) and towing upgrades later.

A winch is an **equipment-gated recovery mechanic**, not a magic teleport. Anchors have capacity and attachment validity, line stretch/forces are bounded, hitch strength can fail under unrealistic loads. Some extreme recovering should require hiring a tow service for an in-game cost. Contract item and trailer cargo cannot be duplicated by detach/save/reload.

## 14 — CAMERA, AUDIO, VFX AND HUD (PHYSICS-AWARE PRESENTATION)

**Cameras:** smooth chase with velocity-aware follow distance and collision avoidance; hood/bumper for obstacles; in-cabin for immersion; inspection/free orbit when safely parked; external replay/test camera later. Protect player from motion sickness: camera roll/pitch intensity and shake toggles.

**Sounds tied to state:** RPM/load engine loops, starter and missed crank, gear shifts, clutch slip, overrun, tire gravel hiss, coarse rock noise, tire scrub, suspension bottoming, potholes, wind, dust/water, loose exhaust, overheating, cabin rattle, winch motor. Audio should use interpolation/parameter mapping rather than retriggering one-shot sound on every frame.

**FX tied to events:** dust accumulation by actual dry surface and wheel speed/slip; gravel sprays; wet splashes; mud spatters; tire smoke only appropriate conditions; scrape sparks only metal impacts; oil/fluid leaks per fault; displaced vegetation; visible tire tracks; vehicle dirt/wash state persists separately from mechanical damage.

**Driving HUD:** speed, gear, RPM, tach redline, fuel, engine temp, oil pressure/warning, traction/wheelspin indicator, incline/roll angle on suitable off-road build, 4WD/low-range/diff-lock status if fitted, component/condition warning, trip distance, cargo trailer status, recovery indicator. In-world gauges can reflect the same values; do not implement a second fake dashboard telemetry source.

**Telemetry/proving HUD:** contact at each wheel, per-wheel grip and slip, chassis speed, suspension compression, pitch/roll/yaw, throttle/brake input, drivetrain force, surface ID, engine temp, part faults, elapsed run, frame ms and physics steps. Developer-only advanced panel.

## 15 — HANDLING PRESETS AND VEHICLE FAMILIES

Define class archetypes as data-backed **starting configuration**, not hard-coded movement scripts:

| Class | Main handling identity | Unique component considerations |
|---|---|---|
| 1971 Bug-style starter | light, rear-engine/rear-drive-inspired, short wheelbase, modest power | compact engine packaging, light front end, vintage brakes/suspension |
| Stock pickup | heavier, longer wheelbase, useful tow/load | payload, truck tires, brake heat, rear suspension |
| Baja race truck | long-travel, high speed over whoops | travel, damping, high-temp cooling, cage, tires |
| Dune buggy | lightweight, high steering response | exposed suspension, short wheelbase, low cargo |
| Rock crawler | low gearing, articulated, slow but capable | diff locks, geometry, winch, tire pressure |
| Utility/service van | heavy high-CoM, stable delivery | cargo shifting, rear axle load, braking distance |
| SUV/4x4 | broad mixed-terrain capability | 4WD/transfer case/towing |
| Classic coupe/sedan | road-focused and weight-transfer sensitive | road tires/alignment/brake balance |
| Motorcycle/ATV | **different dynamics**; later phase only | lean dynamics, rider balance; do not force 4-wheel controller |
| Trailer/equipment | towed rigid/articulated body | coupler, cargo, brakes, axle simulation |

**Vehicle family expansion contract:** new family needs a catalog definition, prepared 3D chassis/wheels, wheel mounts, chassis CoM/mass, engine/drivetrain interfaces, compatibility, collision shapes, tests. A universal controller is not a universal content generator.

## 16 — RACE, JOB AND EXPLORATION FORMATS BUILT ON SAME PHYSICS

- Garage-to-garage shakedown, local desert road loop, paved handling pad, skidpad, hill-climb, rock-garden crawl, sand-dune route, desert sprint, time trial, endurance/off-road race, delivery haul, towing/recovery, rescue mission, team race support, convoy, rain-affected route, salvage retrieval and test track.
- Pace notes/co-driver: start as text/markers in rally events; voice later. Make direction cues accurate to actual route and visibility conditions.
- Event eligibility comes from build/cage/tire/light/weight/class requirements and real functional state, not total shop money spent. A fast car missing brakes should fail tech inspection.
- Penalties: off-route shortcuts, rollovers, unsafe tow, missed checkpoint; no unexplained random 'lose 20% durability' event tax.
- Town traffic/AI drivers: staged later, waypoint/navmesh/path lanes, intersection rules, occlusion, simple obstacle avoidance, no competing full human simulation. Events and traffic should not hijack base workshop gameplay.
- Loop: `build/repair → choose test or job → drive → collect telemetry & component wear → recover/return → diagnose → service/upgrade → retest`. This is the central *mechanic-sim to driving-sim* feedback loop.

## 17 — DATA CONTRACTS (TYPESCRIPT PROPOSALS; NOT DROP-IN CODE)

These types describe **interfaces and ownership**, not verified imports. Adapt names to existing repository and save schemas after auditing.

```ts
type WheelSlot = 'FL' | 'FR' | 'RL' | 'RR';
type SurfaceId =
  | 'asphaltDry' | 'asphaltWet' | 'hardpack' | 'gradedDirt'
  | 'looseGravel' | 'sandFirm' | 'sandDeep' | 'clayWet'
  | 'mudDeep' | 'rock' | 'wetRock' | 'shallowWater';

type DriveLayout = 'FWD' | 'RWD' | 'AWD' | '4WD';
type DiffType = 'open' | 'limitedSlip' | 'locked';
type ShiftingType = 'manual' | 'automatic' | 'sequential';

interface PartSimulationRef {
  instanceId: string;     // source of truth in existing parts system
  catalogPartId: string;
  installedSlotId: string;
  condition01: number;    // projection, never separate authoritative copy
  faults: string[];
}

interface EngineSpec {
  idleRpm: number;
  redlineRpm: number;
  rotationalInertiaKgM2: number;
  torqueCurve: Array<{ rpm: number; torqueNm: number }>;
  coolingCapacity: number;
}
interface GearboxSpec {
  type: ShiftingType;
  forwardRatios: number[];
  reverseRatio: number;
  finalDriveRatio: number;
  shiftTimeSec: number;
}
interface TireSpec {
  radiusM: number;
  widthM: number;
  pressureKpa: number;
  massKg: number;
  treadCategory: string;
  longitudinalCurveId: string;
  lateralCurveId: string;
}
interface WheelSpec {
  slot: WheelSlot;
  axleId: string;
  mountLocalM: [number, number, number];
  tire: TireSpec;
  steerable: boolean;
  driven: boolean;
  handbraked: boolean;
  springRateNPerM: number;
  compressionDampingNsPerM: number;
  reboundDampingNsPerM: number;
  restLengthM: number;
  travelM: number;
}
interface VehiclePhysicalSpec {
  vehicleInstanceId: string;
  assemblyRevision: number;
  massKg: number;
  centerOfMassLocalM: [number, number, number];
  wheelbaseM: number;
  trackWidthM: number;
  engine: EngineSpec;
  gearbox: GearboxSpec;
  driveLayout: DriveLayout;
  frontDifferential: DiffType | null;
  rearDifferential: DiffType | null;
  wheels: WheelSpec[];
  installedParts: PartSimulationRef[];
  faults: string[];
}
interface DriverInput {
  throttle01: number; brake01: number; handbrake01: number;
  steerNeg1To1: number; clutch01: number;
  ignitionToggle?: boolean;
  gearUp?: boolean; gearDown?: boolean;
}
interface WheelTelemetry {
  slot: WheelSlot;
  grounded: boolean;
  surfaceId: SurfaceId | null;
  suspensionCompressionM: number;
  normalForceN: number;
  longitudinalSlip: number;
  lateralSlipAngleRad: number;
  angularSpeedRadS: number;
  availableGripN: number;
}
interface VehicleTelemetry {
  vehicleInstanceId: string;
  elapsedSimSeconds: number;
  speedMps: number;
  engineRpm: number;
  gear: number; // -1 reverse, 0 neutral, >0 forward
  fuelLiters: number;
  coolantC: number;
  chassisRollRad: number;
  wheels: WheelTelemetry[];
  activeFaults: string[];
}
interface ImpactEvent {
  vehicleInstanceId: string;
  simTick: number;
  contactWorldM: [number, number, number];
  contactNormal: [number, number, number];
  relativeImpactSpeedMps: number;
  impulseNs?: number;
  impactedZones: string[];
}
```

**Save only durable state:** installed part IDs/condition/faults, vehicle location/orientation/parking status, fuel/fluids, wheel setup/tire pressure, setup tuning, dirt/repair history, persistent world rut tiles if meaningful, trailer/cargo and job state. **Do not** save transient ray contacts or render interpolation buffers as authoritative state. For parked vehicle, normalize motion; on reload validate safe spawn/ground penetration and avoid repeatedly reapplying collision damage.

### Schematic end-to-end example

```text
Workshop: change left rear damper instance
  → inventory transfer and new part condition
  → assembly revision ++
  → validate proper suspension mount and compatibility
  → compile affected spring/damper wheel setup
  → apply config only at safe scene transition (parked)
  → next test: wheel compression/rebound curve changes
  → telemetry proves reduced bouncing
  → save state preserves specific part and tuning
```

## 18 — TECHNICAL IMPLEMENTATION PLAN, IN THE RIGHT ORDER

**Milestone D0: Audit & scientific baseline** — inventory current systems, one vehicle prefab, known R3F physics release, loaded asset mass/pivots, surface ID, tests, frame timing. Build fixed seed input replay and visible debug gauges. No feature rewrite.

**D1: Real 4-wheel rolling chassis** — 1 driveable vintage starter, RaycastVehicle or existing adapter, wheel positions, steering/brake/throttle, ground contacts, 60-Hz simulation, safe start/stop, chase camera; flat plane and 1 bump. *Exit:* rolls without jitter or camera-driven torque.

**D2: Grip & surface feedback** — asphalt, hardpack, gravel, sand; tire spec from actual installed part instances, braking/slip and test track. *Exit:* a tire swap measurably changes a reproducible time/distance metric, not simply visuals.

**D3: Real powertrain** — engine start gates, torque curve, manual/automatic, reverse, drivetrain layout, final drive, fuel. *Exit:* engine state, RPM and wheel force trace consistently; broken engine fails to drive.

**D4: Mechanical damage integration** — two failure types: worn rear damper and punctured tire; collision or intentional test trigger damages *instances*; service restores output. *Exit:* garage view and driving output agree after save/reload.

**D5: Physics-ready terrain** — short graded road, gravel turn, sand basin, rocky bump, incline, weather moisture preset; correct surface IDs at contact. *Exit:* each surface behaves distinct and stable at low/high speed.

**D6: Power delivery depth** — open/LSD/locking differential options, 4WD/low range where equipped, pressure and gear ratio; cargo/CoM; overheating and fluids. *Exit:* documented real upgrade tradeoffs and no impossible fitments.

**D7: Towing/recovery** — hitch + one trailer, detachable loaded car, loading ramp, winch/tow fallback. *Exit:* no duplication, stable collisions and save/reload.

**D8: Events/traffic/audio/cameras** — race timing, checkpoints, road legality, advanced cameras, functional audio, NPC traffic later. *Exit:* shakedown drives feel distinct while maintaining FPS.

**D9: Advanced fidelity only with evidence** — rut state, pressure effects, shock temperature, tire heat, detailed alignments, replay, more vehicles; re-assess architecture by measured tests, not feature envy.

### Phasing discipline

For every milestone deliver: (a) repository impact map, (b) feature flag, (c) acceptance test and baseline, (d) save version migration, (e) perf before/after, (f) screenshots or test logs, (g) rollback plan. Avoid 30 simultaneous services and giant `Vehicle.tsx` with physics, engine and UI inside.

## 19 — REPRODUCIBLE DRIVING TEST MATRIX

Measure before/after using **the same vehicle, gear, weight, starting state, surface and input script**.

| Test ID | Setup/action | Required observable evidence |
|---|---|---|
| DRV-001 | Drive on flat dry asphalt, fixed throttle | predictable acceleration, no sideways drift without cause |
| DRV-002 | Apply full brakes at fixed initial speed | stopping distance measurable and stable across same build |
| DRV-003 | Repeat DRV-002 on gravel | meaningful, explainable stopping difference |
| DRV-004 | Swap tire compound from inventory, re-run | wheel material/physics changes, actual part IDs remain linked |
| DRV-005 | Remove driven axle/necessary part, attempt drive | no impossible drive-force generation |
| DRV-006 | Engine overheating caused by radiator leak | warnings, eventual output degradation/failure, exact part damaged |
| DRV-007 | Repair damaged radiator on garage station | restored functional behavior, fluid service if required |
| DRV-008 | Take a small ramp straight and land | controlled compression, no endless rocking or flying |
| DRV-009 | Drain a corner damper condition and hit bumps | measurable rebound change at that wheel |
| DRV-010 | Add 100 kg cargo at rear | supported mass/CoM and handling/braking change |
| DRV-011 | Larger radius tires, same gears | effective speed/accel tradeoff; clearance changes |
| DRV-012 | Enter sand, stop then accelerate | resistance and tire/diff gear choice matter, no unbounded sinking |
| DRV-013 | Drive into realistic water depth | effects/traction; functional fault only above defined thresholds |
| DRV-014 | Cold/hot/wet route presets | surface conditions deterministic under same seed |
| DRV-015 | High-speed collision with obstacle | persistent local damage, sane recovery, no NaNs/explosive impulses |
| DRV-016 | Pause, switch tab, resume | no 60-second catch-up/explosion, input stays safe |
| DRV-017 | Save while parked, reload | exact installed parts, fuel, setup and location conserved |
| DRV-018 | Attach loaded trailer and drive/hard brake | cargo loads/coupler valid, no disappearing or duplicating objects |
| DRV-019 | Crash/rollover recovery | reset cannot fabricate free parts, vehicle remains accessible |
| DRV-020 | 30-minute endurance test | stable frame pacing, no heap/event listener leak, no physics divergence |
| DRV-021 | Drive with ABS/assists modes | difference explainable and limited; warning shows assist active |
| DRV-022 | Steering/gear mapping on keyboard and gamepad | no conflicting bindings; 0–1 analog range, remapping persists |

**Suggested performance gates (proposals, adapt to target hardware):** 60 FPS target on desktop standard scene; 30 FPS degraded fallback if needed; fixed physics simulation remains stable at 30 FPS render; useful visible wheel telemetry in debug mode; no excessive active body count; cleanup on vehicle unload. Profile long before introducing rigid-body bolts, deformable world meshes or dozens of continuously simulated NPC vehicles.

## 20 — PITFALLS, PLAYTEST QUESTIONS AND SCOPE GUARDS

### Watch for these traps

- **Fake torque:** engine HP multiplied directly into position, independent of gear and traction.
- **Fake steering:** steering adjusts chassis yaw directly while moving; drift has no physical explanation.
- **No real surface:** desert textures don't match contact surface IDs.
- **Raycast hard edges:** wheel falls into thin geometry, launches on triangles, or passes through ramp seams.
- **Mass fraud:** cargo is visual but not included in mass/CoM.
- **Disappearing wear:** driving damage tracked separately from repairable part instance.
- **Wrong control stack:** changes fixed-step forces in render tick and causes different speed at 30/144 FPS.
- **Universal engine swap:** any engine can fit any chassis.
- **Infinite tire grip:** on asphalt, tires turn unrealistically under combined max throttle/brake.
- **Soft-body ambition:** authoring and simulating millions of nodes without the production budget.
- **All vehicles same feel:** new meshes placed on identical stats.
- **Infinite weather effects:** storms with identical traction changes on every material.
- **Rollover punishment:** irreversible vehicle trapping with no safe tow/recovery.

### Playtest for feeling, not just math

Ask: Can players tell worn shocks from good ones *without* staring at a bar? Can they identify a loose gravel corner from wheel response? Does a repaired car feel *rewarding*? Do driving assists preserve the joy of a build? Do vehicles maintain believable distinct weight and momentum? Is it clear what caused a failure and how to fix it at Walt's Garage?

## 21 — SHARED INTEGRATION RULES WITH THE TWO OTHER BAJA HANDOFFS

**One authoritative object graph:**

```
VehicleInstance (unique VIN-like invented game ID)
 ├─ Installed part instances (catalog + individual condition)
 ├─ Mechanical configurations (engine/gearbox/suspension/tire/fluids)
 ├─ Current physical simulation projection (transient)
 ├─ Position and garage/road/trailer ownership location
 ├─ Repair/work order history
 └─ Race/test and damage history

PropertyWorld
 ├─ Garage/parking lot/trailer/windmill/water tank/utility state
 ├─ Stored parts/tools/materials (same inventory items as vehicles use)
 ├─ Customer jobs/contracts/ledger
 ├─ Salvage sites and transport cargo
 └─ One shared weather/time/calendar
```

**Example complete chain:** source worn salvage tires at junkyard → transport home in trailer → clean and inspect → mount on grandma's Bug-style car → configure pressure → test on sandy wash → see lower sinkage but new high-speed stability trade-off → pick up rim damage on a rock → recover vehicle → replace bent rim at correct workstation → resale/reputation/bookkeeping reflect materials and labor. This should be possible using shared IDs and events, not disconnected feature mini-games.

**Ownership rules:** car parts remain in part inventory as instances; building materials remain material inventory as batches/units; cargo manifests reference actual items, not clones; economics receipts refer to exact transaction IDs; a repair/fitment transaction commits or rolls back atomically. At save time, an item may be installed, in world, on a trailer, in a bench, in storage, or owned by an NPC—**never duplicated in two locations**. All road wear belongs to a persistent vehicle/part ID.

## 22 — OPEN DECISIONS FOR FORGE (DO NOT ASSUME LOCKED)

- Default simulation/assist level and whether manual clutch is first-release or later.
- Desired maximum supported vehicle speed and physics constraints on the browser target.
- Whether tire temperature/alignment systems are initially simple or deeper.
- How much tire/rut persistence matters for the first explorable map.
- Gamepad/wheel support goals; accessibility needs.
- Whether traffic begins as ambient visual cars or physically reactive NPC vehicles.
- Player recovery fees, roadside towing help and failure penalties.
- First vehicles beyond grandma's Bug-style car: pickup vs dune buggy vs service vehicle.
- Whether manual pacenotes, co-driver/rally events and weather hazards launch early or later.

If no selection is available, choose **minimal viable reversible defaults**, mark them `PROPOSED`, and do not silently add major story, business or progression canon.

## 23 — VERIFIED RESEARCH SOURCES AND TECHNICAL READING

**Research checked November 22, 2026.** Links are included inside this file so a Claude agent or developer can reopen the sources. Publisher/store statements establish public features; engineering recommendations and formulas are original design synthesis. Access dates and page content can change.

- **[R01] Forza Motorsport developer, tire contact, compounds, AI, thermal behavior:** https://forza.net/news/forza-motorsport-drivatars-tire-physics
- **[R02] Forza Horizon 5 wheel and steering modes:** https://support.forza.net/hc/en-us/articles/4409761195923-FH5-Wheel-Setup-and-Tuning
- **[R03] GTA V handling configuration (third-party modding docs; illustrative, not official Rockstar implementation spec):** https://github.com/Goodvibes74/gta5-under-the-hood/blob/main/docs/physics/vehicle-handling.md
- **[R04] DiRT Rally 2.0 publisher listing, surface degradation, tuning, tire choice:** https://store.steampowered.com/app/690790/DiRT_Rally_20/
- **[R05] EA SPORTS WRC, multi-surface Dynamic Handling System:** https://www.ea.com/games/ea-sports-wrc/wrc-24/features
- **[R06] Gravel developer, accessible off-road physics:** https://milestone.it/games/gravel/
- **[R07] SnowRunner publisher, terrain, payload, upgrades:** https://www.focus-entmt.com/en/games/snowrunner
- **[R08] Expeditions: A MudRunner Game publisher, anchors and scouting:** https://www.focus-entmt.com/en/games/expeditions-a-mudrunner-game
- **[R09] BeamNG developer overview of proprietary node/beam soft-body:** https://www.beamng.com/game/about/physics/ and https://documentation.beamng.com/modding/vehicle/intro_jbeam/
- **[R10] Rapier JS vehicle controller, actual API and update order:** https://www.rapier.rs/docs/user_guides/javascript/character_controller/#vehicle-controller
- **[R11] cannon-es RaycastVehicle API:** https://pmndrs.github.io/cannon-es/docs/classes/RaycastVehicle.html
- **[R12] react-three-rapier fixed physics stepping:** https://pmndrs.github.io/react-three-rapier/ and https://rapier.rs/docs/user_guides/javascript/integration_parameters/
- **[R13] Unity WheelCollider spring/damper/slip material-based tire documentation:** https://docs.unity3d.com/kr/6000.0/ScriptReference/WheelCollider.html
- **[R14] NVIDIA PhysX tire force parameter concepts, slips/load response:** https://nvidia-omniverse.github.io/PhysX/physx/latest/_api_build/structPxVehicleTireForceParams.html
- **[R15] Rapier JS collider/heightfield and collision shapes:** https://rapier.rs/docs/user_guides/javascript/colliders/
- **[R16] Three.js InstancedMesh reducing draw calls:** https://threejs.org/docs/pages/InstancedMesh.html
- **[R17] RoadCraft, roads/bridges/equipment as world repair:** https://www.focus-entmt.com/en/games/roadcraft
- **[R18] Rapier forces and impulses, mass and physical responses:** https://rapier.rs/docs/user_guides/javascript/rigid_body_forces_and_impulses/

### Final deliverable checklist for Claude

- [ ] Existing repo surveyed and retained; no assumed blank slate.
- [ ] Driving controller uses one explicit physics authority and tested fixed step.
- [ ] Wheel mounts, tire stats, engine torque and vehicle weight compile from real installed parts.
- [ ] Four surface types and a repeatable test course exist.
- [ ] Suspension/bump and braking tests are stable and quantified.
- [ ] Real tire swap produces a visible and measurable handling change.
- [ ] Repair of actual damaged component reverses the corresponding driving fault.
- [ ] Save/load and safe recovery work after damage, trailer changes and scene transitions.
- [ ] Camera/audio/VFX read physics telemetry rather than faking it.
- [ ] Performance budget and crash/stability tests pass.
- [ ] More advanced physics systems stay on the roadmap until the vertical slice is finished.

**If forced to choose one implementation goal:** *Drive grandma's repaired starter Bug-style car on hardpack and gravel, notice the difference when changing tires or fixing a failed damper, and carry that exact physical state safely back into Walt's Garage.*
