# Office scissors default-view repair — 2026-11-06

**Demo:** [15-second source-to-preview MP4](office-scissors-detail.mp4) · [poster](poster.png)

This follow-up repairs one existing office asset after its catalog-angle preview
showed two finger loops separated from the blade shoulders. Two tapered polymer
tangs now connect the loops to the brass pivot. The stainless-steel blades,
polymer handles and brass pivot remain independently colored; the existing
`professional` and `classroom` presets remain available.

## Changes and results

- Refined `office/scissors` in place. Added no kits or asset IDs.
- Added two named geometry parts, `lower-handle-tang` and
  `upper-handle-tang`; added **0** color controls and **0** presets. The asset
  retains three material controls and both named looks.
- Raised the honest triangle budget from **280** to **360**; the rendered model
  uses **316** triangles.
- Re-rendered all **40/40** office previews and regenerated
  `catalog/index.json`. The scissors source SHA-256 matches its generated index
  row, and the preview path is indexed.
- Quality gate: office **40/40**; catalog **2,390/2,390 (100.00%)**, with no
  thin assets.
- ESLint passed. Catalog integration passed **4 files / 15 tests**.
- Generated the local catalog site and checked the scissors page **7/7** for
  its preview, source hash, material controls, presets and triangle budget.

## Reproduce

From the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts archive-box business-card-holder calculator clipboard desk-calendar desk-organizer dry-erase-board envelope-stack file-folder footrest fountain-pen hanging-file-folder highlighter hole-punch ink-pad label-maker laminator laptop-stand letter-sorter letter-tray marker mechanical-pencil memo-pad monitor-riser mousepad notebook office-pinboard paper-clip-dish paper-cutter paper-shredder paperweight pencil-cup ring-binder rubber-stamp ruler scissors stapler sticky-notes tape-dispenser wrist-rest
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit office
npx eslint catalog/kits/office/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-office-scissors-20261106
python3 artifacts/catalog-demos/office-scissors-detail-20261106/verify_scissors_page.py
npx tsx artifacts/catalog-demos/office-scissors-detail-20261106/render_scissors_presets.ts
python3 artifacts/catalog-demos/office-scissors-detail-20261106/capture_scissors_demo.py
```

[`demo-settings.json`](demo-settings.json) records the exact invocation,
preview IDs, video settings and local provenance. The previous and revised
`.kcad.ts` source and preview are retained in [`before/`](before/) and
[`after/`](after/); exact named palette renders are in [`variants/`](variants/).
Command output, index/source verification, local-page checks, and decoded video
frames are in this bundle.

## Visual review and limits

The regenerated scissors preview shows red polymer tangs joining both finger
loops to the brass pivot, with two open silver blades. The fountain pen preview
still reads as an upright blue pen with a cap and silver band; the paper
shredder reads as a graphite office machine with a top feed slot, bin window and
front casters. The MP4 was decoded and visually inspected at **1280×720, 24 fps,
15 seconds**.

These are local source renders and validation results. The branch is not
deployed; no live-site behavior or physical hardware acceptance is claimed.
These are stylized visualization assets, not vendor-specific scissors geometry
or manufacturing evidence.
