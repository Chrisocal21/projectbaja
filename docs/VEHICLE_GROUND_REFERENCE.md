# Vehicle and ground reference: Baja racing photos

Chris supplied two sets of photos in chat on November 22, 2026. Each section indexes its own set in the order shown and records the art direction for Project Baja. The photos themselves were supplied inline, without source files to check into the repository. Use their construction, terrain, motion, and lighting as reference. Create original vehicles and liveries; do not copy sponsor logos, race numbers, badges, or distinct production grilles. This complements [CANON.md](CANON.md) and [ART_PROMPTS.md](ART_PROMPTS.md).

## The core look

The vehicle and the ground must visibly affect one another. Tires carry weight, springs compress or extend, the body rolls, shadows anchor each wheel, and the driven surface leaves the right marks. Race action can be intense while the surrounding desert remains grounded, sparse, and inhabited. Bright blue sky, pale sand, ocher dirt, dark rubber and underbodies, and distant dusty hills are more faithful to these photos than a uniform orange filter.

## First set: race action and ground, photo-by-photo

| # | Reference frame | Details to carry into the game |
| --- | --- | --- |
| 01 | Stripped trophy truck in a white studio | Triangulated tube cage; side armor; long suspension arms and angled coilovers; visible brake rotors, exhaust and rear spare. Every bar has a real mount. The white backdrop is only for studying form. |
| 02 | Blue truck in a dirt turn | Wide stance, loaded outside suspension, sculpted turn and rut, dark shadow. Roost begins as coarse dirt at the rear tire and rises into a diffuse cloud. |
| 03 | Older red truck jumping a low crest | All tires leave the ground, wheels droop, and the shadow separates below. Jump height is restrained against the distant mountains. |
| 04 | Truck with helicopter over open desert | Fast, low vehicle against a broad pale flat; sparse scrub and a long dust wake give scale. Helicopter is a cinematic cue, not a required gameplay feature. |
| 05 | Blue truck airborne over orange track | Left and right tires hang at different heights; underside is visible. Flight pose follows suspension geometry and landing needs compression. |
| 06 | Red truck in deep loose sand | Countersteer, buried tire, coarse lateral sand spray and deep track cuts. The spray partly obscures the lower body. |
| 07 | Light blue Baja Bug jumping | Compact rounded shell, shortened overhangs, tall tires, visible air gap and shadow; low scrub and stones around the course. |
| 08 | Blue Bug head-on | Exposed tube nose, long arms, coilovers and steering links, wide front track, helmet and interior, independent tire articulation. This is the key front-view mechanical reference. |
| 09 | Monochrome Bug on a slope | Narrow off-camber shelf road, uphill cut bank and downhill drop, bush silhouettes, dust following the road into depth. Monochrome is a composition reference only. |
| 10 | Black Bug jumping at an event | Large tire-to-ground gap, readable dark underside and separate shadow; fencing and a little event activity establish scale. |
| 11 | Red Bug on a rocky trail | Tires wrap around wheel-sized rocks; tube nose protects the shell; body rolls while wheels remain planted. Rocks need collision geometry. |
| 12 | Baja 1000 image search | Broad mix of vehicles, pits, landscapes, and dust shapes. The browser interface is not a visual target. |
| 13 | MDR image search | Grassroots older race machines belong beside modern trucks. Race settings and vehicle build quality should vary. |
| 14 | Trucks turning on a banked course | High outer berm, inside cut, multiple worn lines, a dust wall, minimal course markers. The bank is sculpted ground, not a flat overlay. |
| 15 | Truck crossing a rocky creek | Shallow wheel-depth water, bow splash, submerged stones, reflective water and graded dry-to-wet banks. Dirt fords can cross water; paved roads bridge it. |
| 16 | Truck climbing a rock step | Tire-to-rock contact, visible clearance, chassis lean, coarse embedded rocks and firm contact shadows. |
| 17 | Rally car on a dusty hillside | Narrow route follows the slope; its dust plume traces the bend. Cut banks, rocks and shrubs build depth. |
| 18 | Truck jumping toward camera | Independent wheel droop, clear arms and underside, modest crest, sparse scrub and a dark ground shadow. |

## Vehicle requirements

