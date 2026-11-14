# Beverage bottling line catalog wave

[Watch the 30-second local workflow demo](beverage-bottling-line-kit.mp4)

The video shows the rotary filler source, its default preview, a second preview
after changing scale and accent color, all 50 kit previews, and the local audit
results. It distinguishes local validation from deployed behavior. No deployed
catalog route, factory performance, food-safety compliance, or physical
acceptance is claimed.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/generate_bottling_assets.py
npx eslint catalog/ --fix
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/run_with_occt_cjs_compat.py --output catalog-build-output.txt -- npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/render_bottling_previews.py
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/run_with_occt_cjs_compat.py --output catalog-build-after-previews-output.txt -- npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/audit_bottling_assets.py
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/run_with_occt_cjs_compat.py --output catalog-test-output.txt -- npx vitest run tests/integration/catalog/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/run_with_occt_cjs_compat.py --output catalog-pages-build-output.txt -- npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-beverage-bottling-catalog-pages
python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/verify_bottling_pages.py
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/run_with_occt_cjs_compat.py --output variant-render-output.txt -- npx tsx artifacts/catalog-demos/beverage-bottling-line-wave-20261103/render_variant.ts
python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/capture_bottling_demo.py
python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/inspect_bottling_video.py
npm pack --dry-run --ignore-scripts --json
```

Inspect `video-review/contact-sheet.png` and representative full-size frames.
After confirming all cards fit and the workflow is readable, rerun the inspector
with `--manual-inspection-passed` to record that review.

`catalog-build-output.txt` records the first required index build. The preview
renderer only targets this kit's 50 ids; all 2,000 earlier previews were
already present and verified. `catalog-build-after-previews-output.txt` records
the required index rebuild that adds the preview paths.

The current shell's Node 26 and Node 22.22 builds hit Node's module-type
ambiguity for the installed Emscripten UMD package. `run_with_occt_cjs_compat.py`
temporarily adds `"type": "commonjs"` to that package's ignored
`node_modules/package.json` for one child command and restores the original
bytes afterward. No dependency or product source is changed by this workaround.

## Verification evidence

- `asset-check-results.json` records 50 matching source hashes, parameter sets,
  measured triangle counts, one-material GLBs, floor origins, and rendered
  preview references.
- `catalog-tests.json` and `catalog-test-output.txt` record the requested
  catalog integration suite.
- `catalog-pages-check.json` records local hub/detail page and preview-copy
  verification for the new kit.
- `npm-pack-audit.json` records that the package dry run includes the generated
  index and all 50 new sources and previews; the package still exports only
  `./package.json`, with no commercial code paths in `src/` or `dist/`.
- `live-website-check.json` records the currently deployed homepage and
  `/catalog/` route. The branch was not deployed; post-deployment page
  verification remains pending merge and deployment.
- `settings.json`, `generate_bottling_assets.py`, `render_variant.ts`,
  `render_bottling_previews.py`, and `capture_bottling_demo.py` retain source
  and invocation details. `video-review/` contains decoded frames and the
  video inspection manifest.

All 50 assets are original CC0 1.0 kernelCAD geometry. They are stylized scene
props, not machine specifications, process guarantees, hygienic design
certification, regulatory claims, or installation guidance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/capture_bottling_demo.py`
- video review: `python3 artifacts/catalog-demos/beverage-bottling-line-wave-20261103/inspect_bottling_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
