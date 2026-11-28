# PROJECT: BAJA
# OFF-ROAD VEHICLE PHYSICS & ENGINEERING MASTER SPECIFICATION

Status: Long-term engineering reference (not the active task)
Scope: Vehicle Dynamics, Driving, Suspension, Terrain, Racing, and Mechanical Integration
Repo location: docs/vehicle-physics/VEHICLE_PHYSICS_ENGINEERING.md
Revised: 2026-11-28

---

## 0. READ THIS FIRST

### Document priority

1. The live repo is the source of truth for what exists.
2. `BAJA_PHYSICS_MECHANICS_HANDOFF.md` (Nov 21, 2026) is the active task. Follow its steps and acceptance tests first.
3. This document is the long-term reference. Use it for equations, terminology, architecture direction, and later phases. Where it conflicts with the active handoff, the handoff wins.

Do not paste this document into every session. Read it from the repo when a task needs it.

### Hard rules

- Add to what exists. Do not remove, rename, or rewrite working systems. If something must change, say what and why before changing it.
- Do not switch physics libraries without asking Chris. Evaluate the installed engine only.
- Do not add new gameplay loops, economy, progression, upgrade unlocks, or garage mechanics without Chris's approval. Sections 21 and 22 describe how parts and damage connect to physics, not permission to build those game systems.
- Build for VEH_001 (the starter Bug) only. Other vehicle classes in this document are future expansion.
- End every session with a pasteable summary for the Forge: what existed, what you added, what you changed, what you did not touch, which numbers are still estimates, which tests pass, and open questions for Chris.

### Tiebreaker: physics rules vs. existing code

Section 4, Rule 1 bans faking movement through direct position or rotation changes. Section 1 says to preserve working systems.

If existing code breaks Rule 1: report it, do not rewrite it. Propose the fix and wait for approval.

### Fixed conventions (already decided)

- 1 world unit = 1 meter
- +Y up
- +Z forward (vehicle local)
- -X right (vehicle local, right-handed, matches glTF 2.0)
- GLB/glTF 2.0 assets, PBR metallic-roughness

### Target vehicle: VEH_001

Use these starting values, not the generic example in Section 28. All are estimates. Store them in data files with source notes.

| Field | Value |
|---|---|
| Curb mass | 750 to 850 kg |
| Wheelbase | about 2.4 m |
| Track | about 1.3 m |
| Weight split | about 40 front / 60 rear |
| CG height | about 0.5 m, rising with cage and spare |
| Engine | rear-mounted air-cooled flat-four, 1.2 to 1.6 L, 40 to 60 hp stock |
| Drive | rear-wheel drive |
| Vehicle envelope | about 4.1 m x 1.6 m x 1.5 m (provisional) |

---

## 1. INSTRUCTIONS FOR THE AI DEVELOPMENT ASSISTANT

Work as a vehicle dynamics engineer and TypeScript / Three.js simulation programmer.

Your responsibility is to help engineer a physically believable, modular, and expandable vehicle simulation system.

This document establishes engineering requirements and research direction.

It does not authorize replacing existing working systems.

Before implementing anything:

1. Inspect the existing repository.
2. Understand the current vehicle architecture.
3. Identify the installed physics engine and version.
4. Identify existing vehicle mechanics.
5. Identify existing terrain systems.
6. Identify existing vehicle assets and measurements.
7. Compare existing functionality against this specification.
8. Identify missing systems.
9. Identify technical limitations.
10. Establish an incremental implementation plan.

Preserve existing gameplay, architecture, assets, and established project decisions wherever possible.

Do not invent undocumented library methods.

Do not claim realistic physics without measurable validation.

---

## 2. OVERALL PROJECT VISION

Project: Baja should combine the accessibility of open-world driving games with the mechanical depth of realistic motorsport simulations.

Vehicles should feel like physical machines interacting with the environment rather than animated objects following movement instructions.

The player should experience:

- Vehicle weight
- Engine torque
- Acceleration and deceleration
- Suspension compression
- Suspension rebound
- Chassis flex approximations
- Body roll
- Weight transfer
- Tire deformation approximations
- Traction loss
- Wheelspin
- Drifting
- Understeer
- Oversteer
- Terrain resistance
- Terrain vibration
- Steering feedback
- Mechanical wear
- Mechanical damage
- Mechanical upgrades
- Different vehicle characteristics

Every vehicle should operate through the same underlying physics architecture.

Differences between vehicles should originate from their physical configuration, mechanical components, tuning, and condition.

Do not create unrelated movement scripts for different vehicle classes.

---

## 3. REFERENCE GAMES AND DESIGN INFLUENCES

These games are behavioral and experiential references.

Their proprietary internal physics implementations should not be assumed to be known or copied.

### Forza Motorsport

Study:

- Vehicle weight and inertia
- Tire grip
- Weight transfer
- Suspension tuning
- Camber and toe
- Aerodynamics
- Braking
- Transmission tuning
- Differential tuning
- Tire temperatures
- Tire wear
- Vehicle-specific handling

Desired outcome:

Mechanically meaningful driving and tuning.

### Forza Horizon

Study:

- Accessible vehicle handling
- Mixed-surface driving
- Vehicle customization
- Open-world terrain transitions
- Driving assistance
- Different vehicle classes

Desired outcome:

Realistic foundations without making the game unnecessarily difficult.

### DiRT Rally / EA Sports WRC

Study:

- Loose-surface traction
- Rally suspension
- Weight transfer
- Countersteering
- Scandinavian flicks
- Gravel braking
- Tire slip
- Road surface transitions
- Suspension impacts
- High-speed terrain responsiveness

Desired outcome:

Driving that rewards understanding the terrain and vehicle behavior.

### Grand Theft Auto V

Study:

- Accessible controls
- Open-world vehicle interaction
- Vehicle collisions
- Vehicle variety
- Vehicle recovery
- Environmental interaction
- Camera responsiveness

Desired outcome:

Vehicles that remain enjoyable during casual exploration.

Do not use exaggerated arcade handling as the underlying physics foundation.

### Gravel

Study:

- High-speed off-road racing
- Rough terrain
- Large suspension movements
- Off-road vehicle classes
- Jumps
- Racing across mixed terrain

Desired outcome:

Fast, exciting, physically believable off-road racing.

### BeamNG.drive

Study:

- Mechanical component relationships
- Vehicle deformation
- Weight distribution
- Suspension geometry
- Mechanical damage
- Tire behavior
- Component failure
- Vehicle testing environments

Desired outcome:

Mechanical systems that affect driving behavior.

Full soft-body simulation is not required for the initial implementation.

### SnowRunner / MudRunner

Study:

- Soft terrain
- Mud resistance
- Tire selection
- Terrain deformation
- Differential locking
- Low-range gearing
- Vehicle recovery
- Suspension articulation
- Vehicle weight

Desired outcome:

Terrain that physically affects vehicle performance.

### Assetto Corsa / Assetto Corsa Competizione

Study:

- Tire slip
- Suspension geometry
- Steering feedback
- Vehicle telemetry
- Tire temperature
- Vehicle setup
- Consistent physics behavior

Desired outcome:

An engineering-driven vehicle foundation with measurable handling characteristics.

### Wreckfest

Study:

- Collision response
- Mechanical damage
- Suspension damage
- Vehicle impacts
- Weight and momentum

Desired outcome:

Damage that affects how the vehicle drives rather than remaining purely cosmetic.

### Car Mechanic Simulator

Study:

- Individual mechanical components
- Component compatibility
- Vehicle assembly
- Replacement parts
- Mechanical condition
- Performance upgrades

Desired outcome:

Garage and repair mechanics directly connected to driving physics.

---

## 4. CORE ENGINEERING RULES

### Rule 1: Physics determines movement

Vehicle movement must originate from:

