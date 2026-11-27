# CHATGPT HANDOFF (living page: Claude adds to it every time something is for ChatGPT)

**Standing rule (Chris, Nov 22):** whenever there is something ChatGPT should do or know (a task, a file to avoid, a finding, a decision), Claude adds it here in the same session, under "Open for ChatGPT" or "Coordination". Chris pastes this page into ChatGPT. When ChatGPT finishes a task, move it to "Done" (or delete it).
Last updated: Nov 27, 2026 (start at "UP NEXT" right below).

## UP NEXT (Nov 27; PROPOSAL order). Jobs 1 and 2 below are done: thank you. Claude checked them (tests pass, renders look right).
**Claude is wiring the four `*_Drive.glb` pickups into the Classifieds** (buy, delivered to the yard, drive with turning wheels). Claude centres the DarkRustPickup between its hubs in code (its model centre is 18 cm off because of the open door): don't re-export it for that. Stay out of `DriveWorld.jsx`, `game/fleet.js`, the Classifieds app and Claude's files below while that is in progress.
1. **Bug kit parts** (old job 3 below): `model_part11` front tube bumper + skid, `model_part10` rear cage + plate, `model_part15` race seat from `assets/meshy/white_baja_bug_split_parts.glb`. GLB only, about 15-25k tris, bottom-centre origin, front +z. List file, size and named meshes here; Claude adds the catalog entries.
   - **Delivered:** `KIT_BugTubeBumper.glb` (1,848,616 bytes, 22,000 tris, `FrontTubeBumperWithSkid`, 1.550 × .705 × 1.140 m), `KIT_BugRearCage.glb` (1,848,776 bytes, 22,000 tris, `RearTubeCageWithPlate`, 1.420 × .885 × 1.264 m), `KIT_BugRaceSeat.glb` (1,848,688 bytes, 21,999 tris, `RaceSeat`, .458 × .821 × .333 m). Dimensions are width × height × depth. One mesh per part. Plain finishes remove donor lettering. Sizes are provisional until fitted to the Classic. Generator: `assets/pipeline/export_bugkit_upgrades.py`.
2. **Classic white wheel-well panel** (old job 4 below).
3. **Separate wheels on the other `VEH_M_*` vehicles**, same method and naming as the pickups, as new `*_Drive.glb` files (keep the originals): GoldTowRig, Wrecker, YellowTrailRig, ExpeditionRig, then the race vehicles (BlackRaceTruck, RedRaceTruck, DuneBuggy) and the two bugs (WhiteBug, CarnivalBug). Hub table here as before.
4. **Shop sounds** (older focus list item 4): wrench clicks, angle grinder, welder, table saw, tube bender. Hook off `game.holdBar`; keep K mute and the 50% default.
Run `git status` first; commit only your own files; show Chris renders for anything visual.

## DO THIS NOW (Nov 26, late; PROPOSAL order). This replaces the older art lists below.
1. **Paint out real logos** in the committed game models (the repo is public and the game uses no real brands). Known: the jacket patch on `PERSON_M_Shopkeeper` (Dusty), the white bug's sponsor decals, the green jeep's government-style badge. Also check every other `VEH_M_*` and `PERSON_M_*`. Edit the GLB textures; keep file names, clips and skeletons.
   - **Claude checked 48b4771:** only the base-colour image changed; meshes, skins and clips are the same; 674 tests pass. Jacket logo is gone (a faint patch outline remains, no mark readable). **Still open:** vehicles are too small on the contact sheet to clear. Render close-ups of the grille, tailgate, hood and doors of every `VEH_M_*`, starting with BlueRustPickup (red mark on the tailgate), DuneBuggy and RedRaceTruck (side graphics), ExpeditionRig (white emblem). The Shopkeeper texture also grew from 114 KB to 735 KB: re-save it at a quality near the original size.
   - **Close-up follow-up:** Reviewed both ends, hood/top and both sides of all 13 committed `VEH_M_*` vehicles. Removed the BlueRustPickup blue oval and red bedside graphics, and dulled the small fender lettering. The tailgate's center rust mark remains. DuneBuggy and RedRaceTruck use stylized marks where no real brand could be confirmed. ExpeditionRig's prominent white area reads as mounted equipment. CarnivalBug's Brazilian flag and Brazil lettering are place references. Local review PNGs in `viewer/bug_viewer/dist` are `vehicle-full-0.png`, `vehicle-one-4.png` through `vehicle-one-12.png`, `blue-after-close.png` and `dusty-compact-review.png`. The jacket atlas is now 113,322 bytes at WebP quality 88 and the logo is still absent in the comparison.
   - **Also (Claude, Nov 27):** the Classic body GLB has a real carmaker logo on the stock hubcaps and the hood badge (`B_HoodLogo`). Paint those out too.
   - **Classic cleanup:** Removed raised emblem faces from all four stock hubcaps and the hood trim on `VEH_001_Beetle_Imported.glb` and its Stage 2 counterpart. These were chrome geometry without a texture map. Retained plain cap faces, the hood ring, original names and transforms. Local before/after renders: `viewer/bug_viewer/dist/classic-emblems-1.png` and `classic-emblems-2.png`.
2. **Separate wheels on the `VEH_M_*` pickups first:** `Wheel_FL/FR/RL/RR` meshes, origin at the hub. List hub positions and radius here.
   - **BlueRustPickup pilot:** `assets/pipeline/pilot_pickup_wheels.py` exports a staging GLB. All four tires are fused into the main body surface. The pilot partitions every original face exactly once, but the detached render exposes missing upper tire surfaces and rough inner edges. The runtime pickup remains the original. Next, rebuild the hidden tire surfaces and clean the cut boundaries before wiring it in or repeating on the other pickups. Provisional hub positions (X left, Y up, Z forward, metres): FL (0.887, 0.374, 1.881), FR (-0.887, 0.374, 1.881), RL (0.887, 0.375, -1.367), RR (-0.887, 0.375, -1.367). Nominal radius about 0.39 m on each. Local review: `viewer/bug_viewer/dist/wheel-pilot.png` and `wheel-detached.png`.
   - **Rebuilt pilot:** The same script now makes complete 0.392 m radius tires with recessed, unbranded steel rims in place of the incomplete original wheel surfaces. All four named pivots were verified in the exported GLB. Edge views show the wheels rotated in place and pulled away from the body. The body still has exposed cut edges at the inner wheel wells, and the replacement tires use smooth tread. Staging model and review PNGs: `viewer/bug_viewer/dist/BlueWheelPilot.glb`, `wheel-rebuild-mounted.png`, and `wheel-rebuild-detached.png`. Keep testing in staging until wheel well cleanup and steering clearance checks are done.
3. **Bug kit parts:** `model_part11` (front tube bumper + skid), `model_part10` (rear cage + plate), `model_part15` (race seat). GLB only, about 15-25k tris, bottom-centre origin, front +z. List sizes here; Claude adds the catalog entries.

**Job 2 pickup exports:** Four new `VEH_M_*_Drive.glb` files in public/models. The original customer GLBs remain in service. The new meshes have separate `Wheel_FL/FR/RL/RR` nodes, neutral steel rims and stationary dark arch liners. Each hub is the node origin. Spin about local X and steer about the vehicle Y axis. Hubs in metres, +X left, +Y up, +Z forward:

| Drive GLB | FL | FR | RL | RR | Radius |
|---|---|---|---|---|---:|
| VEH_M_BlueRustPickup_Drive.glb | (.887,.392,1.881) | (-.887,.392,1.881) | (.887,.392,-1.367) | (-.887,.392,-1.367) | .392 |
| VEH_M_BlueTwoTone_Drive.glb | (.913,.430,1.866) | (-.928,.430,1.866) | (.913,.430,-1.329) | (-.928,.430,-1.329) | .430 |
| VEH_M_BrownRustPickup_Drive.glb | (.918,.402,1.643) | (-.915,.402,1.643) | (.918,.402,-1.506) | (-.915,.402,-1.506) | .402 |
| VEH_M_DarkRustPickup_Drive.glb | (1.116,.400,1.758) | (-.746,.400,1.758) | (1.116,.400,-1.391) | (-.746,.400,-1.391) | .400 |

