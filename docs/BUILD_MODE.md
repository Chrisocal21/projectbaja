# Project: Baja — BUILD_MODE

Last updated: November 7, 2026. Building up your property: grandpa's yard and garage. Code: `src/game/home.js` (catalog + placement rules), `src/worlds/Home.jsx` (models, ghost preview), the B-key handling in `src/main.jsx`, and `BuildBar` in `src/game/ui.jsx`.

## How it works now (first slice, shipped)

1. **Unlock:** clear all the junk out of the garage interior (3 piles). Until then, B says "Clear the junk out of the garage first."
2. **Enter:** press **B** on foot anywhere on your property (60 × 50 m around the garage).
3. **Place:** a ghost of the item stands about 4 m in front of you, snapped to a 0.5 m grid. It's green where it can go and red with the reason where it can't.
   - E or click builds it.
   - R rotates it 45°.
   - Mouse wheel or [ ] switches items.
   - X takes down the nearest build for half its price back.
   - B or Esc leaves build mode.
4. **Rules:**
   - Everything stays inside your property line, and nothing sits against a garage wall.
   - Garage items go inside, yard items go outside.
   - The car's spot in the garage and the driveway stay clear.
   - You need the cash.
5. **Saving and collision:** builds are saved (`game.props`). Solid ones (racks, couches, gnomes, the dinosaur) block both the car and you.

### Catalog today

| Category | Items |
|---|---|
| Fences | Wooden fence 3 m ($40), chain-link 3 m ($60), ranch gate ($110) |
| Yard | Floodlight pole ($120, real light), picnic table ($60), barbecue grill ($80) |
| Storage | Steel parts rack ($150), rolling tool chest ($260, garage) |
| Garage | Two-post car lift ($1,800), engine stand ($140) |
| Office | Desk + old PC ($320), busted couch ($35) |
| Decor | "OPEN" neon sign ($75), pink flamingo ($15), giant garden gnome ($90), roadside dinosaur ($2,500), tire stack ($20), oil drum ($10) |
| Car lot | Car lot space, gravel + paint ($200) |

Most of these are cosmetic for now. The functions below are the plan.

## Ideas: what building should do (proposed, needs your sign-off)

### Garage upgrades (function first)
- **Parts racks** add garage shelf capacity once shelves get a limit, and parts sit visibly on them.
- **Car lift** lets you work under the car: exhaust, transaxle and suspension jobs get faster, and the underside opens up for future condition and wear checks.
- **Engine hoist upgrade** (a better hoist) speeds up engine swaps and makes the high-power rear swap possible.
- **Engine stand:** an engine pulled onto the stand can be upgraded off the car.
- **Workbench tiers** for bench repair: raise part condition (blueprint phase 2).
- **Air compressor + paint booth** unlock the paint chain (phase 4).
- **Welder** fabricates cages, bumpers and buggy frames from scrap.
- **Lighting:** garage lights (after the breaker), then floodlights for night work.
- **Garage add-ons:** a second bay, a lean-to carport, a tall bay door for trucks, a mezzanine for storage.

### The office
- **Desk + PC:** order parts online (delivered boxed to your yard after a delay), see classifieds to buy and sell cars (the marketplace in FEATURE_MAP), and check race listings.
- **Phone:** Al calls when new stock arrives on the lot.
- **Funny small stuff:** a "World's Okayest Mechanic" mug, a bobblehead, a lava lamp, a wall calendar stuck on 1987, a mounted fish that sings, a dartboard, a mini fridge with your own soda brand.
- **Funny big stuff:** an arcade cabinet, a jukebox, a full-size cardboard cutout of Al, a disco ball, a hot tub made from a truck bed.

### The yard
- **Fences and gates:** fence in lots; a gate that opens.
- **Your own car lot:** paint car spaces, put a price sign on a parked car, and NPC buyers come by with offers (it ties into the marketplace). Scrap a car on its space for cash and loose parts.
- **Storage:** shipping containers (large storage), a lean-to for big parts, a tire rack.
- **Utility:** a fuel tank (fill up at home), a water tower, solar panels, a generator.
- **Hangout and decor:** fire pit, picnic table, grill, string lights, flamingos, gnome army, roadside dinosaur, a giant fiberglass muffler man, a "WALT'S" billboard you can see from Old Mill Rd.
- **Tracks:** a dirt jump, a small practice loop behind the garage, a dyno pad (shows real top speed and power).

### Progression idea
1. **Clean-up:** clear the junk, flip the breaker, read the letter (done).
2. **Workshop:** racks, tool chest, engine stand, lift.
3. **Office:** desk and PC unlock online parts and classifieds.
4. **Yard:** fences, a fuel tank, floodlights.
5. **Car lot:** spaces, signs and buyers; store, sell and scrap cars.
6. **Expansion:** second bay, big doors, more property bought from the county.

### Rules to keep
- Big build pieces (containers, lift, second bay) should arrive like parts do: bought in town and hauled home in the truck, or later by trailer. No magic delivery, except online orders, which take time.
- Building only happens on land you own; buying the next plot expands the grid.
