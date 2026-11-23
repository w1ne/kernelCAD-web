# Music catalog wave demo bundle

This bundle documents the 40-asset music kit and its local catalog workflow. It retains the asset generator, preview renderer, capture settings and source, audit output, generated-page check, MP4, poster and decoded-frame inspection packet.

## Reproduce

From the repository root:

```sh
python3 artifacts/catalog-demos/music-wave-20261102/generate_music_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/music-wave-20261102/render_music_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-music-catalog-pages
python3 artifacts/catalog-demos/music-wave-20261102/verify_music_pages.py /tmp/kernelcad-music-catalog-pages
python3 artifacts/catalog-demos/music-wave-20261102/record_music_checks.py
python3 artifacts/catalog-demos/music-wave-20261102/capture_music_demo.py
python3 artifacts/catalog-demos/music-wave-20261102/inspect_music_video.py
```

`settings.json` records the 1280×720 capture, frame rate, codec, source paths and invocation. The demo is [`music-kit.mp4`](music-kit.mp4); [`poster.png`](poster.png) is its opening frame.

## Verification and limits

The catalog index records source hashes, parameter names, triangle counts, budgets, materials and base height for each asset. `catalog-eslint.json` records the clean lint result; `catalog-test-output.txt` is the integration suite output. `catalog-pages-check.json` records local static-page and preview checks for all 40 music entries. `video-review/` contains decoded frame samples and the inspection report.

This is local source, mesh, index, lint and static-page evidence. The branch has not been deployed, so public website behavior remains unverified and must be checked after merge/deployment. The video does not demonstrate audio, instrument performance, acoustic simulation or hardware acceptance.

## Provenance

All 40 models are original parametric kernelCAD source, dedicated to the public domain under CC0 1.0. No downloaded models, meshes, textures or palettes are used.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/music-wave-20261102/capture_music_demo.py`
- video review: `python3 artifacts/catalog-demos/music-wave-20261102/inspect_music_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