Blender mesh intersection check passed at each integer angle from -30° through +30° for both front wheels against the body and their respective arch liners. Rear wheels passed at zero steer. Browser comparison at +30° is in local `dist/drive-pickups-*.png`. This is at authored ride height. Check suspension travel and combined bump/steer during gameplay integration. DarkRust has an offset track center from the original scan. Do not assume symmetric X coordinates when wiring it.

4. **Classic body:** hide the white inner wheel-well panel that shows behind the front tire with the carbon wide fenders.

**On hold:** walk / work rigs, until Chris makes the new A-pose Coveralls model in Meshy. Pilot that one only.

**Logo review:** Removed the jacket logo from two UV islands in `PERSON_M_Shopkeeper.glb` and verified both close-up angles in Edge. The GLB base-color replacement script is `assets/pipeline/replace_glb_base_color.py`. All other GLB buffer views are byte-identical, including geometry, skin weights and animation. Two-angle contact sheet reviewed all eight `PERSON_M_*` and thirteen `VEH_M_*` files. No additional legible real brand was confirmed at contact-sheet scale; small markings remain difficult to identify at that scale. The committed `VEH_M_WhiteBug` is a different asset from the sponsor-covered `white_baja_bug_class_.glb`. The sponsor-covered Bug and green ranger jeep are both ignored raw assets and still need decal cleanup if selected for release. Before/after and raw source review screenshots are local in `viewer/bug_viewer/dist` to keep the original marks out of the public commit.

**While Claude builds the lift kit and bigger tires:** do not edit `catalog/*.json`, `BuildModel.jsx` or the other Claude-owned files listed below. Put new export steps in your own script. Raw sources are in `assets/meshy/` on Chris's PC; git now ignores that folder. Run `git status` first and commit only your own files.

## NEW, Nov 26 evening: Chris's Meshy models are in the game (Claude). Read this first.
All on `main`, pushed. Tests: 673 passing; production build clean. Raw Meshy downloads stay in `assets/meshy/` and are NOT committed (only the small game GLBs are).

**What Claude did**
- **Customer trucks** (b2e3584): `assets/pipeline/export_meshy.py` turns the Meshy vehicles into `VEH_M_*.glb` (one fused mesh each, wheels fused, no rig). Eight trucks are customer rides now (`game/custRides.js`, field `file`; `worlds/CustomerRides.jsx`). Also committed but not placed yet: two race trucks, the dune buggy, a white bug and a carnival bug (9a31097), saved for racing and the Classifieds.
- **People** (0bc1786): `assets/pipeline/export_people.py` -> `PERSON_M_*.glb` (static, no skeleton). Casting table `game/people.js` (PROPOSAL): Dusty behind his store counter, Al on the lot office porch, Rosa as the battery customer; two models reserved for the **two hireable workers** (not hireable yet, no names: Chris names them); misc strangers for the tire and flat-wheel jobs. Pastor Dale, Deputy Ruiz and the Hollises keep the old stand-in until Chris adds models.
- **Desert racer tires** (8376cd8): from Chris's exploded "white baja bug" kit; `assets/pipeline/export_bugkit.py` -> `TIRE_DesertRacer.glb` (rim cut off so every game rim fits). New wheel set `tire-desert`.
- **Stage 2 upgrades on the Classic** (c99a6b0): the Stage 2 body is the Classic raised exactly 0.14 m, so the 12 Stage 2-only parts now also fit the Classic (same GLB, `offset.classic = [0,-0.14,0]` in `catalog/parts.json`). The game's bug can buy and fit all 39 upgrades.
- **Spray cans** (39f53da): 12 cans (the customizer palette, `finishJobs.js` CANS). A can also sprays the **rims** (aftermarket only) and the **seats**: hold to blend over one coat, saved in `home.tint[vehId]`, drawn in `BuildModel.jsx`.

**For you (art / models, in this order, PROPOSAL)**
1. **Rig and animate the people**: the `PERSON_M_*` models stand still. Idle, walk, talk; for the two workers also a working loop (crouch at a wheel, use a wrench). Keep the file names; Claude swaps in the rigged versions. Chris has a T-pose man in `assets/meshy/` that is a good rig candidate.
2. **Paint out real logos**: the brown jacket on `PERSON_M_Shopkeeper` (Dusty) looks like a real workwear logo; the assembled `assets/meshy/white_baja_bug_class_.glb` has sponsor decals; the green jeep has a government-style badge. No real brands in game.
3. **Separate wheels on the `VEH_M_*` vehicles** (start with the pickups): split each wheel into its own mesh named `Wheel_FL/FR/RL/RR`, origin at the hub, so Classifieds cars can be driven later. Tell Claude the hub positions and radius.
4. **Three more parts from the bug kit** (`assets/meshy/white_baja_bug_split_parts.glb`): `model_part11` front tube bumper with skid plate, `model_part10` rear tube cage with plate, `model_part15` bucket race seat. Clean, decimate (about 15-25k tris), bottom-centre origin, front +z, then add them here and Claude fits them as catalog parts (or tell Claude to do it).
5. Small: the Classic body's white inner wheel-well panel shows behind the front tire with the carbon wide fenders.

**Claude's files from this stretch (ask here first):** `rules/clearance.js`, `build.js`, `ProcParts.jsx`, `game/workshop.js`, `game/people.js`, `worlds/Person.jsx`, `game/custRides.js`, `worlds/CustomerRides.jsx`, `finishJobs.js`, `game/finishWork.js`, `catalog/*.json`, `assets/pipeline/export_meshy.py`, `export_people.py`, `export_bugkit.py`.

**Rigging first pass:** The eight existing `PERSON_M_*` GLBs now carry one 13-joint `CharacterRig` each. All include in-place `idle`, `walk` and `talk` clips. Coveralls and Overalls also have a crouch and wrenching gesture loop named `work`. Approximate weights from the existing posed meshes need a visual deformation pass, especially at elbows and knees. The work clip animates the person only. Blender generator is `assets/pipeline/rig_meshy_people.py`; run it against the original static GLBs and export to a separate staging folder. Export sizes in bytes: Coveralls 1297796, GreyTee 826796, HiVis 1096364, Overalls 1197000, Shopkeeper 1059488, Trekker 1077552, Woman 1132908, YoungMan 1076812.

**Claude's review (Nov 26): idle + talk are wired in and pushed; walk + work need another rig pass (yours, art job 1).** Rendered all eight in Blender at rest, walk, talk and work.
- Rest and talk are clean on all eight. In the game they idle, and talk when the player is within 2.5 m (`game/people.js` `clipFor`, PROPOSAL).
- **Walk:** GreyTee, YoungMan, Trekker, HiVis and Overalls stretch a large web between the legs; Woman a smaller one. Shopkeeper and Coveralls are mostly OK. Likely cause (not proven): the script picks the leg bones by the sign of x, but these meshes are posed with feet staggered or crossing the centre line, and some legs may be joined in the mesh. Weighting by mesh connectivity (heat weights), or cutting the joined faces, or A-pose sources would likely fix it.
- **Work:** both workers drag jacket / pocket geometry out behind the back with the arms (hands resting on or in the clothes get arm weights).
- Check each fix by rendering side view at walk frames 25% and 75%. When fixed, keep the clip names and tell Claude, who adds them to `clipFor`.

**Follow-up experiment:** Welded duplicate vertices, removed the hard left/right weight split, smoothed weights over connected edges, and measured deformation. With the 99.5th percentile edge stretch capped at 1.35× at sampled keyframes, GreyTee, HiVis, Trekker and YoungMan walk only at 10% of the original motion. Coveralls work also reached only 10%. Overalls reached 20% walk and 30% work. This measures deformation, not visual quality, and does not prove which meshes have fused limbs. The experimental generator stages exports outside public; existing runtime GLBs and idle/talk wiring are unchanged. Use Coveralls for the single Meshy A-pose pilot so it exercises both walk and work. Request clearly separated arms, hands outside pockets, and uncrossed feet. Compare quarter and three-quarter side views before regenerating any other characters.

