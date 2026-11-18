# Two-ram baler power-pack motor material review — 2026-11-13

- Audit ledger: [five recycling-facility previews plus the fixed asset](preview-ledger.md).
- Source snapshots: `source/before/` and `source/after/`.
- Rendered previews: `previews/before/` and `previews/after/`; sampled previews in `samples/`.
- Local demonstration: [17-second review MP4](two-ram-baler-motor-material-review.mp4), built by `build-demo.sh`; inspected frames in `video-review/`.
- Verification logs: `verification/`.

## Change

The two power-pack electric motors (`motor-0`, `motor-1`) used the `hydraulics`
control, labelled "Hydraulic cylinders (steel)". The preview showed them as two
more bright rams on the cylinder housing. A change to the cylinder colour also
recoloured the motors. They now use a new `motorPaint` control (default
`#44515a`, painted cast frame), set in all four presets. The main and ejection
cylinders keep `hydraulics`. Geometry, 1,866 triangles and the envelope do not change.

## Verification

- Focused GLB regression `tests/integration/catalog/twoRamBalerMotorMaterials.test.ts`: fails on the old source (`motor-0: expected [] to include 'motor-0'`), passes on the new source.
- ESLint (`catalog/kits/recycling-facility/` and the new test): clean; [log](verification/eslint.log).
- Structural gate: recycling-facility 153/153; catalog 2,400/2,402. The two outliers (`standard-components/beam-coupling`, `standard-components/retaining-ring`) are inherited and not touched here. This gate does not prove semantic realism.
- Catalog integration suite `tests/integration/catalog/`: **62 files / 107 tests passed**, including the index-freshness check; [summary](verification/catalog-integration.log).
- Index rebuilt with `scripts/buildAssetCatalog.ts`; only the `two-ram-baler` row changed (source SHA, description, `motorPaint` param, presets, palette zone).

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts two-ram-baler
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/recycling-facility/
npx vitest run tests/integration/catalog/twoRamBalerMotorMaterials.test.ts
npx vitest run tests/integration/catalog/
(cd artifacts/catalog-demos/recycling-two-ram-baler-motor-material-review-20261113 && ./build-demo.sh)
```

## Evidence boundary

The MP4 and previews show a local software render and local tests only. The branch
is not deployed. This prop establishes no baler performance or equipment acceptance.
