# Hull panel turnover cradle material review — 11 November 2026

The fifth preview in a sample of five shipyard manufacturing assets showed a
material mismatch: two identical fabricated end frames used different palette
controls. `end-frame-1` now shares the `yardPaint` control with `end-frame-0`.
The central axle, saddle arms, panel stops and stabilizing feet remain on
`structuralSteel`. Geometry, dimensions, parameters, presets, triangle budget,
asset identity and catalog count are unchanged. The default asset remains 420
triangles under its 1,800-triangle budget.

The other four sampled previews—`plate-rolling-machine`,
`plasma-cutting-gantry-head`, `pipe-spool-rotator`, and
`hull-panel-cutting-table`—read plausibly for their names and show coherent
materials in their rendered previews. Open issue searches and open PR file-path
checks found no existing target for any of the five sample assets.

## Verification results

- Focused GLB regression: passed; both frame meshes use the yard-finish color,
  and the 420-triangle count and measured envelope remain unchanged.
- `npx eslint catalog/kits/shipyard/ tests/integration/catalog/hullPanelTurnoverCradleMaterials.test.ts`:
  clean.
- `npx vitest run tests/integration/catalog/`: 23 files / 38 tests passed,
  including catalog-wide source/index freshness.
- Shipyard material-control gate: 70/70 (100%). The separate whole-catalog
  `scripts/checkCatalogQuality.py` run printed 2,401/2,402 (99.96%), flagging
  only the unchanged `standard-components/beam-coupling`; its full output is
  retained in the bundle and this structural scan does not certify semantic
  realism.
- `catalog/index.json` was generated from all catalog sources; the new source
  hash and preview path match. The local static detail page check passed.

## Reproduce and verify

Run from the repository root:

```sh
npx vitest run tests/integration/catalog/hullPanelTurnoverCradleMaterials.test.ts
npx tsx scripts/renderCatalogPreviews.ts hull-panel-turnover-cradle
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/shipyard-hull-panel-turnover-cradle-material-review-20261111/verify_asset_index.py
npx eslint catalog/kits/shipyard/ tests/integration/catalog/hullPanelTurnoverCradleMaterials.test.ts
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-shipyard-turnover-pages
python3 artifacts/catalog-demos/shipyard-hull-panel-turnover-cradle-material-review-20261111/verify_local_page.py /tmp/kernelcad-shipyard-turnover-pages
python3 artifacts/catalog-demos/shipyard-hull-panel-turnover-cradle-material-review-20261111/capture_demo.py
python3 artifacts/catalog-demos/shipyard-hull-panel-turnover-cradle-material-review-20261111/inspect_video.py
```

`demo-settings.json` and the capture/inspection scripts retain the video
settings and invocations. [Open-target searches](open-target-check.json),
[before/after hashes](before-after-hashes.json), and the
[live route check](public-route-check.txt) are retained alongside the before
source and preview, updated source, generated after preview, build/test/lint
logs, index verification, local detail-page check, and inspected video frames.

## Review bundle

- Before source and render: [before/](before/)
- Updated source: [source/hull-panel-turnover-cradle.kcad.ts](source/hull-panel-turnover-cradle.kcad.ts)
- New rendered preview: [after/hull-panel-turnover-cradle.png](after/hull-panel-turnover-cradle.png)
- Regression: [hullPanelTurnoverCradleMaterials.test.ts](../../../tests/integration/catalog/hullPanelTurnoverCradleMaterials.test.ts)
- Five-asset observation ledger: [asset-semantic-2026-11-11.md](../../../docs/quality/asset-semantic-2026-11-11.md)
- Workflow demo: [MP4](shipyard-hull-panel-turnover-cradle-material-review.mp4)
- Decoded review samples and contact sheet: [video-review/](video-review/)

The comparison of official equipment context is recorded privately in
`kernelCAD-private/docs/competitors/2026-11-11-shipyard-turnover-cradle-material-review.md`.
Public review artifacts describe only the native kernelCAD asset and its local
rendered behavior.

The live asset image route served the prior preview at audit time. The live
catalog detail route and `/catalog/` returned HTTP 404; the generated local
detail page was checked separately. This branch is not deployed. The demo shows
local source renders and validation only; no simulation, hardware behavior,
turnover capacity, or equipment acceptance is claimed.
