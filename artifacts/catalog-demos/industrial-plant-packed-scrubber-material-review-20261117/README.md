# Packed scrubber column material correction — 2026-11-17

**Demo:** [15-second local source-to-preview MP4](industrial-plant-packed-scrubber-material-review.mp4) · [before preview](before/packed-scrubber-column.png) · [after preview](after/packed-scrubber-column.png) · [five-preview audit ledger](preview-review.md)

**Evidence:** [changed source](after/packed-scrubber-column.kcad.ts) · [demo settings and commands](demo-settings.json) · [verification report](verification.json) · [index verification](index-verification.json) · [video inspection](video-review/inspection.json)

## Finding and change

Reviewed five industrial-plant previews. The packed scrubber's large sump and
two process nozzle bodies used the safety-paint finish, while the vessel shell
used the steel finish. They now share the existing vessel finish. Safety paint
remains on the service decks, ladder rails and roof lip.

The asset ID, dimensions, parts, geometry, color controls, presets and triangle
budget are unchanged. The preview remains **548 triangles / 1,400 budget**.
Four other reviewed assets were left unchanged; the full ledger is linked above.

## Verification

- The new GLB material regression failed on the baseline because `sump` used
  safety paint, then passed after the three process-part color assignments
  changed. It confirms the steel finish, retained access safety paint, 548
  triangles, bounds, controls and presets.
- `npx vitest run tests/integration/catalog/` passed **128 files / 198 tests**,
  including the full 2,402-asset source/index freshness and export check.
- ESLint is clean for `catalog/kits/industrial-plant/` and the new regression.
- Industrial-plant quality gate: **60/60 (100.00%)**. The catalog-wide
  structural gate reports **2,398/2,402 (99.83%)**; four unrelated
  `standard-components` assets remain thin.
- The generated index retains **2,402 rows and IDs**. Exactly the scrubber row
  changed; a saved digest confirms all 2,401 non-target rows are unchanged. Its
  source SHA-256 matches, and the preview path/file remain present.
- The local detail-page build produced 2,402 asset pages. The scrubber page
  contains its controls, presets and current rendered preview.
- The public detail page and preview returned HTTP 200 before and after this
  local change. The live preview still matches the saved baseline, not the
  changed local image. This branch is not deployed.

The public detail page and preview both served HTTP 200 before the edit, and the
live preview matched the checked-in baseline. This change is a local branch
update; it has not been deployed, so the public page continues to serve the
baseline preview.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/catalog/packedScrubberWettedPartsMaterial.test.ts
npx tsx scripts/renderCatalogPreviews.ts packed-scrubber-column
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/industrial-plant-packed-scrubber-material-review-20261117/verify_asset_index.py
npx vitest run tests/integration/catalog/
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/packedScrubberWettedPartsMaterial.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
python3 scripts/checkCatalogQuality.py  # 2,398/2,402; exit 1 for four unrelated standard-components assets
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-packed-scrubber-pages
python3 artifacts/catalog-demos/industrial-plant-packed-scrubber-material-review-20261117/verify_local_page.py /tmp/kernelcad-packed-scrubber-pages
python3 artifacts/catalog-demos/industrial-plant-packed-scrubber-material-review-20261117/verify_live_site.py
python3 artifacts/catalog-demos/industrial-plant-packed-scrubber-material-review-20261117/capture_demo.py
python3 artifacts/catalog-demos/industrial-plant-packed-scrubber-material-review-20261117/inspect_video.py
```

The catalog-wide structural command reports 2,398/2,402 and exits 1 for the
four unrelated thin assets in `standard-components`.

The MP4 shows local source rendering and software validation only. It does not
show deployment, simulation, engineering performance, or hardware acceptance.
