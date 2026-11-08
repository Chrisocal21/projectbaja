# Project: Baja — PROJECT_LOG

Newest entries last. Records what happened and what was decided, not plans.

## November 6, 2026

- Idea opened as an off-road truck build game, related to Salvage Road but populated and less deserted.
- Decided parts sources: few paid-entry junkyards, barn finds discovered purely by exploring, racing rewards later.
- Decided world: free roam across Southern California and Baja Mexico.
- Decided marketplace: simple forum-style listing, game appraisal with player price override, NPC offers the player can accept, listings sit until handled.
- Handed visuals and assets to ChatGPT because Claude token limits were running low. ChatGPT produced the visual direction, starter Bug, concept art, 17 GLB blockouts and a React Three Fiber viewer.
- Title set as Project: Baja, provisional and changeable. Confirmed separate from Salvage Road.
- Visual direction confirmed: grounded semi-realism with workshop wear, warm light, defined palette.
- Starter vehicle confirmed: faded-blue classic Bug, converted to a Baja Bug over time.
- Existing ChatGPT assets recorded as unverified prototypes.
- Decided Baja takes the main project slot and runs alongside Zombie Siege. Salvage Road steps back and its world, vehicle building and driving, and scrapyards move into Baja. Survival layer and tone stay behind.
- Decided Baja gets a fresh repo. Salvage Road repo stays untouched as a read-only parts bin. No code is copied until the viewer check passes.
- VS Code handoff written. First Claude Code task is the viewer check only.

### Asset lab continuation - imported Beetle, tires and Stage 2

- Ran the local asset viewer and production build; the initial viewer-check
  kickoff above is complete. The active UI is Project: Baja - Vehicle Asset Lab.
- The procedural body did not achieve the requested classic Bug appearance.
  The user supplied [the native Beetle asset](../assets/bug/Beetle1.blend);
  exported it through Blender without modifying the supplied source files.
- Replaced the active Stock base with
  [VEH_001_Beetle_Imported.glb](../assets/bug/VEH_001_Beetle_Imported.glb).
  Normalized to meters, +Y up, +Z forward and 2.38 m wheelbase. The assembled
  Stock model retains its original triangles, materials and winding.
- Separated eight removable body groups: hood, rear lid, four wings, nose skin
  and tail skin. Retained all 56 native object names, yielding 64 export nodes,
  and preserved full-precision authored normals.
- Refitted four body prototypes to this import. The earlier flat-nose/empty-bay
  experiment remains available as **Body prototype**, not the Stage 2 target.
- The user supplied [all-terrain tire archives](../assets/Tires). Reduced the
  92,686-triangle tire to 24,000 triangles after checking sampled surface error.
  Built a stock-size adaptation with the original rims unchanged. Archives
  are preserved and checked by SHA256.
- The user established Stage 2 as a full-bodied classic Baja conversion before
  a later full race/Class 1-inspired build. Chose the light-blue/white rounded
  references and authorized the complete appearance, including raised stance,
  larger tires, simple protection and a fitted rear engine.
- Added a separate **Stage 2 Baja** profile: rounded nose, high-cut wings,
  original fender-mounted lamps, 140 mm body lift, 30-inch tires and 1.50 m
  wheel-center track. Added simple bumpers/rocker rails, static running gear
  and a refitted flat-four-inspired engine blockout. Removed the obstructing
  rear inner skin and the old polygonal opening outline.
- Exported a Stage 2 shell, ten modular components and the assembled
  [VEH_002_Stage2Baja.glb](../assets/bug/VEH_002_Stage2Baja.glb).
  This filename represents the converted Bug export, not an additional
  approved starter vehicle.
- Checked 27 regression cases across the existing 19-case asset suites and
  final eight-case Stage 2 suite. Checks include geometry, source preservation,
  authored normals, mounting seams, grounding, tire/body clearance and
  assembled/modular equality. Sampled engine-case/head spacing measured 34.4 mm.
