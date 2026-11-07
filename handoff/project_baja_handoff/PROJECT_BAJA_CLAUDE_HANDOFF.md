# PROJECT: BAJA — CLAUDE.AI / THE FORGE HANDOFF
Date: November 6, 2026
Status: Provisional working title; changeable.
Updated: after imported Stock, supplied tires and classic Stage 2 validation.
The original ZIP package remains historical; the live workspace has advanced.

## HOW TO USE THIS HANDOFF
This is a context and asset handoff, not a request to redesign the game. Read this alongside the existing Forge documents. Treat established Forge decisions as authoritative. Identify conflicts with the Forge's latest records rather than silently overwriting them. Update living documentation only as consistent with the Forge workflow, then prepare a focused VS Code / Claude Code implementation task.

Start with the [current viewer README](../../viewer/bug_viewer/README.md),
[progress tracker](../../docs/PROGRESS_TRACKER.md) and
[project log](../../docs/PROJECT_LOG.md). The original viewer-check kickoff is
complete; do not restart from the ZIP or label all current assets unverified.
The local workspace is not initialized as a Git repository. No GitHub/Vercel
deployment, playable game or Salvage Road code transfer has been verified.

## OWNERSHIP / ROLES
- The Forge in Claude.ai owns scope, game design, milestones, decisions and the living documents: FEATURE_MAP, PROGRESS_TRACKER, OPEN_QUESTIONS, PROJECT_LOG and CLAUDE_GUIDE. Nora coordinates the team. Claude.ai is not the code implementation environment.
- Claude Code / VS Code implements and tests code. The Workshop can be used for UI prototypes.
- ChatGPT has been supporting visual direction, concept art, procedural 3D blockouts, reference assets, and a preliminary viewer.
- Source-of-truth priority: live GitHub repository and Vercel deployment > newest actual implementation summary > older Forge snapshot. The Forge cannot directly observe GitHub; send back verified Claude Code session summaries.

## GAME IDENTITY / SETTLED BRIEF
Working title: PROJECT: BAJA (not final). Separate from Salvage Road. Do not bring over Salvage Road's lonely post-apocalyptic style or branding.
Open-world off-road vehicle building/trading game in Southern California and Baja Mexico, with lived-in towns, coastal roads, dry lakebeds, desert, mountains and border-region environment. Players acquire, improve and sell vehicles; classic Bugs, buggies, trucks, and later bikes are part of the wider visual scope. Racing is a later-phase item. The central fantasy is that the vehicle visibly tells the story of what the player found, repaired, bought and built.
Parts sources already discussed: ordinary paid-business junkyards, unmarked barn finds discovered by exploration, and later-phase racing rewards. Marketplace concept: player lists builds as on a classified/off-road forum; appraisal and NPC offers. These are already settled context, not requests for engineering or mechanics proposals.

## CONFIRMED VISUAL DIRECTION
- Grounded semi-realism; realistic vehicle proportions and mechanical detailing, slightly simplified but believable environments.
- Authentic workshop finish: chalky sun-faded paint, primer replacements, dusty glass and rubber, metal wear, convincing welds, aged chrome, surface corrosion, grime, repaired components.
- Lived-in SoCal / Baja, normal shops and junkyards, natural warm afternoon lighting. Avoid excessive bloom, exaggerated stylization or survival/post-apocalypse clichés.
- Visual brand palette (not limits on paint): sand #C4A574; clay #A46A4B; sage #778571; graphite #353B40; cream #E5DDD0; orange #DC652D.
- The working tagline 'Built, Not Bought' is optional concept copy, NOT an approved final brand promise.

