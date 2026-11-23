# Five-preview audit ledger: data-center-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `86a86a5f3`.
Selection: `leak-detection-module` (puck finish noted in the
[liquid-cooling manifold ledger](../data-center-liquid-cooling-manifold-support-material-review-20261120/preview-review.md),
not yet corrected) plus four data-center assets not yet in any audit ledger
(`distribution-panelboard`, `power-meter-pedestal`, `floor-cable-grommet`, `busway-plug-in-unit`).
No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `leak-detection-module` | Reads as an enclosure with an amber polymer face, two terminals, a floor puck and a cable. | **Fixed this round.** `floor-sensor-puck` was painted `steel`; a leak-sensor puck is a moulded polymer body. | Puck is a square slab; `sensor-cable` runs along Y between box and puck and connects to neither. |
| `distribution-panelboard` | Reads as a tall wall cabinet with a door and four horizontal bars. | `breaker-row-0..3` are painted `steel`; moulded-case breakers are polymer (candidate next fix). | Breakers stand proud of a closed door, so the door reads as open and closed at once; `cable-entry` is hidden inside the enclosure base. |
| `power-meter-pedestal` | Reads as a post with a meter head, display window and side door. | Plausible: steel body, glass window. | `cable-port` (rubber) is hidden inside the base plate; `service-door` (y 190–220 mm) floats 100 mm behind the riser rear face (y 90 mm), below the head. |
| `floor-cable-grommet` | Reads as a curb plate with a black ring between two collar blocks. | Plausible: steel curb and collars, rubber ring. | The two 280 mm "split collar" halves overlap by 136 mm; `clamp-boss` is hidden inside the left collar. |
| `busway-plug-in-unit` | Reads as a box with a cover and an amber handle and knob. | Plausible: steel box, polymer handle. | No busway stab or hanger on top; `cable-gland` is hidden inside the box base. |

Decision: fix `leak-detection-module`. The change is one part's colour control; geometry and
triangle count are unchanged.
