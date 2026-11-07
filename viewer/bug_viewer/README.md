# Project: Baja - Vehicle Asset Lab

Last updated: November 6, 2026 - verified imported Stock and classic Stage 2.

A Vite + React 18 + React Three Fiber / Three.js inspector. The active stock
vehicle is the supplied Blender Beetle, exported as
`VEH_001_Beetle_Imported.glb`. Four body conversions now fit this imported
shell, alongside supplied all-terrain tires fitted to the stock wheels. The
previous procedural base and historical upgrade assets remain on disk.

The current workspace is a local asset inspector, not a playable game or an
initialized Git repository. No GitHub/Vercel deployment or Salvage Road code
carry-over has been verified.

## Current profile inventory

| Profile | Active base | Fitted controls | Default |
|---|---|---|---|
| Stock | Imported native Beetle | 001, 007-010 | No upgrades; original wheels |
| Body prototype | Same imported base | Same five controls | 007, 008, 009; earlier flat-nose/empty-bay experiment |
| Stage 2 Baja | Separate raised `STAGE2_` shell | 001-003, 006-012 | Nine parts; 010 wide wings excluded |

Stage 2's six unavailable parts are 004, 005 and 013-016. Original Trail/Baja
full-build presets remain disabled. The Stage 2 export is visual progression
of the same Bug, not an approved second starter or an implemented gameplay tier.

## Run

With Node.js 18+, run `npm install`, then `npm run dev` from this folder.
Open the local URL printed by Vite. Check production output with `npm run build`.

## Features

- Orbit, zoom, pan, reset camera, autorotation, grid and wireframe.
- Click meshes to inspect their original Blender object name, actual primitive
  node name, GLB, primitive triangle count and bounds. Hidden stock panels do
  not intercept selection of visible replacements.
- Stock preset loads the imported vehicle, including its interior and eight
  independently named removable body panels.
- Cut Baja fenders, wide fiberglass fenders, shortened front hood and rear
  engine opening are enabled. Cut/wide fenders are mutually exclusive.
- Stock-profile all-terrain wheels use the supplied tread model, resized to
  the native wheel envelope on original rims; no lift is applied to that profile.
- The **Body prototype** preset retains the earlier clipped-panel experiment
  on stock running gear; it is not the reference-based Stage 2 design.
- **Stage 2 Baja** loads a separate raised shell and rounded classic conversion,
  with larger tires, simple protection and an exposed engine.
- Stock/Body prototype expose five fitted controls. Stage 2 exposes ten,
  including an alternative wide wing set. Profile-specific files prevent
  mixing the old stock-size prototypes with the raised kit.
- Original Trail/Baja full-build presets remain disabled. Full suspension,
  roll-cage bracing, auxiliary lights and skid plate are still unfitted.
  Category filters continue to work.
- Local generated studio reflections; no external environment downloads.

## Imported asset and limitations

Source: [Beetle1.blend](../../assets/bug/Beetle1.blend). The supplied OBJ/FBX/3DS/STL
and Blender originals are never overwritten. Only vehicle `B_` meshes are
exported, preserving their names, geometry and evaluated modifiers. Studio
floor, studio light meshes, cameras and reference images are excluded.

- Meters, +Y up, +Z forward; uniform scaling to a 2.38 m wheelbase, axle midpoint
  at the origin horizontally, tires on the ground. No reflected geometry.
- Measured envelope: 3.924 m long, 1.564 m wide, 1.524 m high.
- Full model: 190,396 triangles, about 4.74 MB. This is a detailed import, **not
  a game-optimized or production-ready asset**; the exterior planning budget
  does not validate this model.
- Legacy Cycles materials are explicitly translated to metallic-roughness PBR,
  not baked or faithfully preserved. Available diffuse colors are retained;
  paint uses the viewer's faded-blue theme, glazing uses transparent tinted
  PBR, and chrome uses metallic PBR.
- `speedometer.png` and `t_trucklight2.jpg` are missing from the download. Export
  emits warnings and uses plain colors for the dashboard and lamp surfaces.
  No substitute textures are fetched. Procedural wear, bump and displacement
  shaders are not reproduced.
- The source includes its original badge. No asset license was provided in the
  folder; confirm licensing/branding before redistribution or production use.

## Upgrade compatibility

The native source has one connected `B_Body`. Export partitions its evaluated
triangles into the remaining `B_Body` and these independent stock panels:

- `B_Body_Hood_Front`
- `B_Body_Engine_Lid_Rear`
- `B_Body_Fender_FL`, `B_Body_Fender_FR`
- `B_Body_Fender_RL`, `B_Body_Fender_RR`
- `B_Body_Nose_Front`
- `B_Body_Tail_Rear`

