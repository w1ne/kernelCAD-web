# Data-center infrastructure: distribution panelboard breaker material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/distribution-panelboard.png) · [after preview](after/distribution-panelboard.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/distribution-panelboard` now moulds its four breaker rows in polymer.
Before, `breaker-row-0..3` (each 460 x 26 x 105 mm) used the `steel` control, the same painted
finish as the door and deadfront, so the breakers did not read in the preview. Moulded-case
circuit breakers have moulded plastic bodies, so the rows now use the existing `polymer`
control, like the `door-latch`. The description says "four rows of moulded polymer breakers".
Colour controls (`steel`, `polymer`, `rubber`) and presets (`facilityStandard`,
`highVisibility`) are unchanged. Geometry is unchanged: 172 triangles (budget 2,200).

## Evidence

- `tests/integration/catalog/panelboardBreakerMaterial.test.ts` fails on the original source
  (`breaker-row-0 should use the moulded polymer finish`) and passes after the fix. It checks
  the exported GLB: breaker rows and latch in the polymer colour, enclosure, door and deadfront
  in the steel colour, cable gland in the rubber colour. Logs: `verification/test-before.txt`,
  `verification/test-after.txt`.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts distribution-panelboard`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 193 files, 285 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. Noted, not fixed: the deadfront
and breakers stand proud of the closed door, and the cable gland is hidden inside the
enclosure base.
