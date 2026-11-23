# Eight-preview audit ledger: mining, 2026-11-21

Audit base: `feat/catalog-2000` at `68ba0a8bb`.
Selection: the telecom-infrastructure kit is fully ledgered, so this round moves to the `mining` kit.
Only `mining/tailings-stack-conveyor` and the four assets in its 2026-11-19 ledger were audited
before. These eight mining assets are in no audit ledger under `artifacts/catalog-demos/`. The only
open PR on the repository is the lane PR #1507; no open issue or PR targets these assets.

Method: the checked-in default preview of each asset was opened, then every colour control and every
`.color()` call in the source was read against the part names. `trommel-screen` was also checked with
`npx kernelcad render inspect` (right and iso views in `inspect/`).

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `trommel-screen` | Reads as an inclined green trommel drum with grey screen panels, a feed hopper, a cross conveyor to a fines pile and an oversize pile. | **Fixed this round.** The `spray-bar` and six `spray-nozzle-*` used the `stainlessSteel` control, labelled "Screen panels": a colour change to the panels also recoloured the water pipe. The `spray-supply` used the pale-blue `water` colour `#9fc6d8`, so one pipe run had two finishes, and neither was pipe. The supply ran diagonally and ended in the air 600 mm above the ground. | `mechanism.interpenetration` badge in `render inspect` before and after (not caused by this change). Screen panels are one plain cylinder, no perforation. |
| `mill-feed-chute` | Reads as an elevated belt conveyor with a head hood over an inclined lined chute, a drop box and a spout on a trolley into the trunnion of a yellow grinding mill. | Weak: `belt-carry` and `belt-return` use the `wearLiner` control ("Wear liner rubber"), so a liner colour change recolours the belt. Both are rubber, so not counted as a defect. | Conveyor columns are long thin posts with no bracing. |
| `ore-pass-grizzly` | Reads as a concrete collar with grizzly bars over an ore pass, broken rock, a pedestal rock breaker, a striped bump rail and chained guard posts. | Plausible. The breaker and the hazard stripes share `hazardPaint`; the label ("Hazard and breaker paint") says so. Yellow guard chain is a common plastic chain. | None recorded. |
| `roof-bolting-rig` | Reads as a crawler twin-boom roof bolter: ATRS beam, two drill masts, operator canopies, dust collector, cable reel and trailing cable. | Plausible. Body `machinePaint`, tracks and deck `frameSteel`, ATRS pads and hoses rubber. | The header comment calls the operator "his"; wording only. |
| `run-of-mine-hopper` | Reads as a truck dump pocket: concrete retaining wall, grizzly bars over a yellow hopper on braced steel columns, a striped stop block and a traffic light. | Plausible. | None recorded. |
| `metal-detector-arch` | Reads as a blue search-coil frame around a troughed belt conveyor, with a control enclosure on a post and a beacon. | Plausible. The fibreglass stringer bridge and idlers through the coil are the non-metallic zone a real detector needs. | None recorded. |
| `spiral-concentrator` | Reads as a bank of three helical troughs on a blue frame with a distributor, feed boxes, splitter boxes and launders. | Plausible. Troughs, boxes and distributor are fibreglass. The control id is `coatedSteel` but its label is "Trough fibreglass"; id wording only. | None recorded. |
| `thickener-bridge` | Reads as a round thickener tank with a water surface, a bridge with a central drive, a launder and an access stair. | Plausible. Tank, launder and feedwell coating; drive head, rake cylinder and underflow pump in drive coating. | None recorded. |

Decision: fix `trommel-screen`. The spray bar, nozzles and supply are now one galvanized steel pipe
run (`#a7afb1`): the supply runs level from the discharge end of the bar to the back of the drum,
an elbow turns it down, and a riser drops through a cast iron gate valve (`#3c4144`, red handwheel
`#c8322b`) to a flange on the discharge plinth (to the ground for the mobile mounting). The
`stainlessSteel` control ("Screen panels") now drives the screen panels only. Triangles 2160 -> 2352
(budget 3200, unchanged).

Best next fix in this kit: none with a clear material defect in these eight. With this ledger,
every mining asset is named in at least one audit ledger; the next round needs a new kit to scan.
