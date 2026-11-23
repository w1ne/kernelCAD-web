# Solar-energy catalog quality promotion — 2026-11-06

**Demo:** [solar-energy-quality-demo.mp4](solar-energy-quality-demo.mp4) · [poster](poster.png)

The video follows the local `.kcad.ts` source-to-preview workflow: material
controls and named appearances, before/after previews, source-driven preset
renders, and local catalog checks. It is a rendered documentation video, not a
live Studio capture. It does not show a deployment or claim electrical,
installation, manufacturing, or hardware acceptance.

## Round result

- Promoted all **40 existing** solar-energy assets. No IDs or kits were added.
- Added **130 material-named color controls** and **80 named preset entries**
  (`fieldService` and `highVisibility`, two per asset). Each source keeps its
  scale control and exposes two to four colors for actual materials such as
  solar glass, aluminum, galvanized steel, rubber, ceramic, polymer, concrete,
  and enclosure coating.
- Kept existing component identities and improved the largest visible shapes:
  the single-axis tracker has eight tilted, framed modules with cell divisions;
  the cleaner robot has idler wheels inside its tracks; and the battery
  container has paired service doors on both long faces, hinges, vents,
  corrugated ends, and end-mounted cooling housings.
- Re-rendered **40/40 previews** and regenerated `catalog/index.json`. The
  verification bundle confirms every solar source hash and preview path and
  checks every triangle count against its declared budget.
- The kit quality gate passes **40/40**. Across the catalog, the gate improved
  from **2,291/2,390 (95.9%; 99 thin)** to **2,331/2,390 (97.5%; 59 thin)**.
  The remaining failures are in other kits, including office.
- `npx eslint catalog/kits/solar-energy/` passed. The catalog integration suite
  passed **4 files, 15 tests**. All 2,390 local static catalog pages built, and
  all 40 solar pages were checked for their title, preview, and material
  controls.
- The MP4 was probed and visually inspected. The checked frames show the source
  controls, the tracker, before/after previews, the two container presets, and
  the validation results.

The current kernelCAD homepage and existing catalog source were reviewed. The
feature branch is not deployed, so its public page has not been verified after
deployment. The local page build is recorded separately in
[`catalog-pages-check.json`](catalog-pages-check.json).

## Reproduce the promotion

From a clean checkout at the promotion base (`328762c77`):

```sh
git restore --source=328762c77 --worktree -- catalog/kits/solar-energy
python3 artifacts/catalog-demos/solar-energy-quality-20261106/promote_solar_energy_quality.py
npx tsx scripts/renderCatalogPreviews.ts \
  ac-disconnect-switch balcony-solar-panel battery-cabinet battery-rack \
  bifacial-pv-module dc-disconnect-switch flexible-solar-panel floating-solar-platform \
  ground-mount-pv-rack home-battery-wall hybrid-inverter microinverter-unit \
  pad-mount-transformer plane-of-array-irradiance-sensor pole-mount-transformer \
  pv-ballast-block pv-cable-tray pv-combiner-box pv-junction-box \
  pv-module-microinverter pv-module-transport-cart pv-panel-cleaning-robot \
  roof-flashing-mount rooftop-pv-array rooftop-pv-module single-axis-solar-tracker \
  solar-battery-container solar-carport-canopy solar-charge-controller \
  solar-data-logger solar-electric-meter solar-main-panel solar-panel-end-clamp \
  solar-panel-wash-cart solar-pergola-canopy solar-roof-section \
  solar-weather-station solar-wind-sensor-mast string-inverter utility-inverter-station
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/solar-energy/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-solar-pages-20261106
python3 artifacts/catalog-demos/solar-energy-quality-20261106/record_solar_verification.py
npx tsx artifacts/catalog-demos/solar-energy-quality-20261106/render_solar_presets.ts
python3 artifacts/catalog-demos/solar-energy-quality-20261106/capture_solar_quality_demo.py
python3 artifacts/catalog-demos/solar-energy-quality-20261106/inspect_solar_quality_demo.py
```

[`promote_solar_energy_quality.py`](promote_solar_energy_quality.py) records the
part-to-material mappings and source hashes. [`render_solar_presets.ts`](render_solar_presets.ts)
exports both actual presets for the tracker and battery container.
[`demo-settings.json`](demo-settings.json) records video settings and
invocations; [`video-inspection.json`](video-inspection.json) and
[`video-review/visual-review.md`](video-review/visual-review.md) record the MP4
inspection.

## Verification evidence

- [`material-map.json`](material-map.json): before/after source hashes, material
  controls, per-part assignments, preset names, and part counts.
- [`verification.json`](verification.json): catalog and kit pass rates, all 40
  source hashes, preview paths, material controls, presets, and triangle budgets.
- [`preview-render-output.txt`](preview-render-output.txt),
  [`catalog-build-output.txt`](catalog-build-output.txt),
  [`catalog-build-settings.json`](catalog-build-settings.json), and
  [`indexcheck-output.txt`](indexcheck-output.txt): preview regeneration,
  generated index, and source/index checks.
- [`check-results.json`](check-results.json), [`eslint-output.txt`](eslint-output.txt),
  [`integration-output.txt`](integration-output.txt),
  [`kitquality-output.txt`](kitquality-output.txt), and
  [`catalogquality-output.txt`](catalogquality-output.txt): commands and results.
- [`catalog-pages-check.json`](catalog-pages-check.json) and
  [`catalogpages-output.txt`](catalogpages-output.txt): local static-page build
  and checks for all solar assets. This is not deployed behavior.
- [`before-previews/`](before-previews/), [`preset-variants/`](preset-variants/),
  `frames/`, [`video-inspection.json`](video-inspection.json), and
  [`video-review/`](video-review/): comparison images, actual preset renders,
  video source frames, decoded MP4 metadata, and visual inspection.

## Limits

These are stylized low-poly visualization assets. Catalog evaluation and local
page generation do not establish actual PV output, voltage or current ratings,
electrical clearances, structural performance, installation suitability,
certification, deployed behavior, or hardware acceptance. The feature branch
remains undeployed.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/solar-energy-quality-20261106/capture_solar_quality_demo.py`
- video review: `python3 artifacts/catalog-demos/solar-energy-quality-20261106/inspect_solar_quality_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
