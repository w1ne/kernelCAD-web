# Five-preview audit ledger: data-center-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `e44978575`.
Selection: `distribution-panelboard` (breaker finish noted in the
[leak-detection puck ledger](../data-center-leak-detection-puck-material-review-20261120/preview-review.md),
not yet corrected) plus four power-path cabinets not yet in any audit ledger
(`automatic-transfer-switch-cabinet`, `static-transfer-switch`, `maintenance-bypass-cabinet`,
`monolithic-ups-cabinet`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `distribution-panelboard` | Reads as a tall wall cabinet with a door and four horizontal bars in the door colour. | **Fixed this round.** `breaker-row-0..3` were painted `steel`, the same finish as the door; moulded-case breakers are polymer. | Deadfront (front y -199 mm) and breakers (front y -223 mm) stand proud of the closed door (front y -181 mm); `cable-entry` is hidden inside the enclosure base. |
| `automatic-transfer-switch-cabinet` | Reads as a floor cabinet on a plinth with a display, two source windows, a knob, a round control and a handle. | Plausible: steel shell, glass windows, polymer handle and controls. | `control-knob` and `transfer-control` are vertical-axis cylinders on the door face (knob axis should point out of the door); `cable-entry` hidden in the plinth. |
| `static-transfer-switch` | Reads as a floor cabinet with a display, two indicators, a knob and an amber handle plate. | Plausible: steel shell, glass indicators, polymer handle. | Source indicators (rear y -437 mm) and `transfer-handle` (rear y -460 mm) float 47 mm and 70 mm in front of the door face (y -390 mm). |
| `maintenance-bypass-cabinet` | Reads as a floor cabinet with an interlock panel, two mimic bars, and an amber rotary selector. | Plausible: steel interlock panel and painted mimic bars, polymer selector. | `rotary-bypass-selector` is a vertical-axis disc (r 68 mm) half sunk into the door, with the handle bar lying on its top face, so the selector does not face the operator; `cable-entry` hidden. |
| `monolithic-ups-cabinet` | Reads as a floor cabinet with a display, knob, handle, and six louvre bars. | Plausible: steel shell and louvres, glass display. | Louvres are proud bars, not slots; `cable-entry` hidden in the plinth. |

Decision: fix `distribution-panelboard`. The change is four parts' colour control; geometry and
triangle count are unchanged.
