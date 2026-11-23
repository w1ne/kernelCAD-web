# Photo/video studio catalog quality promotion — 2026-11-06

**Demo:** [photo-video-studio-quality-demo.mp4](photo-video-studio-quality-demo.mp4) · [poster](poster.png)

The short video follows the local `.kcad.ts` source-to-preview workflow: separate material controls, two source presets, before/after previews, generated kit previews and local catalog checks. It does not show a deployed page or claim optical performance, lighting output or physical acceptance.

## Round result

- Promoted all **40 existing** photo/video studio assets. No IDs or kits were added.
- Added **125 material-named controls** and **80 named preset entries** (`studioBlack` and `fieldRental`, two per asset). Each source keeps its scale control and exposes two to four color controls named for materials such as polymer, rubber, metal, glass, fabric and reflective film.
- Retained each object's component-based silhouette. Camera bodies distinguish shells, grips, glass and metal hardware; lenses separate barrels, grip bands and front glass; lights and reflectors separate fabric or diffuser surfaces from their frames and mounts.
- Re-rendered all **40 previews** and regenerated `catalog/index.json`. The verification bundle checks every source hash against the index, each preview path, and every triangle count against its budget.
- The catalog quality gate reports **2,291/2,390 assets passing (95.9%)**, with **99 thin assets remaining**. This round brings the photo/video kit to **40/40 passing**.
- `npx eslint catalog/kits/photo-video-studio/` passed. The catalog integration suite passed: **4 files, 15 tests**. The generated-index check and local library page build/check results are recorded in [`check-results.json`](check-results.json) and the neighboring output files.
- The current kernelCAD [Model Library](https://kernelcad.com/asset-library/) route was checked before this branch update. This feature branch has not been deployed, so its live page behavior remains unverified.

Lint, integration, index and local-page commands with exit codes are listed in [`check-results.json`](check-results.json). Full source hashes, material assignments, indexed previews and triangle budgets are in [`verification.json`](verification.json). The private dated workflow comparison is retained in `kernelCAD-private`.

## Reproduce the promotion

From the promotion branch at a clean working tree, restore the kit sources,
guide and previews to the promotion base (`41232a82d`):

```sh
git restore --source=41232a82d --worktree -- catalog/kits/photo-video-studio
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/promote_photo_video_quality.py
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/render_photo_video_previews.py
npx tsx scripts/buildAssetCatalog.ts
npx tsx artifacts/catalog-demos/photo-video-studio-quality-20261106/render_photo_video_presets.ts
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/update_photo_video_readme.py
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/run_photo_video_checks.py
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/record_photo_video_verification.py
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/capture_photo_video_quality_demo.py
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/inspect_photo_video_demo.py
```

[`promote_photo_video_quality.py`](promote_photo_video_quality.py) records the material-to-part mapping and per-asset palettes. [`render_photo_video_previews.py`](render_photo_video_previews.py) targets the 40 existing IDs. [`render_photo_video_presets.ts`](render_photo_video_presets.ts) exports and renders both actual source presets for the DSLR; [`preset-variants.json`](preset-variants.json) records its source hash, exact values and render settings.

## Verification evidence

- [`material-map.json`](material-map.json): each source's before/after SHA-256, material controls, part assignments, presets and part count.
- [`verification.json`](verification.json): all 40 source hashes, indexed preview paths, triangle counts and budgets, plus the whole-catalog pass rate.
- [`preview-render-output.txt`](preview-render-output.txt), [`catalog-build-output.txt`](catalog-build-output.txt), [`catalog-build-settings.json`](catalog-build-settings.json) and [`indexcheck-output.txt`](indexcheck-output.txt): preview renders, generated-index rebuild and stale-index check output.
- [`check-results.json`](check-results.json), [`eslint-output.txt`](eslint-output.txt), [`integration-output.txt`](integration-output.txt), [`kitquality-output.txt`](kitquality-output.txt), and [`catalogquality-output.txt`](catalogquality-output.txt): quality, lint and test results with saved command output.
- [`catalog-pages-check.json`](catalog-pages-check.json) and [`catalogpages-output.txt`](catalogpages-output.txt): local static page and preview checks for every photo/video asset. This is local verification, not deployed behavior.
- [`before-previews/`](before-previews/), [`preset-variants/`](preset-variants/), [`demo-settings.json`](demo-settings.json), `frames/` and [`video-inspection.json`](video-inspection.json): comparison images, actual preset renders, capture settings, video frames and decoded MP4 metadata.
- [`video-review/`](video-review/) retains sampled decoded frames and the contact sheet used for visual inspection.

## Limits

The models are stylized scene props. Local model, preview, index and page checks do not establish real camera dimensions, optical performance, light output, manufacturing suitability, certification, deployed behavior or hardware acceptance. The branch remains undeployed.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/capture_photo_video_quality_demo.py`
- video review: `python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/inspect_photo_video_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