The original 56 object names remain; export adds eight names. `original_source_name`
metadata records their native origin. Body subdivision, mirroring and edge
splitting happen **before** partitioning. Triangle positions, winding, materials
and UVs are retained, with full-precision corner normals supplied through a
temporary glTF export hook. No addon or Blender preferences are saved.

Panel boundaries use this source's crease patches and face grid; changed native
topology is rejected rather than silently applying old selections. Fixed quarter
panels, cabin, floor and rear intake vent deck remain on the body. Nose/tail
skin groups allow the conversions to remove stock aprons without hiding the
whole body. These are separated exterior surfaces, not newly modeled hinges,
panel thickness or trunk interiors.

Stock wheel centers are at X +/-0.652 m, versus +/-0.76 m on the procedural stock
and +/-0.82 m on the old all-terrain prototype.

### Fitted body conversions

[build_baja_parts.py](../../assets/bug/build_baja_parts.py) derives replacement
surfaces directly from the imported panels, retaining surviving mounting seams:

- `PART_007_CutBajaFenders`: cropped stock wings with rolled cut edges.
- `PART_010_FiberglassWideFenders`: the same cropped wings widened outboard by
  up to 0.14 m, with a smooth falloff at their original body mounts.
- Both fender sets reuse the source lamps, raised on buckets and attached brackets.
- `PART_008_ShortenedFrontHood`: cropped hood and nose skin at Z=+1.34 m, with a
  deliberately flat front closure and reinforced edge.
- `PART_009_RearEngineOpening`: cropped lid and tail skin at Z=-1.68 m with a
  hollow opening frame. The rear bay is intentionally empty; there is no engine
  placeholder, fitted cage or completed mechanical assembly.

Each replacement is below 25,000 triangles. Fit is checked on the imported
**stock-size running gear only**, including a bounding-cylinder regression that
allows no stock-tire clearance reduction beyond 0.2 mm. This does not certify
physical 35-inch tires, steering/suspension travel or production collision.

Masks remove the replaced panels and incompatible stock trim, lamps and
bumpers. Other upgrades remain gated at the controls, rendering/masking and
preset layers until their geometry is refitted. Presets are asset previews,
not gameplay rules.

### Supplied all-terrain tires

Source: [tire archives](../../assets/Tires). Originals are preserved and checked
by SHA256. The OBJ contains a single tire, not a wheel assembly; its referenced
material file is absent. The replacement uses plain dark rubber PBR, without
invented textures. Confirm the downloaded tire's license before redistribution.

[prepare_all_terrain_tire.py](../../assets/bug/prepare_all_terrain_tire.py)
normalizes the tire about its axle and reduces 92,686 triangles to a 24,000
triangle viewer mesh in
[TIRE_AllTerrain_Normalized.glb](../../assets/Tires/TIRE_AllTerrain_Normalized.glb).
[build_all_terrain_wheels.py](../../assets/bug/build_all_terrain_wheels.py)
fits four copies to the imported wheel centers, reusing the stock painted rims
and chrome hubs unchanged. It remaps the radial bead/outer radius and the axial
bead/shoulder widths separately to match the stock rims without widening the
tires. These are **stock-size adaptations, not physically sized 35-inch tires**.

The fitted `PART_001_AllTerrainWheelSet.glb` is 108,208 triangles including rims.
Grounding, original tire envelopes, bead fit, and stock/cut/wide-fender clearance
are regression-tested. This remains a static preview, not a suspension or
steering-travel validation. Use the All-terrain wheels checkbox on Stock or the
earlier Body prototype; Stock resets to the untouched native wheels.

### Classic Stage 2 Baja

The user's light-blue/white classic Baja references guide this intermediate
stage, before the future full race/Class 1-inspired design. It retains the
Beetle cabin, doors, glazing and rounded bonnet rather than using the earlier
flat nose plate or a narrow nose-mounted-headlight kit.

[build_stage2_baja.py](../../assets/bug/build_stage2_baja.py) exports a separate
`STAGE2_VEH_001_Beetle_Imported.glb` shell and ten `STAGE2_PART_*.glb` components.
Original source files, imported Stock GLB, stock-size tire adaptation and
historical handoff assets remain unchanged.

- 140 mm body lift; 30-inch tire diameter; 1.50 m wheel-center track.
- High-cut wheel mouths, swept lower wings and a rounded native-surface nose
  with a raised lower apron. Headlights and amber signals remain in their
  original fender mount positions, lifted with the shell, not on exposed pods.
- Fixed outer body/wheel-mouth cuts accommodate the larger tires. The open
  engine bay removes the obstructing rear floor/inner skin while retaining
  the vent deck, cabin and a short upper rear lid lip. There is no polygonal
  tube outline pretending to be bodywork.
