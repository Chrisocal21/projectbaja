# Blueprint → Project Baja: what we have, what's missing, build order

Maps [SYSTEMS_BLUEPRINT.md](SYSTEMS_BLUEPRINT.md) onto the game as of commit `c620978` (2026-11-07).
Legend: ✅ have it · 🟡 partial / different · ❌ missing.

## Where we stand, section by section

| § | Blueprint system | Today in Baja | Status |
|---|---|---|---|
| 1 | On foot FPS, chase cam, cab cam | `game/Walker.jsx`, `DriveWorld.jsx` (chase + C cab view) | ✅ |
| 1 | One E key, context prompt | `Walker.jsx` picks a target each frame, `promptText()` | ✅ |
| 1 | Targeting: 2.2 m to *surface*, 57° cone, 0.6 m override | Distance to object *centre*, ~72° cone (dot 0.3), 1.2 m override | 🟡 |
| 1 | Plain refusals with a reason | Some ("Won't fit in the car…", "doesn't fit this car") | 🟡 |
| 2 | VehicleDef as data (physics, slots, zones, storage, camera, tow) | Body is data (`bodies.json`), but physics dims are `DEFAULT_DIMS` + `resolve()`, storage is hard-coded in `items.js`, camera hard-coded | 🟡 |
| 2.2 | Interaction zones (hood / driver / passenger / rear) | One "near the car" radius | ❌ |
| 3.1 | Slot rules: `after[]`, `cover`, `tool`, `carry`, `function` | Slots exist (`slots.json`) but only as upgrade sockets; parts carry `requires` (roof gear needs rack) | 🟡 |
| 3.1 | Driveable rule (start/drive/steer/grip filled) | The Bug is always complete and always drives | ❌ |
| 3.2 | Restorable body pieces | **The Bug model already has 28 named, hideable pieces** (windshield, seats, dash, steering, fenders ×4, hood, nose, engine lid, bumpers, headlights, taillights…) used only by the dev "Body pieces" toggles | 🟡 (big head start) |
| 3.4 | Fit by hand at the vehicle | E to install, but only inside the garage zone, no deps/tools/cover checks | 🟡 |
| 3.5 | Hands vs pack carry, slowdown, put down | Hands (1) + pack (4 small) + slowdown + G drop | ✅ |
| 3.5 | Tire stacks give the top one; parts runner within 8 m | — | ❌ |
| 3.6 | Detach with reverse deps, part keeps condition | X in garage drops part on the floor; `normalize` silently strips dependants | 🟡 |
| 3.7 | Replace / damaged parts / upgrades as alternatives | Replace ✅ (old part drops), upgrades ✅ (engines, tires), damaged variants ❌ | 🟡 |
| 3.8 | Workshop panel (slot readiness) | `RemovePanel` lists fitted parts only | 🟡 |
| 4 | Driving maths | Own fixed-step sim: bicycle tire model + per-wheel suspension, landings, rollovers (`suspension.js`, 24 tests) | 🟡 (different engine, keep it) |
| 4.1 | Brake-then-reverse below 0.5 m/s, rear-only handbrake | Brake-then-reverse ✅ (at 0.5 m/s), Space = handbrake locks rear ✅ | ✅ |
| 4.2–4.4 | Power-limited force, drag+rolling formula, speed-sensitive steer | Similar shapes, different formulas (`ACC*(1-v/MAXV)`, steer `0.7/(1+0.004v)`) | 🟡 |
| 4.6 | Buildings as boxes, parked vehicles as obstacles | Circles for everything; only one vehicle exists | 🟡 |
| 4.7 | Flip-upright key, gateable | R = reset to spawn; auto-flip after 2.5 s | 🟡 |
| 4.8 | Towing / trailers | — | ❌ |
| 5 | Per-part condition 0–100 with effects in the sim | One global `WEAR` uniform that only ages the paint visually | ❌ |
| 5.2 | Wear from collisions, use, terrain, overload | Impact impulses already computed in `suspension.js` (landing g-loads) — not stored as damage | ❌ (hooks exist) |
| 5.4 | Repair in place / at bench | Gas station car wash lowers `WEAR` | ❌ |
| 6 | Paint chain per panel: rusted → ground → painted → buffed | `weather.js` shader does rust/chalk/chips for the whole car from one value | 🟡 (shader exists, needs per-panel state) |
| 7 | Inventory as stacks, side-by-side vehicle screen | Items are single parts with sizes; Tab panel shows hands/pack/car | 🟡 |
| 7.2 | Capacity model per vehicle | Bug: cab 4 units + roof deck 6 with rack (≈ "physical limits") | 🟡 |
| 7.3 | Visible cargo | Crates shown in the cab and on the roof | ✅ |
| 7.4 | Cargo mass affects handling | — | ❌ |
| 7.5 | Parked vehicles keep position + inventory | Car pose not saved (Continue starts in the garage) | ❌ |
| 8 | Grid building | — | ❌ |
| 9 | Rules as pure tested functions; content as data; save everything | Physics is; parts/inventory rules live in `items.js` + `main.jsx`, untested | 🟡 |