- Forces
- Torques
- Gravity
- Friction
- Mechanical constraints
- Collision response
- Tire-ground interaction
- Suspension behavior

Do not use direct position changes to imitate acceleration.

Do not directly rotate the chassis to imitate steering.

Do not apply unrelated artificial propulsion forces on top of calculated tire forces.

Explicit recovery, spawning, and teleportation systems are permitted exceptions.

### Rule 2: Rendering follows physics

The visual vehicle must follow the physical simulation.

This includes:

- Wheel rotation
- Steering rotation
- Suspension compression
- Suspension extension
- Body movement
- Axle movement
- Control arm movement
- Driveshaft rotation

Visual animation must not substitute for actual physics.

### Rule 3: Feedback follows physics

The following should originate from real simulation events:

- Camera vibration
- Controller rumble
- Steering-wheel feedback
- Suspension sounds
- Tire sounds
- Engine vibration
- Dust
- Dirt particles
- Mud spray
- Impact effects

Disabling visual and audio feedback must not change the underlying physical behavior.

### Rule 4: One universal vehicle architecture

All vehicles use the same core simulation.

Vehicle differences are defined through configurations.

Current scope: VEH_001 only (vintage compact, converting toward a Baja Bug).

Future expansion, not to be built now: trophy trucks, sand rails, dune buggies, rock crawlers, pickups, UTVs, and similar.

Keep the architecture from hard-coding four wheels where it costs nothing, but do not build multi-axle or trailer support yet.

---

## 5. MEASUREMENT AND UNIT STANDARDS

Use SI units throughout the physics simulation.

| Property | Unit |
|---|---|
| Distance | meters |
| Mass | kilograms |
| Time | seconds |
| Force | newtons |
| Torque | newton-meters |
| Velocity | meters per second |
| Acceleration | meters per second squared |
| Angular velocity | radians per second |
| Angles | radians |
| Spring stiffness | newtons per meter |
| Damping | newton-seconds per meter |
| Pressure | pascals |
| Power | watts |
| Moment of inertia | kilogram-meter squared |

Use conversions only at the user interface boundary.

Examples:

- MPH
- KM/H
- Horsepower
- PSI
- Inches
- Pounds
- RPM

Maintain consistent world scale.

One world unit equals one meter.

Vehicle dimensions must correspond to believable real-world measurements.

Already decided (see Section 0): +Y up, +Z forward, -X right, right-handed.

Still to document from the repo:

- Rotation convention
- Wheel orientation
- Steering direction (positive steer = left or right)
- Force direction
- Local-to-world transformations

Avoid arbitrary scale corrections scattered throughout the code.

---

## 6. PHYSICS ENGINE FOUNDATION

Use the physics engine already installed in the repo.

Do not switch engines without asking Chris. If the installed engine cannot support a required capability, report the gap and the options. Do not migrate.

Reference only (for reading, not adoption):

- Rapier Physics
- Jolt Physics
- NVIDIA PhysX as an architectural reference
- Project Chrono as a scientific simulation reference

Do not assume every engine supports every requested feature.

### Required foundation capabilities

- Dynamic rigid bodies
- Static colliders
- Collision detection
- Collision response
- Raycasting
- Shape casting where available
- Force application
- Torque application
- Force application at specific points
- Fixed simulation timestep
- Collision filtering
- Continuous collision detection where appropriate
- Physical materials
- Mechanical constraints
- Debug visualization

### Architecture requirement

Create or preserve a physics adapter layer.

The vehicle simulation should not be unnecessarily dependent on one specific physics engine.

The physics engine should handle rigid-body integration and collisions.

The vehicle simulation layer should calculate vehicle-specific forces.

Avoid running a built-in vehicle solver and a custom vehicle solver simultaneously on the same wheels unless their responsibilities are explicitly separated.

---

## 7. SIMULATION TIMESTEP

Physics must operate independently from rendering.

Initial target:

- Physics simulation: 60 Hz
- Advanced evaluation: 120 Hz
- Rendering: independent and interpolated

Use a fixed timestep.

Do not use an unrestricted variable frame delta for suspension and tire calculations.

Implement:

- Fixed timestep accumulator
- Maximum accumulated time
- Maximum substeps
- Rendering interpolation
- Protection against excessive frame stalls

Evaluate additional substeps for:

- High-speed driving
- Stiff suspension
- Wheel impacts
- Tire force calculations
- Landing impacts
- Mechanical constraints

Measure performance before increasing simulation frequency.

The vehicle should behave consistently at different rendering frame rates.

---

## 8. VEHICLE CHASSIS DYNAMICS

Each vehicle requires a physical chassis with:

- Total mass
- Sprung mass
- Unsprung mass or documented approximation
- Center of mass
- Inertia tensor
- Wheelbase
- Front track width
- Rear track width
- Ride height
- Ground clearance
- Collision geometry
- Weight distribution
- Cargo capacity
- Aerodynamic drag
- Aerodynamic lift or downforce where applicable

### Physical movement axes

Simulate:

- Longitudinal movement
- Lateral movement
- Vertical movement
- Pitch
- Roll
- Yaw

### Weight transfer

Weight should naturally transfer through vehicle acceleration, deceleration, cornering, suspension movement, and force application locations.

Engineering reference approximations:

Longitudinal load transfer:

    DeltaF = mass * longitudinalAcceleration * centerOfMassHeight / wheelbase

Lateral load transfer approximation:

    DeltaF = mass * lateralAcceleration * centerOfMassHeight / trackWidth

The lateral formula represents a simplified total transfer approximation.

Actual front and rear distribution depends on suspension geometry, roll stiffness, roll centers, and other factors.

Use these equations to validate behavior.

Do not add artificial weight transfer on top of load transfer that already emerges from the physical solver.

### Center of mass

Center of mass should respond to:

- Engine placement
- Fuel tank placement
- Cargo
- Spare tires
- Batteries
- Vehicle modifications
- Chassis construction
- Heavy accessories

Changes in center of mass should alter:

- Cornering
- Braking
- Acceleration
- Rollover resistance
- Jump behavior
- Suspension loading

---

## 9. WHEEL PHYSICS

Each wheel maintains its own independent physical state.

Required data:

- Wheel ID
- Axle ID
- Local mounting position
- World position
- Wheel radius
- Wheel width
- Wheel mass
- Rotational inertia
- Angular velocity
- Wheel RPM
- Steering angle
- Camber
- Toe
- Tire pressure
- Suspension position
- Suspension velocity
- Contact point
- Contact normal
- Contact surface
- Normal load
- Longitudinal force
- Lateral force
- Slip ratio
- Slip angle
- Drive torque
- Brake torque
- Tire condition
- Contact status

### Wheel-ground contact

Initial implementation may use raycast wheels.

Evaluate improvements through:

- Sphere casts
- Shape casts
- Multiple contact samples
- Tire envelope models
- Contact patch approximations

A single raycast may fail to accurately represent:

- Rock edges
- Curbs
- Narrow obstacles
- Deep ruts
- Tire width
- Rough terrain

Multiple contact samples should be combined into a coherent contact model.

Do not multiply the total available tire force by the number of samples.

### Airborne behavior

When a wheel loses contact:

- Normal ground force becomes zero.
- Tire traction becomes zero.
- Suspension extends toward its droop limit.
- Wheel rotation continues according to torque and inertia.
- Braking can still slow wheel rotation.

Airborne wheels must not continue propelling the vehicle through nonexistent ground contact.

---

## 10. SUSPENSION ENGINEERING

Suspension is one of the most important systems in the game.

It determines how the vehicle responds to:

- Terrain
- Impacts
- Braking
- Acceleration
- Cornering
- Jumps
- Landings
- Vehicle loading
- Mechanical modifications

### Supported suspension architectures

Eventually support:

