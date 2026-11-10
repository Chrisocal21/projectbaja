# Real-map performance work (Nov 9, 2026)

Chris reports lag in the game. The immediate focus is frame-time spikes while playing and flying around `?realmap`. We have not measured FPS, GPU time or memory on Chris's machine, so the causes below are code-level candidates rather than a ranked profiler result.

## Changes started in this pass

- [x] Terrain tile normals now reuse the padded height grid. This removes four extra world-height lookups per terrain vertex; a high-detail tile has about 15,100 vertices including its skirts.
- [x] Real scenery placement is split into batches of 160 candidate cells per frame. The old instances stay visible until a complete new field is ready, avoiding a single large placement pass whenever the player moves 65 m.
- [x] An opt-in `?perf` readout shows FPS, median/95th/worst frame time, draw calls, triangles, geometry count, texture count, and the slowest terrain, road and scenery jobs each second. Use `/?realmap&perf` on the local game.
- [x] A small FPS counter is visible during normal gameplay without a URL flag. It can be turned off in Settings > HUD; `?perf` still opens the detailed readout.
- [x] Auto render scale uses device pixel ratio 1 on the real map. A player-selected scale still takes priority.
- [x] The real-map sun uses a 1024-pixel shadow map, and the shadow pass stops at night.
- [x] Terrain and road streaming limit visible geometry to the day/night fog distance. Distant terrain is hidden at night and remains cached until the usual drop radius.
- [x] Junction surfaces are split into 800 m spatial chunks, letting the renderer cull junctions outside the camera view.
- [ ] Confirm these changes in game: no new terrain cracks, no delayed or missing scenery, and smoother motion while flying.

## Measure before further quality tradeoffs

- [ ] Record FPS, median/95th/99th frame time, long main-thread tasks, GPU time if available, draw calls, triangles, JS heap and texture memory in the garage, open desert, dense roadside area and mountain area.
- [ ] Repeat while driving and while flying at normal and Shift speed, including a fresh load and a return trip across terrain-streaming boundaries.
- [ ] Compare the same route before/after each optimization. Keep a screenshot or coordinates for the worst hitch.

## Next likely bottlenecks to profile

- [ ] Terrain streaming: synchronous high-detail tile creation, up to eight coarse tiles in one frame, terrain material cost, and the per-frame scan over nearby tiles. Budget tile creation by time or move preprocessing off the main thread if the profiler confirms spikes.
- [ ] Road streaming: the ribbon updater scans every road piece about five times per second and builds pavement plus two shoulder meshes near the camera. Add spatial indexing or tile buckets if this appears in CPU profiles; avoid rebuilding unchanged pieces.
- [ ] Scenery: measure height/surface/road lookups, instance-buffer uploads, the number of visible trees/rocks, and `frustumCulled = false` on all scenery instances. Keep deterministic placement and avoid popping.
- [ ] GPU: inspect the 2048² sun shadow, shadow casters, draw calls, device pixel ratio, transparent road/shoulder layers, terrain texture array and per-pixel ground-detail shader. Add a measured quality preset rather than cutting all detail globally.
- [ ] Loading and memory: check model and texture ownership/disposal, streamed tile and road geometry lifetime, save/UI update work, and long GC pauses.

## Acceptance

- [ ] The real map should maintain stable frame pacing in the tested routes, with no visible hitch when a terrain tile, road piece or scenery field appears.
- [ ] Record the machine, browser, resolution and quality settings with the before/after numbers. Set a concrete FPS target after the baseline is measured.
- [ ] Keep road seams, terrain relief, shoulder visibility and scenery density acceptable after each optimization.
