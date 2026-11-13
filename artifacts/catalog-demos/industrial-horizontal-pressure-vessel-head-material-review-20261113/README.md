# Horizontal pressure-vessel material review — 2026-11-13

- Audit ledger: [five industrial-plant previews](preview-ledger.md).
- Source snapshots: `source/before/` and `source/after/`.
- Rendered previews: `previews/before/` and `previews/after/`.
- Local demonstration: [18-second review MP4](horizontal-pressure-vessel-material-review.mp4), built by `build-demo.sh` from source and rendered-preview evidence.
- Verification logs: `verification/`.

## Base sync

After the asset-fix commit, `develop` advanced with the retaining-ring fix in [PR #1373](https://github.com/w1ne/kernelCAD-web/pull/1373). The branch sync keeps that upstream source and preview unchanged and regenerates the catalog index. The index audit therefore records two changed rows against the pre-round baseline: the pressure-vessel correction and the inherited retaining-ring fix.

## Change

The rendered pressure-vessel heads and top nozzle necks used the safety-paint color,
although the shell and nozzle flanges used steel. Those four pressure-boundary
parts now use the existing `steel` control. The focused GLB regression verifies the
palette assignment and exported color. The mesh remains 468 triangles under the
1,400-triangle budget; no geometry or dimensions were edited.

## Verification

- Focused GLB regression: **1/1 passed**; [test source](../../../tests/integration/catalog/horizontalPressureVesselMaterials.test.ts) and [log](verification/focused-test.log).
- Industrial-plant ESLint: **passed**; [log](verification/eslint.log).
- Catalog integration tests: **60 files / 102 tests passed** on commit `54848148a`, including the exhaustive source-build, triangle-budget, and index-freshness check; see [run log](verification/catalog-integration.log). The exact-head CI status is tracked on PR #1258.
- Catalog index regenerated: 2,402 assets / 50 kits, zero source SHA mismatches, and zero missing preview files; the pressure-vessel source hash matches and its preview path resolves. The only other changed row is the inherited retaining-ring update from PR #1373. See [audit JSON](verification/index-audit.json) and [recheck script](verification/verify-index.mjs).
- Structural quality: industrial-plant is **60/60 (100%)**; after syncing current `develop`, catalog-wide is **2,400/2,402 (99.92%)**. The two outliers are `standard-components/beam-coupling` and the inherited `standard-components/retaining-ring` from PR #1373; logs before and after the sync are retained in `verification/`.
- The generated before/after previews and the five selected samples are retained in this bundle.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts horizontal-pressure-vessel
npx tsx scripts/buildAssetCatalog.ts
node artifacts/catalog-demos/industrial-horizontal-pressure-vessel-head-material-review-20261113/verification/verify-index.mjs
npx eslint catalog/kits/industrial-plant/
npx vitest run tests/integration/catalog/horizontalPressureVesselMaterials.test.ts
npx vitest run tests/integration/catalog/
bash artifacts/catalog-demos/industrial-horizontal-pressure-vessel-head-material-review-20261113/build-demo.sh
```

The official product comparison is dated and recorded privately at
`kernelCAD-private/catalog-industrial-horizontal-pressure-vessel-material-review-20261113/COMPARISON.md`.

## Evidence boundary

The MP4 shows a local source mapping, software-rendered catalog preview, and local
verification only. The public detail route returned HTTP 403 during this round; the
branch is not deployed. This prop establishes no pressure rating, engineering
suitability, simulation result, deployed behavior, or physical acceptance.
