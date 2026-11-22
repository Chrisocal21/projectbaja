# RESUME HERE (rewritten Nov 22, 2026)

Read this first when picking the work back up. Then [README](./README.md) (which doc is current, which is history) and [CANON](./CANON.md) (locked, never invent lore). Labels: **PROPOSAL** = design guess.

## How we work now
- **The game is simulation-forward (Chris, Nov 22).** No click-and-choose for anything the player does to a vehicle: tires off rims, grinding rust, painting, buffing, hosing dirt off, fitting parts, servicing are all hands-on jobs with tools. Admin and the build-mode swatches are dev tools and are hidden at launch.
- **One branch: `main`.** Commit and push small, often. Only commit in this repo (`projectbaja`); never in `salvageroad` (it is a read-only reference, merge finished, see [SALVAGE_MERGE_PLAN](./SALVAGE_MERGE_PLAN.md)).
- **Two builders at once: Claude Code and ChatGPT.** Before editing, run `git status`: files that show as modified and are not yours belong to the other builder, so leave them alone. Whenever something is for ChatGPT, add it to [CHATGPT_HANDOFF](./CHATGPT_HANDOFF.md) (standing rule).
- Chris plays and judges how it feels. All physics, wear and world numbers are estimates (labelled in code and docs) to tune by feel.
- Dev server: `npx vite --port 3001` in `viewer/bug_viewer`. Tests: `npm test` (about 440 pass). Build check: `npx vite build --outDir <tmp> --emptyOutDir`.

## Where things stand (Nov 22)
All pushed to `main`. Details and numbers are in [REPAIR_AND_WORLD_PLAN](./REPAIR_AND_WORLD_PLAN.md) (the running record) and [PERFORMANCE_WORK](./PERFORMANCE_WORK.md).

- **Driving:** one rigid-body car (`src/rigid.js`): spring-damper wheels, friction-circle tires, engine with gears and heat, open/LSD/locker diff, tire pressure, handling profiles (`handlingProfiles.js`; the old loose balance is saved as `DRIFT_BASELINE` for a future drift car), long-travel suspension for upgraded builds, wet brakes, wading, river current, deep water drowns the engine. Controller support, speed FOV, eased steering wheel.
- **Wear and service:** `src/wear.js`: shocks, tires, alignment, engine wear slowly (quarter rate until dialled in); clues while driving, hold T to look the car over or service with the wrench / jack, workbench service, parts that change wear rates.
- **World features** (`worlds/offroadFeatures.js`, `wildFeatures.js`, `WildScenery.jsx`): whoops, low table-top jumps, berms, dirt tracks, strips beside highways, creek crossings, rivers (flowing look), forest trails, hill climbs, plank bridges, about 9,000 trees. Dust, tire ruts, landing and bottom-out feedback.
- **Mechanic loop:** tools in hand (wrench, jack), tool-gated removal, hold-click fit/remove, fiberglass panels flat white until painted, the fiberglass front clip, El Cajon as a restorable and drivable second vehicle.
- **Admin (phone):** a grid of vehicle and tool tiles; spawn a whole vehicle where you stand, parts, items, props, teleport to any city or spot with a vehicle, races, cheats. Archive of everything in the game. Hide it before any public build.
- **Perf:** draw cap (650 m), terrain streaming in slices, FPS counter (`PerfHud`); Chris sees about 30 FPS on his machine: the next perf pass needs his numbers.
- **Sound:** a first procedural pass (`src/audio.js`, K mutes, 50% default). Real recordings are better; see the handoff.
- **Big map (`?realmap`):** real border slice, real highways, junction signs, rest areas, gas stations. See [WORLD_MAP](./WORLD_MAP.md) and [ROAD_WORK_BACKLOG](./ROAD_WORK_BACKLOG.md). Road crossings, river crossings and driveways into places are ChatGPT's current job (Nov 22).

## Next (in order, Chris's call)
1. Test the new handling, suspension and table tops by feel; tune.
2. **Lower the dirt roads just below the highway asphalt** so unpaved "flatish" roads sit in a natural shallow cut (jumps at crossings are fine); not on bump sections, jumps or turns. **Assigned to ChatGPT** (it owns `highways.js`; spec is item 0 in [CHATGPT_HANDOFF](./CHATGPT_HANDOFF.md)).
3. Performance on Chris's machine (about 30 FPS): thin trees and roadside strips if needed.
4. **Paint, rust and clean-up as hands-on jobs** (spec: [SYSTEMS_BLUEPRINT](./SYSTEMS_BLUEPRINT.md) section 6). Rules are built and tested (`src/rules/finish.js`: per-panel rust, paint coverage, gloss, dirt; grind, paint, buff, hose, weather, chip). Next: the tools in hand (grinder, spray can, buffer, hose) using hold-click on a panel, per-panel state saved on the vehicle, and the look (rust and dirt masks). Tires off rims comes after. The build-mode paint swatch is only a dev stand-in.
5. Older plan (Nov 8, still unverified item by item): see [GAMEPLAN](./GAMEPLAN.md) and [PROGRESS_TRACKER](./PROGRESS_TRACKER.md) (history). Cloud saves (Clerk + Vercel) stay last.

## Open questions for Chris (still open as far as we know)
- Explorer: should unfound places show real names or "???".
- Is Phase 2+ open; lock cabin/boat into canon; does Al sell trailers; are the El Cajon and Dusty's gift canon (**CANON? not locked**).
- Prices in the shop are placeholders.

## Known rough edges
- Bridges have no solid rails (you can drive off the side); water ripples are cosmetic.
- Full-lock turns at high speed still roll the Bug and trucks (tall body, not the tires).
- Terrain mesh is 2.5 m at best, so whoops (7-19 m) look faceted (in the handoff for ChatGPT).
- Not tested by hand yet: long-travel soak, handling profiles, wet brakes, drowning, bridges, service by hand.
- Pre-existing: nearly-black truck material.
