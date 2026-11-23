# Five-preview audit ledger: telecom infrastructure, 2026-11-21

Audit base: `feat/catalog-2000` at `6c351e01e`.
Selection: `wall-mast-bracket` (named best next fix in the guy-wire-mast-anchor ledger) and four
telecom mast and cable-support assets not in any audit ledger (`cable-support-hanger`,
`conduit-riser-frame`, `mast-extension-section`, `rooftop-tripod-mast`). No open issue or PR
targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `wall-mast-bracket` | Reads as a teal panel with grey arms and two pale discs. | **Fixed this round.** The `backplate` was the only `powderCoat` part (painted steel) on galvanized arms and gussets of the same weldment. A welded stand-off bracket is hot-dip galvanized as one part. | Fixed with the material: the `clamp-*` parts were solid 170 mm cylinders at mid-arm with no mast; the gussets were not under the arms. |
| `cable-support-hanger` | Reads as a teal panel with a teal and grey U-frame on the floor. | Weak mixed finish: `arm-*` and `lip-*` are `powderCoat`, the `crossbar` that joins them is galvanized. | The 660 mm "two-hole" plate has no holes; the U-frame lies on the ground at the plate foot, not projecting from the wall. |
| `conduit-riser-frame` | Reads as three grey conduits over four grey and teal cross bars. | Mixed finish pair: `bridge-top` is `powderCoat`, `bridge-bottom` galvanized. The two are the same part type. | Conduits pass in front of the bars with no clamps; polymer `cable-band-*` are thin rings at one height only. |
| `mast-extension-section` | Reads as a grey pole on a pale sleeve with two teal tabs and a teal cap. | Weak: `sleeve` is `stainlessSteel` on a galvanized tube (a mast splice sleeve is galvanized like the tube); `cap` and `tab-*` are `powderCoat`. | The two tabs float 18 mm off the tube (best next geometry fix). |
| `rooftop-tripod-mast` | Reads as a grey mast on a teal disc with three splayed legs. | Plausible: galvanized mast and legs; a painted base plate is a common option. | The legs meet the mast at z 805 mm, 65 mm under the `collar` (z 870 mm); no leg feet on the plate. |

Decision: fix `wall-mast-bracket`. The `powderCoat` control is removed and the wall plate, arms,
gussets and end saddles are one galvanized weldment. A galvanized 76 mm mast pipe bears on both
saddles and two stainless U-bolts per arm wrap it, with nuts behind each saddle. A new `polymer`
control (default `#22292d`) drives the two pipe end caps. Triangles 148 -> 1072 (budget
900 -> 1200).

Best next fixes: `conduit-riser-frame` (one finish for the two bridges; conduit clamps) and
`mast-extension-section` (galvanized sleeve; tabs welded to the tube).
