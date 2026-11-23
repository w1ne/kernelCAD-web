# Data-center infrastructure quality promotion

[Watch the 18-second source-to-preview demo](data-center-infrastructure-quality-promotion.mp4).

This round promotes all 50 existing data-center assets in place. It adds no catalog IDs. Every source has two to four material-named color controls and `facilityStandard` / `highVisibility` presets. The source retains the overall scale control. Equipment-specific changes include rack ventilation details, a corrected rack PDU outlet channel and feed cable, removable UPS modules, distinct transfer cabinets and perimeter cooling geometry, chiller coil fins and fan blades, a cooling-tower fan cowl, and lofted transformer bushings, generator stack and sensor cap.

The demo compares earlier and refreshed previews, shows the rack's material controls, renders the named `highVisibility` preset from source, and shows representative equipment. Captions describe local CAD source evaluation, software preview rendering, indexing and checks. This is not a data-center operation simulation; the feature branch has not been deployed, and no facility engineering, safety or hardware acceptance is claimed.

## Evidence

- [Promotion audit](promotion-audit.json) records the assets, net color controls, preset variants, catalog pass rate, preview coverage, mesh triangle range and source-hash check.
- [Preview review](preview-review.md) records what is visible in the rack, chiller and cooling-tower previews.
- [Preset verification](variant-verification.json) records the resolved high-visibility rack render and mesh budget.
- [Local page audit](catalog-pages-check.json) checks all 50 generated asset pages, controls, presets and preview pairs.
- [ESLint status](catalog-eslint-status.json) and [catalog integration status](catalog-test-status.json) retain the required check results.
- `checks/` retains command output, including the full catalog audit. Other thin kits remain; the kit gate is the promotion gate for this round.
- `frames/`, `poster.png`, `video-metadata.json`, and `video-review/` retain the MP4 source frames, metadata and decoded-frame inspection.
- `promotion-source-audit.json` records the model parts, materials and geometry plan; `settings.json` records baseline commit, invocation and verification scope.

## Rebuild and verify

Run from the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/promote_data_center_infrastructure.py
mapfile -t asset_ids < <(rg --files catalog/kits/data-center-infrastructure | sed -n 's#^.*/##; s/\.kcad\.ts$//p')
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit data-center-infrastructure
npx eslint catalog/kits/data-center-infrastructure/
npx vitest run tests/integration/catalog/
npx tsx artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/check_data_center_pages.mts
npx tsx artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/render_data_center_variant.mts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/write_data_center_readme.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/record_data_center_promotion.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/capture_data_center_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/inspect_data_center_video.py
```

The comparison and source-selection note is retained privately at
`/home/andrii/worktrees/kernelCAD-private/catalog-data-center-infrastructure-compare-20261105/COMPARISON.md`.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/capture_data_center_demo.py`
- video review: `python3 artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/inspect_data_center_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
