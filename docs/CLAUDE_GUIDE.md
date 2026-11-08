# Project: Baja — CLAUDE_GUIDE

Standing guide for Claude Code working in the Baja repo. Read at the start of every session.

Last synchronized: November 8, 2026, after the Forge canon arrived (CANON.md, phases, Slice A).

## Roles

- The Forge (Claude.ai) owns scope, game design, milestones, decisions and the living docs: FEATURE_MAP, PROGRESS_TRACKER, OPEN_QUESTIONS, PROJECT_LOG, CLAUDE_GUIDE.
- Claude Code owns implementation and testing.
- ChatGPT supports visuals and concept art only.
- Source-of-truth order: the live repo and Vercel deployment, then the newest verified implementation summary, then the Forge docs.

## Rules

- **Read [CANON](./CANON.md) first.** Locked canon is a requirement; do not redesign it. Only Phase 1 is open, and inside it only Slice A. Do not build later phases.
- Parts exist in exactly one state: installed, held, stored, in the world or consumed. Install and remove are atomic: wrap any change to `game.items` and `game.build` together in `transact()` (`game/store.js`), so the save is written once.
- Mark every unsettled detail as a PROPOSAL and prefer placeholders that can be reversed. Give exact filenames, run commands and a test checklist, and say plainly whether the code was actually run.
- **Never:**
  - invent lore
  - add player injury or insurance
  - require a main quest
  - let parts teleport or duplicate
  - erase saves or property
  - advance the world while the game is closed
  - add business or racing systems to Phase 1
- Do not make design decisions. Write the question down in your session summary and route it to the Forge.
- Do not invent game systems, milestones, engines, backends or data models.
- Do not claim prototype assets are production-ready. Only call something validated if you tested it.
- Keep Project: Baja separate from Salvage Road in tone and branding. Never use Salvage Road's name or look in Baja.
- The Salvage Road repo is read-only. Copy code from it only when the Forge says so.
- Do not overwrite unrelated work. Keep commits small and clearly named.
- Keep changes narrow. Fix what the task names before extending scope.

## Asset conventions

- Three.js with React Three Fiber.
- GLB/glTF 2.0, PBR metallic-roughness.
- Meters, +Y up, local +Z forward.
- Modular parts with stable names. Do not rename existing mesh or file names without Forge approval.
- Provisional vehicle envelope about 4.1m long, 1.6m wide, 1.5m tall. Verify visually.
- 20k to 40k triangles for the exterior is a planning guideline, not a measured budget.
- Check pivots, assembly fit and overlaps before calling a part done.

## Current state (November 7, 2026)

- The game is playable: `viewer/bug_viewer`, Vercel from GitHub `main`. Read [PROGRESS_TRACKER](./PROGRESS_TRACKER.md), [STORY_AND_WORLD](./STORY_AND_WORLD.md), [BUILD_MODE](./BUILD_MODE.md) and [BLUEPRINT_GAP_PLAN](./BLUEPRINT_GAP_PLAN.md) first.
- The story world is `src/worlds/county.js` + `County.jsx`. Sites, obstacles and targets are in `worlds/siteData.js`, loot in `game/loot.js`, grandpa's place and build mode in `game/home.js` + `worlds/Home.jsx`, vehicles in `game/fleet.js`, plants in `worlds/flora.js` + `Flora.jsx`.
- Terrain and scenery:
  - `worlds/terrainMaterial.js`: the ground texture array and macro shading.
  - `worlds/Desert.jsx`: rocks, dead trees and shrubs as BatchedMeshes.
  - `worlds/kit.js`: the sparse raster and `boxBlur`.
- `county.js` loads `/terrain/height.bin` with a top-level `await`, so `vite.config.js` sets the build target to es2022. Keep that.
- Rules stay pure and tested in `src/rules/*.js` (`npm test`, 38 tests; `rules/atomic.test.js` covers Slice A). Build check: `npx vite build`.
- Large source packs never get committed. Export trimmed GLBs and baked textures into `public/` with the scripts in `assets/truck` and `assets/pipeline` (see its README).
  - Git-ignored in this repo: `assets/truck/*.zip` and `assets/plants/`.
  - Kept in sibling folders outside the repo: the Unity and texture libraries in `../supplyline-unity/Assets`, `../supplyline/public/assets/materials` and `../salvageroad/public/textures`.