- MacPherson strut
- Double wishbone
- Multi-link
- Trailing arm
- Semi-trailing arm
- Solid axle
- Live axle
- Leaf spring
- Coil spring
- Coilover
- Torsion bar
- Long-travel racing suspension

Distinguish between suspension layout and spring technology.

For example, a coilover is a spring/damper arrangement rather than a complete suspension geometry.

Start with a common suspension interface.

Introduce layout-specific kinematics incrementally.

### Required suspension properties

- Rest length
- Minimum length
- Maximum length
- Compression travel
- Droop travel
- Spring stiffness
- Spring preload
- Compression damping
- Rebound damping
- Progressive spring rate
- Bump stop stiffness
- Bump stop engagement
- Motion ratio
- Anti-roll stiffness
- Static sag
- Suspension geometry
- Mechanical condition

### Spring force

Hooke's law:

    Fspring = k * x

Where:

- Fspring = spring force
- k = effective spring stiffness
- x = spring compression

### Damper force

    Fdamper = c * suspensionVelocity

The damper force must oppose suspension motion.

Use different compression and rebound coefficients when appropriate.

Document the displacement and velocity sign convention.

### Effective wheel rate

Using sprung corner mass and desired natural frequency:

    wheelRate = sprungCornerMass * (2 * PI * naturalFrequency)^2

### Critical damping

    criticalDamping = 2 * sqrt(wheelRate * sprungCornerMass)

### Target damping

    damping = dampingRatio * criticalDamping

### Static sag approximation

For an unpreloaded linear spring:

    staticSag = sprungCornerMass * gravity / wheelRate

Preload, progressive springs, motion ratios, and suspension geometry change the relationship.

### Motion ratio

If motion ratio is defined as:

    motionRatio = springMovement / wheelMovement

Then:

    wheelRate = springRate * motionRatio^2

An equivalent relationship applies to linear damping under the same assumptions.

Do not confuse shock travel with total wheel travel.

### Example suspension calculation

Illustrative starting values:

- Sprung corner mass: 270 kg
- Target ride frequency: 1.5 Hz
- Damping ratio: 0.65

Approximate results:

- Effective wheel spring rate: 24,000 N/m
- Effective wheel damping: 3,310 N*s/m

These are example values, not universal off-road racing specifications.

### Advanced damping

Eventually support:

- Low-speed compression
- High-speed compression
- Low-speed rebound
- High-speed rebound
- Digressive damping
- Progressive damping
- Position-sensitive damping
- Hydraulic bump stops
- Internal bypass shocks
- External bypass shocks

High-speed and low-speed damping refer to shock shaft velocity, not vehicle speed.

### Anti-roll bars

Anti-roll behavior should depend on left-to-right suspension displacement differences.

Anti-roll systems should:

- Reduce body roll
- Redistribute axle loading
- Affect cornering balance
- Reduce articulation when overly stiff

Avoid creating unlimited artificial restoring torque.

### Suspension articulation

Independent wheels must respond differently to uneven terrain.

Solid axles must eventually account for coupling between left and right wheels.

The first virtual-wheel implementation may approximate axle coupling.

Document this limitation.

### Bottoming out

When suspension reaches the compression limit:

- Bump stops engage.
- Effective resistance increases.
- Impact feedback increases.
- Mechanical damage may occur.
- Chassis collision may occur.

Avoid instantly teleporting wheels away from the terrain.

---

## 11. TIRE PHYSICS

Tires are the primary connection between the vehicle and terrain.

The tire model should calculate forces from:

- Normal load
- Longitudinal slip
- Lateral slip
- Tire dimensions
- Tire configuration
- Tire pressure
- Surface characteristics
- Tire condition

### Longitudinal slip ratio

A simplified regularized representation:

    slipRatio = (wheelAngularVelocity * effectiveRadius - longitudinalVelocity)
                / max(abs(longitudinalVelocity), abs(wheelAngularVelocity * effectiveRadius), minimumVelocity)

Handle:

- Low-speed movement
- Reverse driving
- Standing starts
- Wheel lockup
- Wheelspin
- Zero-velocity conditions

A stable low-speed model is essential.

### Lateral slip angle

A simplified representation:

    slipAngle = atan2(lateralVelocity, max(abs(longitudinalVelocity), minimumVelocity))

Use a consistent sign convention.

Calculate velocities relative to the wheel and contact surface.

### Combined slip

Simplified friction-circle constraint:

    sqrt(longitudinalForce^2 + lateralForce^2) <= frictionCoefficient * normalLoad

More advanced implementations may use:

- Friction ellipses
- Load-sensitive curves
- Brush tire models
- Fiala models
- TMeasy-style models
- Pacejka-style empirical models

Choose the model based on available data, performance, and stability.

Do not assume a complicated tire equation automatically produces realistic handling.

### Tire load sensitivity

Tire grip should not necessarily increase linearly with vertical load.

A heavily loaded tire may generate more total grip while producing less grip per unit of load.

This behavior is important for:

- Weight transfer
- Understeer
- Oversteer
- Cornering balance
- Suspension tuning

### Tire relaxation

Where needed, implement relaxation length or another documented transient force approximation.

Tire force should not always appear instantaneously when slip changes.

This may improve:

- Steering transitions
- Drift behavior
- Transient stability
- Feedback consistency

### Tire types

Support:

- Street tires
- Performance street tires
- Rally tires
- All-terrain tires
- Mud-terrain tires
- Sand tires
- Rock-crawling tires
- Off-road racing tires
- Worn tires
- Damaged tires

### Tire pressure

Pressure should affect calibrated properties such as:

- Effective tire stiffness
- Contact area
- Rolling resistance
- Surface compliance
- Soft-ground performance
- Steering responsiveness
- Tire damage susceptibility

Lower pressure should not automatically increase grip on every surface.

### Tire wear and temperature

Later phases may include:

- Surface temperature
- Internal temperature
- Tread wear
- Uneven wear
- Pressure changes
- Punctures
- Sidewall damage
- Blowouts

Use simplified, documented thermal and wear models before attempting detailed tire thermodynamics.

---

## 12. TERRAIN PHYSICS AND TERRAMECHANICS

Terrain is a physical system.

It must not exist only as a visual texture.

Each terrain material requires a physical configuration.

### Terrain properties

- Surface friction
- Longitudinal traction
- Lateral traction
- Rolling resistance
- Surface roughness
- Surface hardness
- Soil cohesion
- Internal friction
- Soil strength
- Moisture
- Compaction
- Sinkage
- Shear resistance
- Deformation potential
- Tire compatibility

### Asphalt

Behavior:

- Relatively high rigid-surface traction
- Low sinkage
- Predictable steering
- Surface-dependent braking
- Reduced traction when wet

### Hard-packed dirt

Behavior:

- Moderate to high traction depending on condition
- Low to moderate resistance
- Surface irregularities
- Dust generation
- Controlled sliding

### Loose gravel

Behavior:

- Loose-surface slip
- Reduced steering precision
- Gravel displacement
- Longer braking distances under many conditions
- Increasing or decreasing traction depending on tire and surface state

### Sand

Behavior:

- Tire sinkage
- Increased rolling resistance
- Soil displacement
- Increased wheelspin potential
- Pressure-dependent performance
- Momentum-sensitive traversal

### Deep sand

Behavior:

- Greater sinkage
- Higher motion resistance
- Higher risk of becoming stuck
- Increased drivetrain load
- Stronger dependence on tire size and pressure

### Mud

Behavior:

- Soil shear
- Reduced traction in many conditions
- Increased rolling resistance
- Rut formation
- Tire clogging approximations
- Vehicle weight sensitivity

### Rock

Behavior:

- Rigid contact
- Abrupt elevation changes
- Tire impacts
- Suspension articulation
- Potential tire and component damage
- Surface-dependent traction

### Grass

Behavior:

- Variable traction
- Moisture sensitivity
- Underlying soil influence
- Potentially increased resistance

