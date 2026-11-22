# Salvage Road into Project Baja: merge plan

Written November 21, 2026. Project Baja stays in front. Labels: **PROPOSAL** = my design guess. **VERIFY** = I have not checked this in the code yet.
Nothing here changes [CANON](./CANON.md).

## What Chris decided (this session)

1. **Only the vehicle building mechanic comes over.** Containers, the build hammer, the wood/planer crafting chain, the hotbar and everything survival (hunger, thirst, looting, traders, island world, roads, towns) are **backburnered**. They may not belong in this game at all.
2. **Port the rules to JavaScript and rebuild the views in React Three Fiber.** No TypeScript move, no second codebase.
3. Baja's save format, canon, cash economy and physics stay as they are.

## Where Salvage Road lives

It is a **separate repo** at `c:\Users\chris\Documents\code\salvageroad` (own git history, three new untracked docs). It is not inside `projectbaja`. It is open in this session as an extra folder, which is how it reads as "added".

**PROPOSAL:** leave it there as a read-only reference and port from it. Do not copy it in whole: it carries 168 MB of `node_modules`, 49 MB of `dist` and a different stack (TypeScript, vanilla three 0.187, Rapier, vitest) that would only add clutter to Baja.

## The key finding: Baja already has most of Salvage Road's vehicle build

Baja's `rules/restore.js`, `rules/vehicles.js`, `rules/atomic.js` and `game/workshop.js` were written from Salvage Road's assembly design (the code comments cite its sections). Baja is already **ahead** on the rules:

| Idea | Salvage Road | Project Baja today |
|---|---|---|
| Parts as slots with `after`, tool, cover, zone | `rules/carParts.ts` (15 parts, one vehicle) | `rules/vehicles.js` (36 slots, covers, zones, drive functions) ✅ |
| Fit and detach checks with a reason code and blockers | `checkFit` only | `checkFit` and `checkDetach`, tested ✅ |
| Fit glow and amber blockers, detach glow | described in the guide | built (`BuildModel.jsx`, `hologram.js`) ✅ |
| Atomic install | none | `rules/atomic.js` (`createTx`) ✅ |
| Doors, hood, lid hinges | yes | yes ✅ |
| Supports under missing wheels | blocks and cribbing | "corner on a stand" (VERIFY it looks the same) |
| Several vehicles with their own part lists | El Cajon, tractor, box truck, pickup, step van | **Bug only.** The '84 truck and '78 pickup are not restorable yet |
| Damaged part swaps for a fitted part | `Damaged <slot>` groups | not found (VERIFY) |
| Weathered paint and rust shader | `render/rust.ts`, `vehicleFinish.ts` | not found on vehicles (VERIFY; blueprint phase 4) |
| Loose parts cloned from the vehicle's own meshes, carried one at a time | `render/carParts.ts` | items and a "hands" size system exist; check how parts look on the ground and in hand (VERIFY) |
| Importing a supplied GLB and re-grouping it into slots | `importedVehicle.ts`, `refineImportedVehicle.ts` | catalog pieces matched by mesh-name prefix; no axis fix or repivot step (VERIFY) |

So "make Salvage Road's way the new way" is mostly **filling the gaps in the last five rows**, not replacing Baja's system. Replacing it would throw away tested code that already does the harder parts.

## What gets ported, in order (PROPOSAL)

Each step is small, behind a flag that is off by default, has `node --test` tests for the rules, and is checked in the browser before the next one starts.

1. **Audit** (no code change). Read `BuildModel.jsx`, `Walker.jsx` and `game/items.js` against the VERIFY rows, and write the real gap list at the bottom of this file.
2. **Second vehicle as a restorable VehicleDef.** Use Salvage Road's pickup and step-van data as the pattern (multi-unit slots, prerequisite table) to make the '84 truck restorable. The rules already support it; this is data plus a model with named part groups. Chris's memory notes say parts are fitted by hand with atomic installs, so no auto-fit.
3. **Damaged-part swap and weathered finish.** `Damaged <slot>` groups that swap for the good part when fitted, plus the rust shader as the first piece of the paint chain. Ties into [SYSTEMS_BLUEPRINT](./SYSTEMS_BLUEPRINT.md) restoration/wear/paint.
4. **Loose-part look and carry.** Parts on the ground and in hand are clones of the vehicle's own meshes (shared geometry, cheap), lie the way they would be left, stack with only the top one takeable. Only if the audit shows Baja's current version is weaker. Must sit on Baja's placement grid, not replace it.
5. **GLB import re-group tool.** Axis fix, name-pattern to slot mapping that throws on unmapped names, wheel repivot. This would make mounting the parked Meshy parts (fiberglass front clip, headers, coilovers) much less manual.

Not planned: Rapier physics (Baja keeps `suspension.js`), the 24/28/96-slot vehicle storage (Baja uses the placement grid and size units), Salvage Road's HUD/inventory styling.

## Backburnered (do not touch)

Shipping containers and support-pillar rule, wood build pieces, planer and portable benches, build hammer and removal dialog, numbered hotbar, flatbed and trailer hauling, tractor and box-truck restoration, trader/barter, survival needs, island world, roads/towns/settlements, cannon-es lab. All stay in `salvageroad` untouched.

## Cleanup candidates in Baja (nothing deleted yet; each needs Chris's OK)

- `Project_Baja_Claude_Handoff_2026-11-06.zip` (11 MB) and `handoff/project_baja_handoff/`: look like duplicates of each other (VERIFY).
- `assets/` is 3.9 GB with an `archive` folder and many Meshy/test models: check what is referenced by `viewer/bug_viewer/public/models` and what is only source.
- Nine docs in `docs/` overlap (RESUME_HERE, ROADMAP, PROGRESS_TRACKER, GAMEPLAN, PROJECT_LOG). Could be folded into one status page. Docs are Chris's record, so ask first.
- Root `package.json` is the API (`projectbaja-api`), the game is in `viewer/bug_viewer`. Fine, but worth a one-line README at the root.

