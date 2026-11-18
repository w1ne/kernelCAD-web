# Garden compost bin visual refinement — 2026-11-09

**Demo:** [compost-bin-quality.mp4](compost-bin-quality.mp4) ·
[poster](video-review/contact-sheet.png)

This round refines the existing [`garden/compost-bin` source](../../../catalog/kits/garden/compost-bin.kcad.ts).
The model now shows its compost-colored mound through a configurable removable-
slat front. `frontAccess` builds `open`, `lower-access`, or `closed` layouts;
`width` remains selectable. The existing two material controls now have
stronger treated-timber / compost contrast, and a third named `mature` palette
joins `recycled` and `painted`.

## Result

- The default preview is a slatted timber bin with an open front and a visible,
  rounded dark compost pile. The lower-access choice removes the bottom three
  front boards; the closed choice restores all six.
- The default model is **296 triangles** under its unchanged **420-triangle
  budget**. It exposes two material-named color controls and three named
  presets. No asset IDs or kit counts changed.
- All **40 garden previews** were regenerated and `catalog/index.json` was
  rebuilt. The edited source SHA-256 matches its generated index row.
- The quality gate remains **40/40 in garden** and **2,402/2,402 overall
  (100.00%; 50 rich kits, 0 thin kits)**.
- The three spot-checked garden previews read as a compost bin with visible
  wood/compost separation, a timber arbor, and a green multi-cell seedling
  tray. The access variants and painted preset were also rendered from the
  `.kcad.ts` source and reviewed.
- `npx eslint catalog/kits/garden/` passed. The requested catalog integration
  suite is being run. The in-memory output of the catalog `renderAssetPage`
  function passed its title, controls, presets, Studio-link and triangle-fact
  checks.
- The video is H.264, 1280×720, 30 fps, 12 seconds. Four decoded samples were
  inspected from the MP4. It shows the original preview, new default,
  lower-access/closed choices, and the painted preset.

## Claim limits

This branch has not been deployed, so no live-page update is claimed. A full
static catalog-page export was attempted but stopped at directory creation with
`ENOSPC` because the root filesystem was at 100% usage. The target page content
was checked in memory from the rebuilt index; a copied-preview page audit must
be rerun when storage is available. These are source and software-preview
checks; no replay/simulation, product fit, composting performance,
manufacturing suitability, or physical acceptance is claimed.

The dated comparison of current compost-bin product references is retained in
the private `kernelCAD-private` research workspace; public documentation here
describes native kernelCAD asset behavior only.

## Reproduce

From the repository root:

```sh
python3 artifacts/catalog-demos/garden-compost-bin-quality-20261109/render_garden_previews.py
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit garden
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/garden/
npx vitest run tests/integration/catalog/
npx tsx artifacts/catalog-demos/garden-compost-bin-quality-20261109/render_compost_bin_variants.ts
python3 artifacts/catalog-demos/garden-compost-bin-quality-20261109/capture_compost_bin_demo.py
python3 artifacts/catalog-demos/garden-compost-bin-quality-20261109/inspect_compost_bin_video.py
npx tsx artifacts/catalog-demos/garden-compost-bin-quality-20261109/verify_catalog_page_memory.ts
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-garden-compost-bin-pages-20261109
python3 artifacts/catalog-demos/garden-compost-bin-quality-20261109/verify_local_page.py /tmp/kernelcad-garden-compost-bin-pages-20261109
```

`demo-settings.json` records the source, variants, video settings, commands and
claim limits. `render_compost_bin_variants.ts` checks the selected access modes
and palette names against the source before rendering. The baseline preview,
variant PNGs and hashes, MP4 source, decoded review samples, and command outputs
are retained alongside this handoff.