## STARTER VEHICLE / STORY CONTEXT
VEH_001: a classic, vintage rounded two-door, rear-engine, air-cooled Bug-inspired compact car. Original unbranded final design; not a modern Fiat-style compact. The player purchases an old, beat-up project car from a seller at an ordinary small-town mechanic yard and makes it roadworthy with a tune-up and fluids rather than doing a total rebuild immediately. It should still look worn after initial maintenance. Over time the player finds parts and visibly converts the classic Bug into a Baja Bug.
Original-for-sale appearance: faded blue paint (#739CA6), matte primer-gray **front-left** fender (#777A78), slightly crooked aged chrome bumper, narrow old steel wheels, street tires, dusty windows, oxidized hood/roof, small dents, worn seals, aged tan cabin. Seller setting: open repair bays, tools, cracked asphalt, parked vehicles, modest mountains/palms in the background, warm afternoon light.
Visual progression: stock worn project car -> early trail beater -> recognizable Baja conversion -> capable desert Baja. This is art direction; do not infer unapproved upgrade mechanics.

The user subsequently defined the middle **Stage 2** as a full-bodied classic
rounded Baja, based on the light-blue/white reference cars, before the later
full race/Class 1-inspired look. Authorized complete Stage 2 appearance:
body, moderate raised stance/larger tires, simple bumpers/rocker rails, fitted
rear engine and protection. Unlocks, competition rules and gameplay tiers are
still undecided. The current imported Stock retains its native badge and plain
PBR approximations; the original-for-sale wear/primer brief above is a target,
not an implemented final material treatment.

## TECHNICAL ASSET CONVENTIONS
Engine/render target: Three.js with React Three Fiber. Primary asset format: GLB/glTF 2.0; PBR metallic-roughness; meters, +Y up, local +Z forward; stable names and modular replaceable parts. Initial modeled vehicle envelope around 4.1m long x 1.6m wide x 1.5m tall (provisional, visually verify). The early exterior geometry target of 20k–40k triangles is a planning guideline, not a measured finished asset budget. Distinct doors, hood, rear lid, fenders, body, bumpers, trims, and eventual wheels/suspension. Inspect pivot positions and assembly fit.

## CURRENT WORKSPACE FILES / VERIFIED STATE

- [Active viewer](../../viewer/bug_viewer/): Project: Baja - Vehicle Asset Lab;
  browser-checked Vite/React/Three.js/R3F app with orbit, reset, grid, wireframe,
  inspector and profile-specific stock masks.
- [Native source](../../assets/bug/Beetle1.blend) and other supplied formats:
  preserved. [Imported Stock](../../assets/bug/VEH_001_Beetle_Imported.glb)
  is meters, +Y up, +Z forward, 2.38 m wheelbase, 190,396 triangles. Eight
  removable body groups preserve the original assembly and authored normals;
  all 56 native names remain, with 64 exported nodes.
- [Supplied tire archives](../../assets/Tires/): preserved. A 92,686-triangle
  tire is prepared at 24,000 triangles with sampled surface-error validation.
  The stock-size wheel set reuses the original rims unchanged.
- **Body prototype** retains the earlier clipped-panel/flat-nose experiment
  with an empty rear bay. Stock/Body prototype expose five fitted controls:
  001 and 007-010. It is not the reference-based Stage 2 target.
- **Stage 2 Baja** uses a separate `STAGE2_` shell and ten modular component
  exports. Default is nine parts, excluding the alternative wide wing set.
  Rounded bonnet/nose, high-cut wings, original fender-mounted lamps, 140 mm
  body lift, 30-inch tires, 1.50 m track, simple tube protection and static
  running gear distinguish it from the later full race design.
- [VEH_002_Stage2Baja.glb](../../assets/bug/VEH_002_Stage2Baja.glb) is the
  assembled converted Bug for downstream import, not an additional approved
  starter. Its 253,214 triangles match the modular preview's geometry/material/
  winding signature. The historical engine is refitted as a PBR visual blockout.
- Stage 2 fits 001-003 and 006-012. Parts 004, 005 and 013-016 remain gated;
  original Trail/Baja full-build presets remain disabled. Cut/wide wings are
  exclusive; enabling the Stage 2 engine requires opening the rear deck.
- Validated 27 cases across the existing 19-case asset suites and final eight
  Stage 2 cases. Static checks include grounding, normals, seams, tire/body
  clearance, >70 mm wing/tire clearance and sampled engine-case spacing
  (34.4 mm minimum). Browser masks, profile transitions, dependencies, inspector
  and wireframe passed. Production build passed with the existing chunk warning;
  all twelve Stage 2 source/public/dist files match.
- These are tested **static prototypes**, not production-ready meshes or
  validated steering/travel/physics assemblies. Stock source/material fidelity,
  missing textures, licensing/branding, detailed engine art, optimization/LODs
  and collision/rigging remain unresolved.

## HISTORICAL FILES (ORIGINAL HANDOFF PACKAGE, NOT CURRENT FIT AUTHORITY)
- OffRoad_Bug_Asset_Viewer_v01.zip: a working-source **prototype**, not browser-verified. Vite + React 18 + Three.js + R3F + Drei; includes 17 GLBs in public/models. Features orbit, zoom/pan/reset, stock/trail/Baja preview presets, part toggles, automatic hiding of some stock meshes, mesh click inspector, wireframe and grid. package.json currently uses Vite 5, React 18, R3F 8, Drei 9, Three 0.170; check compatibility during install. Viewer UI currently has generic 'Off-Road Build' wording; rename user-facing identity to Project: Baja.
- bug_asset/VEH_001_Bug_Base_v01.glb — initial stock vehicle procedural geometry blockout.
- bug_asset/PART_001 through PART_016 — 16 modular upgrade blockouts:
  001 AllTerrainWheelSet
  002 FrontTubeBumper
  003 RearEngineCage
  004 BumperAuxLights
  005 FrontSkidPlate
  006 TrailShockSet
  007 CutBajaFenders
  008 ShortenedFrontHood
  009 RearEngineOpening
  010 FiberglassWideFenders
  011 RockerGuards
  012 AirCooledRearEngine
  013 SuspensionAssembly
  014 InteriorRollCage
  015 FrontCageReinforcement
  016 RearCageBracing
- bug_asset/*.py — procedural generators to revise these blockouts, not artist-authored final meshes.
- reference_images/starter_bug_mechanic_yard.png — original faded-blue mechanic-yard starter vehicle concept; primary appearance reference.
- reference_images/modular_asset_sheet.png — mesh breakdown + views; conceptual only.
- reference_images/vehicle_turnaround_sheet.png — surfaces and views; has ERRONEOUS 'SALVAGE ROAD' text; use only the car imagery, not that branding.
- reference_images/project_baja_poster_concept.png — temporary art exploration titled 'Off-Road Build'; not an approved final game logo/title.

This inventory describes the unchanged historical ZIP, not the active viewer.
Its procedural files remain prior art and are not a verified, integrated,
shipped game. Their original overlap/fit limitations still apply to those
archived assets. Current imported/Stage 2 validation is recorded above.
Do not run the historical generators to overwrite current exports or treat
concept images as accurate orthographic data. The Stage 2 builder only reads
the old engine GLB as a refittable visual blockout.

## IMMEDIATE GOAL FOR THE FORGE
The initial naming/viewer check is complete. Use the current verified summary
and synchronized [living documents](../../docs/) to review Stage 2 against the
user's references, resolve production blockers, and select the next narrow
implementation task. Preserve the distinction between static fit validation
and production readiness. Do not invent an engine/backend, gameplay loop,
marketplace model, milestone plan, unlock rules or authorized code carry-over.

## RESUMING IMPLEMENTATION
1. Work in the existing workspace, not a fresh extraction of the old ZIP.
   Read the current technical README, living docs and relevant scripts first.
2. Run the existing viewer from `viewer\bug_viewer` with `npm run dev` if needed;
   do not restart an already working shared server unnecessarily. Validate
   production with `npm run build` after relevant code/asset changes.
3. From the workspace root, use a Python environment with numpy/scipy/trimesh:
   `python -m unittest discover -s assets\bug -p 'test_*.py' -v`.
   Use the README's Blender 4.5+ preparation and generation order when needed.
4. Keep Stock, Body prototype and Stage 2 coordinate profiles distinct. Verify
   masks, source names, seams, grounding and inspector behavior on any changed
   parts; do not enable the unfitted full race prototypes.
5. Preserve the supplied assets and historical packages. Document known limits;
   obtain approval for new gameplay systems, milestones or source transfers.
6. Return exact changed paths, commands/results, visual observations, limits,
   one next recommendation and unresolved design questions to the Forge.

## CURRENT HANDOFF SUCCESS CRITERIA
- The local viewer runs and builds; Stock restoration and Stage 2 profile
  behavior are checked, not replaced with assumptions from the archive.
- Regeneration and relevant tests preserve supplied source files, assembly
  geometry, author normals and source/public/dist synchronization.
- Unsupported parts remain gated; engine/open-deck and wing alternatives stay
  consistent across UI and exported assembly.
- Static prototypes are explicitly distinguished from game-optimized,
  rigged/physics-validated or shipped assets.
- Documentation reflects current results without rewriting settled game
  decisions or claiming a Git repository/deployment that was not verified.

## USER PREFERENCES
Direct, short, practical instructions. Explain exact VS Code paths and commands as needed. Prioritize visual inspection and real working files over aspirational planning. The Forge owns design; Claude Code owns implementation.
