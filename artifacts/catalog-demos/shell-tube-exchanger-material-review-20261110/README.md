# Shell-and-tube exchanger material correction — 2026-11-10

**Demo:** [local before/after MP4](shell-and-tube-exchanger-material-review.mp4) · [poster](poster.png) · [before preview](before/shell-and-tube-exchanger.png) · [after preview](after/shell-and-tube-exchanger.png) · [stainless preset](variants/stainless.png)

## Finding and change

The default `safetyPaint` palette was assigned to the visible tube sheets, process nozzles, saddles and shell band. The render made these metal components appear brass or safety-yellow coated, although they are the exchanger's exposed metalwork. The asset now exposes separate `steel` and `hardware` color controls. Both presets keep those parts metallic: `weathered` and `stainless`.

The comparison uses official product pages only to check generic industrial material semantics: API Heat Transfer lists carbon steel or 304 stainless steel shell options for its Basco U-tube family, and Alfa Laval describes metallurgy as a condition-specific selection. No vendor geometry or dimensions were copied: [API Heat Transfer](https://www.apiheattransfer.com/product/u-tube/) · [Alfa Laval](https://www.alfalaval.com/products/heat-transfer/tubular-heat-exchangers/process-shell-and-tube-heat-exchangers/process-shell-and-tube-heat-exchangers/). A dated comparison is retained privately in `kernelCAD-private`.

## Evidence and verification

- The [five-preview ledger and contact sheet](../water-filter-vessel-semantic-review-20261110/preview-review.md) document the full industrial semantic review; this asset was the one material mismatch selected for correction.
- The [regression test](../../../tests/integration/catalog/shellAndTubeExchangerMaterials.test.ts) checks the exported GLB's material palette and confirms the former ochre default is absent.
- All **60 industrial-plant** previews were re-rendered. `catalog/index.json` was regenerated and checked against all **2,402/2,402 source hashes** and every indexed preview path.
- Structural quality is **60/60 (100%)** for industrial-plant and **2,402/2,402 (100%)** catalog-wide; that gate does not prove realism.
- This local software render does not claim vendor accuracy, physical acceptance, or deployed behavior. The branch is not deployed.

## Reproduce

From the repository root:

```sh
python3 artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/verify_asset_index.py
python3 scripts/checkCatalogQuality.py --kit industrial-plant
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/shellAndTubeExchangerMaterials.test.ts
npx vitest run tests/integration/catalog/shellAndTubeExchangerMaterials.test.ts
npm run catalog:pages
python3 artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/verify_local_page.py
python3 artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/capture_demo.py
python3 artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/inspect_video.py
```

`demo-settings.json`, render and check outputs, the source snapshots, and `video-review/inspection.json` retain invocation and verification evidence.
