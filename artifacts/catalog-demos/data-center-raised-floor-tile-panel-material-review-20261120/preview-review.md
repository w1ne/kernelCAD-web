# Five-preview audit ledger: telecom infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `b1c09169c`.
Selection: five telecom cabinet, antenna and mast assets not in any audit ledger
(`fiber-distribution-cabinet`, `microwave-dish-antenna`, `monopole-mast`,
`outdoor-network-cabinet`, `optical-patch-panel`). No open issue or PR targets these assets.
Fixed asset: `raised-floor-tile`, recorded as the best next fix in the ledger
`data-center-perforated-floor-tile-panel-material-review-20261120` and left uncorrected.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `raised-floor-tile` | Reads as an amber slab with a steel cross and four short posts on top. | **Fixed this round.** `tile-panel` (600 x 600 x 45 mm, the tile body) was `polymer`; access-floor tiles are steel or cast aluminium because they carry rack and foot loads. | Fixed with the material: `pedestal-0..3` (z 0-150) stood up through the tile; `stringer-x/y` (z 145-173) floated above the tile as a cross. Still not modelled: pedestals sit 50 mm in from the corners, not on shared corner heads; no pedestal base plates or height-adjust nuts. |
| `fiber-distribution-cabinet` | Reads as a teal street cabinet with a hood, a door and a lock. | Plausible: powder-coated body, hood, door and skirt; stainless lock. | 92 triangles, 5 boxes: no hinges, no handle, no cable-entry gland plate. |
| `microwave-dish-antenna` | Reads as a shrouded dish on a pole mount with a base plate and gussets. | Plausible: aluminium reflector and shroud, polymer radome, galvanized pole and base, powder-coated radio unit. | The radio unit behind the dish is mostly hidden at preview scale. |
| `monopole-mast` | Reads as a tapered monopole with three sector arms, panel antennas, a beacon and a concrete pier. | Plausible: galvanized shaft and arms, concrete pier, white radomes, black jumpers, red beacon lens. | Preview scale makes the antenna head small; no defect found. |
| `outdoor-network-cabinet` | Reads as a teal outdoor cabinet with a cap, a door and two side louvre panels. | Plausible: powder-coated body; galvanized louvre panels are an accepted finish. | 84 triangles: `foot-left/right` are hidden under the body; door has no handle or lock. |
| `optical-patch-panel` | Reads as a teal block with ten round ports between two tall end blocks. | Plausible per part (powder-coated panel, polymer adapters). | Wrong proportions: 240 mm tall (about 5.4U) instead of 1U-4U; `ear-left/right` are 60 x 190 x 280 mm solid blocks instead of thin rack flanges; ports are round stubs, not LC/SC adapters (best next geometry fix). |

Decision: fix `raised-floor-tile`. `tile-panel` becomes `steel` (588 x 588 x 35 mm) at z 150-185 mm.
Pedestals are shortened to z 0-122 mm and carry four steel stringers (z 122-150 mm) that run under
the tile edges between the pedestal heads, replacing the `stringer-x/y` cross. The redundant
`edge-frame` slab is removed. The `polymer` control moves to four `edge-trim-*` bands (6 mm) that
wrap the panel to 600 x 600 mm; its default changes from amber `#c99b35` to dark grey `#2f3438`.
The single `corner-fastener` becomes four hold-down screws on the tile top over the pedestals.
Triangles 268 -> 460.

Best next fixes: `optical-patch-panel` (rack proportions and ear flanges) and the data-center
`rack-blanking-panel` (server shape under a blanking-panel label).
