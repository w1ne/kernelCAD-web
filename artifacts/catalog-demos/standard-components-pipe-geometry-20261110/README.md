# Pipe and spacer geometry — standard-components

**Demo:** [source-to-preview MP4](standard-components-pipe-geometry.mp4) · [decoded sample sheet](video-review/decoded-samples.png) · [three-preview review](preview-review/three-previews.png)

This in-place refinement improves three existing standard-components assets.
The pipe reducer now reads as a hollow tapered fitting; its outlet ratio changes
the actual taper, and its painted-steel barrel, zinc-plated collars, and
elastomer band have separate color controls. The retaining ring now has open
plier holes and a selectable 4/6/8 mm gap that moves its ears. The tubular spacer reads
as a sleeve rather than a washer: its 22/36/50 mm length choice changes the
barrel, and the polymer liner and plated rims remain independently colored.

No asset IDs or kit counts changed. The standard-components kit remains 50/50
passing; its average material-control count rises from 2.50 to 2.54. The global
quality gate remains **2,402/2,402 passing (100.00%; 50 rich kits, zero thin
kits)**. Default meshes are 474/620 triangles (reducer), 228/420 (retaining
ring), and 432/520 (spacer). This is local branch evidence; it does not imply a
deployment or physical acceptance.

## Source and reproduction

- [Design brief](design-brief.md)
- Previous sources and previews: [`before/`](before/)
- Current source snapshots: [`source/`](source/)
- Exact render choices and commands: [`demo-settings.json`](demo-settings.json)
- Source-driven variant renderer: [`render_variants.ts`](render_variants.ts)
- Complete kit preview renderer: [`render_kit_previews.py`](render_kit_previews.py)

From the repository root:

```sh
python3 artifacts/catalog-demos/standard-components-pipe-geometry-20261110/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
npx tsx artifacts/catalog-demos/standard-components-pipe-geometry-20261110/render_variants.ts
npm run catalog:pages
python3 artifacts/catalog-demos/standard-components-pipe-geometry-20261110/verify_asset_index.py
python3 artifacts/catalog-demos/standard-components-pipe-geometry-20261110/verify_local_pages.py
python3 scripts/checkCatalogQuality.py --kit standard-components
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/standard-components/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/standard-components-pipe-geometry-20261110/capture_demo.py
python3 artifacts/catalog-demos/standard-components-pipe-geometry-20261110/inspect_video.py
```

`render_variants.ts` runs each source choice through `variantSource` and the
kernelCAD low-poly GLB exporter, then renders the resulting meshes. Its manifest
checks outlet-ratio and gap changes, short/long height, palette changes, and each
asset's triangle budget. It records exact source and PNG hashes. The screenshot
bundle and MP4 use those rendered results; no model pixels are painted.

## Visual and verification evidence

The three final catalog previews were opened. The reducer shows a continuous
taper between two metal collars with a red seal band; the retaining ring shows
an open spring band and two pierced ears; the spacer shows a long blue steel
sleeve, orange bore liner, and bright end rims. `preview-review/three-previews.png`
retains the reviewed contact sheet.

The local page build and source-hash checks are recorded beside the command
outputs. The 12 geometry and palette variant renders are checked against the
source options and triangle budgets in `variant-manifest.json`; the integration
suite and catalog-wide index verification provide additional freshness checks.
See `verification-summary.txt` for the retained outcomes and `index-rebuild-output.txt`
for the index build record. The current live asset URL returned 404 during the initial review, and
this feature branch is not deployed; the local page is not evidence of deployed
behavior. The dated comparison of official parametric-CAD workflows is retained
privately in `kernelCAD-private/catalog-standard-components-pipe-refinement-20261110/COMPARISON.md`.

These are generic low-poly visualizations, not vendor-certified components,
manufacturing dimensions, fit verification, or physical-acceptance evidence.
