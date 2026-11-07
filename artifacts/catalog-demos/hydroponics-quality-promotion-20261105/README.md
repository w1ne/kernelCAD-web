# Hydroponics quality promotion

[Watch the 24-second local workflow demo](hydroponics-quality-promotion.mp4).

The MP4 shows before/after previews for the tunnel bay, exhaust fan and pump skid, then renders the pump's indexed `highVisibility` preset and presents the local verification results. It demonstrates source edits, software preview rendering and local catalog checks. It does not show a deployment or physical equipment test.

## Promotion result

- Promoted all **52 existing hydroponics asset IDs** in place; added zero IDs.
- Added **152 material-named color controls**, 2–4 per asset, and **104 named preset entries** (`weathered` and `highVisibility`). Every source passes `scripts/checkCatalogQuality.py`: **52/52**.
- Added loft-profiled cylinder forms, an arched polyethylene greenhouse roof, open fan frames with swept blades, and a cylindrical motor/volute pump assembly. The fan mounting bosses now sit on the base plane. Seedling plug rows use grow-substrate color; the tray handles use polymer; the float clamp uses stainless steel.
- Re-rendered **52/52 previews** and rebuilt the **2,390-row** index. All 52 kit source hashes match, and all 52 rows have indexed preview paths. Meshes range from 160 to 564 triangles under the existing 1,800-triangle budgets.
- Catalog quality moved from **1,296/2,390 passing (54.23%)** to **1,348/2,390 passing (56.40%)**; 1,042 assets remain thin (43.60%).
- Kit ESLint passes. Catalog integration passes **4/4 files, 15/15 tests**. The local page build produced all 2,390 pages; all 52 hydroponics pages have previews and expose both preset entries.

The [three-preview review](preview-review.md) records what is visible in the tunnel, pump and exhaust fan renders. The [preset render](high-visibility-variants/circulation-pump-skid.highVisibility.png) is built from values read from `catalog/index.json`. The [promotion audit](promotion-audit.json) verifies hashes, previews, material controls, presets, triangle budgets, gate counts and check statuses.

## Source and invocation

The [promotion source](promote_hydroponics.py) transforms the pre-promotion kit from revision `5cddb841c`. The [settings file](settings.json) records the commands, branch, baseline and claim boundary. [Initial test output](catalog-test-first-run-output.txt) retains the base-plane issue found by the first suite run; after correcting the fan bosses, the [final test output](catalog-test-output.txt) passes.

To replay the source transformation from a later checkout, restore the original kit from its pre-promotion revision first:

```sh
git restore --source=5cddb841c -- catalog/kits/hydroponics
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/hydroponics-quality-promotion-20261105/promote_hydroponics.py
xargs -a artifacts/catalog-demos/hydroponics-quality-promotion-20261105/preview-asset-ids.txt npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit hydroponics
npx eslint catalog/kits/hydroponics/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-hydroponics-quality-20261105
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/hydroponics-quality-promotion-20261105/verify_hydroponics_pages.py /tmp/kernelcad-hydroponics-quality-20261105
npx tsx artifacts/catalog-demos/hydroponics-quality-promotion-20261105/render_hydroponics_variant.ts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/hydroponics-quality-promotion-20261105/capture_hydroponics_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/hydroponics-quality-promotion-20261105/inspect_hydroponics_demo.py
```

## Website and claim boundaries

On 2026-11-05 the public homepage and `/assets.json` returned HTTP 200. `/catalog/` and `/catalog/hydroponics/` returned HTTP 404. This branch is not deployed, so updated public-page behavior remains unverified. Local static page generation is recorded separately from deployed behavior.

These are stylized visualization assets. They do not establish greenhouse suitability, crop yield, nutrient or water performance, sensor calibration, equipment ratings, food-contact suitability, structural capacity, safety, regulatory compliance, fabrication, hardware acceptance or physical fit.
