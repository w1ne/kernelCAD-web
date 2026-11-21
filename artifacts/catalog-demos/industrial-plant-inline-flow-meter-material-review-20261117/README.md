# Inline flow meter flange material review — 2026-11-17

**Preview:** [before](before/inline-flow-meter.png) · [after](after/inline-flow-meter.png) · [five-preview audit ledger](preview-review.md)

**Demo:** [15-second local source-to-preview MP4](industrial-plant-inline-flow-meter-material-review.mp4) · [demo settings and commands](demo-settings.json) · [video inspection](video-review/inspection.json)

**Evidence:** [before source](before/inline-flow-meter.kcad.ts) · [after source](after/inline-flow-meter.kcad.ts) · [baseline regression failure](verification/baseline-focused-test.txt) · [passing focused test log](verification/focused-test-pass.txt) · [verification report](verification.json) · [index verification](index-verification.json) · [saved baseline index row and digest](before/index-row.json) / [manifest](before/index-manifest.json)

## Finding and change

The existing inline flow meter showed both process flange rings in safety yellow while the adjoining pipe run used steel gray. The two flange parts now use the existing `steel` parameter. The asset ID, geometry, dimensions, controls, presets and triangle budget are unchanged; the model remains **212 triangles / 1,400 budget**.

The five-preview ledger also records a separate visible gap between the process-water-silo access ladder and shell for a later geometry review. That finding was not combined with this one material correction.

## Verification

- The focused GLB regression failed on the baseline at the flange color assertion and passed after the two assignments changed.
- ESLint is clean for the full industrial-plant kit and the new regression.
- Industrial-plant quality gate: **60/60 (100.00%)**. Catalog-wide structural gate: **2,398/2,402 (99.83%)**; four unrelated thin assets remain in `standard-components`.
- Catalog integration suite: **129 files / 199 tests passed**.
- Generated index: **2,402 rows**, with only this asset row changed. Its source SHA-256 and preview path match; all other IDs and rows are unchanged.
- Local detail page: **2,402 pages built**; the target page exposes its controls, presets and current preview.
- Public detail page and preview currently return HTTP 200. The live preview hash matches the checked-in baseline and not the local render; the branch is not deployed.

The [public catalog](https://kernelcad.com/catalog/) describes 2,402 free CC0 models across 50 kits. This change edits the existing asset and adds no IDs. The public catalog landing page and local source were checked before editing.

The preceding catalog feature [PR #1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was already merged when this round began. All listed CI checks passed; GitHub has no review events recorded for it.

The MP4 shows a local source review, software render and checks only. No deployment, simulation, flow performance, or hardware acceptance is claimed.
The video is H.264 at 1280×720 for 15 seconds; its sampled frames and visual review are retained in `video-review/`.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/catalog/inlineFlowMeterFlangeMaterial.test.ts
npx tsx scripts/renderCatalogPreviews.ts inline-flow-meter
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/industrial-plant-inline-flow-meter-material-review-20261117/verify_asset_index.py
npx vitest run tests/integration/catalog/
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/inlineFlowMeterFlangeMaterial.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
python3 scripts/checkCatalogQuality.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-inline-flow-meter-pages
python3 artifacts/catalog-demos/industrial-plant-inline-flow-meter-material-review-20261117/verify_local_page.py /tmp/kernelcad-inline-flow-meter-pages
python3 artifacts/catalog-demos/industrial-plant-inline-flow-meter-material-review-20261117/verify_live_site.py
python3 artifacts/catalog-demos/industrial-plant-inline-flow-meter-material-review-20261117/capture_demo.py
python3 artifacts/catalog-demos/industrial-plant-inline-flow-meter-material-review-20261117/inspect_video.py
```

The catalog-wide structural quality command reports the four unrelated `standard-components` thin assets and exits non-zero for those findings.
