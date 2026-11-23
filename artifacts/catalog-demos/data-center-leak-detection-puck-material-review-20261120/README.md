# Data-center infrastructure: leak-detection floor puck material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/leak-detection-module.png) · [after preview](after/leak-detection-module.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/leak-detection-module` now moulds the floor sensor puck in polymer.
Before, the 180 x 180 x 40 mm `floor-sensor-puck` used the `steel` control (painted enclosure
finish). A water-leak floor puck is a moulded plastic sensor body, so it now uses the existing
`polymer` control, like the `control-face`. The description says "moulded polymer floor sensor
puck". Colour controls (`steel`, `polymer`, `rubber`) and presets (`facilityStandard`,
`highVisibility`) are unchanged. Geometry is unchanged: 168 triangles (budget 2,200).

## Evidence

- `tests/integration/catalog/leakDetectionPuckMaterial.test.ts` fails on the original source
  (`floor-sensor-puck should use the moulded polymer finish`) and passes after the fix. It checks
  the exported GLB: puck and control face in the polymer colour, box and terminals in the steel
  colour, cable in the rubber colour. Logs: `verification/test-before.txt`, `verification/test-after.txt`.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts leak-detection-module`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/`: 283 of 284 tests passed. `catalogFreshShapes` hit its
  300 s timeout while another lane session loaded the machine; run alone it passed in 48 s
  (`verification/catalog-integration.txt`, `verification/catalog-fresh-shapes-rerun.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. Noted, not fixed: the puck is a
square slab, and the sensor cable connects to neither the enclosure nor the puck.