**Wiring (done by Claude):** In `worlds/Person.jsx`, clone each instance with Three's SkeletonUtils before animation and give it its own mixer. Default to `idle`, crossfade by clip name, and move the world group along the path during `walk`. Worker logic can position a separate wrench to match the right forearm and choose `work` only for the two reserved models. File names and casting keys are unchanged.


## READ FIRST: catch-up since your last commit (f8979cb, Nov 23)

**Where the game is heading** (Chris): the opening and the garage business come first. He wants it to be more than mechanic + racing: a **light** bench-crafting system (buy, find or scrap materials, then build shop furniture and race parts by hand). Everything the player does is hands-on, never click-and-choose. Plan and Chris's picks: [CRAFTING_PLAN](./CRAFTING_PLAN.md). Current state: [RESUME_HERE](./RESUME_HERE.md).

**Done since then (all on `main`, pushed)**
- **New-game opening:** 16 old tires to clear off the property before you can open; lean starting stock; the Bug has her own side bay (lean-to with roll-up door), so the lift is free for customers.
- **Office:** it grows as one office (one counter, one stair). Your back-shop tier work is committed, with two invented-lore props removed.
- **Phone:** one fixed size; the Internet app is a browser with four sites (parts, building and steel supply, classifieds, Honest Al's).
- **Vehicles:** more cargo room.
- **Crafting Phase 1:** racks and shelves are blueprints. Place an amber hologram, put materials in, hold left click with the wrench; the real rack rises out of the floor.
- **Crafting Phase 2:** four materials (wood, scrap, steel, fasteners). The angle grinder at Walt's workbench cuts scrap into steel; a crate or oil drum is taken apart by hand. Shock hoops take steel.
- **Fixes from Chris's play-testing:** better stand-in junk models (drum, jerry can, crate, engine block); the Bug's wheels now sit on the tire shelf, not in the wall; Walt's tool chest moved from the office into the garage; the main breaker can be aimed at again; the red tail lamps only show once the Taillights are fitted (they are built into the rear fender meshes, now claimed by material: `meshMatch.js`, token `mat:B-taillight1` in `catalog/bodies.json`).
- Tests: 641 passing; production build clean.

## YOUR FOCUS, in this order (PROPOSAL: Chris can reorder)
You: art, models, sound and world. Claude: gameplay rules and wiring them in.
**Done (Nov 26):** sawhorses, workbench, lumber / steel / battery rack models (964922a); 64 small GLBs for junk, materials, tools, engine parts, kits, containers and yard piles (9e51248, see [GLB_INVENTORY](./GLB_INVENTORY.md)). Claude still has to wire in the furniture.

1. **Station models delivered below, wiring pending:** grinder station, welding table + welder cart, table saw station, tube bender station, plus broken looks for Walt's old welder (under a tarp), grinder and compressor. Moving parts as separate named meshes.
2. **In-game walk-through of your 64 models** (still pending): in your hands, on shelves, on the floor, in containers; check size, floating or sinking, facing, grip, and frame rate.
3. **People for customer visits:** superseded by Chris's Meshy people (see NEW section above): rigging them is the job now.
4. **Shop sounds:** wrench clicks, angle grinder, welder, table saw, tube bender, plus grinder sparks and a small puff when a build stage finishes. Hook off `game.holdBar`; keep K mute and the 50% default.
5. **Garage art polish:** the scrap tire pile's readable "SCRAP TIRES" sign (if not already done), the side bay (eave, matching roll-up door, work light, stains), and the tire look on the racks (item 12).
6. **World work:** drive the 24 baked trails (item 8), the dirt-road drop (item 0), a visual check of the Mex 5 crossing fix.

**Model rules:** metres; origin at the bottom centre (bottom at y = 0); front faces +z; match the footprint of what it replaces; GLB in `viewer/bug_viewer/public/models`. For each model, tell Chris the file name, its size and the names of any moving or separate meshes. Put paint, lamps and trim that bolt on separately in **their own named meshes**, never inside another part's mesh (that caused the tail lamp bug).

### Walk-through status and requests for Claude
The local game title screen loaded in an isolated browser. After Start, the headless game session stopped responding to browser evaluation. The full in-game review of all 64 models, screenshots and frame-rate measurement remains pending. The earlier contact sheet and nine state checks cover isolated assets only.

Items.jsx follow-up for Claude from source inspection
- PartModel clamps every loose kit to its carry tier. Verify long kits and the stock engine at shelf scale during the walkthrough.
- StockItem's wheel resting transform wraps a bottom-centred StockPiece in another rotated group. Check floor contact for stock wheels.
- TireItem uses a fixed 0.18 m lift. Measure the GLB bounds after its resting rotation so every tire touches the surface.
- The rack and vehicle grid paths use their separate TireModel. Compare them with the new loose worn tire.
- No Items.jsx or BuildModel.jsx edits were made in this station pass.

## Nov 26: Claude finished your trail pass; walk-in stores started
- Your uncommitted `highways.js` change and trail tools are committed. All 24 trails reach the end in `tools/drive-trails.mjs`. In-game checks (Mex 5, garage polish) are still open.
- Claude is building walk-in stores, Dusty's first (`worlds/DustyStore.jsx`, `dustyLayout.js`). The goods on its shelves are plain boxes: product and fixture models would help (keep within the sizes in `dustyLayout.js`).

## Coordination (who edits what)
- Both builders work on `main`. Run `git status` first: modified files you did not touch belong to the other builder. Pull before you start.
- **No files are locked right now.** (The Nov 22 road-work lock is over.) If you are about to spend a while in a file, say so here.
- **Yours:** the world and road files (`worlds/county.js`, `County.jsx`, `highways.js`, `trailRoutes.js`, `offroadFeatures.js`, scenery), new GLB models, new model components, `audio.js`.
- **Claude's, ask here first:** `main.jsx`, `game/Walker.jsx`, `game/home.js`, `game/items.js`, `Items.jsx`, `BuildModel.jsx`, `catalog/`, `meshMatch.js`, every `*Rules.js`, `game/blueprints.js`, `bpWork.js`, `materials.js`, `matWork.js`, the phone, HUD and docs. To get a model into one of these, add it to this page and Claude wires it in.
- **Shared, small separate commits:** `worlds/Home.jsx`, `worlds/Sites.jsx`.
- Commit small. Run `npm test` and `npx vite build --outDir <tmp> --emptyOutDir` before pushing. Check visual work in a real browser. Never commit `node_modules`. Never commit in `salvageroad`.

## Project in one paragraph
A browser off-road driving and vehicle-building game set in Baja California. JavaScript, React 18, @react-three/fiber 8, three 0.170, Vite 5. Game folder `viewer/bug_viewer`; tests `npm test` (node --test, 673 passing). Chris wants a realistic racing-game feel and builds cars piece by piece. Reference photos: Ocotillo Wells and Baja desert race trucks. **Never invent lore** ([CANON](./CANON.md)); do not add gameplay loops or economy without asking. All numbers are estimates to tune by feel. Dev server: `npx vite --port 3001`; real map: `?realmap`.

## How the ground works (read before touching terrain)
- One height function, `height(x, z)` in `worlds/county.js` = base terrain (`groundOnly`) + the feature field. The car (`rigid.js`) samples it directly, so physics sees the exact smooth surface.
- The picture is a triangle mesh: `StreamTerrain` in `County.jsx` builds 300 m tiles at `LO` 24 segments (12.5 m), `LO_REAL` 12 (25 m) far away, `HI` 120 (2.5 m) within about 430 m. Built in about 4 ms slices per frame (11 ms while ground near you is missing).
- Features are height deltas planned in `offroadFeatures.js` / `wildFeatures.js` and indexed by `buildField` (96 m cells). Heading 0 faces +z, positive turns toward +x.

| Feature | Shape | Numbers (estimates) |
|---|---|---|
| Whoops | rounded humps across the path | wavelength 7.5-19 m, amplitude 0.26-0.7 m |
| Jump | low table top | 0.45-1.65 m high |
| Berm | banked turn, S of two | radius 24-38 m, bank 1.0-1.7 m |
| Creek / river | carved trench, water surface, bank blend `hw*0.4` to `hw*2.6` | half-width 2.6-9 m, depth 0.5-1.6 m |
| Hill climb | dome | 9-16 m high, radius 62-88 m |
| Bridge deck | flush with the banks, creek bed under it ignored | 4.8 m wide |

Water (`DriveWorld.jsx`): wading slows and cuts grip, spray, current pushes the car, deep water drowns the engine, wet brakes for 7 s. The water ribbon is a shader with moving streaks and bank foam (`WildScenery.jsx`).

## Open for ChatGPT
0. **Lower the dirt roads just below the highway asphalt (Chris's idea, do this with your road work).** Goal: unpaved "flatish" roads should sit slightly below the paved roads' grade across the whole real map, like real dirt roads that wear down into a shallow cut. Where a dirt road meets or crosses a highway you get a small natural step or hop; that is normal and wanted. It also flattens the dirt roads naturally.
   - Where: `src/worlds/highways.js`, dirt STYLE (`half 2.8, lanes 2.1, shoulder 7, grade 90`) and `blend(x, z, h)`, which eases the ground onto each road's graded height `nH[j]` with `dirtWeight = smooth(0, 12, edge)`. Paved roads keep owning crossings.
   - What: on a dirt road's centre and lanes, subtract a small depth (start about 0.15 to 0.3 m, tune by feel), fading out across the shoulder so the cut has soft sides. Keep it deterministic and a pure function of position so physics and the mesh agree.
   - Only on the plain flatish stretches. **Skip** the drop where there is a bump section, whoops, a table-top jump, a berm or a sharp turn (use the feature field from `offroadFeatures.js`, and a curvature test on the road polyline), and near bridges and fords. Fade the drop in and out over about 20 m at those edges so there is no cliff.
   - Test: a pure-function test (dirt road centre is lower than the nearest paved grade by the set amount on a straight; zero on a feature; continuous at the edges). Then check in game with `?realmap` and drive a dirt road beside a highway (Chris's screenshot shows the case).
   - Do not change how the car or the mesh sample height; this stays inside the height function.
1. **Ground mesh smoothness.** Whoops are 7-19 m long but the finest mesh is 2.5 m, so they look faceted and the visible ground disagrees with the physics surface by a few cm (more on coarse tiles). Ideas: locally refine the mesh inside feature footprints (about 1 m), compute vertex normals from the height function (central differences), keep a far LOD that drops whoops but keeps jumps and berms, no cracks at seams, stay fast (Chris sees about 30 FPS).
2. **More natural bumps.** Whoops are clean sines; real ones vary in spacing, size and crest and get rutted. Add noise without breaking the physics. Another builder already started on whoop phase / amplitude variation (see `offroadFeatures.js` in the tree): check it first.
3. **Creek banks and water look.** Nicer bank cross-section, wet-dirt colour at the edge, gravel bed. Bridges have no solid rails and nothing visible underneath.
4. **Engine and driving sounds.** `src/audio.js` is a first procedural pass (engine from rpm, tires, wind, water, landings; K mutes). Real recordings would sound much better: boxer burble, backfire on lift-off, wet-brake squeal, creaks from worn parts, dirt and gravel. Chris may supply samples; wire them in without removing the mute and the 50% default.
5. **Concept and art help** (Chris's call): trophy-truck-style long-travel suspension look, track and drift-car ideas.
6. **Paint-sim look (reference only, no code needed).** Chris wants hands-on grinding, painting, buffing and hosing (no picker). Useful from you: reference images and concept art of each stage on steel and fiberglass: heavy rust, ground bare metal, flat paint, buffed gloss, fresh gelcoat, mud and dust, hose spray and wet look. Claude builds the tools and shaders from `src/rules/finish.js` (`look()` returns colour, roughness, metalness, rust and dirt amounts).

7. **Tool art and recovery references (reference only).** Concept art / photo-style references for the tools in [TOOLS_AND_JOBS](./TOOLS_AND_JOBS.md): angle grinder, spray gun and cans, buffer, pressure washer, body hammer and dolly, engine hoist, tow strap, winch, hi-lift jack, traction boards, tow truck and flatbed (old 1960s-80s style), car hauler trailer. Models and code are Claude's job.

8. **Check the new baked dirt trails (Chris wants them end to end perfect, one by one).** About 18 trails in `public/terrain/trails.json` (see "Dirt roads are now baked trails" below). Nobody has driven them yet. For each: does it start and end on a road with no gap or step, is the grade drivable (the finder allows up to 17%), does it read as a wash or mountain trail in the real terrain, and does the ground mesh and road ribbon cope. Fix by editing `trailRoutes.js` costs or by hand-placing a trail in the json. Add a debug overlay (draw `trails.json` on the map) if useful.
9. **Dirt trail variety.** Only two kinds exist: a trail between two highways. Wanted: dead-end mountain trails climbing a ridge, long wash runs, short stretches that hop onto a paved road and off again, more trails in the peninsula south of the garage region (the highway data is thin there, so few trails were found).
10. **Retired procedural dirt.** `regionalDirtRoads` (`regionalRoads.js`), `makeBadlands` relief (now fed no trails) and the roadside dirt loops from `planFeatures` / `planHighwayFeatures` are switched off in `county.js`. The jumps and whoops beside highways remain but their access trails are gone. Check no feature now sits unreachable, or retire the leftovers.
11. **Map look (Chris said the old one looked horrible).** `game/WestCoastMap.jsx` is now full screen with a legend, race routes (SCORE orange, MDR purple, Baja 1000 thick, S/F flags), the US-Mexico border and region names. It was never visually checked. Art help welcome: nicer terrain shading, label placement at each zoom, road styling, and a cleaner legend. Keep click-to-set-waypoint working.
12. **Tires on the racks** (see the section below): the look is still open.

### New-game opening and customer visits (Nov 26, from Chris)
- **Tire cleanup is built** (Claude: `game/yardTires.js`, `home.js`, `Home.jsx` `TirePile`, `Walker.jsx`, `hud.jsx`). The scrap tire pile is plain boxes and rings: it could use a proper model and a readable "SCRAP TIRES" sign.
- **Coming:** customer cars that drive onto the lift and visible customers who walk, talk and wait. There are no character models in the game yet: ChatGPT could make a few low-poly rigged people (idle, walk, talk, sit). Claude will start with simple stand-in figures.
- **Side bay is built** (Claude, Nov 26): `worlds/sideBay.js` (sizes), `SideBay` in `worlds/Sites.jsx` (plain boxes in the shop's skins), collision in `siteData.js`, floor in `county.js` FLOORS. It could use art: a proper lean-to roof edge where it meets the main eave, a roll-up door that matches the main one, a work light, oil stains. The water tank moved to (19.6, -8.6) and `GarageGrounds.jsx` `driveRects` east lane is now x 13.8..17.4 (east of the bay).

### Office and stairs: finished by Claude (Nov 27) - do not redo
Codex stopped at "next is the office and stairs, including the duplicate desks and the landing that cuts across the room". Claude did that job, so the office now grows as one office:
- **One customer counter: Walt's.** The wing's separate service counter is gone (it stood back to back with Walt's across the widened doorway). Walt's counter, just inside the doorway, serves the wing. `WING.counter` no longer exists.
- **One stair: Walt's.** At office level 3 the team room is reached up Walt's stair, along his loft and through a doorway at loft height in the old office's west wall (`WING_UP.door`, openings segment OW1 upper part; `OriginalWall` takes an `upper` cut). The wing's own stair and landing are gone, the west parts shelving stays, the supplier desk no longer slides, and the race planning board moved to the wing's north wall.
- **Two walking bugs fixed:** wing furniture heights (`wingWallCircles` top/bottom) are above the garage slab but were compared with the walker's world height (the garage sits at y -4.19), so the upstairs table never blocked and ground furniture blocked upstairs; `home.js propObstacles` now adds `G.y`. And Walt's loft rail (Walker.jsx) used to stop you walking south anywhere at loft height, the team room too; it is now limited to his office.
- Your back-shop tier work is committed (73b91ae) with two changes: the side bay family board keeps only the photo of grandma's Bug (the note to Walt and the "Sunday drive" map were invented story: never invent lore, see CANON), and the tier-3 storage signs hang between rack posts.
- Still open in the office: a parts sign or screen on Walt's counter at level 2 (the old service counter had one), the balcony over the shop floor (never built), and art for the upper doorway.

### Phone browser, materials and crafting (Claude, Nov 27) - for polish, not rework
- Internet on the phone is now a browser (`game/BrowserApp.jsx`, styles `.web-*` at the end of `hud.css`): four sites with a colour band each (Parts Online, Building & Steel Supply, Classifieds, Honest Al's). Polish welcome: a small logo per site, a nicer home page, photos on classified posts. Names and addresses are PROPOSALs until Chris names them; never invent people (sellers are "a seller in <real town>").
- Materials: bundles lie at roadside stops and along forest trails (`game/matFinds.js`); the look is in `Items.jsx` (kind 'mat': a few planks, or bent bars and a plate). A better plank-bundle and scrap-pile model would help.
- Racks are blueprints now (Phase 1, `game/blueprints.js` + `game/bpWork.js`): a prop with `bp: { got, work }` is not finished. It draws as an amber hologram with the real model clipped at the work height (`BlueprintProp` in `worlds/Home.jsx`), is skipped as a tire surface, a bin and in `hasInGarage`, and cannot be stored. A finished one carries `made` (the materials it took), and taking it down refunds those materials, not cash. If you add code that treats racks as working storage, skip props with `p.bp`. A new game starts with one tire shelf and one supply shelf (`STARTER_LEAN_*`). Polish welcome: a work sound (wrench clicks) and a small puff when a stage completes.
- Materials (Phase 2): the four ids are `wood`, `scrap`, `steel`, `bolts` (`game/materials.js`; use `addMats` / `shortOf` / `matsText`, don't hand-edit `game.mats`). `game/matWork.js` runs the held jobs (cutting steel at the bench, salvage). Polish welcome: grinder sparks and sound while `game.holdBar` is cutting or salvaging with the grinder, and real models for the steel and fastener bundles (`Items.jsx`, simple boxes now). The loose junk (oil drum, jerry can, wooden crate, engine block) has stand-in models built from shapes in `game/JunkModels.jsx`; real GLBs can replace them one at a time (same size, bottom at y = 0).
- More cars for the classifieds need more car models first (only the '84 pickup is buyable today).

## Done (recent, for context)
### Remaining stations delivered
Eight GLBs are ready in `viewer/bug_viewer/public/models`. Dimensions are provisional, in metres, width ? height ? depth. Origins are bottom-centred with +z front. Blade, die, lever, controls, wheels and tarp are separate meshes. Their mesh geometry uses asset-local coordinates, so animation needs a pivot at the spindle or hinge. Claude can wire them into stations and broken equipment.

| File | Dimensions | Meshes |
|---|---|---|
| SHOP_GrinderStation.glb | 0.910 ? 1.050 ? 0.576 | Frame, Feet, Stretchers, TopPlanks, ClampingPlate, Motor, CuttingDisc, ToolGrip |
| SHOP_OldCompressor.glb | 0.800 ? 0.721 ? 0.479 | Tank, Feet, MotorPlate, DeadMotor, PumpFins, Flywheel, DisconnectedHose, DeadGauge |
| SHOP_OldGrinder.glb | 0.457 ? 0.274 ? 0.286 | Base, Motor, Spindle, WornWheel, BrokenGuard, LooseToolRest |
| SHOP_OldWelderTarped.glb | 0.656 ? 0.679 ? 0.633 | TransformerCase, Wheels, DeadPanel, MissingDial, FrayedLead, Tarp |
| SHOP_TableSawStation.glb | 1.100 ? 1.097 ? 0.830 | Frame, Feet, Stretchers, SawBody, Table, Blade, Teeth, RivingKnife, Fence, FenceRails, HeightWheel, Switch |
| SHOP_TubeBenderStation.glb | 0.955 ? 0.982 ? 0.630 | Base, Pedestal, DiePlate, BendingDie, DieGroove, Follower, Lever, HandleGrip |
| SHOP_WelderCart.glb | 0.510 ? 0.985 ? 0.666 | Frame, Feet, Stretchers, LowerTray, MachineTray, Wheels, WelderCase, VentSlots, ControlKnobs, PushHandle, TorchLead, Torch |
| SHOP_WeldingTable.glb | 1.280 ? 0.920 ? 0.840 | Frame, Feet, Stretchers, TableSlats, LowerShelf, GroundLead |


- **Small GLBs and asset inventory.** See [GLB inventory](./GLB_INVENTORY.md) for all 99 game files, source and handoff copies, dimensions, named meshes and current wiring. The [contact sheet](./SMALL_MODEL_PREVIEW.png) shows all 64 new assets. Loose salvage, bundles, tools, supplies, removable engine pieces, upgrade kits, searchable containers and the yard cleanup piles now use the models through their existing game render paths. The scrap-tire pile has a readable sign and a counted stack. The rack tire renderer and fitted car assemblies have separate art paths.
- **Phase 3 furniture art, first batch.** Five static GLBs are ready in `viewer/bug_viewer/public/models`. Claude can wire the sawhorse pair and new workbench into their blueprints and the three racks into storage. Each file uses a bottom-centred origin, metres and +z front. These are proposed furniture sizes. Allow access from the front of the cantilever racks. The two sawhorses together form one station. Browser checked as standalone assets. Placement and gameplay integration remain open.

  | File | Width × height × depth (m) | Bytes | Separate meshes (all fixed) |
  |---|---|---:|---|
  | SHOP_Sawhorses.glb | 1.180 × 0.810 × 1.439 | 12,364 | Both `Front` and `Rear` prefixes on `Beam`, `Legs`, `Ties`, `Braces`, `Hardware` |
  | SHOP_Workbench.glb | 1.650 × 0.913 × 0.708 | 13,616 | Top1–Top5, Legs, ShelfCleats, Apron, Hardware, Shelf1–Shelf4 |
  | SHOP_LumberRack.glb | 1.750 × 1.700 × 0.600 | 7,972 | Posts, Feet, Arms, Knees, Rails |
  | SHOP_SteelRack.glb | 1.700 × 1.400 × 0.600 | 6,884 | Uprights, Feet, Arms, EndStops, Rails, BackBrace |
  | SHOP_BatteryRack.glb | 1.122 × 1.030 × 0.468 | 8,120 | Frame, Trays, Lips, LabelPlates |

- **Paved crossing gap fix (Nov 23, ChatGPT):** Chris's Mex 5 screenshot showed asphalt branches cut back from their through roads. `County.jsx` had junction fill meshes disabled, but the highway ribbon and shoulder builders still removed lower-priority paved triangles at every crossing. Those cuts are now removed; continuous paved ribbons overlap at joins, while dirt still yields to pavement. The road tests and production build pass. The browser capture returned the editor rather than the game, so this specific junction still needs an in-game visual check.
- **Map route discovery (Nov 23, ChatGPT):** The full-screen map has a visible Routes & Races panel. Separate Desert trails and Race courses toggles show the 24 baked trails and seven race courses; numbered trail badges match the list. Choosing a trail sets a waypoint to its nearer entrance and centers the map there; choosing a race sets a waypoint to its start. The selection remains highlighted on the map. The source for the displayed trail list is the final joined road geometry from `trailRoutes()` in `county.js`. This is map/navigation discovery, not a race-entry or pit system.
- **Western Imperial trail-network pass (Nov 23, ChatGPT):** Read the two-page BLM routes PDF as a terrain/network reference and Chris's fourteen race-map images as course-structure references; notes are in `docs/ROUTE_AND_RACE_REFERENCE.md`. `trailRoutes.js` adds short terrain-routed connectors around the western Imperial play area, and `trails.json` was rebaked to 24 dirt runs (~100 km). `tools/build_trails.mjs` now rejects any baked centerline that crosses mapped water or leaves an end more than 90 m from a paved segment. The connectors use the baked-road name expected by `highways.js` so both ends snap to the final paved mesh. **Open:** drive all 24 routes in game and inspect joins, grade, road mesh and useful alternate paths before calling item 8 complete.
- Real-map graded dirt road centers return hardpack and dry lake flats return clay. Both use the physics catalog grip and rolling resistance.
- Table-top jumps, long-travel suspension (soft spring, firm damping, light anti-roll), handling profiles with a saved drift baseline, tire pressure, diff types, wear and service, Admin redesign and teleport, flat-white fiberglass, fiberglass front clip, chunkier coilovers, terrain streaming fix after teleports.

## Garage expansion art (Nov 22, nothing built yet)
Claude will build basic box buildings for garage levels 1-3, office levels 1-3 and a living quarters. When they exist, polish the look: steel-clad shop with roll-up doors (level 1), polished epoxy floor and light rows (level 2), open race warehouse with wall car racks (level 3), two-story office block with balcony. Plan: docs/EXPANSION_PLAN.md.

### Garage expansion: rules now set (Claude, Nov 22)
The extension behind Walt's garage (worlds/GarageExtension.jsx, layout data in worlds/garageLevels.js) now follows fixed rules, listed in docs/EXPANSION_PLAN.md "Expansion rules". When you polish the art, keep the layout as it is: door positions, bay spots, bench wall, aisle and racks come from garageLevels.js and are checked by tests. Look direction: new clean steel (not Walt's rust), white liner inside, steel beams, LED high-bays, flake epoxy at levels 2-3. Screenshots: viewer/bug_viewer/screenshots/garage_L*_*.png and garage_plan_0_3.png.

## Garage grounds (Nov 22, Claude)
`worlds/GarageGrounds.jsx` draws the ground round the garage as basic boxes: the slab edge eases 0.12 m down to the yard over 0.9 m (no step), concrete ramps out of each roll-up door, and a gravel drive (front yard, east side between the shop and the camper, then behind the back doors; at level 3 out of the east and west doors). Please polish freely (better blend into the terrain, tyre tracks, edging); keep the drive reaching every door. The extension's slab is now a walkable floor via `dynFloors` in `game/home.js` (county.js FLOORS still lists only Walt's slab).

## Office level 1 (Nov 22, Claude)
Stage `office1` ("Customer office", needs the annex): `worlds/office.js` WING (x -17.2..-13.2, z -6..6) replaces the annex; `GarageWing.jsx` OfficeWing draws it with basic boxes (walls, customer door in the front wall with header and sign, service counter, waiting benches, back room desk and files). Doorway to the old office is openings OW3+OW4 (4 m). Collision = `wingWallCircles` (walls, door gap, counter). Floor is a walkable dyn floor in `home.js`. Polish: real windows, door, counter, seating, signage, lighting. Levels 2-3 (parts counter, upstairs team room, balcony) follow the plan in EXPANSION_PLAN.md.

## Office level 2 (Nov 22, Claude)
Stage `office2` ("Parts counter", needs office1): `worlds/office.js` PARTS_ROOM (shelving along both back-room walls, supplier desk beside the counter); `OfficeWing` in GarageWing.jsx swaps the back room's desk and files for shelves with part boxes, adds a screen over the counter. Collision via `wingWallCircles(2)`. Order speed is unchanged (supplier account still sets it). Polish: real shelving, counter window, supplier desk props, signs.

## Office level 3 (team room) - Nov 22
Stage `office3` ($14,000, proposal). Code: worlds/office.js (WING_UP, wingLevel, deskOf), worlds/GarageWing.jsx (TeamFloor), game/Walker.jsx (stair and floor walking), game/home.js (circle top/bottom).
- The wing grows to 6.6 m tall with a second floor at 3.12 m (same height as the old office loft). The stair is 16 boxes up the west wall; the west shelving is not drawn at level 3.
- Collision circles may now be `[x, z, r, top, bottom]`: `top` = walkers above it pass over, `bottom` = walkers below it pass under (used for the upstairs table).
- Basic box art only: please polish the stair, rails, team table, chairs, the race planning board (blank on purpose: do not invent team names or routes), windows, a real door model.
- Left for later: the balcony over Walt's shop floor, any link from the upstairs room to the old office loft, an upstairs use for the team room (nothing happens there yet).


## Visual work on props and junk (Claude, Nov 22)
ChatGPT may restyle looks now. Rules so we do not collide:
- Safe: the shapes and colors inside each `case '<prop>'` model in `worlds/Home.jsx` (toolChest, partsBin, partsWasher, batteryCharger, the rest), the `Junk` pile models, and your own world files.
- Keep the ids, sizes and positions the same: `partsBin`, `toolChest`, `yardRack` hold items; props have a solid circle from their `r` in `BUILD_ITEMS` (game/home.js). A bigger model than its `r` will look like it clips.
- `ShrinkingPile` in Home.jsx scales a junk pile from 1 down to 0.35 as loads are hauled; keep a pile as one group so that scaling still works.
- Not yours: Walker.jsx, main.jsx, game/home.js, items.js, bins.js, benches.js and any `*Rules.js`. Ask in this file instead.
- Home.jsx is shared: make small separate commits and tell Chris when you commit; Claude pulls before touching it and is staying out of it meanwhile.

## Tires on the garage racks look wrong (Chris, Nov 22) - for ChatGPT
Chris looked at the tires on the blue tire shelves (the Bug's four wheels and the shop's worn tires, `pose: 'upright'` on the `shelfTires` surfaces, see `game/teardown.js` TIRE_SHELF / SHOP_TIRE_SHELF and `placement/Preview.jsx`) and said they need fixing, but did not say what. From his screenshots (evening, power off): they read as flat black, they sit in a tight row that looks like stacked discs, and the end ones sit at the very edge of the shelf. Please look at the tire model (`TireModel`), its material and lighting, the spacing, and the sidewall and hub detail, so a rack of tires reads as a rack of tires. Keep the item ids, positions and `pose: 'upright'` the same (Claude owns Items.jsx, teardown.js and the placement rules).

## Changes that touch your files (Claude, Nov 22)
- Junk piles are now picked up with one press of E and the whole pile clears at once (no hold-to-haul in loads). `ShrinkingPile` in Home.jsx never shrinks a pile any more, so a plain model per pile is fine.
- HUD: a minimap (`game/Minimap.jsx`, bottom left) draws roads from `worlds/county.js` (`ROADS`, `highways()`) and found places from `SITES`. New roads or sites you add show up on it by themselves. Tab now opens the phone on its Inventory app.

## Dirt roads are now baked trails (Claude, Nov 22)
- The brown dirt lines were procedural loops beside the highways (`regionalRoads.js` wash/shelf trails, `planHighwayFeatures` loops). Those are no longer added to the world. `regionalDirtRoads` still exists but is unused.
- Dirt roads now come from `viewer/bug_viewer/public/terrain/trails.json`, baked by `node tools/build_trails.mjs [debug.png]` using `src/worlds/trailRoutes.js`. Trails are least-cost routes over the real elevation data between two highway points: they favour washes, avoid ridges and steep faces and water, and ride a highway where that is the easy way. Only the off-pavement runs are kept, so each one starts and ends on a road.
- Race dirt legs (`RACE.dirtRoads`) are unchanged. Re-run the tool if highways.json, the keep-out list (`tools/keep.json`) or the terrain changes. To get more or fewer trails change `want` in `planTrails`.
- Trails are named 'Dirt road' on purpose: highways.js snaps their ends onto the nearest paved road.

## What Claude did this stretch (Nov 22), so you are not surprised
- **HUD:** driving HUD is Forza-style (thin rev arc, big italic speed, gear ring, fuel) in `game/driveHud.js`, plus a condition readout under it (`game/condition.js`: engine temp, engine health, tires, suspension, alignment; the Bug is air-cooled so there is no coolant or oil system, none was faked). The hands/pack panel is gone from the screen; Tab opens the phone on an Inventory app. On-screen key hints only show in build mode.
- **Minimap and navigation:** `game/Minimap.jsx` (GTA-style wide rounded map, darkens at night, N badge, shows state or country via `game/region.js`). Click the full map to set a waypoint (`game/navigation.js`); `game/routing.js` finds a road-following route (A* over `highways()` and `ROADS`), drawn pink on the minimap with miles left. The waypoint is saved in `game.home.waypoint`.
- **Full-screen map:** `game/MapPanel.jsx` + `WestCoastMap.jsx` take the whole screen (see open item 11).
- **Dropping items:** a ground marker shows where a held item will land (`items.js` `dropPoint`, `Items.jsx`). Junk is a single E press.
- **Dirt roads:** replaced by baked trails (section above).
- **Breaker box:** moved from behind the shop shelving to the office wall under the stairs (`BREAKER` in `worlds/office.js`; used by `Sites.jsx` and `siteData.js`). It was unreachable before. Do not move the shelving back in front of it.
- **Not verified by eye:** minimap layout, the full map, the new trails and the breaker spot were built and tested (562 passing, build OK) but Chris had not yet played them when this was written. Expect small fixes.

## Gas stations, rest stops and street lights (Claude, Nov 22)
- `worlds/roadside.js` now places about 23 gas stations and 31 rest stops over the ~500 km of real highway (gas: at junctions and about every 11 km on open road; rest stops every ~5 km on major and secondary roads). Deterministic.
- `worlds/stationLayout.js` draws each one: pure data of boxes, plus the spots you press E at. Every gas station is different (`variantOf`: brand, pump islands, store size, service bays, sign side, wash side) but they share one theme. Brands are knock-offs in `worlds/brands.js` (six now, none real). **Art help wanted:** these are still plain boxes. Real models for the canopy, pumps, store front, bay door, car-wash arch and pole sign, in the same layout frame (x across, y up, z toward the road), would be a big step up. Keep `spots` where they are or update `stationLayout.js` with them.
- Services (Claude, `game/Walker.jsx`, `game/store.js`, `game/stationRules.js`): pump fills the tank, the shop counter opens a store panel titled with the brand, the hose spot washes the car ($120), the bay does a quick fix of every worn part (bench price plus 25%). Rest stops have the hose and the fix, no pump or shop. Stations show as G and R on the minimap and the full map.
- `worlds/streetLights.js` puts poles around stations, junction stops and the bigger towns only (open road stays dark). The lamp heads glow at night through one shared material. No real light sources yet: a soft ground glow or light pool under each lit zone would help.
- Not checked by eye. The shop is a counter you press E at; there is no walk-in interior yet.

## Barns, junkyards and off-road stores (Claude, Nov 22) - for ChatGPT
- 38 or so shops are spread over the real map by `worlds/shopSites.js`: barns (on dirt trails and back roads, about every 6 km), junkyards (about every 9 km), off-road stores (about every 13 km). Each is far from the next of its kind and off the gas stations, so the only way to find them is to drive. Names are made up (two parts, e.g. "Dead Mule Salvage").
- `game/shopStock.js` gives every shop its own fixed shelf: off-road stores sell NEW parts and lean one way (suspension, engine, body, lights, rack and gear); junkyards sell USED parts at about half price, old wheels and rims, junk, and sometimes El Cajon parts; barns sell supplies and tools cheap plus a "barn find" or two; gas-station marts now sell a few of Dusty's items at higher prices. What you buy leaves that shelf for good (`game.home.shopSold`). There is no restock yet.
- You stand at the shop spot and press E; `RoadShopPanel` in `game/ui.jsx` shows the shelf and what you can sell there (new buyers in `game/market.js`: barn, junkyard, offroad, mart).
- The buildings are plain boxes (`worlds/shopLayout.js`, same parts format as `stationLayout.js`). Please make real models: a gambrel barn with silo, a fenced junkyard with stacked wrecks and a crane, an off-road shop with a lifted truck on display. Keep `spots.shop` (where you press E) and `spots.sign` (the name board) or move them with the model.
- Map and minimap show them as B (barn), J (junkyard), O (off-road). Not checked by eye.

## More real places and where the stops sit (Claude, Nov 22)
- `game/realPlaces.js` now has 26 more real towns on the desert racing and Baja 1000 routes (Ocotillo Wells, Plaster City, Borrego Springs, Julian, Campo, Tecate, Rosarito, Valle de Guadalupe, Ojos Negros, Jacumba, Ocotillo, Glamis, San Luis Rio Colorado, Palm Springs, Puertecitos, Gonzaga Bay, Bahia de los Angeles, Catavina, El Rosario, Punta Prieta, Vizcaino, San Ignacio, Ciudad Constitucion, Los Barriles, Santiago, San Jose del Cabo). They show on the map, the compass line and the teleport list, and the main ones get a town sign. Brawley, Holtville and Niland were left out on purpose: they land on the county's own sites.
- Las Vegas and Reno are off the map (north of the data box), so Vegas to Reno has no start or finish yet. That needs a bigger map from you.
- A place with `stop` set gets a gas station on the nearest main road ('gas'), or a gas station plus a rest stop ('both'), or only a rest stop ('rest'). Open-road rest stops were cut to about one every 8.5 km so they do not take over; gas stations near a town replace the open-road ones there. If you move roads, the stops follow (worlds/roadside.js `places`).

## Race-mile markers (Claude, Nov 22)
- `worlds/RaceMarkers.jsx` now also draws a `MileMarkers` board at every 1609 m along each race route (the whole line, paved and dirt): the course name and "MILE 12 · 31 LEFT", on the shoulder, facing a driver going the race direction. Wood posts for MDR, steel for SCORE, same as the start signs. Built only within 700 m of the camera. Placement math is `mileMarkers` in `worlds/raceCourses.js` (tested). Not checked by eye; the board is the same stock sign texture, so any look pass you do on the start and finish signs should carry over.

## Paintable bumpers and roof (Claude, Nov 22)
The hands-on finish tools (grinder, spray cans, buffer, hose; `src/finishJobs.js`) work on body pieces whose material is body paint (`B_Body_*` in the car GLB). The front and rear **bumpers** (`B_FrontBumper`, `B_BackBumper`) are chrome trim, so a finish would not show on them, and the **roof** is not a separate piece (it is part of the shell). If you rework the Bug body model: please give the roof its own named mesh (e.g. `B_Body_Roof`) and, if bumpers should be paintable, a painted-metal material on them. Tell Claude the final names and it adds the piece ids to `src/catalog/bodies.json` and `isBodyPanelSlot`.

## Silt and soft sand (Claude, Nov 22)
Two new ground types in `src/worlds/kit.js` SURFACES: `silt` (pale powder, `#cbbb9f`) and `softSand` (`#e2cb93`). A car that crawls or spins its wheels on them bogs down (`src/bogDown.js`); the player digs out with a shovel or traction boards. Claude places them off the roads with `src/worlds/softGround.js` (silt patches on open flats and round dry lakebeds, soft sand in deep washes and dune hearts; never within 300 m of Walt's). Things you could do on your side if you want: (1) a few **silt sections on trails** (`trails.json` / `trailRoutes.js` are yours): paint the trail cells with the `silt` surface id for a stretch of 40 to 120 m; real Baja race courses have them. (2) A powdery ground texture for silt in the terrain material (`src/worlds/terrainMaterial.js` maps `silt` and `softSand` to the sand layer for now). (3) Small models for a **shovel** and **traction boards** (orange plastic, about 1.1 x 0.3 m, a pair) if you make tool art; they show as plain items for now.

## Garage polish pass (Nov 26)

## Road-cut protection (Nov 26)

`offroadFeatures.js` now indexes complete feature footprints plus a 20 m feather for the shallow dirt cut. Whoop troughs and flat bridge decks stay protected even where their added height is zero. Creek banks, fords, hills, jumps and berms also exclude the cut. `highways.js` compares tangents across a bend and feathers sharp turns / mapped water along the route; it also fades out the cut on grades from 4% to 8%. `county.js` supplies the field mask. The 0.2 m flat-straight cut and paved priority remain. Three additional tests cover whole feature regions, continuous 20 m transitions, bridge decks, turns, grades and mapped water. Full suite: 647 passing; production build passes (existing chunk warnings).

The garage and road-cut changes have browser art review / pure height checks; full-game driving remains a separate validation below.

## Garage polish details

The scrap pile already has a canvas-textured readable SCRAP TIRES sign and the worn-tire GLB; preserved. `worlds/Sites.jsx` now mounts new `SideBayDetails.jsx`: head flashing under the main eave, exposed roof-edge fascias, matching roller-door seams and recessed guide tracks, a powered work-light fixture, and subtle engine drips / wheel scuffs. Existing floor, opening and collision sizes are unchanged. [Standalone browser preview](./GARAGE_POLISH_PREVIEW.png) shows the detail component on a simplified bay shell, not an in-game screenshot.

New `worlds/RackTire.jsx` and `rackTireGeometry.js` provide rounded rubber shoulders, three rows of tread blocks and ventilated steel dishes in three draws per wheel. Same bottom-centred `dia`, `width`, `upright`, `cast`, `ud`, `color` interface as `placement/Preview.jsx` TireModel. Geometry remains inside the original footprint. Claude wiring: delegate TireModel to RackTire in Preview.jsx; cargo and placed upright tires then share the art. Items.jsx has its separate tire path; compare that during Claude's walkthrough before deciding whether to share the component. No spacing, item IDs or placement rules changed. Rack integration and evening / power-off readability need an in-game check.

Preview harness: `tools/garage-polish-review.jsx` (bundle with esbuild into dist, serve the game root).

## Customer people and workshop effects delivered

Chris assigned the 64-model in-game walkthrough to Claude. Customer and effects work adds new files only, apart from this handoff entry.

### Customer models

Three unnamed variants share a 13-bone rig and four looping one-second clips. Units are metres, feet at y=0, front +z, standing height approximately 1.73 m. Each mesh has skin weights. Each character has shirt, trousers, shoes, arms, hands, face, hair, nose and eyes. The skeleton uses Hips, Spine, Head, ThighL/R, ShinL/R, FootL/R, UpperArmL/R and ForearmL/R. Motion is in place. The sit clip puts the pelvis at y=0.495, for a roughly 0.45 m chair seat. Chair placement needs checking in game.

| GLB in public/models | Bytes | Clips |
|---|---:|---|
| PERSON_Customer1.glb | 104620 | idle, walk, talk, sit |
| PERSON_Customer2.glb | 104620 | idle, walk, talk, sit |
| PERSON_Customer3.glb | 104616 | idle, walk, talk, sit |

[Character preview](./CUSTOMER_MODEL_PREVIEW.png). All twelve variant/clip combinations rendered in a standalone browser preview. These are basic low-poly characters with small skin and clothing palette differences. Their animations use rigid weights at the limb segments.

Claude wiring
- Mount `worlds/CustomerPerson.jsx` inside Suspense. Props are `variant={1..3}`, `action="idle|walk|talk|sit"`, plus ordinary group position/rotation. Each instance clones the skeleton and owns its mixer. The component blends clips.
- Customer arrival/waiting logic supplies positions and action changes. Move the group along the customer path during walk. No customer behavior or collision rules were added.
- Generator is `tools/build_customers.mjs`, run from the game directory with Node or from repo root using the full path.

### Shop sounds, sparks and build puff

New `game/shopAudio.js` supplies wrench clicks, grinder whine, welder crackle, saw motor and tube-bender creak using Web Audio synthesis. It starts after a pointer or keyboard gesture. It reads `audio.js isMuted()`, so K and programmatic mute share the existing state. Default volume is 0.5. Voices fade when work stops, gameplay pauses or the component unmounts. No additional K handler is registered. These are procedural sounds and still need listening and level tuning in game.

New `game/ShopWorkEffects.jsx` mounts once inside Canvas. It reads `game.holdBar`. Existing blueprint stage labels and steel/drum cutting labels map to sound profiles. An optional `holdBar.shopSound` string or component `kind` prop explicitly chooses wrench, grinder, welder, saw or bender for future stations. Grinder and welder work emit sparks. A bounded 48-point buffer is reused.

Claude wiring
- Mount `<ShopWorkEffects workPosition={[worldX, worldY, worldZ]} completion={stageCounter} />` once in the game scene. Pass the actual tool contact point in world space. An omitted workPosition suppresses particles.
- Increment completion only after a build stage succeeds. Disappearing hold bars and mouse releases deliberately produce no completion event. The component cannot distinguish cancellation from success through the current holdBar alone.
- Keep workPosition at the completed stage for the 0.65-second puff. Clear or update it when moving to another job. Supply `volume` if a shared sound-volume control is introduced.
- Do not set kind permanently across unrelated jobs. Use holdBar.shopSound for an explicit per-job tag.
- No Items.jsx, BuildModel.jsx, main.jsx, audio.js or gameplay rules were changed.

Validation completed with GLB rig/clip inspection, standalone character rendering and independent bundling of both new React components. In-game customer placement, audio audition and effects placement remain Claude wiring checks.

## Nov 26: Dusty's, shopping by hand (Claude)

- Buying is now by hand: take a real item off its shelf (E or left click), then press E at the counter to pay. Right click puts it back; walking out unpaid puts it back too.
- Files: `game/dustyRules.js` (pure, tested), `game/dustyShop.js`, `worlds/dustyGoods.js` (shelf spot per product), `worlds/DustyGoods.jsx` (models and price cards).
- The island shelf is now 1.18 m high (was 1.5) so you look down on the goods.
- Art wanted: pump, hose, bulb, plug kit and fan belt read poorly on a shelf; retail-pack versions would help. The coloured boxes and cans on the other boards are filler.

## Nov 26: garage business (planned, nothing built)
See `docs/GARAGE_BUSINESS_PLAN.md`. No art is needed yet. Later pieces will likely need: worker outfits and animations (walk, work at a car, crouch, eat lunch) alongside `PERSON_Customer1-3.glb`, and a few more customer vehicles. Wait for sizes and file names before making them.

## Nov 26: customer vehicles (scratch stand-ins built, real models wanted later)
- Customers now arrive in a pickup, sedan, van, dirt bike or street motorcycle. All five are simple shape stand-ins (`viewer/bug_viewer/src/worlds/CustomerRides.jsx`).
- Nov 26 update: the dirt bike and a second (old, blue) pickup now use real models from Chris's asset drop. Still wanted later: real GLB models of a 4-door sedan (~4.7 m), a work van (~4.9 m) and a street motorcycle (~2.2 m), +z forward, ground at y=0, plain paint the game can recolour. Wait for filenames and sizes from Claude before making them.
- Nov 26 update: Claude added crop fields, grass and windbreak tree rows around the garage valley. Still wanted later: low-poly GLB trees (salt cedar/tamarisk, eucalyptus, fan palm), under about 1,500 triangles each, y up, trunk base at y=0. Wait for filenames from Claude before making them.
