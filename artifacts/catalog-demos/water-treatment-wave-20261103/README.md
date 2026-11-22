# Water Treatment catalog wave demo

[Watch the 30-second local workflow demo](water-treatment-kit.mp4)

The MP4 shows a real `circular-clarifier.kcad.ts` source and rendered preview, followed by the 50 generated treatment-plant previews in seven contact sheets. Its final frame reports the source/index/mesh audit, lint, integration suite, and locally generated pages. Captions separate local validation from deployed behavior and engineering or physical acceptance.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/water-treatment-wave-20261103/generate_water_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run src/kernel/backends/occt/occtResetPoison.test.ts
set -o pipefail && npx vitest run tests/integration/catalog/ 2>&1 | tee artifacts/catalog-demos/water-treatment-wave-20261103/catalog-test-output.txt
python3 artifacts/catalog-demos/water-treatment-wave-20261103/record_water_checks.py
python3 artifacts/catalog-demos/water-treatment-wave-20261103/write_water_readme.py
python3 artifacts/catalog-demos/water-treatment-wave-20261103/render_water_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-water-pages
python3 artifacts/catalog-demos/water-treatment-wave-20261103/verify_water_pages.py /tmp/kernelcad-water-pages
python3 artifacts/catalog-demos/water-treatment-wave-20261103/capture_water_demo.py
python3 artifacts/catalog-demos/water-treatment-wave-20261103/inspect_water_video.py
```

`catalog-build-output.txt`, `occt-reset-test-output.txt`, `asset-check-results.json`, `catalog-tests.json`, `catalog-eslint.json`, and `catalog-pages-check.json` retain the checks. `settings.json` records capture settings; `video-review/` contains decoded frames, a contact sheet, and MP4 metadata. The scripts retain generation, preview, audit, page verification, capture, and inspection invocations.

## Website status and limits

The local static page builder is checked separately from deployed behavior. On 2026-11-03 the public homepage and `/catalog/` route were checked; the catalog route returned HTTP 404. This branch was not deployed.

All assets are original CC0 1.0 kernelCAD geometry. These are stylized scene props and make no claims about flow rates, water-treatment performance, chemical dosing accuracy, pressure capacity, regulatory compliance, installation suitability, or physical acceptance.