- Blender 5.2 CLI: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`. Use it for FBX → GLB.
- `assets/pipeline/preview_county.mjs` renders the county top-down in a few seconds. Use it to check terrain or layout changes before opening the browser.
- Browser checks:
  - Older: puppeteer scripts in `C:\Users\chris\shots` against `vite preview` on :4173.
  - Newer: `playwright-core` driving the installed Chromium (`~/AppData/Local/ms-playwright/chromium-1243`) with `--use-angle=d3d11`, which renders on the real GPU.
  - `?dev` plus the backquote key opens the dev tools on the title screen, and number keys teleport in the free drive.
  - Test hooks: `window.__game`, `__walk`, `__baja`, `__fleet`.
- Don't remount the R3F canvas for build changes; a new WebGL context can come up black. Only `<Vehicle key={vehKey}>` in `DriveWorld.jsx` is re-created, and only for changes the wheel rig depends on.
- The sections below describe the earlier asset-lab stage and are kept for history.

## Asset-lab history (November 6, 2026)

- The local workspace is an asset lab, not a playable game or an initialized
  Git repository. No GitHub/Vercel deployment or Salvage Road code transfer
  has been verified. Do not infer those from the earlier handoff.
- Read [PROGRESS_TRACKER](./PROGRESS_TRACKER.md),
  [PROJECT_LOG](./PROJECT_LOG.md) and the
  [viewer README](../viewer/bug_viewer/README.md) before resuming asset work.
- Active Stock is
  [VEH_001_Beetle_Imported.glb](../assets/bug/VEH_001_Beetle_Imported.glb),
  not the old procedural base. It is 3.924 m long, 1.564 m wide, 1.524 m high,
  with a 2.38 m wheelbase, eight removable body groups and 190,396 triangles.
  The original native assembly and authored normals are preserved.
- Preserve all supplied Blender/tire files and historical ZIPs. The
  [historical handoff](../handoff/project_baja_handoff/) is provenance/prior art;
  its procedural generators must not overwrite current imported or Stage 2
  models. The Stage 2 builder reads its engine blockout without modifying it.
- The user's Stage 2 direction is the full-bodied rounded classic Baja shown
  in the light-blue/white references, before a later full race design. This is
  visual staging, not permission to invent unlocks, physics or Class 1 rules.
- Stock/Body prototype use unprefixed parts and expose five fitted controls.
  Stage 2 uses `STAGE2_` shell/parts and exposes ten, with nine default parts.
  Keep profile-specific files and masks aligned; never mix their wheel/ride-height
  coordinate setups. Cut/wide wings are alternatives; an enabled Stage 2 engine
  requires the rear deck opening.
- Stage 2 targets a 140 mm body lift, 30-inch tires and 1.50 m wheel-center
  track. [VEH_002_Stage2Baja.glb](../assets/bug/VEH_002_Stage2Baja.glb) is the
  assembled converted-Bug export, not a new approved starter type.
- Keep full suspension, cage/bracing, auxiliary lights and skid plate gated
  until fitted. Engine/running gear are static visual blockouts; the 253,214
  Stage 2 triangle count is measured, not an approved production budget.
- Latest validation covers 19 existing asset cases plus eight Stage 2 cases,
  browser controls/masking/inspector, production build and twelve Stage 2
  source/public/dist matches. Maintain those checks when changing relevant code.
  Use the README's generation order and targeted tests; do not regenerate
  assets or run code builds for documentation-only edits.
- Licensing/native badge, missing textures, material fidelity, detailed engine
  art, LODs and collision/rigging remain unresolved. Report these explicitly.

## Visual direction

Grounded semi-realism. Chalky sun-faded paint, primer patches, dusty glass, worn rubber, aged chrome, corrosion, grime. Warm afternoon light. No heavy bloom, no exaggerated stylization, no post-apocalypse look. Palette: sand #C4A574, clay #A46A4B, sage #778571, graphite #353B40, cream #E5DDD0, orange #DC652D.

## Session handback

End every session with one pasteable summary: files changed, commands and results, what the screen actually showed, defects, limits, one recommended next step, and design questions for the Forge.

## Communication

Chris wants short, direct, practical output with exact paths and commands. Real working files over aspirational planning.
