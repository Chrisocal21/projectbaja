# Catalog — add content without touching code

Every `*.json` under this folder is auto-discovered (an entry, or an array of entries). Drop the GLB in
`public/models/` and add an entry; it shows up in the UI and in Randomize/share links automatically.

| `type` | What | Key fields |
|---|---|---|
| `slot` | A place a part can go | `id`, `label`, `category`, `order` |
| `body` | A vehicle shell | `id`, `file`, `family`, `wheels` {FL,FR,RL,RR: center+radius}, `wheelHide` (built-in wheel mesh prefixes), `colorChannels` [{id,label,match: regex of material names}], `pieces` [{id,label,category,match: mesh-name prefixes}], `cabEye`, `fused` |
| `wheels` | A wheel set | `kind`: `stock` / `tire` (one tire GLB instanced 4x: `file`, `baseRadius`, `halfWidth`; resizable) / `prebuilt` (per-body file in `bodies`); optional `mounts` {bodyId or "*": {FL,FR,RL,RR: center+radius+halfWidth}} overrides body wheel positions |
| `part` | An attachable part | `slot`, `bodies` (`"*"` + `file`, or {bodyId: file}), `hides` (body mesh prefixes to hide), `requires` {slot: partId}, `attach` |
| `preset` | A saved build | `build` {body, wheels, wheelScale, lift, paint, parts: {slot: partId}} |

* One part per slot; parts in the same slot are mutually exclusive.
* The `suspension` and `shocks` slots control one procedural suspension assembly,
  shared with drive mode. The trail running-gear GLB and per-wheel coilover GLB
  remain archived but are not rendered alongside the articulated assembly.
  Other `attach` modes are not implemented.
* A part that lists no file for a body of its `families` shows as "refit needed" and is disabled.
* Tire GLBs: ~0.95 m across with the axle on Z (any size works — set `baseRadius` to half the diameter).
* `halfWidth` is the tire's axial half-width in meters, before scaling. Mount
  centers/radii must match the fitted wheel GLB, including stock wheels on a
  raised body; verify them with `npm test` from the viewer folder.

* `pieces` are toggle-able (show/hide) sub-meshes of a body; `colorChannels` are independently recolourable material groups. Both are generated for the Classic bodies from the GLB's mesh names.
