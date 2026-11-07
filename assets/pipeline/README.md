# Meshy body pipeline

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
