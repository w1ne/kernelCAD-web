# Theatre production quality promotion

This bundle records the 2026-11-05 in-place promotion of the existing 52-asset `theatre-production` kit. It retains the source transformer, original before renders, final preview review, resolved preset render, source/index checks, local page check, required command output, and an inspected MP4 demo.

## Result

- 52 existing assets promoted; 0 catalog IDs added.
- 161 material-named color controls total, with 2–4 per asset.
- 52 assets now have `houseShow` and `touring` appearance presets (104 named variants).
- All 52 rendered previews are present and indexed; source hashes match `catalog/index.json`.
- The kit quality gate passes 52/52. Meshes range from 120 to 344 triangles against the existing 1,800-triangle budgets.
- Catalog quality moved from 1,348/2,390 (56.40%) at this round's source baseline to 1,400/2,390 (58.58%); 990 assets remain thin. The full-catalog audit still reports those remaining thin assets.

## Demo and review

- [Short MP4 demo](theatre-production-quality-promotion.mp4)
- [Poster](poster.png) · [decoded video contact sheet](decoded-video-contact-sheet.png)
- [MP4 inspection notes](video-review.md)
- [Final preview review](preview-review.md)
- [Touring preset render](variants/ellipsoidal-reflector-spotlight-touring.png) · [preset verification](variant-verification.json)
- [Promotion audit](promotion-audit.json) · [generation settings](settings.json)

The demo shows before/after local renders, named material controls, the resolved `touring` preset, object previews, and recorded local checks. Its claims cover source evaluation, catalog data, static page generation, and software rendering. The feature branch is not deployed; deployed feature behavior is unverified. These visualization props do not establish rigging capacity, electrical ratings, venue compliance, operational safety, or physical acceptance.

## Verification evidence

- `catalog-index-build-output.txt`, `catalog-index-build-status.json`
- `catalog-index-check.json` checks all 52 source hashes, color controls, presets, previews, origins, and mesh budgets.
- `kit-quality-output.txt`, `kit-quality-status.json`
- `catalog-eslint-output.txt`, `catalog-eslint-status.json`
- `catalog-test-output.txt`, `catalog-test-status.json`
- `catalog-pages-check.json` checks the 52 generated asset pages, their previews, and the local catalog hub.
- `quality-gate-full-output.txt` records the full catalog pass rate and remaining thin assets.
- `live-website-check.json` records HTTP availability of the existing public homepage and asset library. It is a live baseline check, not deployment verification for this branch.
- `video-metadata.json`, `video-inspection.json`, and `decoded-video-contact-sheet.png` retain MP4 metadata and inspection evidence.

## Reproduction

Run the commands listed in `settings.json` from the repository root. The source transformer is `promote_theatre_production.py`; it changes existing IDs only. `capture_baseline_quality.py` reconstructs the source baseline named in `source-revision.txt`.

The all-assets Studio parameter check's timeout was raised from 300 to 600 seconds after the full 2,390-asset evaluation exceeded its original limit; its parameter equality assertion is unchanged. The passing integration output records 15 tests across four files.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/theatre-production-quality-promotion-20261105/capture_theatre_promotion.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
