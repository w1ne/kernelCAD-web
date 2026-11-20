# Five-preview audit ledger: data-center-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `dc7756906`.
Selection: five floor, ceiling and containment assets that were not in any audit ledger
(`ceiling-return-plenum`, `cold-aisle-roof-panel`, `floor-air-grille`, `perforated-floor-tile`,
`vertical-cable-manager`). No open issue or PR targets these assets.
Fixed asset: `overhead-coolant-header`, a mixed-finish pair already recorded in the ledger
`data-center-overhead-cable-ladder-hanger-cap-material-review-20261119` and left uncorrected.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `overhead-coolant-header` | Reads as two pipes between an amber end block and a blue end block. | **Fixed this round.** `hanger-left` was the only `polymer` part; its mirror `hanger-right` was `steel`. Both brackets carry the same pipe load and are painted steel on real headers. | The "hanger brackets" are 420 mm floor blocks, not rods from the ceiling; `pipe-clamp-*` sit on top of the supply main, not around it; branch drops pass through the return main. |
| `ceiling-return-plenum` | Reads as a box on four legs with an amber door and a round collar on top. | Questionable: `service-panel` is the only `polymer` part; plenum access doors are normally sheet steel. Not fixed (one fix per round). | A "ceiling" plenum stands on 240 mm floor legs, and its `hanger-strap-left/right` lie on the roof (z 810-890) instead of rising to a slab. |
| `cold-aisle-roof-panel` | Reads as an amber slatted panel with two thin posts rising above it. | Plausible: steel frame, polymer (polycarbonate) roof panels. | `support-post-front/rear` (2,200 mm) rise from z 0 above the canopy instead of holding it up at the rack tops; only two diagonal posts. |
| `floor-air-grille` | Reads as a louvered register on an amber curb. | Plausible: steel frame and louvers, polymer curb trim. | `damper-adjuster-tab` sits on the louvers, not below the grille. |
| `perforated-floor-tile` | Reads as an amber slab with steel bars and four short posts standing on top. | Questionable: `tile-panel` is `polymer`; perforated raised-floor tiles are steel or cast aluminium. | `pedestal-0..3` (z 0-150) stand up through the 45 mm tile instead of below it; no perforation, only eight raised bars. |
| `vertical-cable-manager` | Reads as a tall channel with dark cable fingers. | Plausible: steel channel, elastomer fingers. | No hinged front cover, although the description names covers. |

Decision: fix `overhead-coolant-header`. `hanger-left` becomes `steel`. To keep the `polymer`
control effective, five `valve-lever-*` grips (26 x 110 x 18 mm) are added on the branch drops,
the same pattern as `liquid-cooling-manifold` (86a86a5f3). The branch drops now run z 40-410 mm
(were 150-410, hidden between the mains), so the levers sit on visible pipe below the return
main. Triangles 392 -> 452.

Best next fixes from this ledger: `perforated-floor-tile` (polymer tile body, pedestals above
the tile) and `ceiling-return-plenum` (polymer access door).