- Browser checks passed for profile-specific masks, Stock restoration,
  cut/wide exclusion, engine/open-deck dependency, inspector and wireframe.
  Inspected front/rear shaded views. No WebGL error or page exception occurred
  in the final control checks.
- Production build passed with the existing large-chunk warning. All twelve
  Stage 2 outputs match their source, public and production copies. Native
  Blender source and historical archives remain unchanged.
- The imported Stock is 190,396 triangles; assembled Stage 2 is 253,214.
  Neither is game-optimized or production-ready. Engine/running gear remain
  visual blockouts; no steering, suspension travel or gameplay physics are
  validated. Material fidelity, missing textures and licensing remain limits.
- No driving/world/marketplace systems or Salvage Road code were added.
  The local workspace is not initialized as a Git repository; no GitHub or
  Vercel deployment was verified.
- Synchronized all seven project Markdown files to this implementation state.
  [Viewer README](../viewer/bug_viewer/README.md) holds the technical details and
  regeneration commands.


## November 7, 2026

- Took the user's Systems Blueprint as the base spec. Built restoration as pure rules: every part detachable, lids and doors swing, the shell lifts off, a procedural engine with mods. Added physical items and inventory, loot in buildings, and one shared world.
- **Story decided (user):** a kid inherits his grandfather's run-down garage after college. The Bug is found in the garage; Al's lot has the pricier vehicles. Implemented as the new-game start: junk to clear, a breaker to flip, grandpa's letter, the Bug half apart with its parts nearby.
- **Official map decided (user):** the garage is the centre biome, with roads out to other biomes and places to explore. Built Baja County (3 × 3 km): Dry Wells town, Hollis farm, Red Rock Canyon, Sidewinder Dunes, Bitter Lake, the Proving Grounds (the old test tracks moved in), a warehouse and shacks.
- **Build mode decided (user):** grow the yard and garage (racks, lifts, an office and PC, funny decor, fences, add-ons, your own car lot). First slice built; the idea list is in BUILD_MODE.md.
- **Truck:** the user supplied a Hilux model pack. It was exported unbranded and trimmed to 68k triangles and 5.4 MB. It's buyable at Al's and drivable, with cab and bed storage. A fleet system keeps the other vehicles parked where they were left.
- **Plants:** the user supplied plant and tree packs (2.3 GB, git-ignored). Two low-poly trees and the dead grass, grass bushes, ferns and nettles were exported to two small GLBs and placed over the county.
- **Repo:** the truck zips (330 MB) had been committed by accident. They're untracked and ignored now, and unused models were deleted. Purging them from history needs a force-push and is waiting on the user's OK.

### November 7, 2026 (later): breakpoint

- Fixed tires sinking into floors indoors. Slabs and paving now count as ground (`groundHeight`).
- Added the county map (M).
- **Story additions (user):**
  - Grandpa's old #7 desert race car under a tarp in the side yard. Its shocks and race tires go to the Bug, after you weld in shock hoops made from scrap with a welder and a tube bender.
  - Odd jobs from locals: small, occasional, no stress.
  - Fixing up the livable trailer.
- **Assembly guide adopted (user):** saved as `VEHICLE_ASSEMBLY_GUIDE.md`. The hologram recipe (§7) is used for build mode, and a first slice of the fit glow (§9) works on the Bug.
- Build props got more detailed, with textures. Final art is to come from Meshy and OpenAI; prompts are in `ART_PROMPTS.md`.
- Marked a breakpoint in PROGRESS_TRACKER: what's completed, and what's still to be completed.

### November 7, 2026 (evening): Meshy #7 racer tried and reverted

