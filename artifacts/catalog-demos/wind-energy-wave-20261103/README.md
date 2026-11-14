# Wind energy catalog wave demo

[Watch the 30-second local workflow demo](wind-energy-kit.mp4)

The MP4 shows a real `horizontal-axis-wind-turbine.kcad.ts` source and rendered preview, then the 50 generated previews in seven contact sheets. Its final frame reports the source/index/mesh audit, lint, integration suite and locally generated pages. Captions distinguish local validation from deployment and engineering or physical acceptance.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/wind-energy-wave-20261103/generate_wind_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run src/kernel/backends/occt/occtResetPoison.test.ts
set -o pipefail && npx vitest run tests/integration/catalog/ 2>&1 | tee artifacts/catalog-demos/wind-energy-wave-20261103/catalog-test-output.txt
python3 artifacts/catalog-demos/wind-energy-wave-20261103/record_wind_checks.py
python3 artifacts/catalog-demos/wind-energy-wave-20261103/write_wind_readme.py
python3 artifacts/catalog-demos/wind-energy-wave-20261103/render_wind_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-wind-pages
python3 artifacts/catalog-demos/wind-energy-wave-20261103/verify_wind_pages.py /tmp/kernelcad-wind-pages
python3 artifacts/catalog-demos/wind-energy-wave-20261103/capture_wind_demo.py
python3 artifacts/catalog-demos/wind-energy-wave-20261103/inspect_wind_video.py
```

`catalog-build-output.txt`, `occt-reset-test-output.txt`, `asset-check-results.json`, `catalog-tests.json`, `catalog-eslint.json` and `catalog-pages-check.json` retain the checks. `settings.json` records capture settings; `video-review/` contains decoded frames, a contact sheet and MP4 metadata. The scripts retain generation, preview, audit, page verification, capture and inspection invocations.

## Website status and limits

The local static page builder is checked separately from deployed behavior. On 2026-11-03 the public homepage and `/catalog/` route were checked; the catalog route returned HTTP 404. This branch was not deployed.

All assets are original CC0 1.0 kernelCAD geometry. These are stylized scene props and make no claims about wind performance, structural loading, electrical generation, installation suitability, regulatory compliance or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/wind-energy-wave-20261103/capture_wind_demo.py`
- video review: `python3 artifacts/catalog-demos/wind-energy-wave-20261103/inspect_wind_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
