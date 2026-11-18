# Sanitary filter skid housing material review — 2026-11-13

- Audit ledger: [five unreviewed beverage-bottling machines](preview-ledger.md).
- Source snapshots: `source/before/` and `source/after/`.
- Rendered previews: `previews/before/` and `previews/after/`; pre-change sampled previews in `samples/`.
- Local demonstration: [16-second review MP4](sanitary-filter-housing-material-review.mp4), built by `build-demo.sh` from slides made by `make-slides.py`; inspected frames in `video-review/`.
- Verification logs: `verification/`.

## Change

`sanitary-filter-skid` paints parts through a shared `finishPart` regex. The regex
sent any name containing `housing` to `powderCoat`, so `filter-housing-0` and
`filter-housing-1` rendered teal under stainless lids. The asset comment and
description say "twin stainless cartridge housings". `housing` is removed from this
file's paint regex; no other part in the file contains that token. Both housings now
use `stainlessSteel`. The skid and four feet keep `powderCoat`. Controls, presets,
geometry and 360 triangles do not change.

## Verification

- Focused GLB regression `tests/integration/catalog/sanitaryFilterHousingMaterials.test.ts`: fails on the old source (`filter-housing-0: expected [...] to include 'filter-housing-0'`), passes on the new source; [before](verification/focused-test-before.log), [after](verification/focused-test-after.log).
- ESLint (`catalog/kits/beverage-bottling-line/` and the new test): clean; [log](verification/eslint.log).
- Structural gate `scripts/checkCatalogQuality.py --kit beverage-bottling-line`: 50/50. This gate does not prove semantic realism.
- Catalog integration suite `tests/integration/catalog/`: **64 files / 109 tests passed** in 729 s, including the index-freshness check; [summary](verification/catalog-integration.log).
- Index rebuilt with `scripts/buildAssetCatalog.ts`; only the `sanitary-filter-skid` row changed (source SHA and palette-zone part lists).

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts sanitary-filter-skid
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/beverage-bottling-line/
npx vitest run tests/integration/catalog/sanitaryFilterHousingMaterials.test.ts
npx vitest run tests/integration/catalog/
(cd artifacts/catalog-demos/beverage-sanitary-filter-housing-material-review-20261113 && ./build-demo.sh)
```

## Evidence boundary

The MP4 and previews show a local software render and local tests only. The branch
is not deployed. This prop establishes no pressure rating, sanitary certification or
filter performance.
