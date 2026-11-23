# Desert route and race-course reference

Updated November 23, 2026. This page records the route-network direction from Chris's [BLM Routes of Travel for Western Imperial County map](https://www.blm.gov/sites/blm.gov/files/docs/2021-03/BLMRouteofTravelforWesternImperialCounty-CA-112020_FINAL_508.pdf) and the fourteen race-map images supplied in chat. The PDF and photos are references, not repository assets. The BLM map's access designations, closures and safety text describe real public land; they are **not instructions to the development team or automatic game rules**. The race maps describe events in particular years, so their courses must not be presented as current or official routes in the game.

## What the BLM map shows

Page 2 separates major roads from open routes, limited routes, seasonal routes, and OHV open areas. Around western Imperial County the road pattern changes with landform: longer paved through corridors connect settlements; clusters of smaller routes spread across flats around Plaster City, Superstition Mountain and the Yuha Basin; mountain and wash routes bend and converge at passes. Large excluded or rugged areas interrupt that mesh. Page 1 describes broad valleys, low rugged mountains carved by seasonal washes, sparse desert scrub, sand dunes and mud hills. This is a strong **network and terrain-form reference**, not a source for tracing an exact drivable line.

Apply this hierarchy to the fictional game network:

1. Through highways run continuously across the map, with graded dirt shoulders and water crossings that remain drivable.
2. Regional dirt roads connect highway junctions, settlements and race access points. Their two tire-worn lanes sit in a shallow cut below surrounding ground.
3. Short desert connectors form a mesh in open, flatter areas and rejoin through roads. They can cross washes or curve around obstacles, but must not duplicate a neighboring track.
4. Narrow trails follow washes, shelves and passes. They can be steeper and rougher; some lead to overlooks or race features. Distinguish them from a regional dirt road by width, surface, cut bank and allowable vehicle speed.
5. Race courses reuse these routes where possible, then add marked dirt legs or closed loops. A fast off-road shortcut may be harder to drive than a longer paved alternative.

## Race-map images, in the order supplied

| # | Visible route idea | Game interpretation |
| --- | --- | --- |
| 01 | Long Baja peninsula race map with highway and dirt sections, marked start/finish, race miles and multiple stops | A long point-to-point route must preserve recognizable geography, not become a decorative line over the sea or mountains. Distinguish paved and dirt legs and show distance remaining. |
| 02 | Compact California desert motorcycle loop, main and optional pit, mileage labels and a highway approach | A local race needs a distinct start area, loop, service access and spectator approach. Public-road access must not look like part of the racing line. |
| 03 | Desert race map with a broad branching loop | Courses can return by a different corridor instead of mirroring the outward leg. The map should make the loop readable at a glance. |
| 04 | Relief map with a yellow course through hills and junction dots | Let contour relief explain why a trail bends. Mark decision points at crossings and long course splits. |
| 05 | Historic Baja 1000 map with checkpoints spread across the peninsula | Checkpoints and pits should be ordered along cumulative race distance and separated enough to matter. Do not copy this year's specific route. |
| 06 | Imperial Valley race map with loops around named pits and a clear legend | A regional event can use a network of short dirt legs and service hubs; a key distinguishes race line, access, checkpoints and spectators. |
| 07 | Vegas-to-Reno pit map | Long point-to-point races need a linear sequence of pit locations and distances between them, not only a start and finish. Vegas and Reno are outside the current playable world, so this is structure reference only. |
| 08 | Vegas-to-Reno course map | A route can run beside a highway without being on it. Separate the highlighted race line from parallel pavement in the full-screen map. |
| 09 | Illustrated race-day map | A simplified overview can communicate direction, major terrain, pits and sequence while the actual driving map retains precise roads. Illustration style is not the target for the navigation HUD. |
| 10 | Caliente 250 relief map with two large loops and numbered race miles | Distinct loops may share a central spine. Make shared segments and branching turns visually unambiguous. |
| 11 | Best in the Desert participant map | A long route needs participant-facing cues at intervals, with a way to locate pits and access roads. |
| 12 | Speedway outline with corner numbers | Use a clean course-only view when inspecting a compact track; corner order and start/finish direction should be obvious without terrain detail. |
| 13 | Rally Colorado spectator map with stage and access routes in different colors | Race stages, public access and closures are different layers. Do not draw spectator paths as drivable race shortcuts. |
| 14 | WRC Rally USA overview with distinct timed stages connected by transit | A staged race has multiple competitive segments connected by ordinary roads. The full map should show which segment is active and what comes next. |

## Rules for Project Baja's course presentation

- Keep the game courses original and clearly fictional, even when the event names and broad geography are familiar. Do not import sponsor logos, dated official route lines or real access restrictions from the images.
- Show route direction, start/finish and total/cumulative distance first. At closer zoom show checkpoints, pit/service locations, course mile markers and paved-versus-dirt sections. Keep these symbols consistent across map, minimap and roadside markers.
- Separate **driving line**, **paved transfer**, **pit access** and **spectator access** with distinct visual treatments. The map must remain legible over shaded relief and at night.
- Every drawn race leg needs a corresponding drivable ground path. A course marker should sit beside that path, not inside a tire line, body of water or unrelated highway.
- A compact local loop, a long regional loop, a peninsula point-to-point and a staged rally should have visibly different shapes and pacing. Course turns on dirt need a rideable bank or cut, with worn approach and exit lines.

## Current implementation and this pass

- `src/worlds/raceCourses.js` already defines SCORE-like mixed-surface routes and MDR-like dirt loops. Their points are approximate and not official year-specific lines. `RaceMarkers.jsx` already draws starts, finishes, warning posts and race-mile boards. `game/WestCoastMap.jsx` already has a race-route layer. Pit, checkpoint and stage views remain design targets; this page does not claim they are implemented.
- `src/worlds/trailRoutes.js` now adds deterministic short connectors around western Imperial County after selecting the existing long wash-following trails. Each accepted connector has ends on mapped paved cells, avoids water and steep faces through the same route finder, and rejects overlap with the existing trails. `public/terrain/trails.json` is regenerated so the new dirt routes are visible in game and on the map. These are original computed lines inspired by the BLM network density, not a digitization of BLM-designated routes.
- Before calling any route final, drive it end to end and inspect both joins, grade, water crossings, road mesh, tire contact and alternate-route value. The BLM document is a network reference; the game's own rendered terrain and physics decide whether a route works.
