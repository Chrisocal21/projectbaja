# Project: Baja — FEATURE_MAP

Provisional working title. Last updated: November 6, 2026 - current asset lab state.

Status key: SETTLED (decided), PLANNED (agreed direction, not started), LATER (explicitly deferred), OPEN (undecided, see OPEN_QUESTIONS).

IMPLEMENTED below means a tested local asset-lab prototype, not a shipped
gameplay feature or production-ready asset.

## Core fantasy

The vehicle on screen tells the story of everything the player found, repaired, bought and built. Lived-in and populated, not lonely or post-apocalyptic.

## World

- Free-roam open world across Southern California and Baja Mexico. SETTLED
- Environments: lived-in towns, coastal roads, dry lakebeds, desert, mountains, border-region feel. SETTLED
- Ordinary working shops and junkyards, warm afternoon light. SETTLED
- World reuses terrain and town generators from Salvage Road, re-fed with SoCal and Baja inputs. PLANNED
- Barn finds placed in the world. SETTLED (see Parts)

## Vehicles

- VEH_001 starter: faded-blue vintage rounded two-door rear-engine air-cooled Bug-inspired car, original and unbranded. SETTLED
- Current asset-lab Stock uses the user's imported classic Beetle. IMPLEMENTED
  (static asset). Its native badge is retained; final originality/unbranded
  presentation and licensing are not resolved by this import.
- Player buys it beat-up from a seller at a small-town mechanic yard, makes it roadworthy with a tune-up and fluids, and it still looks worn. SETTLED
- Over time converted into a Baja Bug. Visual progression: stock worn, early trail beater, recognizable Baja conversion, capable desert Baja. SETTLED (art direction only)
- The user defined the reference-based **Stage 2** as a full-bodied classic
  rounded Baja conversion before the later full race/Class 1-inspired design.
  SETTLED (visual direction); Stage 2 static preview IMPLEMENTED. Unlocks,
  gameplay tiers and race-class compliance remain OPEN.
- Other vehicle types in scope visually: buggies, trophy trucks, rock crawlers, trucks. SETTLED as visual scope
- Bikes later. LATER
- Building: parts change both performance and appearance (tires, shocks, roll cage, bumpers, fenders and more). SETTLED
- Driving: carried over from Salvage Road's vehicle driving setup. PLANNED

## Parts sources

- Junkyards: few in the world, paid gate entry (about $5), walk the rows, pull parts off wrecks, pay for what you take. SETTLED
- Barn finds: abandoned barns out in the middle of nowhere holding vehicles or rare parts, found purely by exploring, no map markers or hints. SETTLED
- Racing rewards. LATER
- Scrapyard and loot container code carried over from Salvage Road. PLANNED

## Marketplace

- Simple marketplace in the style of an off-road forum or classifieds site. SETTLED
- Game appraises the build. Player can accept the appraised price or set their own. SETTLED
- NPC buyers send offers; player accepts the one they want. SETTLED
- Listings do not expire; they sit until the player deals with them. SETTLED
- Buyer tastes or personalities: not in scope, kept simple. SETTLED
- Price and offer behavior (how asking above or below the appraisal affects offers). OPEN

## Racing

- Racing as an additional income stream. LATER

## Art and assets

- Grounded semi-realism, authentic workshop wear, warm afternoon light, no heavy bloom. SETTLED
- Brand palette: sand #C4A574, clay #A46A4B, sage #778571, graphite #353B40, cream #E5DDD0, orange #DC652D. SETTLED (not paint limits)
- Three.js with React Three Fiber, GLB/glTF 2.0. SETTLED
- Vite/React Three Fiber asset viewer runs locally and builds. Stock, Body
  prototype and Stage 2 Baja are distinct previews with profile-aware controls.
  IMPLEMENTED (asset lab only).
- Imported Stock: eight removable body groups, 2.38 m wheelbase, preserved
  source assembly, 190,396 triangles. Static geometry/normalization checked.
- Supplied all-terrain tread: 24,000 triangles per prepared tire; stock-size
  adaptation preserves native rims. A separate Stage 2 adaptation uses
  30-inch tires, 140 mm body lift and 1.50 m wheel-center track.
- Stage 2: rounded bonnet/nose, high-cut wings, fender-mounted lamps, simple
  bumpers/rocker rails, open rear deck, refitted engine and static running gear.
  Assembled export is 253,214 triangles. Static fit and browser behavior checked;
  no steering/suspension physics or gameplay integration is implemented.
- Original 17-model handoff package remains historical procedural prior art.
  Unfitted full suspension, cage/bracing, auxiliary-light and skid-plate
  prototypes stay gated; do not confuse existence on disk with fit validation.
- Missing textures/materials, detailed engine art, wear treatment, licensing,
  geometry optimization/LODs and production collision/rigging remain OPEN.
- See [PROGRESS_TRACKER](./PROGRESS_TRACKER.md) for results and
  [viewer README](../viewer/bug_viewer/README.md) for inventory/regeneration.

## Explicitly not carried over from Salvage Road

- Survival layer (hunger, thirst)
- Ruined-world story and tone
- Container home base
- Salvage Road branding