### Water

Behavior:

- Wet-surface traction changes
- Water drag
- Depth-dependent resistance
- Splash generation
- Potential mechanical effects

Deep-water buoyancy and engine flooding may be implemented later.

### Mixed surfaces

Each wheel must independently identify its contact surface.

Examples:

- Left wheels on asphalt
- Right wheels on gravel
- Front wheels in mud
- Rear wheels on hard-packed dirt

Asymmetric surface traction should naturally affect vehicle handling.

Do not script arbitrary sideways movement to simulate this.

---

## 13. SOFT-GROUND SIMULATION

Use terramechanics as an engineering research reference.

Initial implementation can use calibrated simplified approximations.

Advanced models may evaluate Bekker pressure-sinkage relationships:

    pressure = (kc / contactWidth + kphi) * sinkage^n

Where:

- kc = cohesive soil modulus
- kphi = frictional soil modulus
- n = sinkage exponent

These are calibrated soil parameters with model-dependent units.

Evaluate Janosi-Hanamoto-style soil shear relationships:

    shearStress = (cohesion + normalStress * tan(frictionAngle))
                  * (1 - exp(-shearDisplacement / shearLength))

These relationships require valid soil parameters and contact-area estimates.

Do not insert them into the simulation with arbitrary universal constants.

### Soft-ground implementation stages

Stage 1:

- Surface-dependent traction
- Surface-dependent resistance
- Approximate sinkage

Stage 2:

- Load-dependent sinkage
- Tire-width-dependent contact
- Pressure-dependent contact area
- Soil shear approximation

Stage 3:

- Persistent ruts
- Soil compaction
- Displaced soil
- Terrain condition changes

Stage 4:

- More detailed deformable terrain
- Vehicle interaction with previously created tracks
- Wetness and soil evolution

Visual terrain deformation must remain consistent with physical contact geometry when enabled.

---

## 14. DRIVETRAIN ENGINEERING

The drivetrain transfers engine torque to the wheels.

Required systems:

- Engine
- Flywheel
- Clutch
- Transmission
- Transfer case
- Differential
- Driveshaft
- Axles
- Wheels
- Brakes

### Engine model

Required properties:

- Idle RPM
- Maximum RPM
- Torque curve
- Power curve
- Rotational inertia
- Throttle response
- Engine friction
- Engine braking
- Rev limiter
- Mechanical condition

Engine power:

    power = torque * angularVelocity

RPM conversion:

    angularVelocity = RPM * 2 * PI / 60

### Transmission

Required properties:

- Gear ratios
- Reverse ratio
- Final drive ratio
- Shift duration
- Mechanical efficiency
- Gear selection
- Transmission type

Idealized wheel torque relationship:

    totalAxleInputTorque =
        engineTorque * gearRatio * finalDriveRatio * efficiency

Individual wheel torque must be determined by drivetrain and differential behavior.

### Wheel rotational dynamics

    angularAcceleration = netWheelTorque / wheelInertia

Net wheel torque accounts for:

- Drive torque
- Brake torque
- Tire reaction torque
- Bearing resistance
- Other rotational losses

Avoid applying drivetrain torque and unrelated forward propulsion simultaneously.

### Drivetrain layouts

Support:

- FWD
- RWD
- AWD
- 4WD
- Selectable 4WD
- Low-range 4WD

### Differentials

Support:

- Open differential
- Limited-slip differential
- Locked differential
- Configurable torque bias
- Electronic traction assistance

Open differentials should behave differently from locked differentials when one wheel loses traction.

Locked differentials constrain relative wheel speeds and should introduce appropriate turning tradeoffs.

### Clutch

Eventually support:

- Clutch engagement
- Clutch slip
- Engine stalling
- Launch behavior
- Clutch wear
- Manual and automatic control

---

## 15. STEERING ENGINEERING

Required systems:

- Steering input
- Steering angle
- Steering rate
- Maximum steering lock
- Steering geometry
- Ackermann approximation
- Steering responsiveness
- Self-centering approximation
- Tire aligning forces where supported

### Ackermann geometry

For ideal low-speed geometry:

    insideAngle = atan(wheelbase / (turnRadius - trackWidth / 2))

    outsideAngle = atan(wheelbase / (turnRadius + trackWidth / 2))

Actual high-speed vehicle behavior may require geometry and slip-angle considerations beyond ideal Ackermann steering.

### Handling behavior

Allow natural emergence of:

- Understeer
- Oversteer
- Power oversteer
- Lift-off oversteer
- Countersteering
- Traction loss
- Drift recovery
- Rollover

Do not force these behaviors using artificial chassis rotation.

### Input assistance

Support:

- Keyboard
- Gamepad
- Steering wheel where available

Keyboard input may require:

- Steering input smoothing
- Steering rate limits
- Throttle ramping
- Brake ramping

Separate these control aids from the physical solver.

---

## 16. DRIVING ASSISTANCE PROFILES

Provide a common physics foundation with adjustable assistance.

### Simulation

- Minimal driving assistance
- Direct throttle response
- Manual transmission option
- Realistic traction loss
- Limited automatic recovery

### Balanced

- Optional traction control
- ABS
- Steering assistance
- Automatic transmission option
- Moderate stability assistance

### Accessible

- Increased input smoothing
- More active driver assistance
- Easier recovery
- Automatic transmission
- Optional simplified clutch controls

Driver assistance should operate through plausible steering, braking, or torque interventions.

Do not secretly replace the vehicle's physical behavior with unrelated arcade movement.

---

## 17. BRAKING SYSTEM

Required properties:

- Brake torque
- Brake bias
- Front brake configuration
- Rear brake configuration
- Parking brake
- Brake pedal response
- Brake condition

Support:

- Wheel lockup
- ABS
- Brake fade
- Brake temperature approximations
- Uneven braking
- Damaged brake components
- Handbrake turns

Braking force must remain limited by tire-ground traction.

Larger brakes should not automatically shorten stopping distance when the vehicle is already traction-limited.

---

## 18. AERODYNAMICS AND RESISTANCE

Aerodynamic drag:

    dragForce = 0.5 * airDensity * dragCoefficient * frontalArea * velocity^2

Apply drag opposite relative airflow.

Basic rolling resistance approximation:

    rollingResistance = rollingResistanceCoefficient * normalLoad

Handle near-zero velocity without creating unstable direction changes.

Additional systems:

- Wind
- Headwind
- Tailwind
- Crosswind
- Aerodynamic downforce
- Aerodynamic balance
- Terrain resistance
- Mechanical drag
- Drivetrain losses

Aerodynamic and rolling resistance should emerge from documented force models.

---

## 19. VIBRATION AND PHYSICAL FEEDBACK

Vibration must communicate what the physical vehicle is experiencing.

Do not use constant random camera shaking as the primary vibration system.

### Vibration sources

- Engine rotation
- Engine combustion
- Wheel rotation
- Tire deformation
- Surface roughness
- Suspension compression
- Suspension rebound
- Unsprung wheel movement
- Wheel impacts
- Suspension bottoming
- Drivetrain lash
- Tire slip
- Wheelspin
- Brake vibration
- Damaged components
- Vehicle collisions

### Physical measurements

Track:

- Chassis acceleration
- Angular acceleration
- Suspension velocity
- Suspension acceleration
- Contact-load changes
- Impact impulses
- Wheel angular velocity
- Tire slip
- Engine RPM

Filter differentiated signals to reduce numerical noise.

### Terrain excitation frequency

For repeated terrain features:

    excitationFrequency = vehicleSpeed / terrainFeatureSpacing

Example:

- Vehicle speed: 20 m/s
- Washboard spacing: 0.5 m
- Excitation frequency: 40 Hz

The terrain input frequency and actual chassis response frequency are not necessarily identical.

Suspension and tires filter the input.

### Engine vibration frequency

