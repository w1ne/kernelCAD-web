# Five-preview audit ledger: data-center-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `b52971449`.
Selection: `liquid-cooling-manifold` (mixed-finish saddle pair confirmed in an earlier scan, not
yet corrected) plus four data-center assets not yet in any audit ledger
(`data-center-security-camera`, `leak-detection-module`, `environmental-sensor`,
`perimeter-precision-cooler`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `liquid-cooling-manifold` | Reads as two headers with branch drops between two end saddles. | **Fixed this round.** `support-base-left` was amber `polymer`, its twin `support-base-right` was `steel`. | Headers pass through solid saddles with no clamps; levers have no stem. |
| `data-center-security-camera` | Reads as a mast with a camera housing and sunshield. | `glass` colours a solid `lens-barrel`. | `lens-barrel` is an upright cylinder on top of the housing, not a lens that faces forward. |
| `leak-detection-module` | Reads as an enclosure with a polymer face, two terminals and a puck on a cable. | `floor-sensor-puck` is painted `steel` (a sensor puck is moulded polymer). | Probe terminals are upright stubs on a vertical face; the puck is a square slab. |
| `environmental-sensor` | Reads as a mast with a sensor head and amber cap. | Plausible: steel mast/head, polymer `vent-cap`. | `probe-tip` hangs beside the mast under the head. |
| `perimeter-precision-cooler` | Reads as a floor-standing CRAC cabinet with a grille and top fans. | Fans are steel discs with no guard; plausible. | Rubber feet only at the front; pipe stubs are hidden at the rear. |

Decision: fix `liquid-cooling-manifold`. Two identical structural saddles must have the same
finish. Moving the left saddle to `steel` would leave `polymer` with no part, so five polymer
valve lever grips take that control.
