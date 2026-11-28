# Physics audit (Section 37 of VEHICLE_PHYSICS_ENGINEERING.md)

Claude Code, Nov 28, 2026. Audit of what the repo has, a staged plan, and Chris's decisions. Measured numbers: [PHYSICS_TEST_RESULTS](./PHYSICS_TEST_RESULTS.md).

## Chris's decisions (Nov 28; "your rec")
- The active task is [BAJA_PHYSICS_MECHANICS_HANDOFF](./BAJA_PHYSICS_MECHANICS_HANDOFF.md) (now in the repo); this spec is the long-term reference.
- Gearbox: keep the 5-speed automatic for now; a manual option comes later.
- Feel crutches (1.35 x gravity, extra yaw damping, 1.5 x grip): keep them until telemetry can show what each does; then remove one at a time behind a dev switch, with Chris driving before / after.
- Dev "pro" mode: retire it after its tire curve is ported into `rigid.js`.
- **Physics is Claude's job.** ChatGPT stays out of the physics files.

## The handoff's steps against the repo
| Step | Status |
|---|---|
| 1 Audit | Done (this page). |
| 2 Vehicle spec data | Done: `catalog/physics.json` (820 kg, CG 0.5 m, 42/58, source notes), mass and CG from fitted parts (`massModel`); a cage raises CG (tested). |
| 3 Surfaces and tires | Done: surface table in the handoff's ranges (tested), one traction budget, tire pressure by hand (gauge, chuck, 12 V pump), tire size as gearing (tested). |
| 4 Suspension | Done: per-corner spring, separate bump / rebound damping, travel and lift separate, bump stop, bottom-out wear; parts change it (long travel, lift kit). |
| 5 Drivetrain and engine | Done: torque curve, gears, final drive, open / LSD / locker, air-cooled heat with warning, derate and damage. Built engines not unlocked (Chris's call). |
| 6 Geometry and obstacles | Partly: tip limit done; approach / departure / breakover angles not computed; contact damage only to tires (rock strike), not to the part that touched. |
| 7 Wear and failure | Partly: four wear numbers plus per-corner damper and tire failures with clues; no per-part condition for every part, no axle / CV or clutch failures. |
| 8 Mechanic skills | Partly: tools, look-over clues, tire jobs, engine pieces; no symptom-to-cause diagnosis, tune-up procedures or torque specs. |
| 9 Prove it | 5 of 6 pass as automated tests; the diagnosis puzzle is missing (see results page). |

## The audit (20 items)

1. **Vehicle architecture.** One custom rigid-body car, `src/rigid.js` (`createBody` / `stepBody`), driven from `DriveWorld.jsx` (`Vehicle`). Dimensions come from `build.js resolve().dims` (Bug, from fitted parts) or `game/fleet.js` (trucks, El Cajon, Classifieds trucks). A second, separate solver lives in `src/vehicle/` (`sim.js`, `tire.js`, `config.js`): a flat-ground planar car used only by the dev "pro" mode (`ProDrive.jsx`).
2. **Physics engine.** None installed. `package.json` has only three 0.170 for maths and rendering; all physics is hand-written JS.
3. **Timestep.** `STEP = 1/120` (`suspension.js`); `DriveWorld` splits each frame into 1-5 sub-steps of up to 1.6 x STEP. Not a fixed accumulator, but simulated time stays exact: measured spread between 30, 60 and 144 fps is 0.03% (results page). No render interpolation.
4. **Wheel contact.** Per wheel, 9 sample points around the tire's side profile and across its width against the height field; the highest one sets the spring compression. Ground normal from height differences 0.35 m apart. Better than a single ray.
5. **Suspension.** Per corner spring-damper with progressive rate (`1 + 6 frac^3`), separate bump / rebound damping, a near-solid bump stop, an anti-roll bar per axle (force from left-right travel difference), and per-car presets (stock / offroad / long-travel) in `suspensionSpec`. Static preload is fixed at 21% / 29% of weight per front / rear wheel, not derived from the centre of mass.
6. **Tire model.** Lateral: `cap x tanh(slip / stiffness)` per axle (`handlingProfiles.js`), inside a friction circle shared with the longitudinal force. No load sensitivity, no slip ratio, no relaxation length. Grip = surface x tire set x pressure x wear x the game's 1.5 multiplier.
7. **Drivetrain.** `drivetrain.js`: torque curve, 5-speed automatic with shift time, final drive, air-cooled heat with derate and damage, and open / LSD / locker split by each rear tire's grip. **No wheel spin state:** engine force is applied straight at the rear contact patches, and engine rpm comes from road speed, so there is no real wheelspin or lock-up.
8. **Steering.** Ackermann (`wheelSteerAngle`), speed-faded lock (now scaled by tire grip and wheelbase: ChatGPT, f857c41), a steering-rate limit, and a catch-a-slide assist (`handling.js`) kept apart from the physics.
9. **Terrain.** Surface table (`vehiclePhysics.js` SURFACE_DATA: grip, rolling resistance, softness), tire pressure effects, water wading drag, soft ground and silt sinking (`bogDown.js`), ruts drawn. **The surface is read once at the car's centre**, not per wheel.
10. **Feedback.** Procedural audio from rpm, slip and impacts (`audio.js`); camera shake from landings and bottom-outs; dust and ruts; controller rumble from surface, speed, compression and landings (new, f857c41). All driven by sim events.
11. **Mechanical integration.** Mass and CG from fitted parts (`massModel`), lift kit and taller tires raise ride height and CG, wider stance from tire sets, long-travel suspension from shock / suspension parts, engine pieces and battery gate starting, per-corner wear and failure (`wear.js`: blown damper, puncture, worn tires, alignment pull, engine), tire pressure.
12. **Keep.** The rigid body and its rollover / shell contacts, multi-sample wheel contact, the suspension, the drivetrain and heat, wear and per-corner damage, soft ground, pressure, the headless test harness (`driveMeasure.js`) and its tests.
13. **Missing.** Wheel angular velocity and slip ratio; per-wheel surfaces; a fixed-step accumulator with interpolation; load-sensitive tire curve; telemetry screen for the real car; a physics test facility (static pad, skidpad, slalom, split-mu, side slope, washboard); clutch and manual gearbox; brake bias, ABS and fade as physics; unsprung mass.
14. **Rule 1 report (not changed, per the spec).** (a) Gravity is 1.35 x real (`HEAVY`) so the car feels planted. (b) An extra yaw-damping torque while 2+ wheels touch. (c) Grip x 1.5 in `DriveWorld`. (d) Brakes are a fixed 2.2 g force request (then traction-limited), not brake torque on a wheel. (e) Drive force is applied at the contact patch with no wheel in between (see 7). (f) A per-step clamp on lateral force for stability. All are tuned feel crutches, documented in code.
15. **Accuracy limits.** No wheelspin / lock-up, so launches, burnouts and handbrake turns are approximations; one surface per car; tire curve has no load sensitivity, so weight transfer changes balance less than it should; heavy gravity changes jump arcs and load numbers.
16. **Performance risks.** Physics costs about 2-5 ms a frame now (PerfHud), at 30-50 fps on Chris's machine. Per-wheel surface lookups and wheel spin states are cheap; a fixed 120 Hz step with up to 5 catch-up steps is the same cost as today.
17. **Architecture improvements.** Keep `rigid.js` as the one solver for the game; give it a per-wheel state (spin, surface, slip) and a telemetry record; move the accumulator into a small `fixedStep.js`; port the better tire curve from `vehicle/tire.js` instead of keeping two solvers.
18. **Files to touch (later, per milestone).** `rigid.js`, `DriveWorld.jsx`, `drivetrain.js`, `vehiclePhysics.js`, new `fixedStep.js`, new `physicsTests/*.test.js` or more in `driveMeasure.js`, a dev telemetry panel. Docs: `PHYSICS_TEST_RESULTS.md`, `PHYSICS_CHANGELOG.md`.
19. **Milestones** (below).
20. **Acceptance criteria** (with each milestone below).

## Status per section of the spec

| Section | Status |
|---|---|
| 4 Core rules | Partially implemented (Rule 1 crutches listed in item 14) |
| 5 Units | Implemented (SI inside, mph / °C at the UI) |
| 6 Physics engine | Not applicable (custom solver, no library) |
| 7 Timestep | Partially implemented (sub-steps keep time exact, 0.03% spread across frame rates; no interpolation) |
| 8 Chassis | Partially implemented (mass / CG / inertia from parts; preload not from CG) |
| 9 Wheels | Partially implemented (contact yes; no spin state, slip ratio or inertia) |
| 10 Suspension | Partially implemented (spring, damper, bump stop, anti-roll; no motion ratio or axle coupling) |
| 11 Tires | Partially implemented (friction circle, pressure, wear; no load sensitivity or slip ratio) |
| 12 Terrain | Partially implemented (surface table, water; one surface per car) |
| 13 Soft ground | Partially implemented (stage 1 plus sinking; no ruts in physics) |
| 14 Drivetrain | Partially implemented (curve, auto gearbox, diffs, heat; no clutch, no wheel spin) |
| 15 Steering | Implemented (Ackermann, speed limit, rate limit) |
| 16 Assist profiles | Missing (one fixed set of aids) |
| 17 Braking | Partially implemented (traction-limited; no torque, bias setting, ABS or fade physics) |
| 18 Aero / resistance | Implemented (quadratic drag, rolling resistance) |
| 19 Vibration / feedback | Partially implemented (audio, camera, rumble; no filtered signal channels) |
| 20 Airborne | Implemented (tumbles, droops, no air traction; gravity is 1.35 x) |
| 21 Damage | Partially implemented (per-corner damper / tire / alignment, engine heat) |
| 22 Parts to physics | Partially implemented (mass, CG, lift, tires, long travel) |
| 23 Config data | Partially implemented (`physics.json`, `suspensionSpec`, fleet dims; spread over several files) |
| 24 Architecture | Partially implemented (pure solver; two solvers exist) |
| 25 Update pipeline | Implemented in one function (`stepBody`), in a sensible order |
| 26 Debug interface | Partially implemented (PerfHud, driveHud; per-wheel telemetry only in pro mode) |
| 27 Test facility | Partially implemented (headless stop / accel / tire tests; no skidpad, split-mu, side slope, washboard) |
| 28 VEH_001 data | Implemented (820 kg, CG 0.5 m, 42 / 58 split, all [estimate]); gearbox is 5-speed auto, spec says 4-speed manual |
| 29 Validation | Partially implemented (tests for stopping, accel, landing, soak; no static-equilibrium or frame-rate check) |
| 30 Performance | Partially implemented (measured live; no per-system budget) |
| 31 Roadmap | Phases 1-3 mostly there; 4-6 partly |
| 32 Fidelity | Level 1 done, parts of Level 2 |

## Milestone 1 status (Nov 28)
Done: the test facility (`src/physicsFacility.test.js`: static pad, frame rate, skidpad, single-wheel bump) and the in-game telemetry panel (`game/TelemetryHud.jsx`, F9 or `?telemetry`; per-wheel load, travel, slip angle, Fx, Fy and grip used, read from `rigid.js` without changing it). Still to add to the facility: slalom, side slope on the real Bug, washboard, split-mu (after milestone 3).

## Plan: milestones (PROPOSAL; one at a time)

Order after the Nov 28 measurements: 1, 3, 4, 5, then the handoff's open steps (6 geometry and contact damage, 8 diagnosis puzzle), then 6 and 7 here. Milestone 2 is low priority now (frame rate barely matters).

1. **Measure first: telemetry + test facility.** A dev per-wheel panel (load, travel, slip, surface, rpm, gear) and headless tests: static pad, skidpad, slalom, side slope, single-wheel bump, washboard. Results written to `PHYSICS_TEST_RESULTS.md`. *Accept:* on the static pad the four tire loads add up to the car's weight within 5%; every test prints numbers and runs in `npm test`.
2. **Fixed timestep.** A 120 Hz accumulator with render interpolation. *Accept:* the same scripted run at 30, 60 and 144 fps ends within 1% in distance and speed.
3. **Per-wheel surfaces.** Each tire reads its own ground. *Accept:* with the left wheels on asphalt and the right on sand, braking pulls toward the asphalt side.
4. **Wheel spin.** Each wheel gets spin speed and inertia; engine and brake torque act on the wheel; slip ratio drives the tire force. *Accept:* wheelspin at a sand launch, wheel lock-up when braking hard on dirt, the open diff spins a lifted wheel and the locker does not.
5. **Better tire curve.** Load-sensitive combined-slip curve (start from `vehicle/tire.js`). *Accept:* skidpad g and stopping distances recorded before and after, with differences explained.
6. **Feel crutches, one at a time, only if Chris wants:** heavy gravity, yaw damping, the 1.5 grip multiplier. Each behind a dev switch with a before / after drive by Chris.
7. **Parts to physics, deeper:** shocks and springs as real rates from data, wheel and tire mass and inertia, brake parts as brake torque.

## Questions for Chris

1. The spec names `BAJA_PHYSICS_MECHANICS_HANDOFF.md` (Nov 21) as the active task. It is not in the repo. Do you have it?
2. Gearbox: keep the 5-speed automatic, or switch the Bug to a 4-speed manual (with an automatic option)?
3. The feel crutches (heavy gravity, extra yaw damping, 1.5 x grip): keep them for fun, or remove them step by step as the physics gets better?
4. The dev "pro" mode has its own planar solver: retire it once its tire curve is ported, or keep it?
5. Who owns physics: Claude (as now), with ChatGPT staying out of `rigid.js`, `DriveWorld.jsx` and the drivetrain?

## Forge summary (paste-ready)

- **Existed:** custom rigid-body car (`rigid.js`), multi-sample wheel contact, progressive spring-damper suspension with bump stops and anti-roll, friction-circle tires, engine curve + automatic gearbox + diffs + heat, surfaces, pressure, soft ground, wear and per-corner damage, procedural audio, headless test harness.
- **Added this session:** this audit; the spec saved at `docs/vehicle-physics/VEHICLE_PHYSICS_ENGINEERING.md`; ChatGPT's controller rumble and grip-aware steering limit, reviewed and committed (f857c41).
- **Changed:** nothing in the physics.
- **Not touched:** everything in `rigid.js`, `drivetrain.js`, `suspension.js`, `vehicle/`.
- **Still estimates:** all numbers in `catalog/physics.json`, `suspensionSpec`, `handlingProfiles.js`, rumble strengths, the steering authority formula.
- **Tests:** 681 pass; build clean.
- **Open questions:** the five above.
