# Shipyard blast-dust-collector material review — 12 November 2026

The five-preview semantic review found one material mismatch in
`shipyard/blast-dust-collector`: three exposed filter canisters shared the yard
paint used on the collector skid and enclosure. The canisters now use their own
editable `filterMedia` color control. The existing `fresh-coat` and
`weathered-yard` presets set that control separately. Geometry, dimensions,
triangle count, IDs and kit count are unchanged.

The other four samples—`abrasive-blast-pot`, `electrode-storage-oven`,
`hull-block-paint-booth`, and `airless-coating-pump-cart`—showed recognizable
objects and coherent material zoning. See the [dated five-preview ledger](../../../docs/quality/asset-semantic-2026-11-12.md).

## Verification

- Focused exported-GLB regression: 1/1 passed. It checks all three filter
  canisters use the media color, both preset values, palette separation, the
  356-triangle count and 2.05 × 2.13 × 0.995 m envelope.
- `npx eslint catalog/kits/shipyard/ tests/integration/catalog/blastDustCollectorFilterMediaMaterial.test.ts`:
  clean.
- `npx vitest run tests/integration/catalog/`: 41 files / 66 tests passed,
  including the all-catalog source, budget and index freshness checks.
- Shipyard structural quality gate: 70/70 (100%). Global mechanical scan:
  2,401/2,402 (99.96%), with the unchanged
  `standard-components/beam-coupling` as the sole outlier. The mechanical scan
  does not establish semantic realism.
- `catalog/index.json` was regenerated from all catalog sources. It still has
  2,402 assets across 50 kits; only the dust-collector row changed, its source
  hash is fresh, and all referenced previews exist.
- The local catalog build generated 2,402 pages. The dust-collector page exposes
  `yardPaint`, `filterMedia`, `elastomer`, both existing presets and the new
  preview.
- The 15-second MP4 and its sampled frames were visually inspected. The five
  preview sample, baseline/result comparison, material mapping and local checks
  are readable at 1280 × 720.

## Reproduce

Run from the repository root:

```sh
npx vitest run tests/integration/catalog/blastDustCollectorFilterMediaMaterial.test.ts
npx tsx scripts/renderCatalogPreviews.ts blast-dust-collector
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/shipyard-blast-dust-collector-filter-media-material-review-20261112/verify_asset_index.py
npx eslint catalog/kits/shipyard/ tests/integration/catalog/blastDustCollectorFilterMediaMaterial.test.ts
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-blast-dust-collector-pages
python3 artifacts/catalog-demos/shipyard-blast-dust-collector-filter-media-material-review-20261112/verify_local_page.py /tmp/kernelcad-blast-dust-collector-pages
python3 artifacts/catalog-demos/shipyard-blast-dust-collector-filter-media-material-review-20261112/capture_demo.py
python3 artifacts/catalog-demos/shipyard-blast-dust-collector-filter-media-material-review-20261112/inspect_video.py
```

`demo-settings.json`, `capture_demo.py`, `inspect_video.py`, and
`demo-slides.txt` retain the MP4 settings and invocation. The
[open-target checks](open-target-check.json), [before/after hashes](before-after-hashes.json),
[public baseline check](public-route-check.txt), [index verification](index-verification.json),
and logs are retained alongside the source and image snapshots.

## Review artifacts

- Before source and render: [before/](before/)
- Four other sample sources and renders: [sample/](sample/)
- Updated source snapshot: [after/blast-dust-collector.kcad.ts](after/blast-dust-collector.kcad.ts)
- Updated rendered preview: [after/blast-dust-collector.png](after/blast-dust-collector.png)
- Regression test: [blastDustCollectorFilterMediaMaterial.test.ts](../../../tests/integration/catalog/blastDustCollectorFilterMediaMaterial.test.ts)
- Five-preview semantic ledger: [asset-semantic-2026-11-12.md](../../../docs/quality/asset-semantic-2026-11-12.md)
- Local workflow demo: [MP4](shipyard-blast-dust-collector-filter-media-review.mp4)
- Extracted frames and contact sheet: [video-review/](video-review/)

A dated official product-context note is retained privately in `kernelCAD-private`.
This public handoff describes only native kernelCAD source and local rendering
behavior. The live page and preview still match the pre-change baseline because
the branch has not been deployed. No filtration performance, vendor fidelity,
process simulation, or physical acceptance is claimed.
