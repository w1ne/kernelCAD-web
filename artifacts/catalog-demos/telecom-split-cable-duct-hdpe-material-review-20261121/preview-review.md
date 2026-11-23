# Five-preview audit ledger: telecom infrastructure, 2026-11-21

Audit base: `feat/catalog-2000` at `727f81bcd`.
Selection: five telecom cable-route and mounting assets not in any audit ledger
(`split-cable-duct`, `roof-penetration-seal`, `fiber-coil-reel`, `weatherproof-junction-box`,
`parapet-mast-clamp`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `split-cable-duct` | Reads as two stacked teal slabs with a grey strip on top, not a duct. | **Fixed this round.** All four body parts (`base-a`, `base-b`, `lid-a`, `lid-b`) used the `powderCoat` steel control, with a galvanized `center-join` strip. A telecom split duct is an HDPE conduit split lengthwise so it can close around cables that are already in place; it is not painted steel. The model was also solid: no bore and no cables. | Fixed with the material: the lids floated 5 mm above the bases; the description's "channel shells" had no channel. |
| `roof-penetration-seal` | Reads as a teal plate with a black boot, a steel washer and a grey pipe with a teal cap. | Plausible: coated steel flashing plate and weather cap, elastomer boot, stainless collar, galvanized conduit. | The boot is a straight 290 mm cylinder, not a tapered boot; the stainless `collar` (r 115 mm) is a flat ring, not a clamp on the 104 mm conduit; the `cap` closes the conduit, so no cable can exit (a weatherhead or gooseneck would). |
| `fiber-coil-reel` | Reads as a teal two-flange reel with a dark cable coil and a stainless hub. | Plausible: powder-coated flanges, galvanized spokes, stainless hub, polymer cable jacket. | The galvanized `spoke-*` are not visible in the preview; the coil is one solid annulus. |
| `weatherproof-junction-box` | Reads as a teal box on three grey legs. | Plausible: powder-coated steel body and lid, galvanized entries, stainless screws. | The `lid` (z 175-220 mm) is a band below the body top (z 225 mm); the four lid screws (z 200-218 mm) are hidden inside the lid; the three `entry-*` glands stand 75 mm under the box like legs (best next geometry fix). |
| `parapet-mast-clamp` | Reads as a grey pipe between two teal plates on a teal base. | Plausible: powder-coated base and jaws, galvanized mast socket, stainless cross-bolt, elastomer pads. | No parapet wall between the jaws, so nothing is clamped; the cross-bolt passes through the mast socket; the pads stick out 30 mm past the base ends. |

Decision: fix `split-cable-duct`. The `base-*`, `lid-*` and `center-join` parts are removed. A new
`duct` control (default HDPE orange `#e07a1f`) drives two extruded half shells (`shell-upper`,
`shell-lower`): 150 mm outside diameter, 8 mm wall, 500 mm long, with 24 mm side flanges that meet
on the split seam. Six stainless `bolt-*` heads and six `nut-*` hold the flanges. A new `polymer`
control drives three black `cable-*` that lie in the bore and leave both ends. The `powderCoat`
and `galvanizedSteel` controls are removed. Triangles 60 -> 892 (budget 900 -> 1200).

Best next fixes: `weatherproof-junction-box` (lid on top of the body, visible screws, glands on a
side wall) and `roof-penetration-seal` (tapered boot, clamp on the conduit, open weatherhead).
