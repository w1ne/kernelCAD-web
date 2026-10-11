# Twisted hexagonal vase

> Hollow shell ~150 mm tall, tapers 70 mm base → 50 mm mouth, hex cross-section twisting 120°, 2 mm wall, closed bottom.

Nine hexagonal sections are lofted from base to mouth; each one is scaled for the taper and turned for the twist. The vase is hollowed by subtracting a second loft whose flats sit one `wall` further in. That loft starts one `wall` above z = 0, which leaves the closed floor. Look at the faces as the vase turns: they spiral instead of staying flat. The open mouth shows the even 2 mm wall. The 70 mm and 50 mm are across-corner widths. Every dimension (`height`, `baseDia`, `mouthDia`, `twistDeg`, `wall`) is a `param()` that feeds the geometry through ParamRef arithmetic, so a slider change rebuilds the shape. Checked with `kernelcad evaluate` (clean) and the seven-view `kernelcad render --sheet`. Source: [`twisted-hex-vase.kcad.ts`](twisted-hex-vase.kcad.ts).
