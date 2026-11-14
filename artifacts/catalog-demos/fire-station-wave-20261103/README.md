# Fire station catalog wave

This bundle records the source, rendered previews, local checks and demo for
70 original fire-station fixtures. The kit organizes apparatus-bay equipment,
washing and decontamination, gear processing, clean storage and station
readiness into one place and return-to-service scene. It adds 70 assets to the
branch catalog: **2,170 indexed assets in 46 kits**, each with an indexed PNG
preview.

## Demo

[Watch the 36-second fire-station kit walkthrough](fire-station-kit.mp4). It
shows the scene workflow, native `.kcad.ts` source, a scale and color change,
all 70 rendered previews, and local verification results. The local replay and
validation shown in the demo do not establish deployed behavior or hardware
acceptance.

The H.264 MP4 is 1280×720, 24 fps, yuv420p. Capture source, settings and visual
inspection evidence are retained here:

- `capture_fire_station_demo.py` and `settings.json`
- `inspect_fire_station_video.py`, `video-review/video-inspection.json` and
  `video-review/contact-sheet.png`
- `preview-visual-review.json` and seven contact sheets in `preview-review/`
- `alert-console-variant.png`, rendered from the console source with scale 1.15
  and color `#b46f3d`

## Source and validation

`generate_fire_station_assets.py` is the source generator. It writes the kit
metadata and 70 individual `.kcad.ts` models. Each model uses millimetres and
Z up, exposes labeled scale and color parameters, uses one material and has a
1,800-triangle budget. `run_with_occt_cjs_compat.py` runs the repository
commands with the compatibility setting required by the installed Node 22
OCCT package, then restores that package manifest.

The reproducible catalog workflow is:

```sh
python3 artifacts/catalog-demos/fire-station-wave-20261103/generate_fire_station_assets.py
npx eslint catalog/ --fix
npx eslint catalog/
python3 artifacts/catalog-demos/fire-station-wave-20261103/run_with_occt_cjs_compat.py --output catalog-build-output.txt -- npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/fire-station-wave-20261103/render_fire_station_previews.py
python3 artifacts/catalog-demos/fire-station-wave-20261103/run_with_occt_cjs_compat.py --output catalog-build-after-previews-output.txt -- npx tsx scripts/buildAssetCatalog.ts
```

The final source correction rerendered the four affected assets and ran a final
catalog build. Evidence and full logs are included:

- `source-audit.json` and `source-audit-output.txt`: all 70 sources load and
  produce a mesh; scale and color parameters, one material, triangle budgets
  and origins pass.
- `corrected-previews-output.txt`, `catalog-build-final-output.txt` and
  `final-index-audit.json`: corrected previews, source hashes, all 70 PNGs and
  all 2,170 index preview paths verified.
- `catalog-pages-check.json` and `catalog-pages-build-output.txt`: 70 detail
  pages and preview copies checked in locally generated catalog pages.
- `catalog-tests.json` and `catalog-test-output.txt`: the requested catalog
  integration suite passed (4 files, 15 tests).
- `npm-build-output.txt`, `npm-pack-dry-run.json` and
  `package-boundary-audit.json`: production build passed; dry-run package
  contains all 141 fire-station source, preview and README files; package
  exports are unchanged and no commercial implementation paths were found.
- `catalog-build-output.txt` and `catalog-build-after-previews-output.txt`:
  the required builds before and after the initial 70-preview render.

The npm build retains a warning in vendored `verb-nurbs` code about comparing
against `NaN`; the build completed successfully.

## Website status and limits

The current branch is not deployed. The last successful public endpoint check,
using the existing Chrome/CDP session at 2026-11-03 11:26 UTC, saw 1,291
preview-backed assets in 31 kits, no fire-station rows, and `/catalog/` returned
404. Later endpoint attempts timed out or were blocked, so these results are a
dated baseline; no public verification of this wave is claimed.

The generated local catalog hub and detail pages are validation evidence only.
The assets are generic scene props, not building-code, fire-protection,
ventilation, decontamination, PPE, respiratory or emergency-response
specifications. Catalog replay and software checks do not establish safety or
operational acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/fire-station-wave-20261103/capture_fire_station_demo.py`
- video review: `python3 artifacts/catalog-demos/fire-station-wave-20261103/inspect_fire_station_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
