# Data-center infrastructure: rack KVM console display housing material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/rack-kvm-console.png) · [after preview](after/rack-kvm-console.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/rack-kvm-console` now builds its display housing in painted steel
with a glass screen. Before, `display-housing` (387 x 211 x 300 mm) was one solid block on the
`glass` control, so the preview showed a cyan glass box on the tray. A KVM display housing is a
painted shell; only the LCD screen is glass. The housing now uses the existing `steel` control,
and a new `display-screen` part (350 x 4 x 255 mm, glass) sits on the housing front face, so
the `glass` control stays effective. The description says "a painted-steel display housing and
glass screen". Colour controls (`steel`, `glass`) and presets (`facilityStandard`,
`highVisibility`) are unchanged. Triangles: 248 -> 260 (budget 2,200).

## Evidence

- `tests/integration/catalog/kvmDisplayHousingMaterial.test.ts` fails on the original source
  (`expected 248 to be 260`: the old source has no screen part) and passes after the fix. It
  checks the exported GLB: housing, chassis and keyboard tray in the steel colour, screen in
  the glass colour. Logs: `verification/test-before.txt`, `verification/test-after.txt`.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts rack-kvm-console`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 194 files, 286 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. Noted, not fixed: the housing is
a deep box rather than a thin fold-down lid, the keyboard tray has no keys, and the slide rails
run side to side and stick out past both rack ears.