- Simple front tube bumper, rocker rails and a compact rear engine guard.
  The new silver rim faces reuse the supplied Beetle rim geometry, with
  exposed center/bolts instead of the stock chrome hubcaps.
- Torsion-beam-inspired front links, rear trailing links/halfshafts and shocks
  provide a static running-gear preview, not long-travel coilovers.
- The historical flat-four-inspired engine is refitted and given plain PBR
  materials. It remains a **visual blockout**, not a detailed engine asset or
  mechanically certified installation.
- Opening the rear deck is required when the engine is enabled; closing it
  switches the engine off. Cut/wide wings remain mutually exclusive.

[VEH_002_Stage2Baja.glb](../../assets/bug/VEH_002_Stage2Baja.glb) is the assembled
default Stage 2 vehicle for downstream import. Its geometry/material/winding
signature matches the modular preview. It is 253,214 triangles,
not a game-optimized asset. Authored source normals are retained; inherited
degenerate dashboard/license lettering faces are not repaired in the untouched
source. Generated kit meshes are checked separately for degenerate faces.

Tests verify tire grounding and axle placement, retained cabin components,
rounded nose envelope and original lamp mounts, more than 70 mm of static
wing/tire bounding-cylinder clearance, fixed-body clearance, wide-wing mounts,
rear engine/guard bounds, and assembled/modular equality. These checks do not
replace collision validation; sampled case/head/valve/sump vertices also retain
more than 20 mm separation from the fixed rear body. They do not
validate steering, suspension travel, chassis strength, gameplay stages or
Class 1 rules.

## Verification and documentation

Validated 27 regression cases across the 19 existing import/body/tire cases
and the final eight Stage 2 cases:
[import tests](../../assets/bug/test_export.py),
[body tests](../../assets/bug/test_baja_parts.py),
[stock-size tire tests](../../assets/bug/test_all_terrain_wheels.py), and
[Stage 2 tests](../../assets/bug/test_stage2_baja.py).

Final browser checks cover profiles, all native masking targets, cut/wide
exclusion, engine/open-deck dependencies, Stock restoration, wireframe and
inspector. Front/rear shaded views were inspected with no WebGL error in the
final checks. Production build succeeds with the existing >500 KB chunk warning.
All twelve Stage 2 GLBs match their source, public and production copies.
These are static checks, not certification of production assets or gameplay.

Project state:
[feature map](../../docs/FEATURE_MAP.md),
[progress](../../docs/PROGRESS_TRACKER.md),
[open questions](../../docs/OPEN_QUESTIONS.md),
[project log](../../docs/PROJECT_LOG.md),
[working guide](../../docs/CLAUDE_GUIDE.md), and
[updated handoff](../../handoff/project_baja_handoff/PROJECT_BAJA_CLAUDE_HANDOFF.md).

## Regenerate Stock, body prototypes, tires and Stage 2

Requires Blender 4.5+. From the Project: Baja workspace root, set `$blender` to
your installed or portable executable:

```powershell
$blender = 'C:\path\to\blender.exe'
& $blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python assets\bug\export_beetle.py
```

[export_beetle.py](../../assets/bug/export_beetle.py) reads the native source
without saving it, creates [the GLB](../../assets/bug/VEH_001_Beetle_Imported.glb),
and copies it to `public\models`. Stop on an export error.

Next, using a Python environment with `numpy`, `scipy` and `trimesh`, run from
the workspace root:

```powershell
python assets\bug\build_baja_parts.py
```

Prepare and fit the tires after exporting the base:

```powershell
& $blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python assets\bug\prepare_all_terrain_tire.py
python assets\bug\build_all_terrain_wheels.py
python assets\bug\build_stage2_baja.py
python -m unittest discover -s assets\bug -p 'test_*.py' -v
```

Stop if any generation command fails. The Stage 2 builder also requires the
historical engine GLB in the handoff folder; it reads, refits and exports a copy,
not the historical engine generator. Do not overwrite the source archives.

Tests cover vehicle-only nodes, coordinates, independent panel bounds, finite
geometry/normals, PBR materials, replacement budgets, mounting seams (including
interpolated cut edges), lamp bracket attachment, tire clearance, shortened
envelopes, tire/rim fits, tire-source preservation, sampled simplification error
and viewer/source sync. A canonical triangle and
material signature checks the assembled model against the pre-split import at
0.01 mm precision, preserving winding as well as geometry. Direct GLB comparison
also measured zero position delta and less than 0.0001 corner-normal component
delta after separation. Historical procedural generators and their
geometry tests do not regenerate or validate this imported asset. Historical ZIP
packages are unchanged. The body, wheel and Stage 2 generators copy their GLBs to
`public\models`; they do not overwrite the historical handoff parts. Run
`npm run build` from this viewer folder and reload the browser after regeneration
to clear the GLB loader cache.
