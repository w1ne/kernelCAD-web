# Farm machinery quality promotion

[Watch the 24-second source-to-preview walkthrough](farm-machinery-quality-promotion.mp4).

This round improves all 60 existing farm-machinery assets. It adds no catalog rows, names or duplicates. Each source now has 2–4 material-named color controls and `weathered` / `highVisibility` presets. Vehicle and machine silhouettes use distinct forms and material colors; rectilinear components remain box-based where that suits the object. The existing 2,200-triangle budgets remain unchanged.

The [promotion audit](promotion-audit.json) records material controls, presets, geometry updates, catalog pass rate and preview/index checks. [ESLint](catalog-eslint-status.json), [catalog integration tests](catalog-test-status.json), [local page audit](catalog-pages-check.json), and the [preview review](preview-review.md) record the verification results. `checks/` retains command output for the targeted preview correction, source gate, lint and final index rebuild.

The video compares original and regenerated previews, shows the authored source controls and presets, and presents representative vehicles, grain equipment and field tools. Its [inspection manifest](video-inspection.json) records the decoded frame review. It demonstrates local source authoring, preview rendering, catalog indexing and validation only. The models are visualization props; this work does not assess equipment ratings, agricultural performance, safety, physical fit, manufacturing, hardware acceptance or production deployment.

## Rebuild and verify

Run these commands from the repository root. The promotion script expects the original source baseline from this round's parent commit; on this promotion commit, restore the kit sources and README from `HEAD^` before applying it again.

```sh
git restore --source=HEAD^ -- catalog/kits/farm-machinery
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/farm-machinery-quality-promotion-20261105/promote_farm_machinery.py
mapfile -t asset_ids < <(find catalog/kits/farm-machinery -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/farm-machinery/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-farm-machinery-pages
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/farm-machinery-quality-promotion-20261105/verify_farm_machinery_pages.py /tmp/kernelcad-farm-machinery-pages
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/farm-machinery-quality-promotion-20261105/record_promotion_results.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/farm-machinery-quality-promotion-20261105/capture_farm_machinery_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/farm-machinery-quality-promotion-20261105/inspect_farm_machinery_video.py
```

The source preview renderer targets all 60 kit IDs, and the required index build re-evaluates the full catalog. The generated page audit verifies all 60 local asset pages, source hashes, copied previews and the catalog hub. This branch has not been deployed; verify the public pages after the change is integrated and a site build is published.
