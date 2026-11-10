# Real-map road work still open (Nov 9, 2026)

This is the working acceptance list for the road system on `?realmap`. The road and intersection specs Chris supplied are design references; the screenshots and in-game behavior decide whether a connection is finished. Current road changes are uncommitted. See [WORLD_MAP](./WORLD_MAP.md) for the map history and [PERFORMANCE_WORK](./PERFORMANCE_WORK.md) for the current lag work.

## Current state

- Natural Earth roads are smoothed, graded and rendered near the player. The real-map graph generated roughly 229 at-grade junctions in the latest data audit, including 76 T junctions.
- T junctions keep the through road continuous and place a short side-road connector beneath it. Other crossings use a single bounded pavement surface. Packed-dirt shoulders run alongside the roads and into T connectors.
- Stop signs, street lights, dead-end signs, six rest areas and thirteen gas stations have generated placements. These counts describe the current data, not visual acceptance.
- Freeway ramps are available for comparison with `?realmap&ramps`; normal `?realmap` uses at-grade junctions because the terrain supports only one ground height at each point.

## P0: make every connection credible and drivable

- [ ] Inventory every generated junction with coordinates, road names, leg count and type; identify missing crossings, false crossings, duplicated nodes and nearby nodes that should remain separate.
- [ ] Repair source road ends that stop short, continue past the road they join, or point at the wrong side of a divided highway. Replace coarse or misplaced source lines where needed.
- [ ] Finish T connections: the connector must overlap the side road and through road invisibly, its grade must meet both surfaces, its outer edges and dirt shoulder must turn smoothly into the highway, and the through road must retain its lane markings.
- [ ] Finish four-way, skewed and Y junctions with a single non-self-intersecting pavement surface, realistic corner radii or merge tapers, no exposed terrain, no black slab, no doubled pavement, and no road marking drawn through the wrong movement.
- [ ] Treat offset minor roads as two separate T junctions. Do not merge their pavement or remove the through segment between them.
- [ ] Match the physical driving surface to the visible pavement at every junction. Check wheel contact, vertical steps, airborne samples, and surface classification while crossing from each approach.
- [ ] Check slopes and mountain junctions from road level; reject, reroute or regrade connections that cannot meet within a safe slope.
- [ ] Check the new dirt shoulders on straight roads, bends, T mouths and crossings in daylight and at night. Remove shoulder strips that cross a driveway or junction mouth; blend the outer edge into the local soil palette.

## P1: road hierarchy, markings and roadside safety

- [ ] Define the priority road at each junction, including when a through road is split into two source edges. Use it consistently for pavement, markings, stop control and driving behavior.
- [ ] End or continue yellow center lines, white edge lines and dashed lane lines according to junction type. Add stop bars on controlled minor approaches. Add channelized Y or ramp gore markings where needed.
- [ ] Add turn radii and pavement widening suited to the road class without creating giant pads. Add proper acceleration/deceleration tapers for ramps and exits.
- [ ] Verify stop signs, lights and dead-end signs at their actual junctions from a driver's eye height. Correct orientation, offset, terrain contact and duplicates; add exit and direction signs where roads require them.
- [ ] Add guardrails, drainage crossings, culverts, cut/fill transitions and roadside clear zones where terrain and road grade require them.
- [ ] Make road, shoulder, gravel and dirt materials transition without obvious texture resets or repeating stripes. Verify seams at road-piece boundaries and at streaming/LOD changes.

## P1: freeways and ramps

- [ ] Replace at-grade freeway crossings with true grade-separated bridges or overpasses, with separate render geometry and vehicle collision. The current single-height terrain cannot represent a road above another road by itself.
- [ ] Rebuild freeway interchanges around the actual graded geometry: correct ramp direction, connection point, lane taper, sign and shoulder, with no cloverleaf crossing at grade.
- [ ] Recheck loop radius and width at both about 25 mph and 34 mph, then drive every retained ramp through its merge. The earlier fast steering test left the 3.6 m half-width on two 75 m loops.
- [ ] Verify that dropped ramps leave no stranded signs, lights, pavement or route targets.

## P2: roadside places and map data

- [ ] Give each rest area and gas station a drivable entrance and exit, parking circulation, ground pad and collision. Keep props off the shoulder and sight lines.
- [ ] Finish sign boards and meaningful generic wayfinding; verify placement does not invent towns or businesses.
- [ ] Improve the underlying road source near built places, coastlines and mountain passes; the current Natural Earth lines are too coarse for exact local junction geometry.
- [ ] Make the in-game map and route behavior use the repaired road graph rather than the old county-only drawing.

## Acceptance pass

- [ ] Automate graph checks for disconnected ends, duplicate/overlapping nodes, invalid polygons, excessive height steps and missing road-to-junction coverage.
- [ ] Inspect representative T, four-way, Y, offset, dirt-to-paved, mountain and freeway connections from above and at driver height, in daylight and at night.
- [ ] Drive approaches and exits in both directions at sensible speeds. Record any seam, collision bump, airborne event or lane-marking error with world coordinates.
- [ ] Confirm performance while flying through dense road areas and crossing streaming boundaries; see [PERFORMANCE_WORK](./PERFORMANCE_WORK.md).

The geometry, textures and shoulders currently build and pass automated tests. That does not certify their visual alignment or drive feel across the map.
