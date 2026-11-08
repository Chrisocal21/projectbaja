# Build Sandbox (DEV) — /buildlab.html

An EMPTY 60 x 60 m flat world (grid floor only: no person, Bug, wall or pre-placed garage). Build with the game's real pieces and rules,
save designs as blueprints, export / import `.baja-build.json`. Never reads or writes the game save (`storageGuard.js`); own keys:
`baja-buildlab-v1` (world), `baja-buildlab-library-v1` (library).

## Two views (Tab or the top bar)
- **Game view (default):** first-person walker (`Walk.jsx`, same numbers as `game/Walker.jsx`: eye 1.72 m, walk 3.2, Shift 6 m/s, mouse look
  after a click grabs the mouse) with the game's own HUD: `BuildMenu` (B), `BuildHud`, hotbar 1-8, crosshair, toast, key hints. The ghost is
  4.5 m ahead, green/red with the game's reason text. Click build, R rotate, N material, wheel next in group, V move, X remove, Q put away.
- **Creator view:** orbit camera (right-drag orbit, middle pan, wheel zoom, WASD pan) with the grid, plus creator tools: Pick up, Region (G,
  drag a box to select), Measure (M), info panel, fine 0.5 m grid.
- Top bar in BOTH views: view toggle, Build menu, Library (L), Export (downloads the world as .baja-build.json), Import.

## Build catalogue
`items.js` takes the game's `BUILD_ITEMS` / `BUILD_CATS` (game/home.js) and trims them in memory to the 8 building pieces plus
**Walt's garage + office wing** as a placeable item (place / rotate with R / move with V / remove with X). Fences, props and decor are not in
the file format yet, so they are not listed. Cash is fixed at $999,999 (prices shown, nothing deducted).

## Files
- `format.js` / `format.test.js`: versioned blueprint + library format, validation (`node --test src/buildlab/format.test.js`).
- `rules.js`, `garage.js`: placement rules (game's structures.js rules; the garage as a placeable item).
- `Scene.jsx`: ground/grid, pieces, shared ghost (`useGhost`), creator camera, region box, measure. `Walk.jsx`: game-view walker.
- `App.jsx`: state, undo (Ctrl+Z / Ctrl+Y), keys, HUD, library / import / export UI. `GarageModel.jsx`: garage shell.

## Not reused from game/home.js
`placeWhy` / `snapWorld` / `placeProp` are bound to the one real property (property line, camper, customer lot, game.props), so the
sandbox uses `rules.js` (same wording and order for the grid rules). `buildById`, `BUILD_ITEMS`, `hotbar`, `nextInCat` and the build menu
components ARE reused.
