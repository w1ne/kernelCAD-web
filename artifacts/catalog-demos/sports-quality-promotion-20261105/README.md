# Sports quality promotion — 2026-11-05

This bundle documents the promotion of the existing 40-asset `sports` kit. IDs and the catalog count remain unchanged. Each asset now has 2–4 material-named color controls, one `clubColors` preset, a descriptive source comment, and an indexed default preview. Twenty-five assets gained additional silhouette or object-specific geometry.

## Demo

[Watch the 18-second MP4](sports-quality-promotion.mp4) · [poster](poster.png) · six-frame contact sheet (`video-review/contact-sheet.png`, not tracked).

The storyboard uses the original previews captured from `HEAD`, the refreshed preview PNGs, and six local replay renders built from the declared default and `clubColors` parameter values. [Video settings and invocation](settings.json) · [complete command record](invocations.txt) · [manual video review](video-review.md).

## Quality and checks

- Sports kit: **40/40 assets pass (100%)**; 115 material controls and 40 presets across the same 40 IDs.
- Catalog: **2,131/2,390 pass (89.16%)**, with 259 thin assets remaining. Before this round: 2,091/2,390 (87.49%).
- All 40 current preview files exist, are included in the generated index, and match source hashes. All 40 triangle budgets pass.
- `npx eslint catalog/kits/sports/`: clean.
- `npx vitest run tests/integration/catalog/`: 4 files and 15 tests passed.
- Local page build: all 40 sports pages and previews checked. npm package audit: all 40 sports sources and previews included, package exports unchanged, no product implementation paths.

Detailed output is retained in `catalog-quality-after.txt`, `sports-quality-after.txt`, `quality-kit-check.txt`, `eslint-output.txt`, `catalog-integration-output.txt`, `source-index-audit.json`, `catalog-pages-check.json`, and `package-boundary-audit.json`.

## Reproduction

`promote_sports_quality.py` is the one-time migration source; `promotion-plan.json` records its per-ID plan and SHA-256 results. Before replaying it, restore the original baseline from `artifacts/catalog-demos/sports-wave-20261102/generate_sports_assets.py`. Then follow `invocations.txt` to render previews, regenerate the generated index, replay selected presets, and run local checks.

The scripts `render_sports_presets.ts` and `capture_sports_quality.py` generate the preset images and MP4. The demo captions distinguish local source evaluation and software rendering from deployment, simulation acceptance, and hardware acceptance. This branch is not deployed; no physical sport-performance or hardware acceptance is claimed.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/sports-quality-promotion-20261105/capture_sports_quality.py`
- video review: `python3 artifacts/catalog-demos/sports-quality-promotion-20261105/inspect_sports_quality_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
