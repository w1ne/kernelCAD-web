# Data-center infrastructure: hot-aisle containment door glazing material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/hot-aisle-containment-door.png) · [after preview](after/hot-aisle-containment-door.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/hot-aisle-containment-door` now has glazed door leaves. Before, the
description said "clear-panel frame", but `door-panel-left` and `door-panel-right`
(500 x 35 x 1920 mm each) were solid blocks on the `steel` control, so the preview showed two
opaque dark slabs. Containment doors are glazed so staff can see into the aisle. Each leaf is
now two 50 mm steel stiles, a 60 mm top rail and a 90 mm bottom rail around an 8 mm
`door-glazing-left/right` panel (400 x 1770 mm) on a new `glazing` control (`#9fd3dc`,
"Clear polycarbonate glazing"). Both presets (`facilityStandard`, `highVisibility`) set all
three colour controls (`steel`, `glazing`, `polymer`). The description now says "two
painted-steel door frames with clear polycarbonate panels". Triangles: 116 -> 212 (budget 2,200).

## Evidence

- `tests/integration/catalog/hotAisleDoorGlazingMaterial.test.ts` fails on the original source
  (`expected [ 'polymer', 'steel' ] to deeply equal [ 'glazing', 'polymer', 'steel' ]`) and passes
  after the fix. It checks the exported GLB: jambs, header, stiles and rails in the steel colour,
  both glazing panels in the glazing colour, the handle in the polymer colour. Logs:
  `verification/test-before.txt`, `verification/test-after.txt`.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts hot-aisle-containment-door`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 195 files, 287 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. The preview renderer has no
transparency, so the glazing reads as a light tinted panel, not see-through. Noted, not fixed:
the pull handle sits in the gap between the leaves and touches neither.
