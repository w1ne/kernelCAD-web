# Data-center infrastructure: liquid-cooling manifold support material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/liquid-cooling-manifold.png) · [after preview](after/liquid-cooling-manifold.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/liquid-cooling-manifold` now paints both support saddles steel.
Before, the two identical 180 x 500 x 740 mm saddles had different finishes: `support-base-left`
used the `polymer` control (amber) and `support-base-right` used `steel`. The left saddle now uses
`steel`. So that the `polymer` control still changes the model, five new 26 x 110 x 18 mm
`valve-lever-*` grips sit on the branch ball valves and use it; its label is now "Valve lever
grips (engineering polymer)". Both presets (`facilityStandard`, `highVisibility`) are unchanged.
Triangle count goes from 552 to 612 (budget 2,200).

## Evidence

- `tests/integration/catalog/liquidCoolingManifoldSupportMaterial.test.ts` fails on the original
  source (polymer label) and passes after the fix. It checks the exported GLB: both saddles,
  headers and a valve in the steel colour, and all five lever grips in the polymer colour.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts liquid-cooling-manifold`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.

## Limits

Local source and software-rendered preview only. Not deployed. Noted, not fixed: the headers pass
through solid saddles with no pipe clamps; the lever grips are plain bars with no valve stem.