## What it changes about the game (the new ideas, not already here)

1. **Cars arrive broken, not just ugly.** Today the Bug is a working car with old paint. With slot functions, Al's Bug can be sold *missing a battery and with bald tires*, so the first job is to get it running. The tarp car becomes a true project: no engine, no seats, three wheels. That is the core loop the blueprint adds.
2. **Order of work matters.** `after[]` and `cover` mean you open the engine lid before the engine goes in, the dash before the steering wheel, the grille/bumper before headlights. Removing reverses it. That turns "press E" into a short mechanical puzzle.
3. **Tools are items.** Wrench (bolt-on), jack (wheels/suspension), engine hoist (engines, only in the garage — this is what keeps big jobs at home), grinder / spray gun / buffer (paint). They're found and bought like parts, and replace today's "only in the garage zone" rule with a real reason.
4. **Every part has condition.** It travels with the item. Engine condition scales power, tires scale grip, brakes scale braking, suspension sags a corner. Damage comes from our existing landing impacts, obstacle hits, slides and rough surfaces. A junkyard engine at 35% is cheap; a new one is expensive. Repair kits raise condition in the field (capped), the bench does full repairs.
5. **Paint per panel.** The weathering shader becomes per-panel state: grind rust off a fender, paint it, buff it. Mismatched replacement panels arrive in primer. The car wash stays as a cosmetic clean.
6. **Vehicles are data and stay where you leave them.** A `VehicleDef` lets the truck, a van, the tarp car and wrecks be data entries. Parked vehicles keep their position, parts and storage, and can be stripped as donors. A parked truck within 8 m counts as your parts shelf.
7. **Hauling becomes physical.** Trailers hitch to the truck; the trailer carries the huge things (engines, cages, a whole donor shell). Cargo weight makes the truck slower and harder to stop.
8. **Building your compound (later).** Grid-placed containers, sheds, a lift and garage doors at your property; pieces arrive by trailer.

## Decisions we need from you

- **Driveable rule for the Bug:** must it be complete to drive, or can you drive a rough shell as long as engine/battery/steering/wheels are in? (Recommend: rough shell drives, which fits Baja.)
- **Physics:** keep our own sim and adopt the blueprint's formulas (power-limited force, drag/rolling, steering curve), or switch to a physics engine with raycast wheels. (Recommend: keep ours; it already does landings and rollovers and has tests.)
- **Inventory model:** stay with sized parts (small…huge) for parts and add *stacks* only for consumables (paint, discs, polish, scrap, repair kits)? (Recommend: yes.)
- **Grid building:** in scope for Baja (your yard/compound), or park it?

## Build order

Each phase is playable on its own and adds rule modules with node tests (`src/rules/*.js`), keeping rules out of React.

1. **Vehicle as data + restoration rules.** `VehicleDef` for the Bug (physics, zones, storage, camera). Restoration slots built from the Bug's 28 named pieces plus engine/battery/wheels, with `after`, `cover`, `tool`, `carry`, `function`. Driveable rule. Hood/engine-lid open-close. Zone-aware E (hood / driver / passenger / rear). Tools as items (wrench, jack, hoist). Workshop panel. Al's Bug sold missing a battery. *(rules: `restore.js`)*
2. **Condition and wear.** Condition on every item and fitted part. Effects wired into the sim (power, grip, brakes, sag, steer wander). Damage from impacts/terrain/slip. HUD warnings. Repair kits + bench repair. *(rules: `wear.js`)*
3. **Second vehicle: the truck.** Pickup `VehicleDef` with an open-bed capacity model and visible cargo, cargo mass in handling, saved positions for all vehicles, "parts runner within 8 m", stacks for consumables. Dealer roster with availability over time.
4. **Paint chain.** Per-panel `{rust, painted, color, gloss}`, shader per panel, grinder/spray/buffer, hold-E progress, colour picker.
5. **Towing + recovery + fuel.** Trailer with hitch, recovery gated by jack/winch, real fuel and fuel tank, donor wrecks around the map to strip.
6. **Grid building.** Compound at the garage: containers, sheds, lift, garage doors, hauled in by trailer.