Basic shaft rotational frequency:

    engineFrequency = RPM / 60

Combustion excitation depends on:

- Engine configuration
- Cylinder count
- Firing order
- Engine cycle
- Mechanical balance

For an evenly firing four-stroke engine:

    firingFrequency = RPM * cylinderCount / 120

This is a simplified combustion-event frequency.

### Feedback channels

Separate signals into appropriate frequency ranges.

Low-frequency:

- Body roll
- Pitch
- Large suspension movement
- Large terrain undulations

Medium-frequency:

- Suspension impacts
- Rough ground
- Wheel hop

High-frequency:

- Engine vibration
- Gravel texture
- Tire-related vibration

Use filtering and amplitude limits.

### Camera feedback

Support:

- Cockpit camera movement
- Chase camera movement
- Impact shake
- Landing response
- Acceleration response
- Braking response
- Terrain-related movement

Camera behavior must remain readable.

Provide:

- Vibration intensity settings
- Camera shake settings
- Motion sensitivity settings
- Complete disable option

### Controller feedback

Use simulation-derived signals for:

- Engine rumble
- Wheelspin
- Tire slip
- Rough terrain
- Suspension impacts
- Bottoming
- Collisions

Detect actual browser and hardware haptic support.

Do not assume all devices support haptics.

### Steering wheel feedback

Where hardware integration permits:

- Tire aligning torque
- Steering resistance
- Terrain kickback
- Steering vibration
- Traction loss feedback

Browser-based steering-wheel force feedback may have substantial platform limitations.

Document supported capabilities.

---

## 20. JUMPING AND AIRBORNE PHYSICS

Vehicles should leave the ground through physical momentum and terrain geometry.

Do not use scripted upward forces to create ordinary jumps.

While airborne:

- Gravity remains active.
- Chassis linear momentum continues.
- Chassis angular momentum continues.
- Suspension extends toward droop limits.
- Wheels rotate according to their torque state.
- Tire-ground traction is zero.

Where supported, account for drivetrain and wheel angular-momentum reactions.

Avoid unrealistic midair steering unless explicitly provided as an optional gameplay assist.

### Landing

Landing behavior should depend on:

- Vehicle mass
- Vertical impact speed
- Landing angle
- Suspension travel
- Spring rate
- Damping
- Tire compliance
- Terrain hardness
- Chassis contact
- Mechanical condition

Landings should produce:

- Suspension compression
- Rebound
- Chassis movement
- Impact sounds
- Camera feedback
- Controller rumble
- Potential mechanical damage

Do not create artificial bounce animations independent of physics.

---

## 21. MECHANICAL DAMAGE SYSTEM

Damage must influence physical behavior.

### Suspension damage

- Bent control arms
- Damaged springs
- Leaking shock absorbers
- Broken shock mounts
- Damaged leaf springs
- Bent axles
- Damaged suspension bushings

Possible effects:

- Reduced damping
- Changed ride height
- Changed wheel alignment
- Reduced travel
- Increased instability
- Reduced durability

### Steering damage

- Bent tie rods
- Damaged steering rack
- Damaged steering linkage
- Alignment changes

Possible effects:

- Steering pull
- Reduced steering range
- Uneven steering response
- Increased tire wear

### Tire damage

- Punctures
- Pressure loss
- Sidewall damage
- Tread damage
- Tire separation

Possible effects:

- Changed rolling resistance
- Reduced traction
- Changed stiffness
- Changed effective rolling radius
- Increased vibration

### Drivetrain damage

- Broken axles
- Damaged differentials
- Damaged driveshafts
- Transmission damage
- Clutch wear

Possible effects:

- Reduced torque delivery
- Loss of drive to wheels
- Reduced efficiency
- Increased vibration
- Gear-related failures

### Engine damage

- Reduced power
- Reduced torque
- Increased friction
- Overheating
- Misfires
- Mechanical failure

### Damage calculation

Consider:

- Impact impulses
- Relative collision velocity
- Estimated component loading
- Repeated stress
- Component condition
- Component strength
- Accumulated wear

Do not use a single global vehicle health number as the only mechanical damage model.

Initial damage models may use calibrated approximations rather than full stress or finite-element simulation.

---

## 22. VEHICLE BUILDING AND GARAGE INTEGRATION

Every functional vehicle component should have a connection to the vehicle simulation.

Replacing a part should modify relevant physical parameters.

Scope limit: this section defines how parts feed physics parameters. It does not authorize building garage UI, shops, pricing, unlocks, or progression. Those are Chris's calls. Connect existing parts (PART_001 to PART_016) to physics first, and ask before adding anything else.

### Engine upgrades

Affect:

- Torque curve
- Horsepower
- Mass
- Throttle response
- Engine inertia
- Cooling requirements

### Transmission upgrades

Affect:

- Gear ratios
- Shift behavior
- Torque capacity
- Efficiency

### Suspension upgrades

Affect:

- Wheel travel
- Ride height
- Spring rates
- Damping curves
- Suspension geometry
- Component strength

### Tire upgrades

Affect:

- Radius
- Width
- Mass
- Inertia
- Surface compatibility
- Grip characteristics
- Rolling resistance

### Wheel upgrades

Affect:

- Unsprung mass
- Rotational inertia
- Strength
- Offset
- Track width

### Chassis modifications

Affect:

- Mass
- Center of mass
- Inertia
- Geometry
- Component mounting positions
- Collision geometry
- Structural durability approximations

### Cargo and accessories

Affect:

- Total vehicle mass
- Weight distribution
- Center of mass
- Aerodynamic properties where applicable

### Compatibility system

Parts should define:

- Compatible vehicle platforms
- Mounting requirements
- Physical dimensions
- Connection points
- Mechanical interfaces
- Load ratings
- Torque ratings
- Clearance requirements

Avoid treating upgrades as percentage-based stat bonuses when their effects can be expressed through actual mechanical parameters.

---

## 23. VEHICLE CONFIGURATION DATA

Use structured vehicle configurations.

Avoid scattering magic numbers through the simulation.

Example conceptual structure:

    VehicleConfiguration
        Identity
        Dimensions
        MassProperties
        Chassis
        Axles
        Wheels
        Tires
        Suspension
        Steering
        Engine
        Transmission
        TransferCase
        Differentials
        Brakes
        Aerodynamics
        Damage
        Feedback
        DriverAssistance

Each physical part should have:

- Unique identifier
- Part category
- Physical properties
- Mechanical properties
- Condition
- Compatibility
- Mounting information
- Simulation parameter contributions

Recalculate relevant vehicle properties when parts change.

Prevent invalid configurations from entering the physics solver.

Validate:

- Missing wheels
- Invalid dimensions
- Negative mass
- Invalid spring rates
- Invalid gear ratios
- Missing mechanical connections
- Incompatible mounting points

Distinguish between intentionally disabled components and invalid data.

---

## 24. SUGGESTED SOFTWARE ARCHITECTURE

Adapt this architecture to the existing repository.

Do not automatically create duplicate systems.

    src/
        simulation/
            physics/
                PhysicsAdapter
                FixedTimestep
                CollisionSystem
                PhysicsMath

            vehicle/
                VehicleDynamics
                VehicleConfiguration
                VehicleState
                VehicleFactory
                ChassisDynamics
                WheelDynamics

                suspension/
                    SuspensionSystem
                    SuspensionGeometry
                    SpringModel
                    DamperModel
                    AntiRollSystem
                    BumpStopModel

                tires/
                    TireForceModel
                    TireContactModel
                    TireConfiguration
                    TireWearModel
                    TireTemperatureModel

                drivetrain/
                    EngineSystem
                    ClutchSystem
                    TransmissionSystem
                    DifferentialSystem
                    TransferCaseSystem
                    BrakeSystem

                steering/
                    SteeringSystem
                    SteeringGeometry
                    DriverAssistance

                damage/
                    DamageSystem
                    ComponentCondition
                    ImpactEvaluation

                feedback/
                    VehicleFeedbackSystem
                    VibrationSignals
                    CameraFeedback
                    ControllerFeedback
                    AudioSignals

            terrain/
                TerrainMaterialSystem
                TerrainContactSampler
                TerrainResistance
                SoftGroundModel
                TerrainDeformation

            telemetry/
                PhysicsTelemetry
                VehicleTelemetry
                WheelTelemetry
                TestRecorder

        testing/
            VehicleTestRig
            SuspensionTests
            TireTests
            DrivetrainTests
            TerrainTests
            StabilityTests

