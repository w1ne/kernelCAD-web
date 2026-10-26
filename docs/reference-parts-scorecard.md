# Reference parts scorecard

**Result:** 25/27 reference parts match.
**Gate:** PASS — 25/25 expected-pass parts match; 2 known failures declared, 2 still failing, 0 cleared for promotion; 0 unexpected failures.

This deterministic report compares native `.kcad.ts` models against the values and provenance in `assets/reference-parts/scorecard.json`. The runner uses kernelCAD’s OCCT backend. Per-part timings are printed by the command and omitted here so regeneration stays stable across machines. See the [local validation demo bundle](demos/reference-parts-scorecard/README.md).

Regenerate with `npm run reference-parts:regenerate`; CI runs the same geometry checks and verifies this file is current with `npm run test:reference-parts`.

| Part | Δ volume | Δ surface area | Max Δ bbox | Result |
| --- | ---: | ---: | ---: | --- |
| Rectangular block | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Centered block | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Cylinder | +0.0000% | -0.0000% | 0.024 mm | PASS |
| Sphere | -0.0000% | +0.0000% | 0.024 mm | PASS |
| Revolved torus | -0.0000% | +0.0000% | 0.024 mm | PASS |
| Revolved cone frustum | -0.0000% | +0.0000% | 0.024 mm | PASS |
| Plate with through-hole | -0.0000% | +0.0000% | 0.000 mm | PASS |
| Plate with blind hole | -0.0036% | +0.0060% | 0.000 mm | KNOWN FAIL |
| Plate with counterbored through-hole | -0.0044% | +0.0032% | 0.000 mm | KNOWN FAIL |
| Plate with through-slot | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Annular cylinder boolean cut | +0.0000% | +0.0000% | 0.024 mm | PASS |
| Open-top shell | +0.0000% | +0.0000% | 0.000 mm | PASS |
| L-bracket boolean union | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Boolean intersection | -0.0000% | -0.0000% | 0.000 mm | PASS |
| All-edge filleted box | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Top-edge chamfer | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Plate with four patterned holes | +0.0000% | -0.0000% | 0.000 mm | PASS |
| Circular pattern of pins | +0.0000% | +0.0000% | 0.008 mm | PASS |
| Linear pattern of pins | -0.0000% | +0.0000% | 0.008 mm | PASS |
| Grid pattern of pins | +0.0000% | +0.0000% | 0.008 mm | PASS |
| Mirrored block pair | -0.0000% | -0.0000% | 0.000 mm | PASS |
| Square profile sweep | -0.0000% | +0.0000% | 0.000 mm | PASS |
| Circular profile sweep | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Circular-section loft | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Square-section loft | +0.0000% | +0.0000% | 0.000 mm | PASS |
| Stepped shaft revolve | -0.0000% | +0.0000% | 0.022 mm | PASS |
| Rotated box | -0.0000% | -0.0000% | 0.000 mm | PASS |

## Known failures

- **plate-blind-hole**: still failing. Reason: The OCCT hole cutter extends a blind bore 0.01 mm past its requested depth, adding π·4²·0.01 mm³. The analytic nominal value and tight tolerances remain the target.
- **plate-counterbore**: still failing. Reason: The OCCT counterbore cutter extends 0.01 mm past the requested shoulder depth, removing an extra π·(5²−3²)·0.01 mm³. The analytic nominal value and tight tolerances remain the target.

## Provenance

