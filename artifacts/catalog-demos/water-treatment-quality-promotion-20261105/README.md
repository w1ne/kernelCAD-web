# Water-treatment quality promotion

[Watch the 24-second local workflow demo](water-treatment-quality-promotion.mp4)

The MP4 shows the filter vessel before and after material separation and lofted
shoulders, the lamella clarifier after replacing its solid plate-pack block
with six inclined plates and side supports, a locally rendered
`highVisibility` pump preset read from `catalog/index.json`, and a contact sheet
of the kit's 50 existing preview images. Its final card reports local source,
index, lint, integration, and generated-page checks. The captions distinguish
local renders from deployment, treatment performance, and physical acceptance.

## Promotion result

- Promoted all 50 existing water-treatment asset IDs; added zero IDs.
- Added 139 material-named controls (2–4 per asset) and 100 named preset
  entries (`weathered` and `highVisibility`).
- Replaced flat cylinder ends with lofted shoulders on 45 equipment sources.
  Kept basins and screens rectilinear where that construction describes the
  object. Inclined the six lamella plates and replaced the clarifier's solid
  block with two visible support rails.
- Re-rendered all 50 kit previews, rebuilt the 2,390-row catalog index, and
  verified source hashes, indexed preview paths, and declared triangle
  budgets. The meshes range from 132 to 676 triangles under their existing
  2,200-triangle budgets.
- Overall quality-gate progress is now **1,060/2,390 assets pass (44.35%)**;
  1,330 assets remain thin (55.65%).

## Rebuild and verify

Run from the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/water-treatment-quality-promotion-20261105/promote_water_treatment_assets.py
mapfile -t asset_ids < artifacts/catalog-demos/water-treatment-quality-promotion-20261105/preview-asset-ids.txt
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit water-treatment
npx eslint catalog/kits/water-treatment/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-water-treatment-quality-20261105
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/water-treatment-quality-promotion-20261105/verify_water_treatment_pages.py /tmp/kernelcad-water-treatment-quality-20261105
npx tsx artifacts/catalog-demos/water-treatment-quality-promotion-20261105/render_water_treatment_variant.ts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/water-treatment-quality-promotion-20261105/record_water_treatment_audit.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/water-treatment-quality-promotion-20261105/capture_water_treatment_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/water-treatment-quality-promotion-20261105/inspect_water_treatment_demo.py
```

The bundle keeps the source transformation, exact 50-ID preview list,
invocation settings, preview/index/test/page logs, before/after comparisons,
the indexed preset render, and decoded MP4 inspection frames.

## Website status and limits

The current public baseline returned HTTP 200 for the homepage and
`/assets.json`; the asset index had 50 water-treatment rows with previews and
no presets. `/catalog/` returned HTTP 404. This feature branch is not deployed,
so no updated public-page behavior is claimed.

These are stylized visualization props. They do not define water quality,
process performance, flow, pressure, chemical handling, safety, regulatory
compliance, installation suitability, or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/water-treatment-quality-promotion-20261105/capture_water_treatment_demo.py`
- video review: `python3 artifacts/catalog-demos/water-treatment-quality-promotion-20261105/inspect_water_treatment_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
