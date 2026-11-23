# Office writing-tool silhouette refinement — 2026-11-10

**Demo:** [source-to-preview MP4](office-tools-silhouette.mp4) · [poster](poster.png) · [decoded video review](video-review/visual-review.md)

This local refinement updates two existing office assets after their catalog
previews read as box stacks. The highlighter now has a rounded barrel and cap,
a side clip, and a sloped felt chisel nib with a fluorescent face. The
mechanical pencil now has a turned aluminum barrel, separately colored rubber
grip and raised ribs, tapered nose, click button, pocket clip, and exposed
graphite lead. Both keep their compact/standard format choice and
professional/classroom palettes; no IDs or kits were added.

## Changes and results

- Refined two existing sources: `office/highlighter` and
  `office/mechanical-pencil`.
- Added one material control per asset: the highlighter now separates barrel
  and cap polymers, and the pencil has its own rubber grip control. Each asset
  exposes four material-named controls. No preset entries were added; all four
  existing professional/classroom looks remain available.
- Raised the honest budgets from **120 to 320** triangles for the highlighter
  (232 used), and from **120 to 900** for the pencil (802 used).
- Regenerated all **40/40** office previews and rebuilt `catalog/index.json`.
  The changed sources' SHA-256 values match their generated rows, and both rows
  retain preview paths backed by PNG files.
- Quality gate: office **40/40**; catalog **2,402/2,402 (100.00%)**, with no
  thin assets. ESLint and the catalog integration suite passed; see the saved
  command output in this bundle.
- Generated all 2,402 local catalog pages; the hub and both changed pages,
  controls, presets and copied previews pass the retained page checks.
- The 15-second MP4 was decoded and inspected at **1280×720, 24 fps**.

## Reproduce

Run from the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts archive-box business-card-holder calculator clipboard desk-calendar desk-organizer dry-erase-board envelope-stack file-folder footrest fountain-pen hanging-file-folder highlighter hole-punch ink-pad label-maker laminator laptop-stand letter-sorter letter-tray marker mechanical-pencil memo-pad monitor-riser mousepad notebook office-pinboard paper-clip-dish paper-cutter paper-shredder paperweight pencil-cup ring-binder rubber-stamp ruler scissors stapler sticky-notes tape-dispenser wrist-rest
npx tsx scripts/buildAssetCatalog.ts
npx tsx artifacts/catalog-demos/office-tools-silhouette-20261110/render_variants.ts
python3 scripts/checkCatalogQuality.py --kit office
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/office/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-office-tools-silhouette-20261110
python3 artifacts/catalog-demos/office-tools-silhouette-20261110/verify_asset_index.py
python3 artifacts/catalog-demos/office-tools-silhouette-20261110/verify_local_pages.py /tmp/kernelcad-office-tools-silhouette-20261110
python3 artifacts/catalog-demos/office-tools-silhouette-20261110/capture_demo.py
```

The prior source and previews are in [`before/`](before/); revised source
snapshots are in [`source/`](source/). [`render_variants.ts`](render_variants.ts)
rebuilds the four preset images directly from `.kcad.ts` using the low-poly GLB
exporter and the software preview renderer. [`demo-settings.json`](demo-settings.json)
records the exact invocations and video settings. Hash, budget, preview, page,
lint and test evidence is saved in this directory.

## Visual review and limits

The reviewed highlighter preview shows a gold barrel, a contrasting orange
rounded cap and side clip, and the angled felt nib with a bright ink face. The
mechanical-pencil preview shows a long silver turned body, dark ribbed rubber
grip, red click button, tapered nose, clip and separate graphite lead. The
fountain-pen preview was also opened as a third office-kit cross-check; it
continues to read as a blue pen with a separate clipped cap and metallic nib.
The classroom renders visibly change both objects' palettes.

These results are local source renders, page builds and validation. This branch
is not deployed, so no updated public page behavior is claimed. The geometry is
generic low-poly visualization, not a product replica, manufacturing
specification, or physical acceptance result. The dated comparison record is
kept privately; the public handoff describes only native kernelCAD behavior.
