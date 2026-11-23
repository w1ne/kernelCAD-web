# Five-preview audit ledger: telecom infrastructure, 2026-11-21

Audit base: `feat/catalog-2000` at `667703110`.
Selection: `pedestal-fiber-terminal` (named best next fix in the remote-power-shelf ledger) and four
telecom assets not in any audit ledger (`dual-sector-panel-array`, `fiber-drop-terminal`,
`microwave-backhaul-shelter`, `telecom-equipment-shelter`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `pedestal-fiber-terminal` | Reads as a grey post with a teal base, cap and door. | **Fixed this round.** The `pedestal` body was `galvanizedSteel` while the `base`, `cap` and `door` were `powderCoat`; a fiber pedestal is one painted housing. | Fixed with the material: the door was a slab with no seam, hinges or lock; the cap was a flat plate, not a cover over the body; `conduit-a`/`conduit-b` were galvanized and hidden inside. |
| `dual-sector-panel-array` | Reads as two grey sector panels on crossbars off a pole with a base plate and jumper cables. | Plausible: polymer radomes, painted end caps and tilt brackets, galvanized pole and pipes, stainless clamps, black jumpers. | None seen at preview scale. |
| `fiber-drop-terminal` | Reads as a teal box with a wide hood and six black ports on the front. | Weak: case, hood and face are `powderCoat` steel; a fiber drop terminal is a moulded polymer housing (the `polymer` control only drives the ports). | No pole or strand mount; the hood is a slab wider than the case on all sides. |
| `microwave-backhaul-shelter` | Reads as a teal hut open at the front, with a door slab standing in the opening. | Plausible: painted walls, roof and door, galvanized vent and step. | No front wall: the door (650 mm) stands alone in a 1,450 mm opening and the interior floor shows (best next geometry fix). No dish or waveguide entry for a "microwave backhaul" shelter. |
| `telecom-equipment-shelter` | Reads as a composite-panel shelter with two wall-mounted air conditioners, door canopy, steps, skid and cable bridge. | Plausible: composite walls, painted roof and trim, galvanized skid and bridge, polymer grilles. | None seen at preview scale. |

Decision: fix `pedestal-fiber-terminal`. The `galvanizedSteel` control is removed. One `powderCoat`
control (default `#4f6e57`) drives the 300 x 240 mm body, the base flange, the cover skirt that slides
50 mm over the body top, its gable roof, and the service door. New controls: `concrete` (default
`#a9a69d`) for the mounting pad, `stainlessSteel` (default `#d2dbdc`) for two hinges, the penta-head
lock and four anchor bolts, and `polymer` (default `#1d2326`) for the door seal, eight louvre vents
and two HDPE ducts. Triangles 136 -> 580 (budget 900).

Best next fixes: `microwave-backhaul-shelter` (front wall around the door) and `fiber-drop-terminal`
(polymer housing with a mount).