- Split a Meshy image-to-3D model of the #7 racer (body, wheels, shocks as separate nodes; `split_body.mjs` gained a colour-based `shocks` cut) and wired it into `Home.jsx`. In game it was blurry and blobby: Meshy fuses tube cages and engines into soft surfaces and a 1024px texture can't carry a 3.8 m car.
- Reverted to the procedural racer. The GLB stays local in `assets/generated/raw/` (git-ignored). Kept `check_split.mjs`, `profile_render.mjs` and the pipeline changes.
- Lesson: don't use Meshy for open tube cages. Build the cage procedurally and use Meshy or existing GLBs only for solid parts (tires, coilovers, panels).

### November 7, 2026 (night): racer rebuilt, real items in hand

- **#7 racer rebuilt procedurally** to the concept art (low boxy rust cage, sloped red #7 hood and side panels from a canvas texture, roof spotlights, A-arms, slim shock towers, Bug flat-four in a rear cradle, seats/dash/wheel). Wheels are the Bug's rugged tire GLB + beadlock rim; shocks are `SHOCK_001_Coilover`.
- **Racer parts are stealable separately:** shocks, tires and now a beadlock rim (`STARTER.racecar` in `loot.js`; new games only). Each disappears from the car when taken.
- **Held/loose items show the real thing** (`game/Items.jsx` `Crate`): parts render their own GLB (shrunk to carry size if bigger), tires lie flat, rims show their real shape and colour. Items without a model (supplies, tools, stock, procedural mods) are still labelled crates.
- **Tested:** `vite build` passes; the user checked the racer in-game through several screenshot rounds. Item models not yet seen in game.
- **Fit glow amber blockers (guide §9.3):** `rules/restore.js` checks now return a `code` (ok/full/blocked/zone/cover_shut/no_tool/no_part) and `blockers` (slot ids). `BuildModel.jsx` `FitGhost` draws those slots as pulsing amber ghosts; the held part's own ghost is green or red. New unit test; 32/32 pass, build passes. Not yet seen in game.
- **Detach glow (guide §9.3c):** `DetachGlow` in `BuildModel.jsx` raycasts from the screen centre (every 4th frame) into the Bug, maps the hit mesh to a slot (body pieces by source name, wheels by mesh or tire group) and sets `game.aim`. White ghost = can come off, red + amber blockers = can't. Prompt in `Walker.jsx` carAction; **R** detaches (`main.jsx`, respects the zone you stand in). Engine/battery aren't aimable yet (no named meshes). Build + 32/32 tests pass; not yet seen in game.
- **The #7 moves into the garage** (back-right corner, `RACECAR` in `home.js`; collider, container and junk-box pile moved to match). Covered, it's the real car under a measured, relaxed tarp (`RaceTarp`: rays down into the car + an obstacle-membrane solve) with cardboard boxes piled on the roof and hood and walled around the front and side, so from the door it reads as junk. Uncovering restacks the boxes in the corner and drops the tarp on the floor. Letter and prompts updated. Build + 32/32 pass; only visible covered in a new game (existing saves are already uncovered).
- **Garage and covered-#7 look pass:**
  - Garage (`Sites.jsx`): concrete slab texture (joints, cracks, oil stains), finer corrugated walls with rust streaks, plywood wainscot, steel rafters, a red two-post lift around the Bug's bay with yellow bay lines, pegboard with tool shapes, compressor, engine stand now carries the real flat-four and moved to the left side, right shelves hold oil/jerry cans/paint/rim/battery instead of boxes. Colliders added for the lift posts, engine stand, compressor and tire stack.
  - Tarp: skirt reaches the floor within 0.3 m of the car (distance field + pinned membrane) and pools in rucks; more clearance over the spotlights; poly-tarp canvas texture.
  - The pile on/around the covered #7 is real junk (drums, tire stacks, crate, jerry can, an old door, an engine block); uncovered it's shoved into the corner.
  - Loose stock items render as the real thing: body pieces and the stock wheel are cut out of the Bug's own GLB, engine = flat-four, battery modelled. Build + 32/32 pass; not yet seen in game.
