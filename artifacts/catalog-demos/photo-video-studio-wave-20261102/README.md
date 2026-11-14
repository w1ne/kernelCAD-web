# Photo/video studio catalog wave demo

This bundle captures the real local workflow for the 40-asset `photo-video-studio` kit: authored `.kcad.ts` sources, generated catalog index, rendered model previews, generated static catalog pages, audit results and the short explanatory MP4.

## Video

`photo-video-studio-kit.mp4` is a 24-second H.264 video at 1280×720, 24 fps. It shows an actual source file and its rendered preview, then all 40 generated previews grouped by cameras, optics, lighting, support and production. The final card presents local audit and page-generation results. The source-frame images and encoder settings are retained in this folder. `video-review/` contains decoded samples, a contact sheet and `video-inspection.json` for the final visual review.

## Rebuild and verify

Run these commands from the repository root:

```sh
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/generate_photo_video_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/render_photo_video_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-photo-video-pages
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/record_photo_video_checks.py
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/verify_photo_video_pages.py /tmp/kernelcad-photo-video-pages
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/capture_photo_video_demo.py
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/inspect_photo_video_video.py --manual-inspection-passed
```

`asset-check-results.json` records source hashes, indexed knobs, triangle counts and budgets, materials and base origin for all 40 assets. `catalog-tests.json` and `catalog-eslint.json` record the successful checks. `catalog-pages-check.json` verifies the generated local pages and their copied previews. `settings.json` retains the video and validation settings.

## Claims and limits

The evidence covers local source generation, deterministic catalog build, lint, integration tests, static-page generation and rendered previews. It does not verify the deployed website; deployment is pending merge and release review. The models are stylized scene props and make no claims about optical correctness, light output, functional camera operation or hardware acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/capture_photo_video_demo.py`
- video review: `python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/inspect_photo_video_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
