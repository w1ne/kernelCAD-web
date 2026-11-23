# Compressed air receiver material review

**Asset:** `industrial-plant/compressed-air-receiver`  
**Demo:** [12-second local before/after MP4](demo.mp4) · [before preview](previews/before/compressed-air-receiver.png) · [after preview](previews/after/compressed-air-receiver.png)

The before preview colored the two vessel heads and three top nozzle necks with the safety-paint control while the main pressure shell used steel. The updated low-poly receiver gives those five integral vessel parts the existing steel control. The safety finish remains on the skid and supports. Its shape, scale, controls, presets and **556-triangle** default render are unchanged; no catalog asset was added or renamed.

The [five-preview audit ledger](preview-review.md) records the selection checks and decisions for all images. Before/after source snapshots, preview hashes, settings and verification logs are retained in this bundle.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts compressed-air-receiver
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/compressedAirReceiverMaterials.test.ts
npx vitest run tests/integration/catalog/
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/compressedAirReceiverMaterials.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-compressed-air-receiver-pages-20261111
bash artifacts/catalog-demos/industrial-plant-compressed-air-receiver-material-review-20261111/build-demo.sh
```

The [GLB material regression](../../../tests/integration/catalog/compressedAirReceiverMaterials.test.ts) checks that both heads and all three nozzle necks are exported with the pressure-shell steel color, and that the model stays within its triangle budget. The [demo settings](demo-settings.json) and [capture script](build-demo.sh) record the exact local render and MP4 invocation. [Verification logs](verification/) retain the render, index generation, tests, lint and quality-gate output; [video-review](video-review/README.md) records the inspected MP4 and decoded frames.

## Verification

- Catalog index regenerated; `sourceSha256` matches the edited `.kcad.ts`, and the indexed preview path points to the re-rendered PNG.
- Focused GLB material regression passed. The catalog integration suite passed **20 files / 35 tests**, including the all-asset source-hash and preview-path comparison.
- ESLint passed for the industrial-plant kit and regression test. The industrial-plant quality gate passes **60/60 (100%)**. The catalog-wide structural scan reports **2,401/2,402 (99.96%)**; the sole unrelated existing failure is `standard-components/beam-coupling`.
- Static page generation wrote all **2,402 asset pages**. The local receiver page shows the updated preview, steel control, and existing presets.
- The [video inspection](video-review/README.md) confirms the 12-second H.264 comparison and captions.

The branch is not deployed, so the public page still serves the old preview. The MP4 shows local software renders only; this work includes no simulation or hardware test, and it does not establish pressure performance, vendor fidelity, manufacturing suitability or physical acceptance.
