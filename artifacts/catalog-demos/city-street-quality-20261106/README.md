# City-street catalog quality promotion — 2026-11-06

**Demo:** [city-street-quality-demo.mp4](city-street-quality-demo.mp4) · [poster](poster.png)

The video shows local `.kcad.ts` source, exact named preset exports, rendered
catalog previews, and local checks. It does not show a live Studio session or
deployed behavior.

## Round result

- Promoted the four remaining failing assets in the existing 65-asset
  `city-street` kit: `crosswalk-tile`, `road-tile`, `sidewalk-tile`, and
  `playground-slide`. No IDs or kits were added.
- Made **13 material-named color controls** explicit at their `.color()`
  assignments: asphalt, stripe and edge paint, kerb concrete, paving stone,
  accent brick, galvanized steel, HDPE, stainless steel, and roof polyethylene.
  The changes also make the quality audit recognize the real material
  separation already present in the helper-based sources.
- Kept **8 named appearance presets** across those assets (two per asset), with
  their names and palettes aligned to the updated material controls. This is
  **0 net-new preset entries**; each asset already had two presets.
- Documented the objects and their defining forms in source: flush zebra and
  lane markings, a raised kerb with a paving grid, and a playground tower with
  ladder, guarded deck, roof and U-trough chute. Existing geometry stayed within
  its triangle budgets: 228, 132, 240 and 256 triangles respectively.
- Re-rendered **65/65 city-street previews** and regenerated `catalog/index.json`.
  The [verification record](verification.json) checks the source SHA-256,
  indexed preview path, preview file, and triangle budget for each kit asset.
- The kit quality gate now passes **65/65**, up from 61/65. Across the
  catalog, quality moved from **2,382/2,390 (99.7%; 8 thin)** to
  **2,386/2,390 (99.8%; 4 thin)**. The remaining failures are three assets in
  `nature` and one in `props`.
- `npx eslint catalog/kits/city-street/` passed. Catalog integration passed
  **4 files, 15 tests**. The local static-page builder generated 2,390 pages;
  the four promoted asset pages were checked for their material labels, presets
  and preview paths.
- The MP4 was probed and visually inspected. It shows the material dispatch in
  source, default and preset renders for all four objects, and the local audit
  results.

The current kernelCAD homepage and the existing local catalog source were
reviewed before editing. The homepage already links to the asset library, so
this round improves existing assets and does not introduce another library
workflow. This feature branch is not deployed; no post-deployment page check is
claimed. Local page evidence is recorded in [local-page-check.json](local-page-check.json)
and was generated under `/tmp/kernelcad-city-street-pages-20261106`.

## Reproduce the round

From the promotion base `ef74563fb`:

```sh
python3 artifacts/catalog-demos/city-street-quality-20261106/rerender_city_street.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/city-street/
npx vitest run tests/integration/catalog/
python3 scripts/checkCatalogQuality.py --kit city-street
python3 scripts/checkCatalogQuality.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-city-street-pages-20261106
npx tsx artifacts/catalog-demos/city-street-quality-20261106/render_city_street_presets.ts
python3 artifacts/catalog-demos/city-street-quality-20261106/record_city_street_verification.py
python3 artifacts/catalog-demos/city-street-quality-20261106/capture_city_street_demo.py
python3 artifacts/catalog-demos/city-street-quality-20261106/inspect_city_street_video.py
```

[`render_city_street_presets.ts`](render_city_street_presets.ts) exports the
exact `fresh`, `yellowCentre`, `brick`, and `park` presets through the local
kernelCAD low-poly exporter and catalog rasterizer. [`demo-settings.json`](demo-settings.json)
records video settings and every invocation. [`verification.json`](verification.json)
records hashes, indexed previews, triangle budgets, quality counts and local
page evidence.

## Evidence

- [`preview-render-output.txt`](preview-render-output.txt): all 65 kit preview
  render results.
- [`catalog-build-output.txt`](catalog-build-output.txt): generated index build
  result.
- [`eslint-output.txt`](eslint-output.txt),
  [`integration-output.txt`](integration-output.txt),
  [`check-results.json`](check-results.json),
  [`city-street-quality-output.txt`](city-street-quality-output.txt), and
  [`catalog-quality-output.txt`](catalog-quality-output.txt): local checks.
- [`local-page-check.json`](local-page-check.json): generated page count and
  four reviewed pages.
- [`preset-variants/`](preset-variants/), [`frames/`](frames/),
  [`video-inspection.json`](video-inspection.json), and
  [`video-review/`](video-review/): exact preset exports, source frames,
  decoded MP4 frames and visual inspection notes.

## Limits

These remain stylized low-poly visualization assets. Catalog, lint and local
page checks do not establish traffic compliance, product specifications,
manufacturing suitability, deployed behavior or physical acceptance.
