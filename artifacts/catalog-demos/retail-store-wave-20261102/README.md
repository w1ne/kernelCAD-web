# Retail store catalog wave demo

[Watch the 27-second local workflow demo](retail-store-kit.mp4)

The MP4 shows a real `checkout-counter.kcad.ts` source and its rendered preview, then groups all 48 generated previews across checkout, shelving, chilled displays, merchandising, shopping, stock handling and customer services. Its last frame reports the source/index/mesh audit, lint, integration suite and locally generated pages. The captions distinguish local evidence from deployed website behavior and physical acceptance.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/retail-store-wave-20261102/generate_retail_store_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
set -o pipefail && npx vitest run tests/integration/catalog/ 2>&1 | tee artifacts/catalog-demos/retail-store-wave-20261102/catalog-test-output.txt
python3 artifacts/catalog-demos/retail-store-wave-20261102/record_retail_store_checks.py
python3 artifacts/catalog-demos/retail-store-wave-20261102/write_retail_store_readme.py
python3 artifacts/catalog-demos/retail-store-wave-20261102/render_retail_store_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-retail-store-pages
python3 artifacts/catalog-demos/retail-store-wave-20261102/verify_retail_store_pages.py /tmp/kernelcad-retail-store-pages
python3 artifacts/catalog-demos/retail-store-wave-20261102/capture_retail_store_demo.py
python3 artifacts/catalog-demos/retail-store-wave-20261102/inspect_retail_store_video.py
```

The integration test checks every indexed asset's mesh export, triangle budget, single material, source hash and exact Studio knobs. `asset-check-results.json`, `catalog-tests.json`, `catalog-eslint.json` and `catalog-pages-check.json` retain the wave-specific results. `settings.json` records capture settings and commands. `video-review/` contains nine decoded frames, a contact sheet and MP4 inspection metadata. The scripts under this folder retain the source generation, preview, page verification, capture and inspection invocations.

## Website status and limits

The local page builder produced 48 retail-store asset pages and matching previews. On 2026-11-02, the live `https://kernelcad.com/catalog/` route returned HTTP 404 and the already-open kernelCAD homepage had no catalog navigation link. This branch was not deployed; live behavior after deployment remains unverified.

All assets are original CC0 1.0 kernelCAD geometry. They are stylized scene props; this demo makes no claims about store layout compliance, accessibility, retail operations or physical equipment acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/retail-store-wave-20261102/capture_retail_store_demo.py`
- video review: `python3 artifacts/catalog-demos/retail-store-wave-20261102/inspect_retail_store_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
