# Pressure sand filter vessel semantic correction — 2026-11-10

**Demo:** [15-second local source-to-preview MP4](pressure-sand-filter-vessel-semantic-review.mp4) · [poster](poster.png) · [before public preview](before/pressure-sand-filter-vessel.png) · [after preview](after/pressure-sand-filter-vessel.png) · [five-preview audit sheet](preview-review/five-rendered-previews.png) · [video review contact sheet](video-review/contact-sheet.png)

The bundle retains the [before/after source](before/pressure-sand-filter-vessel.kcad.ts), [after source](after/pressure-sand-filter-vessel.kcad.ts), [variant render source](render_variants.ts), [variant manifest](variant-manifest.json), [demo capture source](capture_demo.py), [video inspection](video-review/inspection.json), [index verification](index-verification.json), and [local page check](local-page-check.json). The exact capture/render settings are in [demo-settings.json](demo-settings.json).

## Finding and change

The public `water-treatment/pressure-sand-filter-vessel` source described side inlet/outlet nozzles, but built both as vertical cylinders centered 80 mm beyond the 310 mm vessel radius. Its preview showed a lone disconnected upright stub. The [ledger](preview-review.md) records the five previews: three were left unchanged, the shell-and-tube exchanger had a material palette mismatch documented in the [companion handoff](../shell-tube-exchanger-material-review-20261110/README.md), and this vessel had the separate nozzle geometry/description mismatch fixed here.

The existing inlet and outlet are now annular horizontal nozzles on the accessible vessel side: a lower inlet and an upper outlet that clears the inspection manway. Each nozzle overlaps the shell and ends in a visible stainless flange lip. No asset IDs, kit membership, palette controls, presets, or triangle budget changed. The default is **696 triangles / 2,200 budget**.

The current [public preview](https://kernelcad.com/assets/water-treatment-pressure-sand-filter-vessel.png) and [public source](https://kernelcad.com/assets/water-treatment-pressure-sand-filter-vessel.kcad.ts) were inspected before editing; the source SHA-256 matched the local source. The after render is local branch output, not deployed behavior. No pressure rating, vendor accuracy, or physical acceptance is claimed.

Official equipment references checked on 2026-11-10: Pentair's [Triton II Side Mount Filters](https://www.pentair.com/en-us/pool-spa/products/filters/triton-ii-side-mount-filters.html) and [installation and user's guide](https://www.pentair.com/content/dam/extranet/nam/pentair-pool/commercial/filters/triton/triton-instructions-english-spanish-french.pdf). They show an upright tank with side connectors/piping and a base. The private dated comparison note is retained in `kernelCAD-private`; no vendor dimensions or geometry were copied.

## Verification

- Full water-treatment preview render: **50 assets**; only the changed preview differs in the source diff.
- Regenerated `catalog/index.json`; verified **2,402/2,402 source hashes** and all referenced preview paths/files. The changed row has `/assets/water-treatment-pressure-sand-filter-vessel.png` and 696 triangles.
- Structural quality: water-treatment **50/50 (100%)**; catalog **2,402/2,402 (100%)**. This gate does not prove semantic realism.
- ESLint: passed. Focused exported-GLB regression: passed. Full `tests/integration/catalog/`: **6 files, 17 tests passed**.
- Generated all 2,402 local catalog pages. The changed local detail page has the title, three material controls, two presets, corrected description, and preview hash matching the catalog file.
- [Variant source](render_variants.ts) renders the existing `weathered` palette and `highVisibility` palette from the side. [Variant evidence](variant-manifest.json) records source and preview hashes.

The regression checks actual exported GLB triangle bounds and material zones: the stainless port group is tall across two elevations, narrow across the radial axis, starts inside the shell radius, and projects beyond the shell. It also checks the triangle budget and minimum-up value.

## Reproduce

Run from the repository root:

```sh
python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/verify_asset_index.py
npm run catalog:pages
python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/verify_local_pages.py
python3 scripts/checkCatalogQuality.py --kit water-treatment
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/water-treatment/ tests/integration/catalog/pressureSandFilterVesselFidelity.test.ts artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/render_variants.ts
npx vitest run tests/integration/catalog/
npx tsx artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/render_variants.ts
python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/capture_demo.py
python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/inspect_video.py
```

`preview-render-output.txt`, `index-verification.json`, `local-page-check.json`, quality outputs, `eslint-output.txt`, `integration-output.txt`, the source snapshots, and video inspection report retain the corresponding evidence and settings.

## Evidence limits

The MP4 shows local kernelCAD source variants and software renders with local validation. This branch is not deployed; verify the live preview/source after deployment. Local replay, catalog rendering, deployed behavior, pressure performance and physical acceptance are separate claims.
