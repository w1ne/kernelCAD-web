# Retail-store quality promotion

[Watch the source-to-preview walkthrough](retail-store-quality-promotion.mp4).

This round promoted all 48 existing retail-store assets in place. It adds 144
material-named color controls across the kit (two to four per asset) and 96
named preset entries: `cleanStore` and `nightRestock` for every ID. No IDs were
added or renamed. All 48 defaults were rendered again before rebuilding
`catalog/index.json` so its source hashes and preview paths match the sources.

The checkout counter now has a contrasting cashier-side fascia and display;
the upright cooler has an open cabinet front with stocked visible shelves; the
shopping cart and baskets have open frames; the produce crates form a stable
ventilated stack with clips at its outer corners. The [preview review](preview-review.md)
records five full-size image checks.

## Results

- The retail-store quality gate passes **48/48 assets (100%)**. Each source has two to
  four material-named color controls and one `presets()` block.
- The catalog gate moved from **2,003/2,390 (83.81%)** to **2,051/2,390
  (85.82%)**. There are 339 thin assets remaining (14.18%), across eight fully
  thin kits and mixed kits. Counts are reported with pass rates.
- All 48 default previews were rendered from the current sources and indexed.
  Source hashes match all 48 index rows, every preview path is present, all
  assets remain within their declared triangle budgets, and the set of IDs is
  unchanged. See [source and index audit](source-index-audit.json).
- `npx eslint catalog/kits/retail-store/` passed. The catalog integration
  suite passed all four files and 15 tests, including full-catalog source/hash
  validation. The [local page build](catalog-pages-build-output.txt) and
  [48-row detail-page, preview and hash check](catalog-pages-check.json) passed.
- Six named-preset renders replayed values from the source for the checkout
  counter, shopping cart and drink cooler. Each pair has the same geometry and
  triangle count. The [preset result data](preset-renders.json) records the
  exact material values.
- The built npm package contains all 48 retail-store sources and previews,
  includes the generated index, preserves package exports, and has no
  product-layer implementation paths. See the [package-boundary audit](package-boundary-audit.json).

## Handoff and evidence

- [Promoted kit documentation](../../../catalog/kits/retail-store/README.md)
  and [catalog asset guide](../../../docs/catalog-assets.md)
- [Source promotion script](promote_retail_store_quality.py), [rendered preset
  script](render_retail_store_presets.ts), and [preset renders](presets/)
- [Before previews](before/) and [refreshed previews](../../../catalog/kits/retail-store/previews/)
- [Preview review](preview-review.md), [settings](settings.json), and [exact invocations](invocations.txt)
- [Exact 48-ID preview command](preview-render-invocation.txt), [render output](preview-render-output.txt),
  [index build output](catalog-build-output.txt), [quality output](retail-store-quality-after.txt),
  and [catalog quality snapshot](catalog-quality-after.txt)
- [Lint output](eslint-output.txt), [integration output](catalog-integration-output.txt),
  [local page build](catalog-pages-build-output.txt), [local page check output](catalog-pages-check-output.txt),
  and [source/index audit](source-index-audit.json)
- [Package audit source](audit_npm_package.py), [package audit output](package-audit-output.txt),
  and [package audit results](package-boundary-audit.json)
- [Demo capture source](capture_retail_store_quality.py), [inspection source](inspect_retail_store_quality_video.py),
  [capture output](demo-capture-output.txt), [video inspection output](video-inspection-output.txt),
  [MP4 inspection data](video-inspection.json), and decoded [contact sheet](video-review/contact-sheet.png)
- [Before quality snapshot](catalog-quality-before.txt), [kit quality before promotion](retail-store-quality-before.txt),
  [live website baseline](live-website-before.json), and [verification summary](verification.json)

## Reproduction

Run from the repository root. The promotion script is a one-time migration from
the original single-color source state. Re-render the exact target IDs listed
in `preview-render-invocation.txt`, then rebuild the index so paths and hashes
match. The preset replay reads the color values directly from each source's
`presets()` block.

```sh
python3 artifacts/catalog-demos/retail-store-quality-promotion-20261105/promote_retail_store_quality.py --apply
# Exact per-kit preview command: see preview-render-invocation.txt.
npx tsx scripts/buildAssetCatalog.ts
python scripts/checkCatalogQuality.py --kit retail-store
npx eslint catalog/kits/retail-store/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-retail-store-catalog-pages
python3 artifacts/catalog-demos/retail-store-quality-promotion-20261105/verify_retail_store_pages.py /tmp/kernelcad-retail-store-catalog-pages
npx tsx artifacts/catalog-demos/retail-store-quality-promotion-20261105/render_retail_store_presets.ts
python3 artifacts/catalog-demos/retail-store-quality-promotion-20261105/capture_retail_store_quality.py
python3 artifacts/catalog-demos/retail-store-quality-promotion-20261105/inspect_retail_store_quality_video.py
python3 artifacts/catalog-demos/retail-store-quality-promotion-20261105/audit_npm_package.py
```

## Scope and deployment

These are generic CC0 store visualization props. Local source evaluation,
default and preset renders, lint, catalog tests, generated pages, and package
contents describe this branch. The live `/asset-library/` route returned HTTP
200 and `/catalog/` returned HTTP 404 before the update. This branch has not
been deployed, so no post-deployment page behavior is claimed. Retail
operations, accessibility, product performance, safety, regulatory compliance
and physical acceptance were not evaluated.
