# Five-preview audit ledger: telecom infrastructure, 2026-11-21

Audit base: `feat/catalog-2000` at `7278acd5e`.
Selection: `conduit-riser-frame` (named best next fix in the wall-mast-bracket ledger) and four
telecom assets not in any audit ledger (`fiber-service-loop-rack`, `cable-splice-pit-frame`,
`yagi-radio-antenna`, `remote-power-shelf`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `conduit-riser-frame` | Reads as three grey conduits over four grey and teal cross bars. | **Fixed this round.** `bridge-top` was `powderCoat`, `bridge-bottom` galvanized: the same part type on the same frame with two finishes. | Fixed with the material: no rails, no clamps; conduits passed in front of the bars; polymer bands were rings at one height. |
| `fiber-service-loop-rack` | Reads as a teal panel with two dark rings and two grey bars. | Plausible: painted plate, polymer loops, galvanized fingers. | `loop-right` (y +150 mm) and `finger-2`/`finger-3` (y +70, +215 mm) sit behind the 45 mm plate; the fingers are spread through the plate depth, not across its face (best next geometry fix). |
| `cable-splice-pit-frame` | Reads as a teal slab with a grey inset square. | Weak: the in-ground `outer-rim` and `lid` are `powderCoat`; pit frames are normally galvanized steel or cast iron. | `inner-lip` (620 mm square, z 70-88 mm) sits on top of the 700 mm lid (z 45-80 mm), so only a 40 mm lid border shows; the lifting `slot-*` blocks (z 70-84 mm) are buried inside the lip and do not render. |
| `yagi-radio-antenna` | Reads as a Yagi on a stub mast with a base plate. | Plausible: galvanized mast, aluminium boom, stainless elements, black polymer insulators. | None found. |
| `remote-power-shelf` | Reads as a grey box with a teal band and two teal faces. | Weak mixed finish: galvanized `shelf` body under a `powderCoat` `top` band; a rack power shelf is one painted chassis. | No rack ears; the `top` "lip" (z 190-230 mm) is a band round the body, not at the top (z 340 mm). |

Decision: fix `conduit-riser-frame`. The `powderCoat` control is removed and the rails, bridges and
conduits are one galvanized strut frame. A new `stainlessSteel` control (default `#d2dbdc`) drives
six strut pipe clamps and 22 bolt heads; `polymer` (default `#22292d`) drives the end bushings and
cable stubs. Triangles 312 -> 2044 (budget 900 -> 2200).

Best next fixes: `fiber-service-loop-rack` (loops and fingers on the plate face) and
`remote-power-shelf` (one painted chassis; rack ears).
