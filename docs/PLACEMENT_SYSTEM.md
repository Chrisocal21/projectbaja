# Placement system: status and what's left

Paused November 8, 2026, close to the session limit. This file says where the work stopped and what still needs to be done.
Chris's original PLACEMENT_SYSTEM brief governs the work. Its rules of engagement still apply:
- don't break anything
- keep edits to existing files as small as possible, and list every one
- new behaviour sits behind a flag that is off by default
- check each stage in a real browser
- Chris makes the design decisions
- each stage ends with a session summary and waits for Chris's go-ahead

## Stages

| # | Stage | Status |
|---|---|---|
| 0 | Repo inspection | ✅ Done |
| 1 | Rules and data types (`src/placement/types.js`, `rules.js`, tests) | ✅ Done, `5a07262` |
| 2 | Placement Lab test scene (`/?lab=placement`) | ✅ Done, `30918e2` |
| 2b | Like items clip together (jerry cans, bottles, toolboxes) | ✅ Done, `6ce4665` |
| 3 | Vehicle cargo surfaces, plus switching world pickup from E to click | 🟡 **Paused mid-build, not committed.** See "Resume here". |
| 4 | Garage: **everything** moves onto the new grid. Furniture, Walt's fixtures, the lift and the bench can all be stored, sold or placed anywhere | ⬜ |
| 5 | World: coarsest grid, free placement | ⬜ |
| 6 | Save and load: versioned placement data, and old saves still load | ⬜ |

## Locked decisions

- **Controls:**
  - Placement is free by default. Hold **Shift** to snap to the grid; Shift snaps only while holding an item and aiming at a surface, otherwise it is still sprint.
  - Rotate with the **mouse wheel** (5°, or 90° with Shift), **Q/E** (15°, or 90° with Shift), or **R** (to the next 90°).
  - **Left click** picks up and places. **E is never pickup**: it is for vehicles, doors and talking, and rotates only while an item is held.
  - The ghost is **green** when the spot is valid and **red** when it isn't, with the reason shown.
- **Stacking:** tires stack. Like items clip together flush when there is room.
- **Vehicle cargo:**
  - The grid is the limit for the new cargo spots. The cab and roof size-unit system stays for the F auto-stow.
  - Cargo surfaces are defined as data for each vehicle, body and accessory: the front trunk, behind the driver, the roof rack (when fitted), the truck bed and the trailer.
- **Upright tires:**
  - A truck bed has fixed **tire mount spots 5–8**, outlined like the car's 4 wheel slots.
  - Upright tires go into those spots, standing side by side against the cab.
  - There is **no flip key**. Fitting a tire there works like fitting a wheel on the car.
- **Garage furniture:** everything is movable. Anything can be **stored or sold**, Walt's pieces included. Players can bring in their own benches. Unlike Vein, you can't take furniture from other buildings.
- **Canon** (`docs/CANON.md`, locked November 8):
  - The in-world year is **2025**.
  - The player has a **smartphone**.
  - Walt's old PC works alongside the phone.
  - The townsfolk names Rosa, Pastor Dale, Deputy Ruiz, Mrs. Hollis, Old Man Hollis, Dusty and Al are canon.

## Resume here: Stage 3

An agent was building Stage 3 when the session paused. Its final status report, listing the exact files and lines it changed, goes in **Stage 3 handoff** below. Before going on:
1. Run `git status` and `git diff` in `viewer/bug_viewer` to see the uncommitted Stage 3 work.
2. Run `npm test` and load the game with the flag off.
3. Then finish the parts listed here:
   - The vehicle surface adapter: cargo surfaces as data per vehicle, body and accessory, with items riding in the `Vehicle` and `Fleet` groups. It sits behind `?placement=1`.
   - The truck-bed **tire mount spots 5–8**: upright tires, at least 4 across the bed. If a real bed is too narrow for 4, report the measurements instead of faking it.
   - **E → left click** for picking up loose world items. This applies everywhere, not behind the flag (approved). Also update any "E to pick up" prompts.
4. Check it in a browser: put items in the Bug's front trunk, drive, and confirm they stay put. Also check the luggage well, the roof rack, a truck bed and the trailer.
5. Send the stage summary to Chris, then commit.

## Side project: Build Sandbox (dev tool, outside the game)

Page: `viewer/bug_viewer/buildlab.html`, code in `src/buildlab/`. Status: in progress, not committed. Its own README is `src/buildlab/README.md`.
- A 60×60 m grid world for devs to test build pieces, spot what needs scaling, and find missing pieces.
- **Starts completely empty.** The full garage is a placeable item, so a tester can build onto it or build separately. No person, no Bug.
- **Two views with a toggle:** *Game feel* (default: first person, the in-game build menu and HUD) and *Creator view* (overhead orbit camera). Export, import and the library work in both.
- **Export and import:** versioned `.baja-build.json` file or copy-as-text, so a dev on another computer can send Chris a build. Satisfactory-style blueprint library (save a region, stamp it as one ghost, one undo).
- Touches no existing game files. Own localStorage keys only (`baja-buildlab-v1`, `baja-buildlab-library-v1`).
- The first creator-style UI was rejected by Chris and is being reworked to match the in-game build menu.
- Not yet done: the "placeable template found in the world" step (turning an exported build into a world pickup) is a later stage.

