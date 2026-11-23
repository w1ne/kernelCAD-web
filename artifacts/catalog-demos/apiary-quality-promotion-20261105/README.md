# Apiary quality promotion

[Watch the source-to-preview walkthrough](apiary-quality-promotion.mp4).

This round promoted 49 thin existing apiary assets in place. It adds 121
material-named controls and 98 preset entries, with two named palettes per
promoted asset. The already-rich apiary gate keeps its three material controls
and two presets. All 50 existing IDs retain their scale control and triangle
budget; no IDs were added or renamed. All 50 default previews were rendered
again, then `catalog/index.json` was regenerated.

The shade canopy now has a canvas roof and visible steel corner brackets. Hive
frames show separate beeswax foundation. The top-bar hive keeps its parallel
bar silhouette and metal roof skin. The bee smoker has a tapered, revolved
spout and round tip; the honey extractor has an angled crank. The honey jar
uses an amber body, tinted-glass neck, brass lid, and paper label. See the
[full-size preview review](preview-review.md).

## Results

- The apiary quality gate passes **50/50 assets**. Every source has two to four
  material-named controls and a `presets()` block.
- The catalog gate moved from **1,954/2,390 (81.76%)** to **2,003/2,390
  (83.81%)**. There are 387 thin assets remaining (16.19%), across nine fully
  thin kits plus mixed kits. Counts are reported with their pass rates.
- All 50 default previews were rendered from the current sources and indexed.
  Five previews were opened at full size: the Langstroth hive shows stacked
  timber boxes, a steel roof and painted entrance; the smoker shows a metal pot,
  separate bellows and tapered spout; the extractor shows a drum, tripod legs
  and crank; the shade canopy shows its canvas roof and steel brackets; and the
  honey jar shows amber contents, glass neck, brass lid and label.
- Named preset colors were replayed from source for three sample assets. The
  video shows the source parameters, actual preset renders, refreshed previews
  and local verification status.
- `npx eslint catalog/kits/apiary/` passed. The catalog integration suite
  passed all four files and 15 tests; it caught an extra PBR export material on
  the honey jar, which was removed while keeping the visibly tinted neck. The
  corrected source then passed the full suite.
- The generated-page check passed for all 50 apiary detail pages, copied
  previews, and source hashes. The npm package audit included all 50 sources
  and previews, kept package exports unchanged, and found no product
  implementation paths.

## Handoff and evidence

- [Promoted kit documentation](../../../catalog/kits/apiary/README.md) and
  [catalog asset guide](../../../docs/catalog-assets.md)
- [Source promotion script](promote_apiary_quality.py), [rendered preset
  script](render_apiary_presets.ts), and [preset renders](presets/)
- [Before previews](before/) and [refreshed previews](../../../catalog/kits/apiary/previews/)
- [Preview review](preview-review.md), [settings](settings.json), and [exact
  invocations](invocations.txt)
- [Default render invocation](preview-render-invocation.txt) and
  [render output](preview-render-output.txt)
- [Final honey-jar render](honey-jar-correction-render-output.txt), [index build
  output](catalog-build-output.txt), and [static page build output](catalog-pages-build-output.txt)
- [Apiary quality output](apiary-quality-output.txt), [catalog quality
  snapshot](catalog-quality-after.txt), [lint output](eslint-output.txt),
  [integration test output](catalog-integration-output.txt), generated-page
  check, and package-boundary audit. The [initial integration failure](catalog-integration-initial-failure.txt)
  records the material issue fixed before the passing rerun.
- [Preset replay results](preset-renders.json), [local page check](catalog-pages-check.json),
  [package audit](package-boundary-audit.json), and [verification summary](verification.json)
- [Demo capture source](capture_apiary_quality.py), [inspection source](inspect_apiary_quality_video.py),
  [capture output](demo-capture-output.txt), and [video inspection output](video-inspection-output.txt)
- [MP4 inspection](video-inspection.json), decoded contact sheet (`video-review/contact-sheet.png`, not tracked),
  and [poster](poster.png)
- [Index build output](catalog-build-output.txt), [before quality snapshot](catalog-quality-before.txt),
  and [kit quality before promotion](apiary-quality-before.txt)
- [Live website baseline](live-website-check.json): checked before promotion;
  this feature branch has not been deployed.

## Reproduction

Run from the repository root. The promotion script records the material
assignment and named appearance palettes. The default preview command renders
only the 50 apiary IDs. The index is rebuilt after previews so its source hashes
and preview paths match the current sources.

```sh
python3 artifacts/catalog-demos/apiary-quality-promotion-20261105/promote_apiary_quality.py
# Exact 50-ID command is recorded in preview-render-invocation.txt.
npx tsx scripts/renderCatalogPreviews.ts <50 apiary IDs>
npx tsx scripts/buildAssetCatalog.ts
python scripts/checkCatalogQuality.py --kit apiary
npx eslint catalog/kits/apiary/
npx vitest run tests/integration/catalog/
npx tsx artifacts/catalog-demos/apiary-quality-promotion-20261105/render_apiary_presets.ts
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-apiary-catalog-pages
python3 artifacts/catalog-demos/apiary-quality-promotion-20261105/verify_apiary_quality_pages.py /tmp/kernelcad-apiary-catalog-pages
python3 artifacts/catalog-demos/apiary-quality-promotion-20261105/capture_apiary_quality.py
python3 artifacts/catalog-demos/apiary-quality-promotion-20261105/inspect_apiary_quality_video.py
python3 artifacts/catalog-demos/apiary-quality-promotion-20261105/audit_npm_package.py
```

## Scope and deployment

These are CC0 visualization props. Source evaluation, default and preset
renders, lint, catalog tests, generated pages, and package contents describe
this local branch. The live asset-library page was checked before the update;
it does not contain the apiary kit, and `/catalog/` returned 404. This branch
has not been deployed, so no post-deployment public-page behavior is claimed.
Beekeeping suitability, equipment performance, food-contact suitability,
operator safety, regulatory compliance, physical simulation, and hardware
acceptance were not evaluated.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/apiary-quality-promotion-20261105/capture_apiary_quality.py`
- video review: `python3 artifacts/catalog-demos/apiary-quality-promotion-20261105/inspect_apiary_quality_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