**Race truck.** Give it a wide tire track, substantial sidewalls, short high-clearance overhangs, a compact protected cabin, and a secured rear spare. Cage tubes meet at welded joints with gussets where needed. Arms run from chassis pivots to hubs; coilovers run between credible mounts; brake discs and calipers are visible through open rims. Distinguish coated tube, dusty composite body panels, bare metal, glass, seat fabric and rubber. Chipping belongs on leading edges; dust accumulates behind tires and below doors.

**Baja Bug.** Keep the small rounded cabin as the anchor, then cut the front and rear for travel and clearance. The wider wheel track, tube nose, skid, rear engine protection, roof cage and spare mount must have visible bracing. The photos show both partially bodied and nearly open race fronts; these can be separate build stages. Model tread blocks, shoulders, sidewalls, rims, hubs and wheel wear. The head-on view must reveal independent left/right travel and steering geometry.

**All builds.** Stock, worn, garage-project and race-prepared states differ through actual parts, not only paint. An upgrade adds visible suspension, protection, lights or carrying hardware at a plausible attachment point. Avoid bars floating through bodywork or sitting on a tire. Use local wear rather than covering every surface in identical noise.

## Ground requirements

| Surface | Shape and visible material | Interaction |
| --- | --- | --- |
| Paved highway | Continuous graded crown and dirt shoulder, shallow cracks and patches, bridge over every waterway | Stable high-speed line; dust only when a tire leaves pavement; no dead-end jumps or abrupt bumps. |
| Hardpack dirt road | Road sits slightly below the adjacent terrain, with cut banks and two tire-worn bands | Fine following dust, modest ruts, sharp contact shadow. |
| Loose sand and wash | Low channel, soft edges, ripples and deeper parallel wheel cuts | Tire sink, slower acceleration, coarse roost and broad rolling cloud. |
| Rocky trail | Narrow route following a slope or wash; embedded wheel-sized rocks with sparse loose stones | Independent articulation and skid clearance, little dust. |
| Gravel road | Graded but imperfect, mixed pebble size and a readable shoulder | Short stone scatter and light dust. |
| Dirt race turn | Elevated outer berm, inside cut, worn primary line and rougher alternate line | Compression and roost follow the chosen line; no flat bank decal. |
| Shallow ford | Natural water channel, graded entry/exit, wet stones and silt margins | Tire-origin splash and bow wave, broken reflections, dark damp exit marks. |

Routes should connect through physical transitions: pavement to shoulder to gravel, or graded dirt to a narrow trail. Preserve multiple ways across the map. The off-road route may be fastest for a capable vehicle while demanding more control. Use three scales of detail: grains and tread prints near a wheel, ruts and rocks across a road, then banks, washes, ridges and atmospheric distance.

## Motion and effects checks

1. **Rest:** each tire has a contact patch and carries visible weight; the shadow direction matches the sun.
2. **Corner:** the outside suspension loads, body rolls, and the rear roost starts at the slipping tire. Coarse fragments stay close; fine dust drifts farther.
3. **Crest and landing:** wheels extend independently; the shadow stays on terrain; landing compresses and rebounds once.
4. **Sand versus rock:** sand leaves persistent deep cuts and granular spray; a rock changes wheel position and chassis pose with little dust.
5. **Ford:** splash scales with speed and tire depth; water remains within the channel and leaves a wet exit.
6. **Performance:** favor the player's contact effects and nearby racers. Distant clouds can use simpler particles or billboards.

## Existing systems to improve

| File | Reference-driven target |
| --- | --- |
| `viewer/bug_viewer/src/BuildModel.jsx` | Tire/rim and suspension visuals exist. Audit every bar and shock mount, wheel clearance, front articulation silhouette and mechanical material differences. |
| `viewer/bug_viewer/src/dust.js` | Surface-aware dust exists. Develop tire-origin roost shape, size variation, rolling cloud and slip/load/speed response. |
| `viewer/bug_viewer/src/worlds/terrainMaterial.js` | Sand, dirt, gravel and rock layers exist. Refine transitions, wheel-scale detail, compacted tracks and wet states. |
| `viewer/bug_viewer/src/worlds/County.jsx` | Inspect highway bridge/shoulder continuity, graded junctions and dirt cut banks at vehicle height. |
| `viewer/bug_viewer/src/worlds/offroadFeatures.js` | Check rideable race banking, alternate lines, crests and rock obstacles against the motion frames. |
| `viewer/bug_viewer/src/worlds/WildScenery.jsx` | Check ford grade, water depth, rocks, splash source and wet margins. |

