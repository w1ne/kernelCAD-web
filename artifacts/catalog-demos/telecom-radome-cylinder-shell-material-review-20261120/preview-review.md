# Five-preview audit ledger: telecom infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `1e175d2b8`.
Selection: five telecom antenna and rooftop assets not in any audit ledger
(`radome-cylinder`, `omnidirectional-whip-antenna`, `sector-panel-antenna`,
`rooftop-microwave-dish`, `waveguide-bridge`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `radome-cylinder` | Reads as a teal steel post or bollard with a grey band, not a radome. | **Fixed this round.** The `shell` (1050 mm tall) and flat `cap` used the `powderCoat` steel control. A radome exists to let radio waves through to the antenna inside; a painted steel tube would block them. Real cylindrical radomes are fibreglass or polymer. The model had no radome colour control. | Fixed with the material: the "narrow mounting foot" was wider (r 120 mm) than the shell (r 110 mm); the "rounded-looking cap" was a flat octagon. Still not modelled: drain hole, mounting thread, internal antenna. |
| `omnidirectional-whip-antenna` | Reads as a white fibreglass whip on a stand-off bracket on a galvanized mast stub with a coax drip loop. | Plausible: fibreglass radome, stainless ferrule and clamps, galvanized mast and plate, black coax. | None found at preview scale. |
| `sector-panel-antenna` | Reads as a tall grey panel antenna with teal end caps on a pipe, jumpers to a base plate. | Plausible: polymer radome, powder-coated end caps and brackets, galvanized pole and plate, black connectors. | None found at preview scale. |
| `rooftop-microwave-dish` | Reads as a grey disc on a post with a side arm and a stub. | Plausible: aluminium reflector, galvanized post, arm, foot and feed. | False shape: the `reflector` is a flat 22 mm disc (no dish depth); its bottom (z 790 mm) floats 70 mm above the `post` top (z 720 mm); the `feed-horn` sits on the arm about 350 mm below the reflector axis, not at its focus (best next geometry fix). |
| `waveguide-bridge` | Reads as a grey bench with teal side rails and three dark strips. | Plausible but weak: galvanized tray, legs and cross members with powder-coated teal side rails (a mixed finish on one bolted frame). | The `waveguide-jacket-*` strips float 30 mm above the tray top (tray top z 585 mm, jackets z 615 mm) and the side rails 15 mm; no hangers or clamps. |

Decision: fix `radome-cylinder`. The `shell`, `cap` and `collar` parts are removed. A new `radome`
control (default `#eeede6`) drives one revolved fibreglass tube with a domed top (216 mm
diameter, 1064 mm tall). A stainless `clamp-band` and `band-screw` hold its base on a galvanized
`flange`, on a narrow galvanized pipe `foot` (100 mm diameter), a bolted galvanized `base` plate
and four `bolt-*` heads. A new `polymer` control drives a black `cable-gland`, `cable-run` and
`cable-drop`. The `powderCoat` control is removed. Triangles 176 -> 634.

Best next fixes: `rooftop-microwave-dish` (dished reflector on the post, feed at the focus) and
`waveguide-bridge` (seat the waveguides on the tray).
