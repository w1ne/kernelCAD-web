# Industrial plant quality promotion

[Watch the 24-second source-to-preview walkthrough](industrial-plant-quality-promotion.mp4).

This round promotes all 60 existing industrial-plant assets in place. It adds no asset IDs, names, or duplicate rows. Each source now exposes two to four material-named color controls and `weathered` / `highVisibility` presets. Rubber wheels and rollers and gauge glass have their own controls where present. The axial fan now has a hollow shroud with visible rotor blades, the cooling tower uses a narrowed and flared lofted shell, and the weigh hopper has a tapered transition into its outlet. Other established multi-part silhouettes remain intact.

The [promotion audit](promotion-audit.json) records per-asset material controls, preset coverage, triangle budgets, source hashes, previews, and overall catalog pass rate. [ESLint](catalog-eslint-status.json), [catalog integration](catalog-test-status.json), [local pages](catalog-pages-check.json), and the [three-preview review](preview-review.md) retain their results. The [highVisibility variant record](variant-verification.json) shows a catalog preset evaluated from its source, exported as a low-poly GLB, and software-rendered.

Overall quality-gate progress moved from **1,120/2,390 assets passing (46.86%)** to **1,180/2,390 passing (49.37%)**. The kit adds 60 passing assets without increasing the catalog count; 1,210 assets remain thin.

The MP4 compares the original and refreshed axial-fan and cooling-tower previews, shows a rendered preset variant and authored material controls, and presents representative equipment and structures. The capture source, [settings](settings.json), original samples, generated frames, and decoded video review are kept in this bundle. It demonstrates local source authoring, catalog preview rendering, index generation, and software checks. The branch is not deployed. These are visualization props; equipment ratings, process behavior, operator safety, physical fit, manufacturing, hardware acceptance, and production performance are not assessed.

## Rebuild and verify

Run from the repository root. The promotion script expects the pre-promotion source in `HEAD^`; restore those sources before replaying it on the completed change.

```sh
git restore --source=HEAD^ -- catalog/kits/industrial-plant
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/industrial-plant-quality-promotion-20261105/promote_industrial_plant.py --dry-run
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/industrial-plant-quality-promotion-20261105/promote_industrial_plant.py
mapfile -t asset_ids < <(find catalog/kits/industrial-plant -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
python scripts/checkCatalogQuality.py --kit industrial-plant
npx eslint catalog/kits/industrial-plant/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-industrial-plant-quality-pages
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/industrial-plant-quality-promotion-20261105/verify_industrial_plant_pages.py /tmp/kernelcad-industrial-plant-quality-pages
npx tsx artifacts/catalog-demos/industrial-plant-quality-promotion-20261105/render_industrial_variant.mts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/industrial-plant-quality-promotion-20261105/record_promotion_results.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/industrial-plant-quality-promotion-20261105/capture_industrial_plant_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/industrial-plant-quality-promotion-20261105/inspect_industrial_plant_video.py
```

`catalog/index.json` is generated and must be rebuilt after source or preview edits. The local page audit checks all 60 detail pages, parameter and preset names, copied previews, and the catalog hub. Verify public catalog pages after this branch is integrated and deployed.
