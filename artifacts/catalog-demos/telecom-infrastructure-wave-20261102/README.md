# Telecom infrastructure catalog wave demo

[Watch the 30-second local workflow demo](telecom-infrastructure-kit.mp4)

The MP4 shows a real `cell-site-cabinet.kcad.ts` source and its rendered preview, then all 56 generated previews in seven contact sheets. Its final frame reports the source/index/mesh audit, lint, integration suite and locally generated pages. The captions identify local replay and validation and leave deployed, RF-performance and physical acceptance claims unmade.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/telecom-infrastructure-wave-20261102/generate_telecom_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
set -o pipefail && npx vitest run tests/integration/catalog/ 2>&1 | tee artifacts/catalog-demos/telecom-infrastructure-wave-20261102/catalog-test-output.txt
python3 artifacts/catalog-demos/telecom-infrastructure-wave-20261102/record_telecom_checks.py
python3 artifacts/catalog-demos/telecom-infrastructure-wave-20261102/write_telecom_readme.py
python3 artifacts/catalog-demos/telecom-infrastructure-wave-20261102/render_telecom_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-telecom-pages
python3 artifacts/catalog-demos/telecom-infrastructure-wave-20261102/verify_telecom_pages.py /tmp/kernelcad-telecom-pages
python3 artifacts/catalog-demos/telecom-infrastructure-wave-20261102/capture_telecom_demo.py
python3 artifacts/catalog-demos/telecom-infrastructure-wave-20261102/inspect_telecom_video.py
```

`asset-check-results.json`, `catalog-tests.json`, `catalog-eslint.json` and `catalog-pages-check.json` retain the checks. `settings.json` records capture settings. `video-review/` contains decoded frames, a contact sheet and MP4 metadata. The scripts retain source generation, preview, audit, page verification, capture and inspection invocations.

## Website status and limits

The local page builder is checked separately from the deployed website. On 2026-11-02 the public homepage returned HTTP 200 and `https://kernelcad.com/catalog/` returned HTTP 404. This branch was not deployed; live catalog behavior remains unverified.

All assets are original CC0 1.0 kernelCAD geometry. They are stylized scene props and make no claims about RF performance, wind loading, weatherproofing, installation suitability, regulatory compliance or physical acceptance.
