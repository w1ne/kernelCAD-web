# Five-preview audit ledger: telecom infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `14a5df636`.
Selection: five telecom antenna, enclosure and fibre assets not in any audit ledger
(`gnss-timing-antenna`, `fiber-splice-closure`, `fiber-handhole-cover`,
`surge-protector-enclosure`, `pole-mount-radio-cabinet`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `gnss-timing-antenna` | Reads as a teal steel disc on a dark drum on a pole, like a bollard light, not an antenna. | **Fixed this round.** The topmost `cap` (310 mm diameter) was `powderCoat` steel over the polymer `puck`. A GNSS antenna needs an open view of the sky; metal above the antenna element blocks the satellite signal. Real timing antennas put the element under one polymer radome. | Fixed with the material: the 290 mm puck was oversized for a timing antenna; now a 148 mm revolved dome on a 152 mm base skirt. Still not modelled: no N-type connector, no threaded thread detail. |
| `fiber-splice-closure` | Reads as an upright dark cylinder on two teal feet, with two side stubs. | Plausible: thermoplastic shell, polymer ports, powder-coated feet. | False shape: described as an "inline" closure with tapered ends, but it stands vertical (h 460 mm, r 145 mm) like a dome closure; no tapered ends (best next geometry fix). |
| `fiber-handhole-cover` | Reads as a grade-level lid in a concrete collar with an orange placard and marker post. | Plausible: polymer-concrete lid and rim, concrete collar, galvanized bolts and plate, orange marker. | The marker post footing straddles the collar edge (x 600-780 mm; collar edge at x 650 mm). |
| `surge-protector-enclosure` | Reads as a teal box on a grey conduit with a front cover and an overhanging cap. | Plausible: powder-coated body, lid and cap; galvanized conduit; stainless latch. | The 18 mm front cover stands 16 mm proud of the body face as a flat slab; no hinges; no ground lug. |
| `pole-mount-radio-cabinet` | Reads as a teal cabinet with an overhanging lid and two grey strap stubs at the back. | Plausible: powder-coated cabinet, galvanized straps, stainless lock. | No pole: the `strap-upper/lower` bands are straight bars, not clamps around a pipe; the lid overhangs only 20 mm. |

Decision: fix `gnss-timing-antenna`. The `powderCoat` steel `cap` is removed. A new `radome`
control (default `#eceee9`) drives one revolved polymer dome, which is now the topmost part. A
dark polymer `base-skirt` and threaded `bush` carry it on the galvanized `pole`; a polymer
`cable-gland`, `cable-run` and `cable-drop` add the coax exit. `powderCoat` now drives only the
`base` plate, held by four galvanized `bolt-*` heads. Triangles 176 -> 594.

Best next fixes: `fiber-splice-closure` (lay it horizontal with tapered ends) and
`pole-mount-radio-cabinet` (strap clamps around a real pole).
