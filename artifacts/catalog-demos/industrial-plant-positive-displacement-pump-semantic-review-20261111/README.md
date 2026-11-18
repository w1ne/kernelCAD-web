# Industrial positive-displacement pump semantic review

**Date:** 2026-11-11
**Asset:** `industrial-plant/positive-displacement-pump`
**Demo:** [12-second local before/after MP4](demo.mp4) · [before preview](previews/before/positive-displacement-pump.png) · [after preview](previews/after/positive-displacement-pump.png)

The before image read as a motor attached to a plain block. The revised low-poly scene prop shows the pump head separately with a bolted circular cover, suction and discharge flanges, and a pressure-relief return feature. The motor, pump steel and safety finish have separate material controls; `weathered` and `highVisibility` presets remain available. The default model is **1,508 triangles / 1,800 budget**. The asset ID and catalog count are unchanged.

The [five-preview ledger](preview-review.md) records the selection and disposition of every audited image. A plate-heat-exchanger discrepancy found while screening candidates is retained there for a separate round.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts positive-displacement-pump
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/positiveDisplacementPumpFidelity.test.ts
npx eslint catalog/kits/industrial-plant/positive-displacement-pump.kcad.ts tests/integration/catalog/positiveDisplacementPumpFidelity.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
bash artifacts/catalog-demos/industrial-plant-positive-displacement-pump-semantic-review-20261111/build-demo.sh
```

The [GLB regression](../../../tests/integration/catalog/positiveDisplacementPumpFidelity.test.ts) checks the separate drive and pump components, service-cover proportions and fasteners, both raised ports and flanges, relief-return features, material controls, presets, floor contact and triangle budget.

The [demo settings](demo-settings.json) and [capture script](build-demo.sh) retain the exact MP4 layout, encoding and invocation. The [video review](video-review/video-inspection.json) records the inspected H.264 output and decoded frames. [Verification logs](verification/) include the targeted test, lint, renderer, regenerated index, catalog integration, quality gate, page generation and hash checks.

## Verification

- Re-rendered all **60 industrial-plant previews** and regenerated the catalog index from source. The indexed pump SHA-256 matches its source; its copied local detail-page preview hash matches the checked-in PNG.
- ESLint passed for the full industrial-plant kit and the new regression.
- Catalog integration passed: **19 files / 34 tests**, including the fresh all-assets index check.
- Industrial-plant mechanical quality passes **60/60 (100%)**. The catalog-wide mechanical scan is **2,401/2,402 (99.96%)**; the sole remaining failure is unchanged `standard-components/beam-coupling`, outside this review.
- The local static build generated all 2,402 asset pages and the changed detail page exposes the updated material controls and preset. The branch has not been deployed.

## Evidence boundary

The MP4 shows local source previews and replay on this branch. This branch is not deployed; no deployed behavior, pump performance, pressure capability, vendor accuracy or physical acceptance is claimed. The official product and workflow comparison is dated and retained privately in `kernelCAD-private`; this handoff describes only native kernelCAD behavior.
