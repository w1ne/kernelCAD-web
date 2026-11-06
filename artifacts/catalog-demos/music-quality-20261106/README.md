# Music catalog quality promotion — 2026-11-06

**Demo:** [music-quality-demo.mp4](music-quality-demo.mp4) · [poster](poster.png)

The short video follows the local source-to-preview workflow: separate material controls, two source presets, before/after previews, generated kit previews and local catalog checks. It does not show a deployed page or claim acoustic performance or physical acceptance.

## Round result

- Promoted all **40 existing** music assets. No IDs or kits were added.
- Added **125 material-named controls** across the kit and **80 named preset entries** (`concert` and `vintage`, two per asset).
- Updated guitar and bowed-string body outlines, made guitar strings visible, and added flared saxophone/tuba bells, saxophone crooks and mouthpieces, banjo skin, violin/viola f-holes, and drumhead surfaces.
- Regenerated all **40 previews** and rebuilt `catalog/index.json`. All source hashes, preview paths and triangle budgets are recorded in [`verification.json`](verification.json).
- The quality gate reports **2,251/2,390 assets passing (94.2%)**, up from 2,211/2,390 in this workspace before the round; **139 thin assets remain**.
- `npx eslint catalog/kits/music/` passed. The catalog integration suite passed: **4 files, 15 tests**. All 40 local static music pages and previews were generated and checked. The branch is not deployed, so public-page behavior for this promotion remains unverified.

Lint, integration-test and local-page commands with exact exit codes are listed in [`check-results.json`](check-results.json). Full command output is retained in the neighboring `*-output.txt` files.

## Reproduce the promotion

From the repository root, on a clean source checkout at the promotion base (`9c2040309`):

```sh
python3 artifacts/catalog-demos/music-wave-20261102/generate_music_assets.py
python3 artifacts/catalog-demos/music-quality-20261106/save_before_previews.py
python3 artifacts/catalog-demos/music-quality-20261106/promote_music_quality.py
python3 artifacts/catalog-demos/music-quality-20261106/render_music_previews.py
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/music-quality-20261106/run_music_checks.py
python3 artifacts/catalog-demos/music-quality-20261106/record_music_checks.py
python3 artifacts/catalog-demos/music-quality-20261106/update_music_readme.py
npx tsx artifacts/catalog-demos/music-quality-20261106/render_music_preset_variants.ts
python3 artifacts/catalog-demos/music-quality-20261106/capture_music_quality_demo.py
python3 artifacts/catalog-demos/music-quality-20261106/inspect_music_video.py
```

[`promote_music_quality.py`](promote_music_quality.py) records the per-part material assignments, presets, new body outlines and missing detail parts. [`material-map.json`](material-map.json) lists each part's material controls. [`render_music_previews.py`](render_music_previews.py) targets the 40 existing music IDs. [`preset-variants.json`](preset-variants.json) records source SHA-256, exact preset values, GLB export settings and rendered variant paths.

## Verification evidence

- [`verification.json`](verification.json): all 40 music source hashes, material controls, presets, preview paths and triangle counts, plus whole-catalog pass rate.
- [`preview-render-output.txt`](preview-render-output.txt): all 40 preview renders and triangle counts. [`catalog-build-output.txt`](catalog-build-output.txt): generated-index rebuild. [`index-check-output.txt`](index-check-output.txt): generated-index consistency check.
- [`catalog-pages-check.json`](catalog-pages-check.json): local static page and preview checks for every music asset. Deployment remains explicitly unverified.
- [`check-results.json`](check-results.json), [`eslint-output.txt`](eslint-output.txt), [`catalog-integration-output.txt`](catalog-integration-output.txt), and [`kit-quality-output.txt`](kit-quality-output.txt): quality, lint and test status with saved command output.
- [`demo-settings.json`](demo-settings.json), [`frames/`](frames/) and [`video-inspection.json`](video-inspection.json): video invocation, source frames and decoded MP4 sample metadata. [`video-review/`](video-review/) retains the decoded sample frames, contact sheet and visual review notes.
- [`before-previews/`](before-previews/) preserves the base-commit images used for visual comparison.

## Limits

The assets are stylized scene props. Local mesh/index/page checks do not establish real instrument dimensions, sound, manufacturing suitability, certification, deployed behavior or hardware acceptance. The private dated workflow comparison is retained separately in `kernelCAD-private`.
