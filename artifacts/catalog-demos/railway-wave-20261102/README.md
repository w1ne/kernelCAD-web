# Railway catalog wave demo

This bundle retains the source generator, source and mesh checks, generated local page evidence, all preview/contact-sheet materials, capture settings, MP4 source, decoded samples, and video inspection report for the 40-asset `railway` kit.

## Video

`railway-kit.mp4` is a 24-second, 1280×720 H.264 video. It shows the native kernelCAD `.kcad.ts` source and rendered steam-locomotive preview, followed by all 40 default-parameter previews in five groups, then the local catalog audit and page results. The eight source frames, encoder settings, decoded samples and contact sheet are retained here.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/railway-wave-20261102/generate_railway_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/railway-wave-20261102/render_railway_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-railway-pages
python3 artifacts/catalog-demos/railway-wave-20261102/record_railway_checks.py
python3 artifacts/catalog-demos/railway-wave-20261102/verify_railway_pages.py /tmp/kernelcad-railway-pages
python3 artifacts/catalog-demos/railway-wave-20261102/capture_railway_demo.py
python3 artifacts/catalog-demos/railway-wave-20261102/inspect_railway_video.py --manual-inspection-passed
```

`asset-check-results.json` records source hashes, indexed controls, triangle counts and budgets, material count and base origin for all 40 assets. `catalog-tests.json` and `catalog-eslint.json` record the successful checks. `catalog-pages-check.json` verifies all generated local pages and copied previews. `settings.json` records capture settings and commands.

## Claims and limits

The evidence covers local source generation, mesh export, lint, integration tests, local page generation and rendered previews. The deployed website has not been verified; deployment is pending review and merge. These stylized railway models do not claim track fit, operational signaling, transport safety or hardware acceptance.