## Art review captures

Capture these at normal gameplay distance before close inspection: parked truck side/front three-quarter; Bug head-on over uneven ruts; truck sliding through a banked turn; Bug on an off-camber rocky trail; truck entering and leaving a ford; both vehicle classes over modest crests; highway-to-dirt junction. Review bright daylight and late afternoon. Each frame should show the physical cause behind its pose and effects. This is the quality target, not a claim that current assets already meet it.

## Second set: vehicle construction and suspension, photo-by-photo

This set is especially useful for inspecting *why* a race vehicle has its stance. The studio, workshop and driveway images reveal attachment points that motion photos hide. White backdrops and sale text are not game-world styling.

| # | Reference frame | Construction and art cues |
| --- | --- | --- |
| 01 | White Bug, front three-quarter, open dirt lot | Mostly complete rounded cabin contrasts with cut front fenders, low tube bumper, exposed front suspension and oversized knobby tires. Roof basket and four round lamps are carried by upright supports, while two lamps sit on the nose. Keep accessory mass and mounts visible. |
| 02 | White Bug, front three-quarter, driveway | Wider front track, very tall travel, pronounced outer tire shoulders, dark open wheel wells and thin side steps. A bumper hoop, skid plate, exposed front shocks, lamp cluster and roof lamps make a layered nose. Brand graphics are not part of the target. |
| 03 | White Bug, rear three-quarter, garage | The stock-looking roof and rear window remain above a cut-away rear apron. A tube cage wraps the exposed engine; exhaust, cooling and rear shock structure can be read. Wide rear tires sit outside the shell, and the roof basket is bolted to the body. |
| 04 | Blue and silver bodied trophy truck, studio | The fiberglass front clip hides much of the frame, while wide arches and an open rear bed reveal the race platform. Preserve the contrast between smooth large body panels and open mechanical volumes. Original grille and graphics only. |
| 05 | Black trophy truck chassis, wheels fitted, studio side | Full side silhouette: low cockpit, high cabin cage, spare at the rear, engine/bed volume behind the cabin, long front and rear wheel travel. The arm and coilover paths remain visible even with armor panels. This is the stance and proportion benchmark. |
| 06 | Bare tube chassis in a fabrication shop | Dense triangulation connects nose, cabin, roof and rear. Tubes change diameter by role; gussets, brackets, plates and weld junctions make the frame credible. Engine/exhaust routing and jack stands explain the build stage. Avoid a random lattice of identical rods. |
| 07 | Dark truck launching over desert hardpack | Tires drop away from body, one axle higher than the other; dust remains behind at the crest. Cloudy light keeps dark panels readable. |
| 08 | Stripped black truck chassis with wheels removed | Brake rotors and hubs sit at the ends of the arms; the wheel opening is not empty space. Spare support, cage and side armor reveal load paths. Compare with frame 05 to ensure wheels attach to the same underlying geometry. |
| 09 | Black open-wheel buggy, front | Very wide front track; upper/lower arms, tie rods, shock towers and front light bar are exposed. Cabin is narrow behind a compact front panel. Front tire offset and arm triangles should read at normal camera distance. |
| 10 | Black open-wheel buggy, desert three-quarter | Nose lamps and roof bar sit on a strong cage, with large front tires much wider than the cabin. Long coilovers bridge wheel end and upper frame. Ignore the sale caption; use the clear silhouette. |
| 11 | Bare long-wheelbase buggy outside | Side and roof diagonals form a protective space frame. Seats are inside the cage; front arms and skid are forward of the cabin. The wheelbase is longer and bodywork lighter than the Bug. |
| 12 | Bare buggy frame in workshop | Close view of bent tubes, triangular joints, shock tower gussets, radiator placement and multiple mounting plates. Differently sized metal parts and hardware break up the frame. |
| 13 | Buggy climbing a loose dirt rise | Rear tires cut into an uneven path and leave a low, rolling plume. The rut is physical relief; the vehicle pitches with the slope. |
| 14 | Dark buggy airborne near spectators | Long wheel droop under the body; chassis remains rigid while arms swing. Ground shadow and spectator scale make height legible. Crowd and sponsor signs are race-event context, not a required base-world look. |
| 15 | Yellow/white open-wheel buggy in sand | Open nose, protective side bodywork, rear frame and spare, long stance. The sandy road has several tire grooves and a raised edge; distant hills are subdued by haze. |
| 16 | Bare buggy, head-on against a wall | Symmetrical front-arm triangles, center skid, paired shocks and roof lamps; wheels far outside the narrow central frame. Use for a straight-on alignment and clearance check. |
| 17 | Silver Bug front detail | Rounded original hood stays above a black armor/skid wedge and exposed arms. Large tires sit well outside the stock fender line; steering and brake hardware are visible behind the tire. A useful intermediate build stage. |
| 18 | Overturned buggy on rocky desert | Real suspension and cage make rollover damage readable: inverted wheels, bent/grounded frame, a detached wheel, disturbed rocks and dust. Use as a damage/physics reference; do not treat a dramatic rollover as normal driving stance. |
| 19 | Blue Bug at full articulation | One front tire nearly airborne and the other highly loaded; front arms and angled shocks remain attached to the chassis. The skid clears a steep cut road. Dust follows the downhill tire path. This is the strongest Bug suspension pose target. |
| 20 | Blue truck bed viewed from behind | A full-size spare lies flat in a metal cradle, below the roof light bar and between upright bed supports. Brackets and straps restrain it. Tail lights, bed rails and crossbars remain readable. |
| 21 | Close-up mechanical suspension assembly | Wheel hub, arms, linkages, coilover spring, damper, adjuster, bump hardware and small fasteners have distinct materials. Use the relationship of components, not this exact assembly or its text marks. |
| 22 | Workshop rear-suspension mount detail | Twin dampers, silver plates, blue shafts and welded tube triangulation meet at a reinforced pivot. Plates sandwich joints; bolts have visible axes. This is a strong check against floating shock ends. |
| 23 | Chassis side detail with coilover | Tall vertical coil spring and parallel damper sit inside the cage, with diagonal bracing, reservoir/hoses, seat and exhaust nearby. Exposed mechanics should feel layered and serviceable without becoming visual noise. |

