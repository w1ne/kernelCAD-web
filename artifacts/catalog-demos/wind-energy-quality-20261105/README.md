# Wind-energy catalog quality round

**Demo:** [wind-energy-quality-demo.mp4](wind-energy-quality-demo.mp4) · [poster](poster.png)

The video shows the promoted source controls, two rendered preset variants, eight representative generated previews, and the local verification results. It demonstrates the catalog workflow and authored stylized scene props. It makes no claim about turbine performance, structural capacity, electrical safety, manufacturing suitability, deployed behavior, or physical acceptance.

## Round result

- Promoted all **50** existing wind-energy assets; no assets or kits were added.
- Added **117** material-named color control usages (2–4 on each asset) and **50** preset blocks with two named appearance variants apiece.
- Regenerated all **50** previews and rebuilt `catalog/index.json`; all 50 source hashes and preview paths match the index.
- All 50 wind-energy assets pass `scripts/checkCatalogQuality.py --kit wind-energy`; ESLint and the catalog integration suite pass.
- Full catalog quality is **1,604 / 2,390 passing (67%)**, with 786 thin assets remaining.
- Generated and checked 2,390 local catalog pages. The feature branch is not deployed.

## Reproduce the demo

From the repository root, after building the asset catalog and previews:

```sh
npx tsx artifacts/catalog-demos/wind-energy-quality-20261105/render_preset_variants.ts
python3 artifacts/catalog-demos/wind-energy-quality-20261105/capture_wind_quality_demo.py
```

`render_preset_variants.ts` reads the actual `weathered` and `highVisibility` values from `horizontal-axis-wind-turbine.kcad.ts`, exports each with `runAndExport` to GLB, then rasterizes those meshes. [`preset-variants.json`](preset-variants.json) retains the source SHA-256, exact values, exporter settings, and render locations. [`demo-settings.json`](demo-settings.json) retains the video command and encoding settings. The authoring source and generated frames are included alongside the MP4.

## Verification evidence

- [`verification.json`](verification.json): 50 source hashes, preview paths, material controls, presets, triangle counts, and local page checks.
- [`checks.json`](checks.json): exact check commands and outcomes.
- [`preview-render-invocation.txt`](preview-render-invocation.txt) and [`vertical-axis-preview-invocation.txt`](vertical-axis-preview-invocation.txt): full-kit render command and the final targeted silhouette rerender. [`catalog-build-output.txt`](catalog-build-output.txt) records the generated index rebuild.
- [`catalog-integration-output.txt`](catalog-integration-output.txt): catalog integration test output.
- [`eslint-output.txt`](eslint-output.txt) and [`catalog-quality-output.txt`](catalog-quality-output.txt): kit lint and catalog quality audit output.
- [`video-inspection.json`](video-inspection.json) and [`video-review/`](video-review/): decoded frame review evidence.

The checks cover local source, generated-index consistency, preview rendering, lint, integration tests, and local static pages. Deployed site behavior, hardware behavior, and engineering or manufacturing acceptance were not tested.
