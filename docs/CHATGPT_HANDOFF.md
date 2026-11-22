# CHATGPT HANDOFF (living page: Claude adds to it every time something is for ChatGPT)

**Standing rule (Chris, Nov 22):** whenever there is something ChatGPT should do or know (a task, a file to avoid, a finding, a decision), Claude adds it here in the same session, under "Open for ChatGPT" or "Coordination". Chris pastes this page into ChatGPT. When ChatGPT finishes a task, move it to "Done" (or delete it).
Last updated: Nov 22, 2026 (simulation-forward rule and paint sim added).

## Coordination (who edits what)
- Both builders work on `main`. Run `git status` first: modified files you did not touch belong to the other builder.
- **ChatGPT is editing now (Nov 22, until about 2:05 pm): road crossings, river crossings and driveways into places.** These files are in play: `src/worlds/county.js`, `County.jsx`, `highways.js`, `regionalRoads.js` (+ test), `offroadFeatures.js` (+ test), `RealScenery.jsx`, `WildScenery.jsx`, `testcenter.js`, `badlands.js`, `sceneryGeometry.js`, `src/game/WestCoastMap.jsx`, `src/rigid.test.js`. **Claude stays out of them until ChatGPT commits.**
- **Dirt-road drop is ChatGPT's job (decided Nov 22):** you are already in `highways.js`, so you do it; Claude will not touch that file. Spec is item 0 under "Open for ChatGPT".
- Claude works on: vehicle and part art (`public/models`, `catalog/parts.json`, `BuildModel.jsx`, `suspension.js`), physics and handling (`rigid.js`, `drivetrain.js`, `handlingProfiles.js`, `wear.js`), the phone / Admin UI, HUD, docs.
- Commit small. Run `npm test` and `npx vite build --outDir <tmp> --emptyOutDir` before pushing. Never commit in `salvageroad`.

## Project in one paragraph
A browser off-road driving and vehicle-building game set in Baja California. JavaScript, React 18, @react-three/fiber 8, three 0.170, Vite 5. Game folder `viewer/bug_viewer`; tests `npm test` (node --test, about 440 passing). Chris wants a realistic racing-game feel and builds cars piece by piece. Reference photos: Ocotillo Wells and Baja desert race trucks. **Never invent lore** ([CANON](./CANON.md)); do not add gameplay loops or economy without asking. All numbers are estimates to tune by feel. Dev server: `npx vite --port 3001`; real map: `?realmap`.

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

## Done (recent, for context)
- Table-top jumps, long-travel suspension (soft spring, firm damping, light anti-roll), handling profiles with a saved drift baseline, tire pressure, diff types, wear and service, Admin redesign and teleport, flat-white fiberglass, fiberglass front clip, chunkier coilovers, terrain streaming fix after teleports.

## Garage expansion art (Nov 22, nothing built yet)
Claude will build basic box buildings for garage levels 1-3, office levels 1-3 and a living quarters. When they exist, polish the look: steel-clad shop with roll-up doors (level 1), polished epoxy floor and light rows (level 2), open race warehouse with wall car racks (level 3), two-story office block with balcony. Plan: docs/EXPANSION_PLAN.md.