Keep high-frequency simulation state outside ordinary React rendering state.

Use typed interfaces.

Reuse mathematical helpers.

Avoid unnecessary allocations inside physics loops.

---

## 25. PHYSICS UPDATE PIPELINE

The following is a conceptual update order.

Adapt it to the selected physics engine and its integration API.

For each fixed physics step:

1. Read driver inputs.
2. Apply input smoothing and assistance.
3. Read current chassis state.
4. Update engine state.
5. Update clutch and transmission.
6. Calculate drivetrain torque distribution.
7. Calculate steering angles.
8. Query wheel-ground contact.
9. Determine terrain materials.
10. Calculate suspension displacement.
11. Calculate suspension velocity.
12. Calculate spring and damper forces.
13. Calculate anti-roll and bump-stop effects.
14. Estimate tire normal loads.
15. Calculate wheel contact velocities.
16. Calculate longitudinal slip.
17. Calculate lateral slip.
18. Calculate tire forces.
19. Apply combined-slip limits.
20. Calculate terrain resistance.
21. Update wheel rotational dynamics.
22. Apply forces and torques to the chassis.
23. Apply aerodynamic and other external forces.
24. Advance the rigid-body physics simulation.
25. Evaluate collision and impact events.
26. Evaluate mechanical damage.
27. Update telemetry.
28. Generate feedback signals.
29. Interpolate visual transforms for rendering.

Some tightly coupled systems may require iterative solutions or substeps.

Avoid double-counting normal forces, tire forces, and collision response.

---

## 26. ENGINEERING DEBUG INTERFACE

Build a vehicle engineering and telemetry interface.

### Vehicle telemetry

Display:

- Speed
- Acceleration
- Pitch
- Roll
- Yaw
- Angular velocity
- Vehicle mass
- Center of mass
- Engine RPM
- Engine torque
- Engine power
- Current gear
- Throttle input
- Brake input
- Steering input

### Per-wheel telemetry

Display:

- Ground contact
- Surface material
- Suspension compression
- Suspension extension
- Suspension velocity
- Spring force
- Damper force
- Normal load
- Wheel RPM
- Slip ratio
- Slip angle
- Longitudinal force
- Lateral force
- Drive torque
- Brake torque
- Tire pressure
- Tire condition

### Visual debug elements

- Contact points
- Contact normals
- Force arrows
- Suspension travel indicators
- Wheel collision geometry
- Center-of-mass marker
- Chassis collider
- Steering angles
- Tire force utilization

### Engineering graphs

Record:

- Suspension displacement over time
- Suspension velocity over time
- Wheel load over time
- Wheel slip over time
- Vehicle acceleration
- Vehicle speed
- Engine RPM
- Impact acceleration
- Chassis vibration

Support exporting test telemetry where practical.

Provide live tuning controls for engineering use.

---

## 27. VEHICLE PHYSICS TEST FACILITY

Create a dedicated testing environment separate from normal gameplay.

### Test 1: Static suspension pad

Purpose:

Validate mass distribution, ride height, static sag, and suspension equilibrium.

Expected behavior:

- Vehicle settles under gravity.
- Suspension supports vehicle weight.
- Wheels maintain valid ground contact.
- No uncontrolled oscillation occurs.

### Test 2: Acceleration lane

Purpose:

Validate engine, drivetrain, tire traction, and acceleration.

Measure:

- 0-60 MPH
- Acceleration curves
- Gear changes
- Wheelspin
- Engine RPM
- Maximum speed

### Test 3: Braking lane

Purpose:

Validate braking forces, weight transfer, and tire limits.

Measure:

- Stopping distance
- Deceleration
- Wheel lockup
- ABS behavior
- Brake bias

### Test 4: Constant-radius skidpad

Purpose:

Validate lateral grip, steering balance, and tire slip.

Measure:

- Lateral acceleration
- Slip angles
- Steering angle
- Understeer
- Oversteer
- Wheel loading

### Test 5: Slalom course

Purpose:

Validate transient handling, weight transfer, and steering responsiveness.

### Test 6: Single-wheel bump

Purpose:

Validate independent wheel behavior.

Use several documented bump heights and approach speeds.

Expected behavior:

- One wheel compresses.
- Chassis responds physically.
- Other wheels respond through chassis and suspension coupling.
- Suspension returns toward equilibrium.

### Test 7: Washboard road

Purpose:

Validate repeated terrain excitation and vibration.

Vary:

- Bump spacing
- Bump height
- Vehicle speed
- Suspension stiffness
- Compression damping
- Rebound damping

Look for:

- Wheel hop
- Loss of contact
- Excessive chassis vibration
- Resonance
- Suspension packing
- Numerical instability

### Test 8: Articulation obstacle

Purpose:

Validate suspension travel and axle behavior.

Include diagonally positioned obstacles.

### Test 9: Rock garden

Purpose:

Validate wheel contact detection and obstacle interaction.

Compare raycast and improved contact models when necessary.

### Test 10: Loose gravel corner

Purpose:

Validate controlled slip and loose-surface handling.

### Test 11: Deep sand section

Purpose:

Validate sinkage, rolling resistance, tire pressure effects, and traction.

### Test 12: Mud section

Purpose:

Validate soft-ground traction and vehicle recovery.

### Test 13: Incline ramp

Purpose:

Validate hill climbing, gearing, braking, and traction.

### Test 14: Side-slope ramp

Purpose:

Validate stability, center of mass, and rollover behavior.

### Test 15: Jump and landing

Purpose:

Validate airborne motion, suspension droop, impact response, and landing stability.

### Test 16: Mixed-surface lane

Purpose:

Validate independent wheel-ground traction.

Examples:

- Left wheels on asphalt
- Right wheels on gravel
- Front wheels on sand
- Rear wheels on hard-packed dirt

### Test 17: Differential test

Purpose:

Compare open, limited-slip, and locked differentials.

Include split-traction and wheel-lift situations.

### Test 18: Mechanical damage test

Purpose:

Verify damaged components produce expected physical changes.

Examples:

- Reduced shock damping
- Bent steering alignment
- Flat tire
- Disabled driven axle
- Reduced engine torque

### Test 19: Vehicle upgrade comparison

Purpose:

Verify that part changes produce measurable effects.

Examples:

- Stock versus long-travel suspension
- Street versus sand tires
- Standard versus low-range gearing
- Heavy versus lightweight wheels

---

## 28. INITIAL TEST VEHICLE SPECIFICATION

The test vehicle is VEH_001, the starter Bug. All values are estimates. Store them in data files with source notes and flag any that cannot be backed up.

### Dimensions and mass

- Curb mass: 750 to 850 kg
- Wheelbase: about 2.4 m
- Track width: about 1.3 m
- Weight split: about 40 front / 60 rear
- CG height: about 0.5 m, rising with cage and spare
- Tire diameter: about 0.62 to 0.65 m (stock street tire, estimate)
- Wheel travel: stock about 4 to 6 in (0.10 to 0.15 m); trail beater about 8 to 10 in; Baja conversion about 10 to 14 in

Mass and CG are computed from installed parts. Each part has a mass and a mounting position.

### Suspension starting point

