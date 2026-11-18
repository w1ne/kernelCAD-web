# Standard-components pulley, elbow and collar refinement — 2026-11-10

**Demo:** [15-second source-to-preview MP4](standard-components-pulley-elbow-collar.mp4) · [decoded frame contact sheet](video-review/contact-sheet.png)

This round refines three existing `standard-components` assets in place. It
adds no asset IDs or kits. The [current kit README](../../../catalog/kits/standard-components/README.md)
documents their controls, silhouettes, and preview meshes.

## Changes

- **V-belt pulley:** two revolved V valleys, paired retaining flanges, keyed
  through-bore, and visible radial locking screw. Material controls: cast iron,
  steel key, zinc-plated hardware. Default mesh: **518 / 700 triangles**.
- **90-degree pipe elbow:** smooth swept hollow turn between perpendicular
  sockets, bronze compression nut, and elastomer seal. Material controls: steel,
  bronze, elastomer. Default mesh: **1,528 / 2,000 triangles**; `minUpM` is
  exactly zero.
- **Shaft collar:** `retention` switches actual geometry between a split clamp
  with cross-bolt and a one-piece collar with radial set screw. Material
  controls: steel and zinc-plated hardware. Default mesh: **416 / 560 triangles**.

The pulley and elbow each gained one material-named color control. Existing
`dark`, `brass`, and `weathered` preset names remain and now cover all visible
material controls; **zero new preset names** were added. The kit's average
material-control count moves from **2.54 to 2.58 per asset**. The quality gate
remains **50/50 assets (100%)** for this kit and **2,402/2,402 (100%; 50 rich
kits, zero thin kits)** across the catalog; this round refined silhouettes and
controls without changing the pass count.

## Source, variants, and verification

- [Before sources and catalog previews](before/)
- [Updated source snapshots](source/) and [final catalog previews](after/previews/)
- [Nine source-driven parameter and palette renders](variants/) and their [contact sheet](variant-contact-sheet.png)
- [Exact controls, choices, commands, canvas settings, and claim limits](demo-settings.json)
- [Variant geometry, palette, budget, and source-hash assertions](variant-manifest.json)
- [50-preview invocation](preview-render-invocation.json) and [index/source/preview checks](preview-index-check.json)
- [Local catalog page check](local-page-check.json)
- [Index build output](catalog-index-build-output.txt), [quality reports](quality-global-output.txt), [kit detail](quality-kit-detail-output.txt), [ESLint output](eslint-output.txt), and [catalog integration output](catalog-integration-output.txt)
- [Video frames and visual inspection record](video-review/)

Run from the repository root:

```sh
npx tsx artifacts/catalog-demos/standard-components-pulley-elbow-collar-20261110/render_variants.ts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/standard-components-pulley-elbow-collar-20261110/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit standard-components
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/standard-components/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-standard-components-pulley-elbow-collar-20261110
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/standard-components-pulley-elbow-collar-20261110/verify_local_pages.py /tmp/kernelcad-standard-components-pulley-elbow-collar-20261110
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/standard-components-pulley-elbow-collar-20261110/capture_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/standard-components-pulley-elbow-collar-20261110/inspect_video.py
```

The dated official workflow comparison is retained privately in
`kernelCAD-private/catalog-standard-components-pulley-elbow-collar-20261110/COMPARISON.md`.
Public documentation describes native kernelCAD geometry and controls only.

## Visual review and limits

The final catalog views read as a double-groove pulley, a curved hollow elbow
with a bronze socket, and a split shaft collar with front-facing clamp hardware.
The MP4 shows the before/after previews, pulley size and palette variants,
collar retention variants, and the elbow's material palette. Its frames were
decoded and inspected. These assets are generic low-poly visualizations, not
supplier geometry, manufacturing specifications, or physical hardware
acceptance. The feature branch is not deployed, so live-page behavior remains
unverified.
