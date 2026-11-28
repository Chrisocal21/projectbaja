# Project: Baja — Physics and Mechanics Add-On (Handoff for VS Code Claude)

Written 2026-11-21. Supersedes the scope of BAJA_REALISM_LESSON_PLAN.md: this is physics and mechanics only, to add to the game as it exists now. The planning chat has not seen the current code. You can. The repo is the source of truth.

## Rules

- Add to what exists. Do not remove, rename or rewrite working systems. If something must change, say what and why before doing it.
- Before building anything, read the repo and report what physics, vehicle, part, damage and repair code already exists. Reuse it. Extend it.
- Numbers below are [estimate]. Put every number in data files with a source note, and flag any you cannot back up.
- Real inputs, simple model. No full multibody simulation. Must run on a mid-range laptop in the browser.
- Units in code: meters, kilograms, newtons, seconds. Player display can be imperial.
- No new gameplay loops, economy or progression. Those are Chris's calls. Ask.
- Report back with a pasteable session summary for the Forge.

## Step 1 — Audit (report before changing anything)

Answer in a short list:
1. What vehicle physics exists (library, raycast or rigid-body, per-wheel forces, suspension model)?
2. How are parts stored and how do they affect the vehicle today?
3. Is there any damage, wear, repair, diagnosis or tool system?
4. Where do surface types live, if anywhere?
5. What is already data-driven and what is hardcoded?

Then propose which of Steps 2 to 8 are already done, partly done, or missing. Build only what is missing or wrong.

## Step 2 — Vehicle spec data

One file per vehicle. VEH_001 starting values:

| Field | Value |
|---|---|
| Curb mass | 750 to 850 kg |
| Wheelbase | about 2.4 m |
| Track | about 1.3 m |
| Weight split | about 40 front / 60 rear |
| CG height | about 0.5 m, rising with cage and spare |
| Engine | air-cooled flat-four, 1.2 to 1.6 L, 40 to 60 hp stock |
| Cooling | air only, depends on fan, tin and airflow |

Mass and CG are computed from installed parts (each part has mass and position). Adding a cage must visibly raise CG and roll tendency.

## Step 3 — Surfaces and tires

surfaces.json, per surface: peak grip and rolling resistance.

| Surface | Grip | Rolling resistance |
|---|---|---|
| Pavement | 0.9 to 1.0 | 0.01 to 0.015 |
| Firm dirt | 0.6 to 0.8 | 0.03 to 0.08 |
| Gravel | 0.4 to 0.6 | 0.05 to 0.10 |
| Loose sand | 0.3 to 0.5 | 0.15 to 0.30 |
| Wet mud | 0.2 to 0.4 | 0.10 to 0.20 |
| Rock | 0.6 to 0.8 | 0.03 to 0.06 |

- Grip force = coefficient x load. One traction budget shared by braking, cornering and accelerating.
- Tire pressure is a player setting: street about 28 to 32 psi, sand and rock about 12 to 20 psi. Lower pressure widens the contact patch (better on sand and rock) but risks pinch flats and bead unseating and costs steering response on pavement.
- Tire diameter acts as gearing: taller tire, more top speed, less pull, more clearance.

## Step 4 — Suspension

Per corner: spring rate, damping (compression and rebound separate), travel, ride height, bump stop.

- Travel and ride height are separate numbers.
- Starting travel: stock about 4 to 6 in, trail beater about 8 to 10 in, Baja conversion about 10 to 14 in.
- Bottoming out is a hard stop with a damage cost. Bump stops soften the last part of travel.
- Too little damping bounces; too much loses grip over bumps.
- Existing parts (trail shocks, suspension, wide fenders) must change the corner they sit on.

## Step 5 — Drivetrain and engine

- Torque curve data, not just peak power. Power = torque x rpm.
- Gear ratios, final drive, tire diameter feed top speed and pull.
- Differential types: open (power goes to the wheel with least grip), limited-slip, locker.
- Heat model, simple: engine heat rises with load and falls with airflow; low oil, blocked airflow or long low-speed hard pulls overheat it; overheating cuts power, then damages the engine.
- Built engine target: about 90 to 150 hp from 1.8 to 2.3 L, for the Baja conversion later. Do not unlock upgrade mechanics Chris has not approved.

## Step 6 — Geometry and obstacles

- Compute approach, departure and breakover angles and ground clearance from the part set.
- Obstacles and terrain contact apply damage to the part that actually touched (skid plate, rocker guard, bumper, exhaust, tie rods).
- Tip limit on side slopes: roll threshold about track / (2 x CG height) in g. Higher CG tips sooner.

## Step 7 — Wear and failure

Every part: condition 0 to 1, stress that builds under hard use, failure modes.

| Cause | Result |
|---|---|
| Low oil, no airflow, long hard pulls | Overheat, then power loss, then damage |
| Bottoming, big landings | Shock blowout, bent arms, cracked welds |
| Aired-down tires on rocks | Pinch flat, bead unseat |
| Wheel hop, hard landings | Axle or CV joint breakage |
| Slipping in sand | Clutch burn |
| Junkyard and barn-find parts | Rust, play, leaks, hidden wear |

Failures give clues first: noise, smoke, pull, vibration, leak. A part's condition changes its real performance, not only a number on screen.

## Step 8 — Mechanic skills (repair and diagnosis)

Build as short real procedures, not menu stat adds.

1. Diagnosis: symptoms.json with symptom to possible causes to tests that narrow them. Same symptom, several causes. A wrong repair wastes parts and time. Start with 15 to 20 faults: hard start, rough idle, backfire, overheating, pull to one side, clunk over bumps, clutch slip, weak brakes, fluid leak by color and location, smoking exhaust, vibration at speed.
2. Tune-up for the air-cooled engine: oil change and level, valve adjustment, ignition timing, carburetor adjustment, spark plugs, fan belt and cooling tin check, compression check.
3. Fasteners: real torque specs from a manual, tagged verified. Wrong torque risks stripping or loosening.
4. Tools: jack and stands, wrenches, torque wrench, feeler gauges, timing light, compression tester, multimeter. Each job lists required tools and an order of steps.
5. Wreck and barn-find inspection: rust in structural spots, frame straightness, engine turns by hand, fluids, joint play, missing small parts. Feeds the existing junkyard and appraisal systems, do not replace them.
6. Fabrication: cutting fenders, shortening the hood, adding cage tubes, mounting shocks. Tie to the existing PART_001 to PART_016 set.
7. Safety: cage, harness, extinguisher. Safer builds survive crashes better.

## Step 9 — Prove it (acceptance tests, drive each one)

1. Stock vs long-travel Bug on whoops: stock bottoms and unsettles, long-travel stays planted.
2. Sand at street pressure vs aired down: street pressure bogs, aired down keeps moving.
3. Open diff vs locker with one wheel off the ground: open stalls, locker drives.
4. Side-slope tip angle with and without a cage: the cage lowers the tip angle.
5. Overheat from a sustained low-airflow climb: warning, power loss, damage in that order.
6. One diagnosis puzzle with three possible causes that tests can separate.

If a test does not feel different, report that instead of adding more systems.

## Sources builders should check numbers against

- Bentley and Haynes manuals for the relevant air-cooled VW model years (torque, valves, timing).
- Gillespie, Fundamentals of Vehicle Dynamics; Milliken, Race Car Vehicle Dynamics.
- Shock manufacturer tech notes on travel and damping.
- Physics library docs for whatever the repo already uses. Do not switch libraries without asking Chris.

## Return to the Forge

A pasteable summary: what existed, what you added, what you changed, what you did not touch, which numbers are still estimates, which acceptance tests pass, and questions for Chris.