- Initial target ride frequency: 1.5 Hz
- Initial damping ratio: 0.65
- Spring rates calculated from actual sprung corner loads
- Separate compression and rebound tuning
- Progressive bump stops

Worked example at 800 kg, 40/60 split, about 35 kg unsprung per corner (all estimates):

| Corner | Sprung corner mass | Wheel rate | Damping | Static sag |
|---|---|---|---|---|
| Front | about 132 kg | about 11,700 N/m | about 1,620 N*s/m | about 0.11 m |
| Rear | about 198 kg | about 17,600 N/m | about 2,430 N*s/m | about 0.11 m |

Warning: for an unpreloaded linear spring, static sag depends only on ride frequency (sag = g / (2 * PI * f)^2). At 1.5 Hz that is about 0.11 m, which uses most of the stock 0.10 to 0.15 m travel. For the stock setup, use preload, a higher ride frequency, or both, and record the choice. Long-travel setups do not have this problem.

### Drivetrain

- Rear-wheel drive
- Rear-mounted air-cooled flat-four, 1.2 to 1.6 L, 40 to 60 hp stock
- Four-speed manual transmission (estimate, verify against a manual)
- Torque curve data, not only peak power
- Open differential stock

### Simulation

- Initial physics update: 60 Hz
- Higher-frequency testing: 120 Hz
- Independent rendering interpolation

### Generic racer (reference only)

The earlier draft of this document used a generic 1,350 kg racer (2.75 m wheelbase, 1.68 m track, 0.90 m tires, 0.38 m travel). That is a reference for future trophy-truck-class vehicles only. Do not use it for VEH_001.

---

## 29. VALIDATION AND ACCEPTANCE CRITERIA

The system is not considered complete simply because the vehicle moves.

### Numerical stability

Required:

- No NaN values
- No infinite forces
- No negative physical mass
- No invalid rotations
- No uncontrolled acceleration
- No unexplained energy generation
- No uncontrolled suspension oscillation

### Static equilibrium

Suggested initial test tolerance:

On level ground with no aerodynamic loading, the combined vertical support forces should approximately equal vehicle weight.

Target tolerance after settling:

- Within approximately 2-5 percent

Account for chassis contacts and solver tolerances.

### Suspension validation

Required:

- Measured static sag reasonably matches calculated sag.
- Suspension oscillation decays with positive damping.
- Compression and rebound settings produce measurable differences.
- Travel limits behave consistently.
- Bump stops engage at configured positions.

### Tire validation

Required:

- Tire force respects the selected combined-slip model.
- Airborne tire-ground traction is zero.
- Increased slip does not produce unlimited grip.
- Different tires produce measurable handling differences.

### Frame-rate validation

Run repeatable tests at rendering rates such as:

- 30 FPS
- 60 FPS
- 120 FPS
- 144 FPS

Compare:

- Distance traveled
- Final speed
- Braking distance
- Suspension behavior
- Vehicle position

A fixed-step simulation should produce reasonably consistent results.

Establish numerical tolerances based on the engine's actual determinism and integration behavior.

### Terrain validation

Different surfaces must create measurable differences in:

- Traction
- Acceleration
- Braking
- Steering response
- Rolling resistance
- Suspension movement
- Vibration

### Mechanical validation

Changing a physical component must modify its corresponding simulation properties.

Examples:

- Lower spring stiffness increases suspension sag.
- Reduced damping changes rebound behavior.
- Changed gear ratio changes wheel torque.
- Increased vehicle mass changes acceleration and loading.
- Altered tire pressure changes the calibrated tire response.
- Broken axle changes torque delivery.

Record actual results rather than relying on visual impressions.

---

## 30. PERFORMANCE REQUIREMENTS

Project: Baja should remain suitable for browser-based gameplay.

Profile the existing target hardware.

Measure:

- Physics frame time
- Wheel contact query time
- Vehicle solver time
- Terrain collision time
- Rendering frame time
- Memory consumption
- Allocation rate
- Garbage collection impact

### Optimization methods

Evaluate:

- Fixed timestep
- Selective substepping
- Collision filtering
- Simplified chassis colliders
- Efficient terrain collision meshes
- Reused vectors and temporary objects
- Physics sleeping
- Distance-based simulation complexity
- Reduced update frequencies for distant inactive vehicles
- Rendering interpolation

### Simulation levels of detail

Nearby player vehicle:

- Highest required simulation fidelity

Nearby active vehicles:

- Appropriate racing and collision fidelity

Distant vehicles:

- Reduced simulation complexity where acceptable

Inactive parked vehicles:

- Sleeping rigid bodies or static representations where appropriate

Simulation transitions must not cause obvious changes in vehicle behavior.

Do not compromise the player vehicle's basic physical correctness merely to improve rendering performance.

---

## 31. IMPLEMENTATION ROADMAP

### Phase 0: Repository audit

- Inspect current systems.
- Identify installed dependencies.
- Identify existing vehicle features.
- Identify existing physics architecture.
- Identify existing terrain architecture.
- Document conflicts and missing systems.
- Establish migration requirements.
- Create a phased implementation plan.

No unnecessary replacement of working systems.

### Phase 1: Fundamental vehicle physics

- One test vehicle
- Rigid chassis
- Correct mass and dimensions
- Wheel-ground contact
- Basic suspension
- Basic steering
- Fixed timestep
- Physics telemetry
- Static test pad

Acceptance gate:

Vehicle rests and moves consistently without instability.

### Phase 2: Tire and drivetrain dynamics

- Nonlinear tire force model
- Combined-slip limits
- Wheel rotational dynamics
- Engine torque curve
- Transmission
- Differential
- Braking
- Steering geometry

Acceptance gate:

Vehicle accelerates, brakes, corners, slides, and recovers through physical forces.

### Phase 3: Off-road terrain

- Terrain materials
- Surface-dependent grip
- Rolling resistance
- Rough terrain
- Improved wheel contacts
- Approximate sinkage
- Mixed-surface behavior

Acceptance gate:

Different terrain types produce measurable and believable physical differences.

### Phase 4: Advanced suspension

- Compression and rebound tuning
- Progressive springs
- Bump stops
- Anti-roll bars
- Motion ratios
- Axle coupling
- Suspension geometry approximations

Acceptance gate:

Suspension reacts correctly to bumps, articulation obstacles, washboards, jumps, and landings.

### Phase 5: Feedback

- Physics-derived vibration
- Camera response
- Controller rumble
- Suspension sounds
- Tire sounds
- Engine vibration
- Terrain particles

Acceptance gate:

Feedback corresponds to actual simulation events.

### Phase 6: Mechanical integration

- Vehicle part configurations
- Garage integration
- Repair mechanics
- Performance upgrades
- Component damage
- Physical compatibility
- Vehicle reconfiguration

Acceptance gate:

Parts and damage produce measurable changes in driving behavior.

### Phase 7: Advanced simulation

Evaluate:

- Explicit unsprung masses
- Advanced tire models
- Tire temperature
- Tire wear
- Deformable terrain
- Persistent ruts
- Advanced suspension kinematics
- Mechanical drivetrain constraints
- Advanced force feedback

Only introduce complexity when supported by performance and test results.

### Phase 8: Production integration

- Vehicle classes
- Racing modes
- AI drivers
- Vehicle recovery
- Save/load integration
- Multiplayer considerations if applicable
- Performance optimization
- Full regression testing

---

## 32. PHYSICS FIDELITY TARGETS

### Level 1: Basic physical foundation

- Rigid chassis
- Raycast or shape-cast wheels
- Spring-damper suspension
- Configurable traction
- Basic drivetrain

Purpose:

Establish stable and measurable vehicle movement.

### Level 2: Advanced game simulation

- Nonlinear tire forces
- Combined slip
- Physical drivetrain
- Dynamic weight transfer
- Terrain-dependent resistance
- Improved wheel contact
- Advanced suspension
- Mechanical damage
- Physics-derived feedback