### What this second set adds to the art target

- **Three distinct vehicle families:** the compact shell-based Bug, a long enclosed race truck, and an almost fully open space-frame buggy. Do not scale one generic chassis to make all three. Their cabin shape, wheelbase, track width, body coverage and spare location must differ.
- **Layered mechanical detail:** at distance, the silhouette should show wheel, arm triangle, shock and cage. Up close, pivots, brackets, mounting plates, bolts, reservoirs, hoses, brake rotor and hub make the assembly believable. Detail density falls with distance so the scene remains readable and fast.
- **Suspension motion follows joints:** upper/lower arms or trailing links pivot at chassis and hub; steering links follow the front wheels; shocks change length between mounts. The tire does not simply move vertically while rods stay fixed. Full droop and compression need clearance from body panels and cage.
- **Accessories need support:** roof lamps and racks have feet; light bars mount to cross tubes; a spare has a cradle and restraint; skid plates and bumpers attach to load-bearing members. The close-ups show hardware that makes otherwise decorative objects credible.
- **Build stages matter:** a full stock-like shell, cut fenders and exposed engine, and a fabricated race chassis are visibly different steps. A garage upgrade should change construction, not only color or numeric stats.
- **Damage has structure:** if rollover or impact is represented, bend/break exposed parts consistently and let dust, stones and shadow respond. Do not reuse the intact vehicle pose inside a debris effect.

### Focused review captures for this set

1. Bug front three-quarter parked and at full articulation: hood-to-arm clearance, shock mounts, skid, wheel track and tire size.
2. Bug rear three-quarter: cut apron, engine cage, rear shocks, exhaust and spare/rack supports.
3. Truck bare chassis side and bodied side: the same wheel centers, pivots and cage should make sense in both build states.
4. Open buggy head-on and side: wide arms, narrow cabin, wheelbase, cage, skid and shock path must differ from the Bug and truck.
5. Close-up of a shock/pivot and a rear spare mount: plates, bolts and connected tubes without clipping or floating hardware.
