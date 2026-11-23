# Six-preview audit ledger: telecom infrastructure, 2026-11-21

Audit base: `feat/catalog-2000` at `ffcc453bf`.
Selection: `fiber-drop-terminal` (named best next material fix in the pedestal-fiber-terminal ledger)
and the last five telecom assets not in any audit ledger (`fiber-route-marker`, `rf-hazard-marker`,
`site-id-placard`, `telecom-cable-marker-post`, `telecom-warning-sign`). No open issue or PR targets
these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `fiber-drop-terminal` | Reads as a teal box on the ground with a wide hood and six black ports on the front. | **Fixed this round.** Case, hood and face were `powderCoat` steel; a fiber drop terminal (multiport service terminal) is a moulded polymer housing. The `polymer` control drove only the ports. | Fixed with the material: no pole or strand mount, no cable entry, the hood was a slab wider than the case on all sides. |
| `fiber-route-marker` | Reads as a grey post on a square slab with a teal cap and a teal strip on the front. | Weak: post and footing are `galvanizedSteel`; buried-fiber route markers are usually polymer or fibreglass posts in a warning colour. | Cap is a 210 mm slab on a 95 mm post; footing is a slab on the ground, not buried; no legend. |
| `rf-hazard-marker` | Reads as a teal sign on one grey post with a grey plate on its face. | Weak: the `center` plate is `galvanizedSteel` on a painted sign; an RF exposure sign is a printed plate (yellow and black symbol), not bare steel. | No RF symbol or legend; the "diamond-like" plate in the description is a rectangle. |
| `site-id-placard` | Reads as a teal plate on two grey posts with two stainless bolts at the top corners. | Plausible: painted plate, galvanized posts, stainless bolts. | Inset is the same colour as the plate, so no text area shows; the description names bolted feet, the model has none; only two bolts. |
| `telecom-cable-marker-post` | Reads as a grey post with a teal cap, a grey tag and a grey band on a slab. | Weak: post, tag and band are all `galvanizedSteel`; cable marker posts are polymer, and the tag is a printed label. | The description names a ribbed cap; the cap is a plain block. |
| `telecom-warning-sign` | Reads as a teal panel on two grey posts with teal foot plates. | Weak: foot plates are `powderCoat` while the posts are `galvanizedSteel`. | The panel floats 20 mm above the post tops (posts end at z 910, panel starts at 930); no legend. |

Decision: fix `fiber-drop-terminal`. The `powderCoat` control is removed. A new `housing` control
(default `#3d4347`) drives the chamfered 400 x 150 x 190 mm moulded housing and the six port bosses.
`polymer` (default `#15191c`) now drives the six dust caps, the lid seam, the tether gland and the
tether stub cable. New controls: `stainlessSteel` (default `#d2dbdc`) for the mounting bracket, two
band straps and four lid screws, and `poleWood` (default `#7a5b3e`) for a 220 mm pole section.
Triangles 300 -> 976 (budget 900 -> 1100).

Best next fixes: `telecom-warning-sign` (panel on the posts, one finish for posts and feet) and
`rf-hazard-marker` (printed sign plate, not bare steel). All telecom-infrastructure assets are now in
an audit ledger.