This is the recommended core target for Project: Baja.

### Level 3: High-fidelity specialized simulation

- Multibody suspension
- Explicit unsprung dynamics
- Measured tire datasets
- Detailed transient tire behavior
- Advanced soft-ground mechanics
- More detailed component deformation

This is a future research and expansion target.

Do not require Level 3 to complete the initial game.

---

## 33. THINGS THE AI MUST NOT DO

Do not:

- Fake vehicle acceleration by changing position.
- Fake steering by directly rotating the chassis.
- Fake suspension using visual animations only.
- Use random camera shake as the entire vibration model.
- Give every terrain surface identical physical behavior.
- Represent all tire behavior with a single friction number.
- Give tires unlimited lateral grip.
- Apply tire traction while wheels are airborne.
- Double-count weight transfer.
- Double-count drivetrain propulsion.
- Run overlapping vehicle solvers without separation.
- Introduce undocumented API calls.
- Scatter arbitrary physics constants throughout the code.
- Ignore measurement units.
- Treat rendering FPS as the physics timestep.
- Make all vehicle classes handle identically.
- Treat mechanical damage as purely cosmetic.
- Treat upgrades as arbitrary stat bonuses.
- Rewrite working systems without justification.
- Claim real-world validation without test evidence.
- Introduce excessive simulation complexity before validating the foundation.
- Switch physics libraries without asking Chris.
- Add gameplay loops, economy, progression, upgrade unlocks, or garage mechanics without approval.
- Build vehicle classes beyond VEH_001 before it passes its acceptance tests.
- Rewrite existing code that breaks Rule 1 instead of reporting it.
- End a session without a pasteable Forge summary.

---

## 34. ENGINEERING RESEARCH REFERENCES

Use these resources to verify equations, study established simulation architectures, and confirm engine capabilities.

### Rapier Physics

https://rapier.rs/docs/

Review:

- Rigid bodies
- Collision detection
- Force application
- Raycasting
- Shape casting
- Vehicle controller API
- WebAssembly integration

### Jolt Physics

https://github.com/jrouwe/JoltPhysics

Review:

- Vehicle constraints
- Wheeled vehicle controllers
- Rigid-body physics
- Contact handling
- Mechanical constraints

### Jolt Physics JavaScript

https://github.com/jrouwe/JoltPhysics.js

Review:

- WebAssembly integration
- Browser compatibility
- Exposed vehicle features

### Project Chrono

https://projectchrono.org/

https://api.projectchrono.org/

Review:

- Chrono::Vehicle
- Suspension subsystems
- Tire models
- Drivetrain models
- Rigid terrain
- Deformable terrain
- Soil contact modeling
- Terramechanics

### NVIDIA PhysX

https://github.com/NVIDIA-Omniverse/PhysX

Review:

- Vehicle architecture
- Tire force calculations
- Suspension force calculations
- Rigid-body integration
- Vehicle update pipeline

### MDN Gamepad API

https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API

Review:

- Gamepad input
- Browser compatibility
- Available vibration interfaces
- Runtime capability detection

### Engineering literature

Research these books and disciplines:

- Race Car Vehicle Dynamics — Milliken and Milliken
- Fundamentals of Vehicle Dynamics — Thomas D. Gillespie
- Tire and Vehicle Dynamics — Hans B. Pacejka
- Theory of Ground Vehicles — J. Y. Wong
- Terramechanics and Off-Road Vehicle Engineering — J. Y. Wong
- Automotive suspension geometry
- Quarter-car suspension models
- Half-car suspension models
- Full-car suspension models
- Vehicle multibody dynamics
- Tire slip and combined-slip modeling
- Soil pressure-sinkage models
- Soil shear models
- Unsprung mass dynamics
- Shock absorber dynamometer curves
- Vehicle telemetry analysis

These resources are research references.

Verify applicable equations, assumptions, units, licensing, and installed software versions before implementing them.

---

## 35. PROJECT KNOWLEDGE AND DOCUMENTATION

Maintain a permanent engineering knowledge base.

Suggested documents:

    docs/vehicle-physics/
        VEHICLE_PHYSICS_ENGINEERING.md
        PHYSICS_ARCHITECTURE.md
        VEHICLE_MEASUREMENTS.md
        SUSPENSION_ENGINEERING.md
        TIRE_PHYSICS.md
        TERRAIN_PHYSICS.md
        DRIVETRAIN_ENGINEERING.md
        VEHICLE_FEEDBACK.md
        COMPONENT_INTEGRATION.md
        PHYSICS_TEST_RESULTS.md
        PHYSICS_CHANGELOG.md

For each system, document:

- Purpose
- Physical principles
- Equations
- Parameters
- Units
- Dependencies
- Implementation location
- Known limitations
- Test procedures
- Test results
- Future improvements

Distinguish between:

- Confirmed project decisions
- Engineering recommendations
- Illustrative parameters
- Implemented features
- Tested features
- Future research
- Unresolved questions

Do not treat every proposed feature as already implemented.

---

## 36. FINAL ENGINEERING DIRECTION

Project: Baja should use a unified vehicle dynamics architecture.

The chassis, wheels, tires, suspension, drivetrain, terrain, mechanical components, and feedback systems should operate as interconnected parts of one simulation.

Example cause-and-effect chain:

1. The vehicle encounters a rock.
2. The wheel contact position changes.
3. Suspension compression increases.
4. Spring and damper forces change.
5. Wheel normal load changes.
6. Tire grip changes.
7. The chassis responds to applied forces.
8. Other wheel loads change.
9. Steering and traction behavior change.
10. The player experiences vibration and movement.
11. Excessive loading may cause mechanical damage.

Every major driving sensation should have an identifiable physical cause.

A lightweight sand rail should feel different from a heavy truck because their physical configurations differ.

A worn starter vehicle should feel different from a rebuilt race vehicle because their components and mechanical condition differ.

A vehicle with properly tuned long-travel suspension should perform differently on rough terrain because its suspension behavior differs.

A vehicle with incorrect tires should struggle because its tire-ground interaction differs.

The objective is not maximum simulation complexity.

The objective is believable, consistent, measurable, and enjoyable mechanical behavior.

---

## 37. FIRST ASSIGNMENT

If the active handoff (BAJA_PHYSICS_MECHANICS_HANDOFF.md) has not been started, do its Step 1 audit first. That audit replaces this one.

If it is already done, use this section to fill gaps.

Do not read this whole document in one session. Read Section 0, then the sections the task needs.

Inspect the existing Project: Baja repository.

Do not implement a replacement vehicle controller.

Produce a short technical audit covering:

1. Current vehicle architecture.
2. Current physics engine and version.
3. Current simulation timestep.
4. Current wheel contact implementation.
5. Current suspension implementation.
6. Current tire model.
7. Current drivetrain implementation.
8. Current steering implementation.
9. Current terrain implementation.
10. Current vibration and feedback implementation.
11. Current mechanical component integration.
12. Existing systems that should be preserved.
13. Missing systems.
14. Technical problems, including any code that breaks Section 4, Rule 1 (report only, do not rewrite).
15. Physics accuracy limitations.
16. Performance risks.
17. Recommended architecture improvements.
18. Proposed files to create or modify.
19. Incremental implementation milestones.
20. Measurable acceptance criteria for each milestone.

Keep each item to a few lines.

Then give one line per section of this document (Sections 4 to 32) with a status:

- Implemented
- Partially implemented
- Missing
- Requires investigation
- Future expansion
- Not applicable

Do not classify every bullet. One line per section.

Identify assumptions and unresolved questions for Chris.

Present the audit and plan before making any architectural changes. Stop and wait for approval.

End with the pasteable Forge summary described in Section 0.

The priority is building the system correctly, not generating the maximum amount of code in one session.

END OF SPECIFICATION