## Open questions for Chris

1. What did you like about Salvage Road's vehicle build that Baja's does not do yet? (Carrying parts, the rusty look, the several vehicles, the import tool?) That sets the order above.
2. Is the '84 truck the second restoration project, or something new from Al's lot?
3. OK to leave `salvageroad` where it is as a reference, instead of copying it in?

## Gap list (filled in by step 1)

Audit done Nov 21 (read from code, **not yet played side by side**). Chris's note: Baja's piece-by-piece vehicle building **feels cheap**; Salvage Road's felt better. So the first port is a **feel pass on fitting**, ahead of the second vehicle.

What Salvage Road does that Baja does not (evidence in code):

1. **Rest poses for loose parts.** SR has a `LIE` table (door flat outside-up, hood and windshield on their backs, wheel flat, engine upright) and centres each part over its footprint with its lowest point on the ground, so a stripped car's parts look *left there*. Baja's `StockPiece` (`game/Items.jsx`) centres the cut-out piece but keeps the model's own orientation, and only wheels are turned. Doors and hoods likely stand or tilt wrongly.
2. **Carry pose.** SR scales the held part to a 0.5 m box and holds it low-right, tilted, parented to the camera. Baja holds the same item at 0.75 scale, level with the camera yaw only, and a big part like a hood is not size-fitted.
3. **Fitting is a visibility toggle in SR** (`showCarBuild()`). In Baja, `doFit` calls `rebuild(nb)` (`main.jsx:131`), which sets `game.rebuilding`, changes the build state and re-requests pointer lock 900 ms later. **VERIFY by playing:** if the scene or its meshes rebuild on every fit, that hitch alone would read as cheap.
4. **Support blocks and cribbing** under missing wheels (Baja has a stand; VERIFY the look).
5. **Rusty, faded paint and bare steel** on every wreck part, which restoring replaces with clean paint. This is a big part of the "mood" and Baja has none on vehicles.
6. **Doors and hood ease** open and shut by amount (Baja has swinging lids too; VERIFY how they move).

Already equal or better in Baja: slot rules, reason codes, blockers, atomic installs, fit and detach glow, zones, tools, covers, doors, shell lift-off.

**Revised order:** (1) fit feel pass: rest poses, carry pose, no rebuild hitch; (2) rust and weathered finish with damaged-part swap; (3) second restorable vehicle; (4) GLB import re-group tool. Step 1 is behind a flag, off by default.

## Progress

- **Step 1, fit feel pass (Nov 21), built, not yet seen in the game.** `game/restPose.js` (+ test): resting poses for loose body parts (doors, fenders, glass, bumpers, steering wheel lie the way they'd be left) and a carry pose (part shrunk to a 0.6 m box, held low-right and tipped). Wired into `game/Items.jsx`. On by default; `?feel=0` restores the old look. The "rebuild hitch" was left alone: the scene only remounts for wheel/engine/shell/steering fits (a physics change), so it needs playing to judge. Tuning numbers (`REST`, `HOLD`) are guesses to adjust by eye.
- Not committed.
- **Step 3, second restorable vehicle (Nov 21), built and driven in headless Chrome:** the El Cajon via Dusty (CANON? not locked), plus the tire machine, work targets and donor Bugs that it needed. Model ported to `src/cajon/`. See [REPAIR_AND_WORLD_PLAN](./REPAIR_AND_WORLD_PLAN.md). Not drivable yet. Steps 2 (rust and weathered finish) is partly there: the El Cajon uses Salvage Road's rust shader; the Bug does not. Step 4 (GLB re-group tool) not started.

## Wrap-up (Nov 22): what is done, what was skipped, and the assets

Checked against both repos on Nov 22.

**Done in Baja:** slot rules, reason codes, blockers, atomic installs, fit/detach glow, zones, tools in hand, covers and doors (already ahead); rest poses and carry pose for loose parts (`game/restPose.js`); the El Cajon as a second restorable vehicle with its rust shader (`src/cajon/`, ported from `render/rust.ts`); weathered paint on the Bug through Baja's own `weather.js` (so gap 5 is closed another way); wear and failure (`src/wear.js`), hand service and diagnosis, which Salvage Road never had.

**Skipped on purpose:**
- `Damaged <slot>` swaps: in Salvage Road these only exist for the box truck and the unfinished pickup (backburnered vehicles), and the Bug already shows fitted vs stripped parts. Revisit if a second restorable vehicle needs worn panels.
- GLB re-group tool: Salvage Road has no generic importer, only hand-written code for its own step van and pickup (`refineImportedVehicle.ts`). Baja's name-prefix matching is enough for now. If mounting the parked Meshy parts becomes the bottleneck, build a small tool then, from scratch.

**Assets: nothing to bring over.**
- `delivery_step_van.glb`, `unfinished_pickup.glb`: Baja already has them (`WRECK_StepVan.glb`, `WRECK_UnfinishedPickup.glb`). They are procedural prototype blockouts.
- `shipping-container.glb`: licence UNKNOWN (source page never recorded), and containers are backburnered. Leave it.
- `public/textures/world/*`: made from Unity Asset Store packs and CGT Facades with UNKNOWN licences (see its `ASSET_LICENSES.md`); not safe for a paid release. Baja has its own textures.
- `public/branding/*`: Salvage Road's logo and title art. Not for Baja.

**Result:** `salvageroad` can be archived on GitHub. Keep the local folder until Chris has no further use for it as a reference; deleting it is his call.