- **Doors really open now:** the Bug bodies had a hidden side panel in `B_Body` behind each door, so an open door left the doorway looking shut. New `assets/pipeline/cut_door_openings.mjs` cut 573 triangles per body (checked with a side-on render: pillars, sill and roof gutter kept); both Bug GLBs updated. Also: the detach glow now lights the real part (emissive pulse) instead of a ghost copy, and fitting/removing a bolt-on no longer remounts the whole world (`physicsKey` in `main.jsx`); the tarp drape is cached.
- **Side trim follows the door:** new `assets/pipeline/split_door_trim.mjs` moved the stretch of `B_SideTrim` across each door (34 triangles a side) into `B_DoorTrim_DoorL/R`, now part of the door pieces in `bodies.json` (both Bug bodies). Checked that no remaining trim triangle straddles a door edge.
- **Loading screen** (`game/Loading.jsx`, styles in `style.css`): the title art with a progress bar and a tip covers the game until the three.js loaders have been idle for 0.8 s (min 1.4 s on screen), and again during physics rebuilds (`game.rebuilding`), so the half-built world is never shown.
- **Doors hang right:** re-cut both Bug bodies from the originals with a 5 cm jamb kept (door glass counted as part of the door outline so no bar is left across the opening); door hinge now comes from the door skin only (handles had pushed it outward), inset 2.5 cm/3 cm, and doors open 1.0 rad instead of 1.15.
- **Waking the Bug:** new games start with the battery fitted (only the flat rear-right wheel and the driver's seat are out). First time in, the gas is dead and E turns the key (`crankBug` in `home.js`): 1) cranks, nothing; 2) coughs and dies; 3) fires, saved as `game.home.bugFired`. G gets out while she's not running. Letter, Al's line and the 'all fitted' message updated. Build + 32/32 pass; not played.
- **No more black screens on fitting:** the canvas is never remounted for build changes any more (each remount made a new WebGL context; Chrome dropped one = black screen). Only the car (`<Vehicle key={vehKey}>` in `DriveWorld.jsx`) is re-created, and only when wheels/steering/tires/ride height/shell/engine/hoops change (the wheel rig re-parents those meshes); everything else re-renders in place. Wheel rig now runs once per car. Loading screen shows for the initial load only.

## November 7, 2026 - Bigger, realistic Baja County

- County grew from 3 x 3 km to 6 x 6 km. Grandpa's garage stays at the origin; the gaps between places doubled.
  Dry Wells, the Proving Grounds, Hollis farm and the canyon trail moved as whole clusters (their own layouts unchanged).
- The land is now a real eroded desert heightmap (Bad Raccoon "3D Realistic Terrain", Unity Asset Store) instead of sine waves:
  low ridges and washes inside, a range of real mountains round the edge, flats levelled for the places. Roads are graded
  (smoothed profiles, ends tied to the road they join) and the hills ease off along road corridors.
- Ground uses 8 real photo textures with normal maps (ForestVision, ZNS3D, Polyeler, Waldemarst, Mini Nature Pack, Poly Haven),
  blended per vertex; washes get sand, steep ground gets rock, and the heightmap's own painted AO shades the far ground.
- Boulders are real rock models; ~520 dead desert trees and ~2,600 shrubs added (ENV_Desert.glb, one BatchedMesh per material).
- Palms (Coconut Palm pack) and the cracked old tree were skipped: Unity-only mesh format / ASCII FBX that Blender can't read.
- Licensing note: the Unity Asset Store items are used under its EULA (embedded in the game, not redistributed standalone);
  Poly Haven is CC0. Sources listed in `public/textures/ground/SOURCES.md`.
- Old saves: anything parked away from the garage keeps its old coordinates, which now point at different ground.
- Checked in headless Chromium on the GPU: a new game in grandpa's yard, plus a teleport tour of Dry Wells, the dunes, Bitter Lake and Red Rock Canyon. It loads in about 20 s, and the only console error is a missing favicon. Build passes; 32/32 tests pass. Nothing committed yet.

### November 7, 2026 (late): docs synced

- Brought all project Markdown up to date with the work since the breakpoint:
  - PROGRESS_TRACKER, STORY_AND_WORLD, FEATURE_MAP, OPEN_QUESTIONS, BLUEPRINT_GAP_PLAN, VEHICLE_ASSEMBLY_GUIDE, BUILD_MODE and CLAUDE_GUIDE.
  - The viewer README and the pipeline README.
- PROGRESS_TRACKER now has a "Direction: what's next" section:
  - Musts: commit, the history purge, a play-test, old saves, licensing for a public build.
  - Then world polish, vehicles and building, story and economy.
- New open questions: old saves after the map grew (10e), the final map size (10f), what fills the extra space (10g), and the lore overview (10h). The licence question (17) now covers the Unity terrain and rock packs on a public web build.
- The user is writing a lore overview; STORY_AND_WORLD's story section will be rewritten from it.
- Left as historical records: `handoff/` and SYSTEMS_BLUEPRINT (the base spec).

## November 8, 2026: the Forge canon, and Slice A's atomic install

**Canon arrived.** The Forge review and canon of November 7, with its verdict:
- Keep every locked decision.
- Shrink the first playable to four slices (wheel, drive, engine, money).
- Only one phase is open at a time.

**Docs:**
- New [CANON](./CANON.md): the opening, the people, the #7 story rules, the world bible with phases, the 14 design rules, the technical principles, the phases and the coding-assistant rules.
- FEATURE_MAP has the systems table with build phases and what's in the repo for each.
- PROGRESS_TRACKER now leads with Phase 1:
  - the four slices
  - Slice A checked against the code
  - the 14 acceptance tests with honest status
  - the old "what's next" list, moved to an inbox.
- OPEN_QUESTIONS has the Forge's F1–F10 and C1–C9, the places where the build disagrees with canon.
- STORY_AND_WORLD defers to CANON and marks the placeholders.
- CLAUDE_GUIDE carries the handoff rules.

**Code (Slice A):**
- **Atomic install and remove:**
  - New `src/rules/atomic.js` (`createTx`), wired into `game/store.js` as `transact()`.
  - `doFit`, `doDetach`, `doDetachUpgrade` and the shell lift in `main.jsx` now change the items and the car in one save write. If the action throws, the state rolls back and nothing is written.
  - Before this, the item list and the car were saved separately, so the save could briefly hold a part in two places.
- **Dev sessions no longer write the story save:**
  - The free drive and the test worlds used to write cash and items into it (only the build was guarded).
  - `startStory` now clears the dev flag before a new game.
- **Canon wording fix:** the #7 uncover text no longer says "cracked frame". Canon says it was repaired, and that its seized parts come from storage.
- The letter is marked as a placeholder in `game/home.js`.

**Verified:**
- `npm test`: 38/38, including 6 new tests in `src/rules/atomic.test.js`.
- `npx vite build`: passes.
- Real browser (Chromium on the GPU, `slicea.mjs`): new game → walk to the loose wheel → E picks it up → walk to the rear-right hub → E fits it → the save on disk shows it fitted, with no loose copy → reload → Continue → still fitted, still no copy. **Slice A's pass condition holds for the stock wheel.**

**Still open for Slice A** (all need Chris):
- C8: the "bald tire" needs tire condition.
- C6: the jack is invisible.
- C7: the spawn point is outside the door.
- C5: the seat is out too.
- F1: how a wrench turn feels.
- F10: the letter text.

## November 8, 2026: the office, attached to the garage

Chris asked to keep building out the world, one item at a time: office, dirt parking lot, then build mode and build pieces.

- **Done: the office.** A 6.2 x 6.4 m shed-roof room on the garage's right side, flush with the front face. Layout is in `worlds/office.js` (PROPOSAL: sizes are placeholders). A 2 m doorway through the shared wall, a street door with awning and sign in the front face, three windows, a desk, chair, two filing cabinets, a bookshelf, a coffee pot, a cork board, a clock and a tube light on the breaker. No lore text or dates.
- Code: `worlds/Sites.jsx` (`Office`, `Wall` with openings), `worlds/siteData.js` (walls and furniture colliders), `worlds/county.js` (floor slab), `game/home.js` (build mode treats the office as inside the garage). The old driver-side drawer chest moved from (6.2, 4.2) to (6.2, 2.8) and the newspaper pile from (4.4, 3.6) to (-3.0, 3.8) so neither sits in the new doorway.
- Verified in Chromium: six screenshots (exterior, interior, doorway); on foot you pass the garage-to-office doorway and the street door, and the shared wall and front wall block. 38/38 tests, build passes. 404 for the missing favicon is the only console error.
- Next in order: dirt parking lot, build mode, build pieces.

## November 8, 2026: Golden Hour property pass

- Followed the supplied **Golden Hour at Walt’s Garage** and **Weathered Desert Garage Concept Sheet** references. Replaced the flat workshop roof with a corrugated gable, timber fascia/posts, ridge cap, cream/red garage sign and warm lamps. Lowered/warmed county sunlight without changing test-world lighting.
- Supersedes the right-office layout above: a two-level service wing now attaches on the **left when facing the garage**. Reception counter, bathroom/toilet/sink/shower fixtures, parts shelves and a rear loft are modeled. Eighteen physical stair treads connect reception to the loft; walking elevations, downstairs collider heights and rail boundaries are handled separately from vehicle ground height.
- Moved the camper, its upgrade geometry, collision footprint and interaction target to the **right**; added rounded body corners and window trim. Moved its shade tree accordingly. The far-left yard remains open for expansion.
- Added marked gravel parking ahead of the garage, keeping the central approach clear. Reused the supplied ground atlas's gravel/albedo/normal and concrete layers instead of replacing these with procedural textures. Building corrugation/wood remain procedural: the repository's supplied archives are terrain/vegetation assets. No Meshy generation.
- Updated floor slabs, office/fixture colliders, build-mode reservations and a property map inset. Moved the clearable brush pile out of parking. Existing workshop targets, loot IDs, race car, job and camper progression were retained; no saved placed props were erased.
- Checks: initial production build passed and the existing 38 tests passed; three new property layout/stair tests passed. Browser rendering and an actual stair ascent reached the loft floor at garage pad + 3.12 m. Visual inspection exposed a gable-normal issue and a service-wing roof gap; both were corrected before final validation.
- Scope: bathroom appliances/reception furniture are scenery, not new use actions; loft build placement is reserved rather than enabled. This is a procedural environment art pass, not a photoreal asset replacement.
- The existing `g-chest` was relocated into the ground-floor storage area (same ID and contents); a corridor beside the stairs keeps it reachable without entering the bathroom. Ground-floor interaction prompts are suppressed from the loft so you cannot search downstairs through the floor.
- Final validation: production build passed, **41/41 tests passed**, and `git diff --check` reported no whitespace errors. Browser checks exercised the street entrance, shared garage doorway, storage corridor/tool-chest prompt, relocated camper prompt, stair ascent/descent and loft guardrail. Build placement rejected reception/parking/camper locations and accepted the far-left expansion yard. Exterior and loft screenshots were inspected; the parking surface was then lightened and its perimeter blended into the existing terrain. Existing duplicate `bench` key and large-bundle build warnings remain.

**Update, same day:** Copilot's version of the office replaced mine: a two-storey wing on the garage's left (`worlds/GarageWing.jsx`, reception, bath, stairs and loft), a camper on the right, and a graded gravel forecourt with parking lines (`Forecourt` in `worlds/Home.jsx`). I removed my superseded `Office`/`Wall` code from `Sites.jsx`. Checked in Chromium (exterior, forecourt, reception); 41/41 tests, build passes. The list is now: office ✅, dirt parking lot ✅, build mode and build pieces next.

## November 8, 2026: a bigger customer dirt lot

Chris: the foundation and parking lot should be bigger and blend into the dirt road out to the main road.

- `worlds/county.js`: a trail of flattened packed-dirt discs funnels from 17 m radius at the garage to the driveway's width; the driveway now starts inside the lot (`[0,16]`) so it has no square end.
- `worlds/Home.jsx`: the gravel apron is 34 x 23 m with a wide soft edge, and two rows of five parking stalls (was two stalls). It stops at z = 32 because the graded road sits above it further out.
- `worlds/flora.js`: no grass in the lot. `game/home.js`: the keep-clear rule covers the whole lot.
- Checked in Chromium from the gate, the side and the road; 41/41 tests, build passes.

## November 8, 2026: parking bays beside the drive lane, customers take an open bay

Chris: turn the lot 90 degrees, put bays down the left and right of the drive, driveway straight into the garage, and customers park in whichever bay is open.

- `worlds/lot.js` (new, pure data): a 9 m drive lane kept clear, 12 bays (6 a side, 3 m x 5.4 m), cars nose-out. PROPOSAL layout. `worlds/lot.test.js` checks the lane, the building and camper clearances and the open-bay logic.
- `game/jobs.js`: a customer parks in a random open bay (no parked vehicle of yours within 2 m, and not the car you are driving). If the lot is full they wait. One customer at a time is unchanged.
- `worlds/Home.jsx` paints the bays and wheel stops from the same data; `game/home.js` keeps the lane and bays clear of build items.
- Checked in Chromium: three customers took three different bays, nose-out. 44/44 tests, build passes.

## November 8, 2026: the OPEN light, lot lights and road signs

Chris: customers should only come when the whole place is open; the lamp above the garage sign means open, other lights mean nothing; lot lights for night; signs leading folks off the highway, lit by the same switch.

- **Open for business = power on AND the OPEN switch on.** New `isOpen()` / `toggleOpen()` in `game/home.js`; the switch is a target on the garage's front wall right of the roller door (press E). Customers (`game/jobs.js`) and the job clock only run while open. Saves from before this change start closed: flip the switch once.
- The lamp over the garage sign (and a soft glow on the sign) is the OPEN light. The two side lamps, the tube lights and the new lot floodlights are just lighting (power only).
- `worlds/RoadSigns.jsx`: a two-face billboard at the Highway 9 / Old Mill Rd junction, three signs along Old Mill Rd, a turn sign at the driveway, and a parking sign at the foot of the driveway. Each has a lamp and an OPEN/CLOSED tag that follow the same switch.
- `worlds/Home.jsx`: six floodlight poles around the lot with a soft ground glow (power only). There is no night cycle yet, so they are decoration until there is one.
- Checked in Chromium: power alone brought no customer; walking to the switch and pressing E opened the shop and a customer pulled into a bay; the garage lamp, billboard and road signs lit. 44/44 tests, build passes.

## November 8, 2026: build mode pass 1 (placement rules and category menu)

Tested build mode in Chromium and by probing `placeWhy` at 14 spots for all 21 items.

- **Working already:** the ghost, placing with E, cash charged, saved to disk, kept after reload, X takes the nearest one down for 50% back.
- **Bug fixed: the office wing blocked everything,** so the "Office desk + old PC" had nowhere to go. Now the back office under the loft (`WING_FREE` in `worlds/office.js`) takes Office, Decor and Storage items; bay tools (lift, engine stand, welder, bender) are refused in the wing with a reason.
- **Bug fixed: the drive lane was only protected to 25 m.** Solid items are now refused along the whole lane (`LANE`, 40 m).
- **Menu:** the bar shows all categories and the items in the current one; `,` and `.` jump category (the `[ ]` keys and wheel still step item by item). A hint in the bar and in the HUD.
- 45/45 tests (a new one covers the wing's free floor), build passes.
