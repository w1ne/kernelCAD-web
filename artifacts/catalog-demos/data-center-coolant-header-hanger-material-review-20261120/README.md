# Data-center infrastructure: overhead coolant header hanger material review (2026-11-20)

**Demo:** [14-second local review MP4](review-demo.mp4) · [before preview](before/overhead-coolant-header.png) · [after preview](after/overhead-coolant-header.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/overhead-coolant-header` now has two painted-steel hanger brackets.
Before, `hanger-left` (110 x 520 x 420 mm) was on the `polymer` control and its mirror
`hanger-right` was on `steel`, so the preview showed one amber bracket and one blue bracket
under the same 1,900 mm pipe pair. Both brackets carry the same load and are painted steel on
real coolant headers. `hanger-left` now uses `steel`.

`hanger-left` was the only `polymer` part. To keep that control effective, five polymer
`valve-lever-0..4` grips (26 x 110 x 18 mm) are added on the branch drops, the same pattern as
`liquid-cooling-manifold` (86a86a5f3). The branch drops now run z 40-410 mm (were 150-410 mm,
hidden between the two mains), so the drops and levers show below the return main. Both presets
(`facilityStandard`, `highVisibility`) are unchanged and still set both colour controls. The
description now names the valve levers and the steel hangers. Triangles: 392 -> 452 (budget
2,200).

## Evidence

- `tests/integration/catalog/coolantHeaderHangerMaterial.test.ts` fails on the original source
  (`hanger-left should use the painted-steel finish`) and passes after the fix. It checks the
  exported GLB: both hangers, both mains and two drops in the steel colour, all five lever grips
  in the polymer colour. Logs: `verification/test-before.txt`, `verification/test-after.txt`.
  The "before" run used an unchanged copy of the original source in a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts overhead-coolant-header`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 197 files, 289 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. One of the five lever grips
(`valve-lever-0`) is hidden behind the left hanger in the default preview view. Noted, not
fixed: the "hanger brackets" are 420 mm floor blocks, not rods from a ceiling slab; the pipe
clamps sit on top of the supply main, not around it; the branch drops still pass through the
return main.