- **Rectangular block** (analytic): Closed form: V=abc; A=2(ab+bc+ca); corner-anchored bbox follows the declared dimensions.
- **Centered block** (analytic): Closed-form rectangular prism: V=abc; A=2(ab+bc+ca); symmetric bbox from half-dimensions.
- **Cylinder** (analytic): Closed form: V=πr²h; A=2πr²+2πrh; bbox from radius and height.
- **Sphere** (analytic): Closed form: V=4πr³/3; A=4πr²; bbox is the diameter on each axis.
- **Revolved torus** (analytic): Closed-form torus with major radius 20 and tube radius 5: V=2π²Rr²; A=4π²Rr. The profile uses four exact circular arcs; bbox is ±(R+r), ±(R+r), ±r.
- **Revolved cone frustum** (analytic): Closed form with R=10, r=6, h=20: V=πh(R²+Rr+r²)/3; A=π(R²+r²)+π(R+r)√(h²+(R-r)²).
- **Plate with through-hole** (analytic): 60×40×10 plate minus a centered r=5 through-cylinder: V=24000−250π; A=6800+50π; outer bbox unchanged.
- **Plate with blind hole** (analytic): 40×30×12 plate with a nominal r=4, depth=5 blind bore: V=14400−80π; A=4080+40π; bbox unchanged.
- **Plate with counterbored through-hole** (analytic): 40×30×10 plate; r=3 through-bore and r=5 counterbore, depth 4: V=12000−154π; A=3800+58π; bbox unchanged.
- **Plate with through-slot** (analytic): 50×30×10 plate minus a centered 20×8 through-slot: V=15000−1600; A=4600−2·160+56·10.
- **Annular cylinder boolean cut** (analytic): 20 mm high annulus, outer radius 15 and inner radius 5: V=π(R²−r²)h; A=2π(R²−r²)+2π(R+r)h.
- **Open-top shell** (analytic): 50×40×30 box shelled inward 3 mm with its top removed: subtract the 44×34×27 cavity; area sums outer faces, rim, floor, and four inner walls.
- **L-bracket boolean union** (analytic): Union of 40×20×8 and 8×20×20 boxes sharing one 8×20 face: sum volumes; sum areas minus twice the shared face.
- **Boolean intersection** (analytic): The box intersection is a 10×20×20 cuboid: V=abc; A=2(ab+bc+ca); bounds are the overlap intervals.
- **All-edge filleted box** (analytic): For the 40×30×20 box with all edges filleted at r=3, the 34×24×14 core gives the Steiner volume V=34·24·14+2r(34·24+34·14+24·14)+πr²(34+24+14)+(4/3)πr³. Surface area is six flat faces (3256), twelve quarter-cylinder strips (432π), and eight spherical octants (36π): A=3256+468π. Bbox preserves the outer dimensions.
- **Top-edge chamfer** (occt-local): Volume and surface area were measured from this repository's buildModel(..., kernel:'occt') result because the top-edge corner miters are not a simple closed-form bevel. The bbox is analytic. FreeCAD Python was unavailable, so these local OCCT values are a regression baseline rather than independent cross-kernel evidence.
- **Plate with four patterned holes** (analytic): 80×50×10 plate minus four r=3 through-holes: V=40000−360π; A=10600+168π; outer bbox unchanged.
- **Circular pattern of pins** (analytic): Six disjoint r=3, h=8 cylinders on a radius-20 circle: V=6·72π; A=6·66π; bbox from the six centers and cylinder radii.
- **Linear pattern of pins** (analytic): Four disjoint r=3, h=8 cylinders at 10 mm pitch: V=4·72π; A=4·66π; bounds use first and last centers.
- **Grid pattern of pins** (analytic): Six disjoint r=3, h=8 cylinders in a 3×2 grid at 10 mm pitch: V=6·72π; A=6·66π; bounds use the grid endpoints.
- **Mirrored block pair** (analytic): Two separated 10×10×10 blocks mirrored across the YZ plane: doubled volume and area; bounds include both copies.
- **Square profile sweep** (analytic): A 4×4 square swept along a 30 mm straight rail is a prism: V=16·30; A=2·16+4·4·30.
- **Circular profile sweep** (analytic): An exact r=5 circular profile swept along a 20 mm straight rail is a cylinder: V=πr²h; A=2πr²+2πrh.
- **Circular-section loft** (analytic): Exact circular loft from r=10 to r=5 over h=20: V=πh(R²+Rr+r²)/3; A=π(R²+r²)+π(R+r)√(h²+(R−r)²).
- **Square-section loft** (analytic): Ruled loft from 20×20 to 12×12 over h=10: V=h(A₀+A₁+√(A₀A₁))/3; side area is four trapezoids with slant √116.
- **Stepped shaft revolve** (analytic): Revolved stepped profile: r=4 for 10 mm, then r=8 for 10 mm; V=800π; A=368π including end disks and shoulder annulus.
- **Rotated box** (analytic): The box's volume and area are rotation invariant. Its XY bounds are the four corners of a 40×20 rectangle rotated 30° about the origin.
