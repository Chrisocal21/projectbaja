# Asset pipeline

Scripts that turn supplied or generated source assets into the trimmed files the game loads from `viewer/bug_viewer/public/`. Sections: Meshy bodies, Bug door fixes, and Baja County terrain and desert scenery. Plants are exported with `export_plants.py`; see STORY_AND_WORLD.

## Meshy bodies

Turns the raw Meshy AI cars (60-100 MB, 2.5-3.1M triangles, one fused mesh) into game-ready bodies
with the four wheels cut out as separate nodes (`Wheel_FL/FR/RL/RR`) so they can spin, steer and be swapped.

```
npm i @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer sharp
# 1. decimate to ~120k tris + 1024px textures
node opt.mjs  <raw>_texture.glb  BODY_x.glb  120000 1024
# 2. bake orientation (+Z forward, 2x scale, on ground) and split wheels/remove junk
node split_body.mjs BODY_x.glb BODY_x_split.glb spec_offroad.json   # writes BODY_x_split.json (wheel mounts)
```
`spec_*.json` hold the wheel centres/radii measured from side/front profile renders, plus the
jack-stand removal for the white Baja. Results live in `viewer/bug_viewer/public/models/`;
wheel mounts (the `.json` written next to each output) are pasted into that body's entry in `viewer/bug_viewer/src/catalog/bodies.json`.
Unused optimized parts (fiberglass front clip, exhaust headers) are in `assets/bug/optimized/`.

## Bug door fixes
Some bodies keep a full side panel in `B_Body*` behind each door skin, so an opened (or removed) door still looks shut.
`node cut_door_openings.mjs in.glb out.glb [edge=0.015]` removes the body triangles inside each door's side silhouette
(eroded by `edge` so the jamb, pillars and sill stay). Applied to `VEH_001_Beetle_Imported` and `STAGE2_VEH_001_Beetle_Imported`.
`check_split.mjs` / `profile_render.mjs` render colour-coded / profile point images for checking splits and measuring wheels.
`node split_door_trim.mjs in.glb out.glb [B_SideTrim] [B_DoorTrim]` moves the stretch of a full-length trim/stripe that crosses each door into `B_DoorTrim_DoorL/R` (listed in the door pieces in bodies.json) so it swings and comes off with the door. Applied to both Bug bodies.

## Baja County terrain + desert scenery (sources are the local Unity / Poly Haven libraries, never committed; the outputs are)
- `python -I build_world_assets.py <supplyline-unity/Assets> <supplyline/public/assets/materials>` bakes
  `public/terrain/height.bin` (Bad Raccoon realistic heightmap, 1025²), `public/terrain/macro.jpg` (its painted diffuse + AO,
  aligned to the heightmap) and `public/textures/ground/{albedo,normal}.jpg` (8 ground layers stacked into a texture array) + `ground.json`.
- `python -I export_desert.py prep <Assets> <tmp>` then `blender -b --factory-startup -P export_desert.py -- build <Assets> <tmp>`
  writes `public/models/ENV_Desert.glb`: 7 dead trees (Dry_Trees LOD2), 3 desert rocks (ZNS3D), 9 boulders (ForestVision), a shrub.
- `node preview_county.mjs out.bmp [px]` renders the county top-down (hillshade, surfaces, sites) without starting the game.
