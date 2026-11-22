# Driving audit: the 10 "30-second tests"

Written Nov 22, 2026 from READING THE CODE and the physics data, not from a fresh play session. Chris plays and judges feel; anything marked "check by feel" needs his hands. Source list: [research/PROJECT_BAJA_DRIVING_PHYSICS](./research/PROJECT_BAJA_DRIVING_PHYSICS_RESEARCH_HANDOFF.md) section 2. The old [vehicle-physics-notes](./vehicle-physics-notes.md) table is out of date (it still says "no tire model").

What exists: a real rigid body with four spring-damper wheels and a friction-circle tire at each contact (src/rigid.js, src/suspension.js), fixed 120 Hz step, an engine torque curve with gears, differential and a heat model (src/drivetrain.js), six surfaces (pavement, dirt, gravel, sand, mud, rock) in src/catalog/physics.json, tire pressure by hand (src/tirePressure.js), per-vehicle wear that a service resets (src/wear.js), skid marks and ruts, front-biased brakes and a handbrake that locks the rear.

| # | The test | Status | Notes |
|---|---|---|---|
| 1 | Starter and engine catch; idle and sound match engine condition | partly | Start now checks battery charge, fuel and the engine's pieces (missing or shot = will not start, named). Idle and exhaust sound do NOT yet change with a weak or missing piece. |
| 2 | Throttle raises RPM and torque; wheel motion per axle | there | torque curve, gears, diff split. Check by feel. |
| 3 | Wheelspin on loose dirt, controlled launch on hardpack | there (data) | per-surface mu and rolling resistance. Hardpack is not its own surface (dirt stands in). Check by feel. |
| 4 | Braking moves weight forward; a worn rear damper or uneven tires are visible | partly | weight transfer comes out of the rigid body. Wear is ONE number per vehicle (shocks, tires, align, engine), not per corner, so one worn rear damper is not possible yet. |
| 5 | A bump moves the corners that hit it, not a global bob | there | per-wheel springs on a rigid body. |
| 6 | Handbrake changes yaw through the rear wheels only; inertia kept | there | handbrake locks the rear. Check by feel. |
| 7 | Clay or gravel gives progressive grip loss | partly | gravel, mud, sand exist; clay is not separate. Slip curve is a friction circle with slip stiffness profiles (handlingProfiles.js). |
| 8 | Worn or wrong tires and poor alignment feel worse | partly | wear lowers grip a bit and pulls to one side; tire pressure changes grip. Different tire MODELS on the car change the stats (build.js reads ws.grip). Not tested as a before/after number. |
| 9 | Damage leaves a persistent, diagnosable consequence | partly | wear persists and has clues (wear.js clues/inspect). A puncture only matters at the tire machine; it does not change the drive. |
| 10 | Fixing the actual part restores its behavior | partly | a service resets wear. Engine pieces now restore start ability. Per-part drive effect is not wired. |

## The reproducible tests (DRV-001..022) worth doing first
- DRV-002 and 003 (stopping distance dry vs gravel) and DRV-004 (tire swap changes a measured number): these need a headless drive script with fixed input. Not written yet. This is the best next driving job.
- DRV-005 (no drive with the driven axle gone): drivetrain should refuse; not verified.
- DRV-009 (drain one damper, bumps change at that wheel): blocked by wear being per vehicle.
- DRV-010 (100 kg cargo changes handling): no cargo yet.
- DRV-013 (water depth) and DRV-018 (trailer): do not exist.
- DRV-017 (save and reload keeps parts, fuel, setup): parts and fuel yes; the engine's pieces, battery charge, and serviced flags are saved on the items and build, check by reload.

## Gaps, in the order I would close them
1. Headless drive script: fixed throttle and brake on each surface, reports stopping distance and 0-30 time. Gives the numbers for B2 (tire swap) and B3 (surfaces) so tuning is measured, not guessed.
2. Engine piece condition changes idle and power (a weak coil or plugs misfires), so a "fixed" engine sounds and pulls better.
3. Wear per corner for shocks and tires, plus the puncture changing the drive.
4. Hardpack and clay as surfaces; cargo and towing later.
