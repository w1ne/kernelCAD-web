# Airfield quality promotion

[Watch the source-to-preview walkthrough](airfield-quality-promotion.mp4).

This round promoted all **40 existing airfield assets in place**. The source
adds 142 material-named color controls, 80 named preset entries across 40
`presets()` blocks, and keeps each asset's scale knob. No IDs were added or
renamed. Every airfield default preview was rerendered before the final
`catalog/index.json` build.

Structural refinements include three-pane cab glazing on eight service
vehicles, stainless compartment panels and a visible roof ladder on the airport
fire engine, a pitched open-front hangar, a tapered control-tower shaft, and a
more legible terminal gate facade. Default palettes now distinguish paint,
metal, concrete, glazing, glass, rubber, fabric and other named materials.
The [preview review](preview-review.md) records full-size visual checks.

## Results

- All **40/40 airfield assets pass (100%)** in `checkCatalogQuality.py`, up from
  0/40. The kit adds 142 material controls (2–4 per asset) and 80 preset
  entries (`weathered` and `highVisibility`).
- Catalog-wide quality moved from **2,051/2,390 (85.82%)** to
  **2,091/2,390 (87.49%)**. There are 299 thin assets (12.51%) remaining across
  seven fully thin kits and mixed kits. The global quality scan therefore
  exits 1 while those assets remain; the targeted airfield scan passes.
- All 40 default previews were rerendered and indexed. The [source/index
  audit](source-index-audit.json) confirms 40 matching source hashes, 40
  present preview paths, 40 triangle budgets respected, all 40 preset blocks,
  and the unchanged ID set. Every asset stays below its 1,800-triangle budget.
- `npx eslint catalog/kits/airfield/` passed. The catalog integration suite
  passed all four files and 15 tests, including full-catalog source/hash,
  triangle-budget and Studio-parameter checks.
- The local page builder produced all 2,390 asset pages and the catalog hub.
  The [page check](catalog-pages-check.json) verified all 40 airfield detail
  pages, previews, and source hashes. This checks generated branch output only.
- Six named-preset renders replayed values from the source for the fire engine,
  control tower and hangar. Each pair has matching geometry and triangle
  counts; see [preset results](preset-renders.json).
- The npm package audit found all 40 airfield sources and previews plus the
  generated index, kept package exports unchanged, and found no product-layer
  implementation paths. See [package-boundary results](package-boundary-audit.json).
- The current public homepage, asset library, asset manifest, and a published
  airfield source/preview were checked before this branch update. This branch
  has not been deployed; no post-deployment behavior is claimed.

## Handoff and evidence

- [Promoted kit documentation](../../../catalog/kits/airfield/README.md) and
  [catalog asset guide](../../../docs/catalog-assets.md)
- [Promotion script](promote_airfield_quality.py), [promotion plan](promotion-plan.json),
  [clean-room source replay audit](promotion-replay-audit.json),
  [before previews](before/), [refreshed previews](../../../catalog/kits/airfield/previews/),
  and [preview review](preview-review.md)
- [Exact all-ID render invocation](preview-render-invocation.txt),
  [render output](preview-render-output.txt), [final refinement renders](preview-refinement-output.txt),
  [index build output](catalog-build-output.txt), and [README triangle refresh](readme-triangle-refresh.txt)
- [Baseline kit quality](airfield-quality-before.txt), [final kit quality](airfield-quality-after.txt),
  [baseline catalog quality](catalog-quality-before.txt), [final catalog quality](catalog-quality-after.txt),
  [catalog quality status](catalog-quality-status.json), [source/index audit](source-index-audit.json),
  and [verification summary](verification.json)
- [ESLint output](eslint-output.txt), [integration output](catalog-integration-output.txt),
  [local page build](catalog-pages-build-output.txt), [local page check](catalog-pages-check-output.txt),
  [live website baseline](live-website-before.json), and [npm package audit](package-boundary-audit.json)
- [Preset renderer](render_airfield_presets.ts) and [preset images](presets/)
- [Demo capture source](capture_airfield_quality.py), [video settings](settings.json),
  [invocations](invocations.txt), [capture output](demo-capture-output.txt),
  [video inspection source](inspect_airfield_quality_video.py),
  [inspection output](video-inspection-output.txt), and decoded
  contact sheet (`video-review/contact-sheet.png`, not tracked)

## Reproduction

Run from the repository root. The original airfield generator restores the
single-color starting sources; the promotion script is a one-time migration and
expects that state. Render the IDs in `preview-render-invocation.txt`, then
rebuild the index so source hashes, triangle data and preview paths match.

```sh
python3 artifacts/catalog-demos/airfield-wave-20261102/generate_airfield_assets.py
python3 artifacts/catalog-demos/airfield-quality-promotion-20261105/promote_airfield_quality.py --apply
# Exact all-40 render command is in preview-render-invocation.txt.
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit airfield
npx eslint catalog/kits/airfield/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-airfield-catalog-pages
python3 artifacts/catalog-demos/airfield-quality-promotion-20261105/verify_airfield_pages.py /tmp/kernelcad-airfield-catalog-pages
npx tsx artifacts/catalog-demos/airfield-quality-promotion-20261105/render_airfield_presets.ts
python3 artifacts/catalog-demos/airfield-quality-promotion-20261105/capture_airfield_quality.py
python3 artifacts/catalog-demos/airfield-quality-promotion-20261105/inspect_airfield_quality_video.py
python3 artifacts/catalog-demos/airfield-quality-promotion-20261105/audit_npm_package.py
```

## Scope

These are generic CC0 visualization props. Source quality checks, previews,
preset replays, generated pages and package audits describe this branch. They
do not establish deployed behavior, airport operations, aviation performance,
airworthiness, vehicle ratings, regulatory compliance, or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/airfield-quality-promotion-20261105/capture_airfield_quality.py`
- video review: `python3 artifacts/catalog-demos/airfield-quality-promotion-20261105/inspect_airfield_quality_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