## Backlog: Chris's ideas, not scoped yet

1. **Phone and PC ecosystem, Rockstar-style.**
   - A smartphone home screen with mini apps:
     - the Index as a wiki-style app (not called "wiki")
     - jobs
     - text messages with suppliers and clients
     - a story log, so nothing that was said is ever missed
   - Walt's PC for ordering parts and looking up vehicles.
   - *We will plan the app list together. Don't decide it alone.*
2. **Interactive furniture:** tire racks show the real tires stored on them, and shelves show real stored items. Today both are placeholders.
3. **Tool spots as progression:**
   - The pegboard's red outlines become slots for missing tools.
   - Walt had the basic, older tools. The specialty and newer ones (welder, bender, grinder, and more) have to be bought or found in the world.
   - Canon allows tool requirements, but not arbitrary skill lockouts.
4. **Rough edges in the placement rules:**
   - Rotated items are checked as axis-aligned boxes, so a turned item can be refused where it would really fit, and it won't clip beside a turned neighbour.
   - Clicking the side of a tall item can place the new item beside it instead of on top.
   - Stacks placed freely can sit a little crooked.

## Open questions for Chris (from the research pass)

- **Deliveries:** where do online orders land, and how long do they take? Canon says "no magic stock".
- **Refunds:** taking an item down pays 50% today, but canon #024 says 100%. This matters for "store or sell".
- **Shelf limits:** should shelves have a capacity and physically hold the real garage items (the BUILD_MODE proposal)?
- **The Index:** should I still open it as a shortcut once it is a phone app?
- **Tools as objects:** the floor jack and engine hoist are invisible today (OPEN_QUESTIONS C6). Should they become real objects?
- **The #7 race car:** is it optional (C2)? This affects whether the welder and bender gate progress.
- **Phases:** canon says only Phase 1 / Slice A is open. The phone, PC, ordering and furniture storage are Phase 2+ in FEATURE_MAP. Chris asked for them, so confirm that those phases are now open.

## Stage 3 handoff

Stage 3 work is uncommitted in `viewer/bug_viewer`. `npm test` passes 109/109. The game loads with the flag off and no page errors.

**Done and checked in a browser**
- **Click to pick up (E no longer picks up), everywhere:** the prompt reads "Click — Pick up X". Clicking to resume after the pause screen picks nothing up.
- **The Scrap heap is still on E** ("pick through", which gives scrap, not an item). Chris to decide whether it stays that way.
- **Bug cargo, behind `?placement=1`:**
  - The front trunk (0.9×0.6 m) works once the hood is open. Items clip into the corners. Items that are too big are refused.
  - The luggage shelf works (1.0×0.35 m).
  - With empty hands, a click takes an item out of the cargo into your pack.

**Existing files touched**
- `package.json`: the new test file.
- `main.jsx`:
  - imports
  - the item branch of `worldInteract`
  - a `placementKey` line
  - the left-click pickup / `placementClick` block
- `DriveWorld.jsx`: imports, and `<VehicleCargo>` added to both the Vehicle and Fleet groups (behind the flag).
- `Walker.jsx`:
  - imports
  - the prompt text
  - Shift sprints only when you are not aiming a held item at a surface
- `WikiPanel.jsx`: a "Click — Pick up" line in the controls list.

**New files in `src/placement/`**
- `vehicleSurfaces.js`: measured cargo surfaces
- `gameItems.js`
- `cargoStore.js`: items saved with `loc:'car', spot:'grid'`
- `input.js`
- `flag.js`
- `VehicleCargo.jsx`
- `vehicle.test.js`
- `rules.js` and `types.js` gained poses, walls, blocks (wheel wells), headroom and a wall magnet.

**Findings**
- The '84 pickup bed has wheel wells **0.84 m apart**. At the real tire size (Ø0.69 m), only **3 upright tires fit across against the cab, not 4.** This was measured, not faked. Chris needs to choose: a wider bed, smaller tires, or mount spots placed over the wells.
- **There is no towable trailer in the game.** "Trailer" means grandpa's living trailer. The data format would support one.
- **Existing bug, not touched:** the truck model's bed is at +z, but the truck code treats +z as forward. That puts the existing truck cargo crates inside the cab.

**What's left in Stage 3**
1. Look at screenshots `scratchpad/pw/shots/s3b_1..4` (not reviewed yet). Check the trunk floor height (0.27) and the shelf position with the hood open.
2. Replace the temporary **T key** (flat/upright toggle) with Chris's design: `mounts` in the bed data (spots 5–8), where an upright tire snaps into a mount and outlines show while you hold a tire. Remove T from `input.js`, the Lab and the Walker hint.
3. In the game:
   - the truck bed
   - the roof rack (fitted through `build.parts.roofRack`)
   - a drive test showing items stay put
   - Lab screenshots of the bed and upright tires
4. **Open risks**
   - Grid items on the luggage shelf can overlap the crates that cab storage draws there.
   - A fitted roof jerry-can part isn't treated as an obstacle.
   - The aim ray ignores the car body.
   - With the flag off, grid items aren't drawn, though they're still listed in Tab.
5. **Proposals to confirm**
   - reach of 3.2 m
   - headroom values
   - crate sizes taken from the item models
   - one tire size for every tire
