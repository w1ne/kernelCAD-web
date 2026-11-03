# Space exploration catalog wave demo

[Watch the 30-second local workflow demo](space-exploration-kit.mp4)

The MP4 shows a real `lunar-habitat-module.kcad.ts` source and its rendered preview, then the 52 generated previews in seven contact sheets. Its final frame reports the source/index/mesh audit, lint, integration suite and locally generated pages. The captions distinguish local replay and validation from deployed, simulation and physical acceptance claims.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/space-exploration-wave-20261103/generate_space_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
set -o pipefail && npx vitest run tests/integration/catalog/ 2>&1 | tee artifacts/catalog-demos/space-exploration-wave-20261103/catalog-test-output.txt
python3 artifacts/catalog-demos/space-exploration-wave-20261103/record_space_checks.py
python3 artifacts/catalog-demos/space-exploration-wave-20261103/write_space_readme.py
python3 artifacts/catalog-demos/space-exploration-wave-20261103/render_space_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-space-pages
python3 artifacts/catalog-demos/space-exploration-wave-20261103/verify_space_pages.py /tmp/kernelcad-space-pages
python3 artifacts/catalog-demos/space-exploration-wave-20261103/capture_space_demo.py
python3 artifacts/catalog-demos/space-exploration-wave-20261103/inspect_space_video.py
```

`asset-check-results.json`, `catalog-tests.json`, `catalog-eslint.json` and `catalog-pages-check.json` retain the wave checks. `settings.json` records capture settings. `video-review/` contains decoded frames, a contact sheet and MP4 metadata. The scripts retain generation, preview, audit, page verification, capture and inspection invocations.

## Website status and limits

The local static page builder is checked separately from the deployed website. On 2026-11-03 the public homepage status and `/catalog/` route were checked; live catalog behavior remains unverified until deployment.

All assets are original CC0 1.0 kernelCAD geometry. These are stylized scene props; they make no claims about launch, pressure-vessel, radiation, thermal-vacuum, mobility or mission performance.
