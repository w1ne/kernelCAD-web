# Fire-station quality promotion — 2026-11-04

This round promotes the 70 existing fire-station assets in place. It adds no
asset IDs or catalog rows. The native `.kcad.ts` sources now expose 2–4
material-specific color controls and two finish presets, `apparatus-red` and
`clean-zone`. Across the kit that is 206 color controls, 136 more than the
previous one-color-per-asset sources, and 140 named preset entries.

Path-derived loft profiles, faceted fittings, angled components, equipment
details, and open sink bowls give the models more distinctive silhouettes.
The final mesh audit passes all 70 assets; they range from 120 to 1,248
triangles under their 1,800-triangle budgets. The old 1,670-sided drying-cabinet
rail was corrected to an eight-sided horizontal rail.

## Preview review

All 70 kit previews were rendered from the final sources. I opened three final
previews and confirmed that they read as their named objects in color:

- `apparatus-bay-bollard.png`: orange post, yellow reflective sleeve, capped
  top, and bolted metal foot.
- `clean-zone-handwash-sink.png`: open basin, backsplash, drain and tap details,
  dispensers, and steel legs.
- `station-alerting-control-console.png`: broad blue console, angled dark
  display, metal detail, and yellow status buttons.

The red parameter variant is also visible in
[`quality-variant.png`](quality-variant.png). File hashes and review notes are
in [`visual-review.json`](visual-review.json).

## Demo

[`fire-station-quality.mp4`](fire-station-quality.mp4) is a 36-second H.264
walkthrough at 1280×720 and 24 fps. It shows the station workflow grouping, a
native source and its material controls, a local palette/scale change, all 70
rendered previews in seven contact sheets, and the local verification results.
The extracted-frame contact sheet is
[`video-contact-sheet.png`](video-contact-sheet.png); video metadata and
inspection notes are in [`video-inspection.json`](video-inspection.json).

The walkthrough distinguishes local rendering and validation from deployed
behavior. The public site returned HTTP 403 for the homepage, catalog, and
gallery data checks, and the existing browser's read-only CDP page selection
timed out. No browser was launched or stopped. The branch was not deployed, so
no public-page behavior is claimed. Hardware acceptance is not applicable to
these visualization assets.

## Verification

- Mesh/source audit: 70/70 pass; 2–4 actual `.color(materialParam)` arguments
  and both named finish presets on every source. See
  [`quality-audit.json`](quality-audit.json) and its retained command output.
- `npx eslint catalog/kits/fire-station/`: passed. See
  [`eslint-check.json`](eslint-check.json).
- `npx vitest run tests/integration/catalog/`: 4 files and 15 tests passed.
  This includes the full catalog source export, triangle-budget, index freshness,
  and Studio parameter checks. See [`catalog-tests.json`](catalog-tests.json)
  and [`catalog-tests-output.txt`](catalog-tests-output.txt).
- The generated index has 2,390 assets across 49 kits. All 70 fire-station
  source hashes and preview paths match; see
  [`catalog-index-check.json`](catalog-index-check.json).
- Local catalog generation verified the searchable hub, all 70 fire-station
  detail pages, their material controls and presets, and all copied previews.
  See [`catalog-pages-check.json`](catalog-pages-check.json).
- The npm dry-run package contains the 70 sources, 70 previews, and catalog
  index, keeps the existing `./package.json` export, and has no commercial
  product paths. See [`npm-pack-audit.json`](npm-pack-audit.json) and the
  [`source-boundary-audit.json`](source-boundary-audit.json). No product runtime
  source, package export, or deployment workflow was changed.

## Reproduction

Run from the repository root. The OCCT compatibility wrapper keeps its log
files in this bundle.

```bash
python3 artifacts/catalog-demos/fire-station-quality-20261104/promote_fire_station_assets.py
artifacts/catalog-demos/fire-station-quality-20261104/render_fire_station_previews.sh
python3 artifacts/catalog-demos/fire-station-wave-20261103/run_with_occt_cjs_compat.py --output ../fire-station-quality-20261104/catalog-build-after-previews-output.txt -- npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/fire-station-wave-20261103/run_with_occt_cjs_compat.py --output ../fire-station-quality-20261104/quality-audit-output.txt -- npx tsx artifacts/catalog-demos/fire-station-quality-20261104/audit_fire_station_quality.ts
npx eslint catalog/kits/fire-station/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/fire-station-wave-20261103/run_with_occt_cjs_compat.py --output ../fire-station-quality-20261104/catalog-pages-build-output.txt -- npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-fire-station-catalog-pages
python3 artifacts/catalog-demos/fire-station-quality-20261104/verify_fire_station_quality_pages.py
python3 artifacts/catalog-demos/fire-station-wave-20261103/run_with_occt_cjs_compat.py --output ../fire-station-quality-20261104/variant-render-output.txt -- npx tsx artifacts/catalog-demos/fire-station-quality-20261104/render_quality_variant.ts
python3 artifacts/catalog-demos/fire-station-quality-20261104/capture_fire_station_quality.py
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,pix_fmt,avg_frame_rate,nb_frames -show_entries format=duration -of json artifacts/catalog-demos/fire-station-quality-20261104/fire-station-quality.mp4
npm pack --dry-run --ignore-scripts --json
```

The promotion settings, source generator, audit, preview renderer, variant
renderer, video capture source, and retained logs live in this directory.
Dated workflow comparisons and the public-site check notes are kept privately
in `kernelCAD-private/catalog-fire-station-compare-20261104/COMPARISON.md`.
