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
