# Mining quality promotion

[Watch the local 18-second workflow demo](mining-quality-promotion.mp4).

## Result

- Promoted all 50 existing mining asset IDs; added zero IDs.
- Added 144 material-named color controls, two to four per asset, and 100 named `weathered` / `highVisibility` preset entries.
- Added faceted loft profiles to the cylindrical components in all 50 source models. The continuous miner now has 20 visible track shoes and 10 cutter picks; the locomotive has three cab-glass panels.
- Re-rendered 50 previews and regenerated `catalog/index.json`; the final audit records source hashes, preview paths, material controls, presets, and triangle budgets.
- Overall catalog quality moved from **1,754/2,390 (73.39%)** to **1,804/2,390 (75.48%)**; 586 assets remain thin. This is a quality-gate result, not an asset-count increase.
- Mining kit ESLint, the catalog integration suite, and generated local catalog page checks are recorded in this bundle.

The demo shows actual before and after previews, the indexed `highVisibility` variant render, the complete 50-preview contact sheet, and local verification. It distinguishes source rendering and local page generation from deployment or real mining-equipment performance. The dated competitor comparisons are recorded privately in the `kernelCAD-private` workspace.

## Rebuild and verify

Run from the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/mining-quality-promotion-20261105/promote_mining_assets.py --write
mapfile -t asset_ids < artifacts/catalog-demos/mining-quality-promotion-20261105/preview-asset-ids.txt
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/mining-quality-promotion-20261105/write_mining_readme.py
python3 scripts/checkCatalogQuality.py --kit mining
npx eslint catalog/kits/mining/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-mining-quality-20261105
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/mining-quality-promotion-20261105/verify_mining_pages.py /tmp/kernelcad-mining-quality-20261105
npx tsx artifacts/catalog-demos/mining-quality-promotion-20261105/render_mining_variant.ts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/mining-quality-promotion-20261105/record_mining_audit.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/mining-quality-promotion-20261105/capture_mining_quality_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/mining-quality-promotion-20261105/inspect_mining_quality_demo.py
```

The bundle retains the reproducible source transformation, the exact preview ID list, source-before previews, final rendered previews in the kit, preset render, checks, and decoded video frames.

## Website status and scope

The live-site check records the current public baseline: 50 mining rows with previews and no presets; `/catalog/` currently returns HTTP 404. This feature branch is not deployed, so no updated public-page behavior is claimed.

These are stylized visualization props. They do not specify equipment dimensions, throughput, safety, structural capacity, mine-site suitability, installation requirements, or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/mining-quality-promotion-20261105/capture_mining_quality_demo.py`
- video review: `python3 artifacts/catalog-demos/mining-quality-promotion-20261105/inspect_mining_quality_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
