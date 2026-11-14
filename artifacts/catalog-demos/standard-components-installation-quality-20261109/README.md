# Standard-components installation variants — 2026-11-09

**Demo:** [15-second source-to-preview MP4](standard-components-installation-quality.mp4) · [decoded frame sheet](video-review/decoded-samples.png)

This local follow-up refined five existing standard-components assets after
their default previews showed little variation beyond uniform size. It keeps
the same IDs and kit. The updated previews show a locating boss on the base
plate, a raised sealing face on the blind flange, elastomer rings inside the
coupling bore, a hollow neck on the pipe flange, and a stepped isolator with a
metal mounting interface on the rubber bumper.

## Changes

- Added one material-named control to each model: zinc-plated fasteners on the
  plate and flanges, rubber seals on the coupling, and zinc-plated insert
  hardware on the bumper. All five now have three color controls and four named
  palettes; five new preset entries were added.
- Added geometry choices: four/eight-hole patterns and open/installed bolt
  layouts on the plate and flanges; sealed/bare coupling ends; male-stud or
  threaded-insert bumper mounts.
- Default meshes: base mounting plate **264 / 1,300** triangles; blind flange
  **296 / 1,500**; pipe coupling **480 / 640**; pipe flange **400 / 1,500**;
  rubber bumper **332 / 420**. The largest rendered variants are **1,208**,
  **1,240**, and **1,344** triangles for the installed eight-hole plate, blind
  flange, and pipe flange respectively.
- The selected assets have no new IDs. The global quality gate remains
  **2,402/2,402 passing (100.00%; 50 rich kits, 0 thin kits)**; the
  standard-components kit remains **50/50 passing** and its average material
  controls increased from **2.28 to 2.38** per asset.

The updated `.kcad.ts` sources are in
[`catalog/kits/standard-components/`](../../../catalog/kits/standard-components/).
The previous five previews are retained in [`before/`](before/), source-driven
option and palette renders in [`variants/`](variants/), and every one of the
kit's 50 current previews was regenerated and indexed. Dated workflow
comparisons are stored in the private research workspace; this public handoff
describes native kernelCAD geometry and controls.

## Reproduce

From the repository root:

```sh
python3 artifacts/catalog-demos/standard-components-installation-quality-20261109/capture_before_previews.py
npx tsx artifacts/catalog-demos/standard-components-installation-quality-20261109/render_variants.ts
python3 artifacts/catalog-demos/standard-components-installation-quality-20261109/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/standard-components-installation-quality-20261109/verify_preview_index.py
npm run catalog:pages
python3 artifacts/catalog-demos/standard-components-installation-quality-20261109/verify_local_pages.py
python3 scripts/checkCatalogQuality.py --kit standard-components
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/standard-components/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/standard-components-installation-quality-20261109/record_verification.py --summary-only
python3 artifacts/catalog-demos/standard-components-installation-quality-20261109/capture_standard_components_demo.py
python3 artifacts/catalog-demos/standard-components-installation-quality-20261109/inspect_standard_components_video.py
python3 artifacts/catalog-demos/standard-components-installation-quality-20261109/record_verification.py
```

[`demo-settings.json`](demo-settings.json) retains the exact target IDs,
parameter values, variants, commands, baseline commit and local-only caption.
[`render_variants.ts`](render_variants.ts) checks that each layout option
changes the generated mesh and that the two bumper interfaces change the
vertical envelope by **9.9 mm**. The MP4 frames are source-derived; no model
images were painted or edited.

## Visual and local verification

The five regenerated catalog-angle previews were opened after the final source
render. The base plate reads as a square mounting plate with four clear bores
and a raised boss; the blind flange reads as a solid pipe closure with a bronze
raised face; the coupling shows both internal seals; the pipe flange shows its
hollow neck and open bolt holes; and the bumper shows its stepped rubber body,
metal washer and stud. The installed variants show separate bolt heads, and
the threaded-insert variant replaces the tall stud with a recessed opening.

[`preview-index-check.json`](preview-index-check.json),
[`local-page-check.json`](local-page-check.json),
[`verification.json`](verification.json), command output files, source hashes,
variant renders and [`mp4-inspection.json`](mp4-inspection.json) record the
generated state and checks. The 15-second H.264 video was decoded into six
samples and visually reviewed; notes and frames are in [`video-review/`](video-review/).

The branch has not been deployed. These are generic low-poly scene assets, not
vendor-certified hardware models; local software checks do not establish
manufacturing suitability or physical acceptance.
