# Five-preview audit ledger: data-center-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `85b468ce4`.
Selection: five containment and cooling assets that were not in any audit ledger
(`hot-aisle-containment-door`, `in-row-cooler`, `rear-door-heat-exchanger`,
`coolant-distribution-unit`, `enclosed-it-rack`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `hot-aisle-containment-door` | Reads as a door frame with two solid dark leaves and an amber handle. | **Fixed this round.** The description says "clear-panel frame", but `door-panel-left/right` (500 x 35 x 1920 mm) were solid blocks on the `steel` control. Containment doors are glazed so staff can see into the aisle. | `pull-handle` sits in the 100 mm gap between the leaves and touches neither; `hinge-top` is a single upright stub between jamb and leaf. |
| `in-row-cooler` | Reads as a tall cabinet with front louvres, two top discs and an amber base. | Questionable: `base-plinth` is the only `polymer` part, so the amber plinth carries the polymer control; a cooler plinth is normally painted steel. | `top-fan-left/right` are discs standing proud of the roof; `pipe-stub-supply/return` exit the rear face. |
| `rear-door-heat-exchanger` | Reads as a tall door frame with nine copper tube bars on the face. | **Mixed-finish pair:** `inlet-port` is `steel` and `outlet-port` is `polymer`. Both ports are fully inside the 110 mm `door-frame`, so the mismatch does not show in the preview (placement fix needed before a material fix is visible). | `hinge-left/right` are full-height 65 x 160 mm bars on both sides of the door. |
| `coolant-distribution-unit` | Reads as a plain cabinet on a skid with one door outline. | Plausible finishes, but `heat-exchanger-plate-0..7` (`aluminum`) and `pump-motor` are inside the cabinet, so the `aluminum` control has no visible effect. | `supply-connection` and `return-connection` exit the rear face only. |
| `enclosed-it-rack` | Reads as a closed rack with a vented front door and amber handle. | Plausible: steel frame, doors and panels; rubber feet; polymer handle. | Only the two front leveling feet exist; the rear corners stand on the plinth. |

Decision: fix `hot-aisle-containment-door`. Each leaf becomes two steel stiles, a top rail and
a bottom rail around an 8 mm `door-glazing-left/right` panel on a new `glazing` control
(116 -> 212 triangles).
