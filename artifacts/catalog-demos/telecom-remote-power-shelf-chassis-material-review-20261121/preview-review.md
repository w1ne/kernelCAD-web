# Five-preview audit ledger: telecom infrastructure, 2026-11-21

Audit base: `feat/catalog-2000` at `49b31afb9`.
Selection: `remote-power-shelf` (named best next fix in the conduit-riser-frame ledger) and four
telecom assets not in any audit ledger (`equipment-fan-panel`, `fiber-terminal-box`,
`rooftop-network-cabinet`, `pedestal-fiber-terminal`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `remote-power-shelf` | Reads as a grey crate with a teal band and two teal faces. | **Fixed this round.** The `shelf` body was `galvanizedSteel` under a `powderCoat` `top` band; a rack power shelf is one painted chassis. | Fixed with the material: no rack ears; the "top lip" (z 190-230 mm) was a band round the body, not at the top (z 340 mm); 680 x 360 x 340 mm does not fit a 19-inch rack. |
| `equipment-fan-panel` | Reads as a teal panel with two grey drums standing on the floor in front of it. | Plausible: painted panel, galvanized shrouds and tabs. | `fan-a`/`fan-b` are vertical cylinders (z 0-300 mm) in front of the panel; the panel starts at z 170 mm. The fan shrouds must be on the panel face with their axis through the panel (best next geometry fix). |
| `fiber-terminal-box` | Reads as a teal wall enclosure with a hood, door and latch. | Plausible: painted body, hood and door, polymer glands, stainless latch. | The two glands (z 0-75 mm) stand under the body (z 75 mm) as legs; no wall plate. |
| `rooftop-network-cabinet` | Reads as a teal cabinet on a galvanized curb. | Plausible: galvanized curb, painted body and lid. | `vent-left`/`vent-right` are flat 12 mm plates with no slots; the front panel has no hinges or handle. |
| `pedestal-fiber-terminal` | Reads as a grey post with a teal base, cap and door. | Weak mixed finish: galvanized `pedestal` body with a `powderCoat` door, cap and base; a fiber pedestal is one painted or polymer housing. | `conduit-a`/`conduit-b` are inside the pedestal and do not render. |

Decision: fix `remote-power-shelf`. The `galvanizedSteel` control is removed. One `powderCoat`
control (default `#353c41`) drives the 440 x 330 x 133 mm (3U) chassis and two L-shaped rack ears
(483 mm over the ears). New controls: `aluminium` (default `#b4bcbf`) for the controller and four
rectifier faces, `stainlessSteel` (default `#d2dbdc`) for four rack screws, and `polymer` (default
`#1c2124`) for handles, vents, display, ports and the rear terminal cover. Triangles 72 -> 688
(budget 900 -> 1000).

Best next fixes: `pedestal-fiber-terminal` (one housing finish) and `equipment-fan-panel` (fan
shrouds on the panel face).
