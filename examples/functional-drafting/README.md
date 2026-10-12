# Declared functional drawing examples

These are illustrative drafting exercises, not released hardware. Millimetres, Z-up. Fixed constants make the chosen geometry explicit; this example makes no arbitrary-slider binding claim.

The fixture plate reuses the tutorial stock, R6 corners and five bores. It omits the tutorial top chamfer, datums and tolerance frame to keep four functional measurements clear. Required scope: 76 mm X pitch, 46 mm Y pitch, Ø9 mounting holes and Ø30 centre bore. Four mounting centres are (12,12), (88,12), (12,58), (88,58). Stock-width coverage is advisory. The missing variant changes only a dimension declaration, never a cutting operation.

The bearing mount reuses the tutorial 120 x 80 x 12 base, R6 corners, four Ø9 holes with Ø15 x 5 counterbores, and 56 x 36 x 54 pedestal at (32,22,12). The horizontal bore axis is Z=39. Required scope: measured Ø44 seat and Ø32 throat plus a recorded retention decision. There is no bearing model, catalog fit, numeric fit tolerance, approved material, GD&T or physical load acceptance. A removable intent note does not change the seat geometry.

Reproduce from this source checkout with Node 22 and installed dependencies:

```bash
npm run build:cli
npx tsx examples/functional-drafting/run.ts
```

The generator uses the actual runtime SVG/PDF exporters with a fixed 2026-10-12 date and EXAMPLE revision. It validates connectedness, B-rep validity, analytical volume, exact bounding box and detected hole dimensions/positions independently of review status. It checks printable SVG/PDF report parity, incomplete ordinary warnings, refused strict SVG/PDF bytes, and complete strict PDFs. Generated article bundles live in `site/blog/functional-drafting` and `site/blog/drawing-decisions`; each includes source, options, reports, SVG, PDF, PNG, geometry evidence and SHA-256 manifest.

UI demos, bounded Chrome attachment helpers, HTTP receipts, actual PDF blobs, compact frame archives and canonical CAD inspection channels live in `docs/demos/functional-drafting`. They are local evidence. No npm release, deployed behavior, manufacture, fit or load acceptance follows from these checks.
