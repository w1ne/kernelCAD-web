# Five-preview audit ledger: data-center and telecom infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `b413e106f`.
Selection: the last two data-center assets not in any audit ledger (`raised-floor-tile`,
`rack-blanking-panel`) and three telecom cabinet and radio assets not in any audit ledger
(`battery-backup-cabinet`, `cell-site-cabinet`, `remote-radio-unit`). No open issue or PR
targets these assets.
Fixed asset: `perforated-floor-tile`, recorded as the best next fix in the ledger
`data-center-coolant-header-hanger-material-review-20261120` and left uncorrected.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `perforated-floor-tile` | Reads as an amber slab with steel bars and four short posts standing on top. | **Fixed this round.** `tile-panel` (600 x 600 x 45 mm, the tile body) was `polymer`; perforated raised-floor tiles are steel or cast aluminium because they carry rack and foot loads. | Fixed with the material: `pedestal-0..3` (z 0-150) stood up through the tile. Still not modelled: real perforation (eight raised bars only); pedestals sit 50 mm in from the corners, not on shared corner heads. |
| `raised-floor-tile` | Reads as an amber slab with a steel cross and four short posts on top. | Same defect as the fixed asset: `tile-panel` is `polymer`. Not fixed (one fix per round); the same fix pattern applies. | `pedestal-0..3` (z 0-150) stand up through the 45 mm tile; `stringer-x/y` (z 145-173) float above the tile as a cross instead of running under the tile edges. |
| `rack-blanking-panel` | Reads as a 1U server chassis with rails and a drive carrier, not a blanking panel. | Plausible per part (steel shell, polymer carrier and grip). | False object shape: a blanking panel is a flat 1U-2U plate with ears; this model has `slide-rail-left/right` (560 mm), a `drive-carrier-0` and a `status-control`, which belong to a server. |
| `battery-backup-cabinet` | Reads as a teal double-door cabinet on a grey plinth. | Plausible: powder-coated body and doors, galvanized plinth, polymer intake grille. | 72 triangles, 6 boxes; the "cable entry hood" in the description is only the roof overhang; the doors have no handles or hinges. |
| `cell-site-cabinet` | Reads as a grey outdoor cabinet with a side heat exchanger, louvres, handles and a warning label. | Plausible: powder-coated body, galvanized plinth, black polymer seals and handles. | None found at preview scale. |
| `remote-radio-unit` | Reads as a finned radio unit on a pole with a sunshield and dark cable drops. | Plausible: cast-aluminium housing and fins, powder-coated sunshield, galvanized pole, black polymer cables. | None found at preview scale. |

Decision: fix `perforated-floor-tile`. `tile-panel` becomes `steel` (588 x 588 x 35 mm) and now
sits on the pedestal heads at z 150 mm. The redundant `edge-frame` slab is removed. The `polymer`
control moves to four `edge-trim-*` bands (6 mm) that wrap the panel to 600 x 600 mm, as on real
access-floor panels; its default changes from amber `#c99b35` to dark grey `#2f3438`.
Triangles 340 -> 376.

Best next fixes from this ledger: `raised-floor-tile` (same polymer tile body and pedestal
defect; same fix pattern) and `rack-blanking-panel` (server shape under a blanking-panel label).
All data-center assets are now in a ledger.
