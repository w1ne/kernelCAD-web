# Five-preview audit ledger: data-center-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `c4a0c9262`.
Selection: five rack and IT-equipment assets that were not in any audit ledger
(`wall-mount-network-cabinet`, `open-frame-it-rack`, `rack-mounted-battery-tray`,
`storage-array-chassis`, `high-density-server-chassis`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `wall-mount-network-cabinet` | Reads as a small cabinet with a solid dark door and two tall ears. | **Fixed this round.** The description says "framed door", but `front-door` (500 x 24 x 590 mm) was one solid block on the `steel` control. Wall-mount network cabinets normally have a steel-framed tempered glass door. | `front-rail-left/right` stand in front of the door and cover the glass edges; `left/right-mounting-ear` rise 143 mm above the roof; a wall cabinet has a floor `base-plinth` and two front `leveling-foot` parts; `door-lock` is an upright cylinder 4 mm clear of the door; no cable-entry plate. |
| `open-frame-it-rack` | Reads as a four-post frame with a solid top slab and bars at the floor. | Plausible: painted-steel frame, rubber feet. | `equipment-rail-0..4` lie flat on the base at z 150-190 instead of carrying equipment; `top-frame` and `base-plinth` are solid slabs on an open frame; front leveling feet only. |
| `rack-mounted-battery-tray` | Reads as a tray with four tall amber blocks standing on top. | Plausible: steel shell, polymer cell covers, copper terminals. | `cell-cover-0..3` stand 180 mm above a 155 mm tray, so the module is about 335 mm tall and cannot fit a rack slot; `slide-rail-left/right` show as short stubs on the side. |
| `storage-array-chassis` | Reads as a 4U chassis with a 6 x 4 grid of amber drive carriers. | Questionable: `rear-controller-a/b` are `polymer` while `rear-power-module-a/b` are `steel`; controller canisters are normally sheet metal. The rear is not visible in the preview. | None found in the front view. |
| `high-density-server-chassis` | Reads as a 3U chassis with eight amber drive carriers. | Plausible: steel shell, polymer carriers and status control. | `left/right-mounting-ear` run the full 760 mm depth like side walls, not short front ears. |

Decision: fix `wall-mount-network-cabinet`. The solid door becomes two steel stiles, a top
rail and a bottom rail around a 6 mm `door-glass` panel on a new `glass` control
(288 -> 336 triangles).
