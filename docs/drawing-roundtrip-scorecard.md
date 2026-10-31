# Drawing round-trip scorecard

**Result:** 15/27 parts rebuilt to the right volume and size from their drawing alone (10 wrong, 1 refused, 1 errors).

Each reference part in `assets/reference-parts/scorecard.json` is drawn by kernelCAD's `pdf-drawing` exporter (automatic dimensions, A3, third-angle). `drawing_to_cad` reads only that PDF and emits a script. The script is rebuilt and measured against the analytic values. A part passes when its volume is within ±0.1% (a mass check) and every bbox extent is within 0.05 mm.

**Scope:** these are clean vector sheets drawn by kernelCAD itself, so the score is an upper bound on what the reader does with third-party drawings. Scanned or raster drawings are out of scope for this reader (see the last section).

Regenerate with `npm run drawing-roundtrip:scorecard`.

| Part | Rebuilt as | Δ volume | Max Δ extent | Result | Detail |
| --- | --- | ---: | ---: | --- | --- |
| Rectangular block | extrude (0 holes) | +0.000% | 0.000 mm | PASS |  |
| Centered block | extrude (0 holes) | +0.000% | 0.000 mm | PASS |  |
| Cylinder | revolve (0 holes) | +0.000% | 0.024 mm | PASS |  |
| Sphere | — | — | — | REFUSED | reference.drawing.view-ambiguous: inline PDF: the sheet could not be interpreted as a multiview drawing (Cannot read properties of undefined (reading 'k')). |
| Revolved torus | revolve (1 holes) | +101.403% | 4.090 mm | WRONG |  |
| Revolved cone frustum | revolve (0 holes) | -0.000% | 0.024 mm | PASS |  |
| Plate with through-hole | extrude (1 holes) | -0.000% | 0.000 mm | PASS |  |
| Plate with blind hole | extrude (1 holes) | -0.004% | 0.000 mm | PASS |  |
| Plate with counterbored through-hole | extrude (1 holes) | +1.466% | 0.000 mm | WRONG |  |
| Plate with through-slot | extrude (0 holes) | +11.940% | 0.000 mm | WRONG |  |
| Annular cylinder boolean cut | revolve (1 holes) | +0.000% | 0.024 mm | PASS |  |
| Open-top shell | extrude (0 holes) | +205.998% | 0.000 mm | WRONG |  |
| L-bracket boolean union | extrude (0 holes) | +0.000% | 0.000 mm | PASS |  |
| Boolean intersection | extrude (0 holes) | -0.000% | 0.000 mm | PASS |  |
| All-edge filleted box | extrude (0 holes) | +2.176% | 0.000 mm | WRONG |  |
| Top-edge chamfer | extrude (0 holes) | +0.629% | 0.000 mm | WRONG |  |
| Plate with four patterned holes | extrude (4 holes) | +0.000% | 0.000 mm | PASS |  |
| Circular pattern of pins | revolve (0 holes) | -83.333% | 38.000 mm | WRONG |  |
| Linear pattern of pins | revolve (0 holes) | -75.000% | 28.000 mm | WRONG |  |
| Grid pattern of pins | revolve (0 holes) | -83.333% | 18.000 mm | WRONG |  |
| Mirrored block pair | — | — | — | ERROR | drawing export: union.disconnected: union() result is 2 separate solids, not one connected body. Main body: 'block' (box_1), 'block.mirror('yz')' (mirror_1) [so |
| Square profile sweep | extrude (0 holes) | -0.000% | 0.000 mm | PASS |  |
| Circular profile sweep | revolve (0 holes) | +0.000% | 0.028 mm | PASS |  |
| Circular-section loft | revolve (0 holes) | +0.000% | 0.024 mm | PASS |  |
| Square-section loft | extrude (0 holes) | +22.449% | 0.000 mm | WRONG |  |
| Stepped shaft revolve | revolve (0 holes) | -0.000% | 0.045 mm | PASS |  |
| Rotated box | extrude (0 holes) | -0.004% | 0.001 mm | PASS |  |

## Raster drawings

`tests/fixtures/drawing-pdf/raster-only.pdf` (an image-only page): refused — reference.drawing.raster-only: raster-only.pdf page 1 is a raster image (1 image(s) covering 100% of the page, 0 vector stroke(s)); there is no linework or dime
