# Airfield catalog wave demo bundle

This bundle documents the 40-asset airfield kit from kernelCAD source through mesh previews, the generated index, local catalog pages and the catalog integration gate. It keeps the generator, capture settings, check outputs, video and decoded-frame review together.

## Demo

The [airfield kit workflow MP4](airfield-kit.mp4) is a 24-second, 1280×720 local replay. It shows the authored model groups, actual rendered previews, source parameters, generated index measurements, local catalog-page output and verification results. The captions distinguish local source/index/page checks from deployed behavior. The branch is not deployed, and the bundle makes no claim about operational aviation or hardware acceptance.

## Reproduce

From the repository root:

```sh
python3 artifacts/catalog-demos/airfield-wave-20261102/generate_airfield_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/airfield-wave-20261102/render_airfield_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-airfield-catalog-pages
python3 artifacts/catalog-demos/airfield-wave-20261102/record_airfield_checks.py
python3 artifacts/catalog-demos/airfield-wave-20261102/verify_airfield_pages.py /tmp/kernelcad-airfield-catalog-pages
python3 artifacts/catalog-demos/airfield-wave-20261102/capture_airfield_demo.py
python3 artifacts/catalog-demos/airfield-wave-20261102/inspect_airfield_video.py
```

`settings.json` records the capture format and commands. `asset-check-results.json` records every airfield source hash, knob, triangle count, budget, material count and measured base. `catalog-eslint.json` and `catalog-tests.json` retain the lint and full integration-suite results. `catalog-pages-check.json` records the generated local hub, all 40 pages and matching preview-image hashes. `preview-contact-sheet.png` covers all rendered assets. `video-review/` contains eight decoded samples and the MP4 inspection report.

## Verification limits

All build, mesh, index, preview and page-generation checks are local to the feature branch. The current public routes `https://kernelcad.com/catalog/` and `https://kernelcad.com/catalog/airfield/single-engine-trainer/` returned 404 on 2026-11-02, so this branch has no live page to verify. Check the public route after the website build/deploy path includes these generated pages. The models are original stylized scene props and do not represent aircraft performance, airport procedures, airworthiness or physical hardware acceptance.

## Provenance

All 40 assets are original kernelCAD programs dedicated to the public domain under CC0 1.0. Geometry is generated from source primitives; no third-party model meshes, textures or palettes are included.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/airfield-wave-20261102/capture_airfield_demo.py`
- video review: `python3 artifacts/catalog-demos/airfield-wave-20261102/inspect_airfield_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
