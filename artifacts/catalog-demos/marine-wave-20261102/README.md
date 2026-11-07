# Marine catalog wave demo

This bundle records the local workflow for the 40-asset `marine` kit: authored `.kcad.ts` sources, generated index, rendered model previews, local asset pages, audit results and a short explanatory MP4.

## Video

`marine-kit.mp4` is a 24-second H.264 video at 1280×720, 24 fps. It shows a real life-ring source and rendered preview, then generated previews grouped by harbor vessels, safety, dock gear, navigation and fishing. The final card shows local audit and page-generation evidence. Source frames, encoder settings, decoded samples and a contact sheet are retained in this bundle.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/marine-wave-20261102/generate_marine_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/marine-wave-20261102/render_marine_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-marine-pages
python3 artifacts/catalog-demos/marine-wave-20261102/record_marine_checks.py
python3 artifacts/catalog-demos/marine-wave-20261102/verify_marine_pages.py /tmp/kernelcad-marine-pages
python3 artifacts/catalog-demos/marine-wave-20261102/capture_marine_demo.py
python3 artifacts/catalog-demos/marine-wave-20261102/inspect_marine_video.py --manual-inspection-passed
```

`asset-check-results.json` records source hashes, indexed knobs, triangle counts and budgets, material counts and base origin for all 40 assets. `catalog-tests.json` and `catalog-eslint.json` record successful checks. `catalog-pages-check.json` verifies generated local pages and copied previews. `settings.json` retains capture settings.

## Claims and limits

The evidence covers local source generation, catalog build, lint, integration tests, local page generation and rendered previews. The deployed website has not been verified; deployment is pending merge and review. These models are stylized scene props and do not claim seaworthiness, flotation performance, navigational accuracy or hardware acceptance.
