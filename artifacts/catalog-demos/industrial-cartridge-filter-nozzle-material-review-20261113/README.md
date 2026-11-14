# Cartridge filter housing nozzle material review — 2026-11-13

- Audit ledger: [five unreviewed industrial previews](preview-ledger.md).
- Source snapshots: `source/before/` and `source/after/`.
- Rendered previews: `previews/before/` and `previews/after/`; sampled previews in `samples/`.
- Local demonstration: [17-second review MP4](cartridge-filter-nozzle-material-review.mp4), built by `build-demo.sh`; inspected frames in `video-review/`.
- Verification logs: `verification/`.

## Change

The lid outlet nozzle (`top-nozzle`) and the side inlet neck (`side-nozzle`) used the
`safetyPaint` control. The inlet flange welded to that neck (`side-flange`) used
`steel`. A nozzle is a welded pressure part and carries the shell material. In the
preview the lid outlet rendered as a yellow stub and the inlet showed a yellow ring
between the shell and a steel flange. Both nozzles now use `steel`. The clamp ring,
stiffener band, legs and ladder rails keep `safetyPaint`. Controls, presets, geometry,
476 triangles and the envelope do not change.

## Verification

- Focused GLB regression `tests/integration/catalog/cartridgeFilterNozzleMaterials.test.ts`: fails on the old source (`top-nozzle: expected [...] to include 'top-nozzle'`), passes on the new source; [before](verification/focused-test-before.log), [after](verification/focused-test-after.log).
- ESLint (`catalog/kits/industrial-plant/` and the new test): clean; [log](verification/eslint.log).
- Structural gate `scripts/checkCatalogQuality.py --kit industrial-plant`: 60/60. This gate does not prove semantic realism.
- Catalog integration suite `tests/integration/catalog/`: **63 files / 108 tests passed** in 834 s, including the index-freshness check; [summary](verification/catalog-integration.log).
- Index rebuilt with `scripts/buildAssetCatalog.ts`; only the `cartridge-filter-housing` row changed (source SHA and palette-zone part lists).

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts cartridge-filter-housing
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/industrial-plant/
npx vitest run tests/integration/catalog/cartridgeFilterNozzleMaterials.test.ts
npx vitest run tests/integration/catalog/
(cd artifacts/catalog-demos/industrial-cartridge-filter-nozzle-material-review-20261113 && ./build-demo.sh)
```

## Evidence boundary

The MP4 and previews show a local software render and local tests only. The branch
is not deployed. This prop establishes no pressure rating or filter performance.
