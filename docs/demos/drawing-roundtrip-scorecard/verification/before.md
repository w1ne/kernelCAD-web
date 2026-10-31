# Drawing round-trip scorecard

**Result:** 0/27 parts rebuilt to the right volume and size from their drawing alone (26 wrong, 0 refused, 1 errors).

Each reference part in `assets/reference-parts/scorecard.json` is drawn by kernelCAD's `pdf-drawing` exporter (automatic dimensions, A3, third-angle). `drawing_to_cad` reads only that PDF and emits a script. The script is rebuilt and measured against the analytic values. A part passes when its volume is within ±0.1% (a mass check) and every bbox extent is within 0.05 mm.

**Scope:** these are clean vector sheets drawn by kernelCAD itself, so the score is an upper bound on what the reader does with third-party drawings. Scanned or raster drawings are out of scope for this reader (see the last section).

Regenerate with `npm run drawing-roundtrip:scorecard`.

| Part | Rebuilt as | Δ volume | Max Δ extent | Result | Detail |
| --- | --- | ---: | ---: | --- | --- |
| Rectangular block | extrude (0 holes) | -76.255% | 15.300 mm | WRONG |  |
| Centered block | extrude (0 holes) | -46.838% | 7.000 mm | WRONG |  |
| Cylinder | extrude (0 holes) | -49.437% | 23.000 mm | WRONG |  |
| Sphere | extrude (0 holes) | -86.845% | 21.700 mm | WRONG |  |
| Revolved torus | extrude (0 holes) | +210.962% | 4.807 mm | WRONG |  |
| Revolved cone frustum | extrude (0 holes) | -76.089% | 17.130 mm | WRONG |  |
| Plate with through-hole | extrude (2 holes) | -34.663% | 5.000 mm | WRONG |  |
| Plate with blind hole | extrude (2 holes) | -63.050% | 7.500 mm | WRONG |  |
| Plate with counterbored through-hole | extrude (1 holes) | -55.690% | 5.500 mm | WRONG |  |
| Plate with through-slot | extrude (0 holes) | -35.662% | 7.000 mm | WRONG |  |
| Annular cylinder boolean cut | extrude (0 holes) | -85.151% | 17.000 mm | WRONG |  |
| Open-top shell | extrude (0 holes) | -41.497% | 24.300 mm | WRONG |  |
| L-bracket boolean union | extrude (0 holes) | -76.176% | 15.500 mm | WRONG |  |
| Boolean intersection | extrude (0 holes) | -72.156% | 7.300 mm | WRONG |  |
| All-edge filleted box | extrude (0 holes) | -75.743% | 15.300 mm | WRONG |  |
| Top-edge chamfer | extrude (0 holes) | -75.986% | 15.300 mm | WRONG |  |
| Plate with four patterned holes | extrude (0 holes) | -81.723% | 22.500 mm | WRONG |  |
| Circular pattern of pins | revolve (0 holes) | -83.333% | 38.000 mm | WRONG |  |
| Linear pattern of pins | extrude (0 holes) | -68.169% | 28.000 mm | WRONG |  |
| Grid pattern of pins | extrude (0 holes) | -78.779% | 18.000 mm | WRONG |  |
| Mirrored block pair | — | — | — | ERROR | drawing export: union.disconnected: union() result is 2 separate solids, not one connected body. Main body: 'block' (box_1), 'block.mirror('yz')' (mirror_1) [so |
| Square profile sweep | extrude (0 holes) | +14.276% | 9.300 mm | WRONG |  |
| Circular profile sweep | extrude (0 holes) | -55.481% | 11.500 mm | WRONG |  |
| Circular-section loft | extrude (0 holes) | -74.020% | 17.700 mm | WRONG |  |
| Square-section loft | extrude (0 holes) | +25.143% | 3.500 mm | WRONG |  |
| Stepped shaft revolve | extrude (0 holes) | -73.938% | 13.500 mm | WRONG |  |
| Rotated box | extrude (0 holes) | -72.660% | 23.571 mm | WRONG |  |

## Raster drawings

`tests/fixtures/drawing-pdf/raster-only.pdf` (an image-only page): refused — reference.drawing.raster-only: raster-only.pdf page 1 is a raster image (1 image(s) covering 100% of the page, 0 vector stroke(s)); there is no linework or dime
