# Construction equipment machine silhouette refinement — 2026-11-09

This round refines four existing IDs in place: `walk-behind-power-trowel`,
`vibrating-concrete-screed`, `rebar-bending-machine`, and
`portable-material-hoist`. It adds no assets or kits. Each source now has four
material-named color controls, geometry-changing configuration choices,
detailed parts, and two named presets. The rebar bender adds the `siteBlue` preset; the
other assets retain their existing `weathered` and `highVisibility` presets,
updated for the added material controls.

## Source-driven variants

`demo-settings.json` records the choices and presets. The checked-in renderer
compiles each selected configuration from the `.kcad.ts` source, exports a GLB,
renders that GLB to PNG, checks the triangle budget, and confirms that the
shape choices change the model bounds:

```sh
npx tsx artifacts/catalog-demos/construction-equipment-machines-20261109/render_equipment_variants.ts
```

The outputs are in `variants/`; `variant-manifest.json` records the selected
settings, geometry stats, and PNG SHA-256 values. `before/` contains the four
pre-change kit previews. `frames/` compares the previous previews to the
updated defaults and shows each selectable configuration and finish preset.

## Preview and index workflow

All 60 `construction-equipment` preview images were rendered from their
catalog sources, then `catalog/index.json` was regenerated:

```sh
npx tsx scripts/renderCatalogPreviews.ts <the 60 construction-equipment asset ids>
npx tsx scripts/buildAssetCatalog.ts
```

`preview-render-output.txt` and `index-build-output.txt` retain the command
results. The updated index rows carry source hashes and preview paths. The four
refined models export at 920/2600, 804/2400, 1,376/2800, and 1,384/3200
triangles respectively; each base-origin model touches the ground in the
exported bounds. `source-preview-sha256.txt` and `catalog-index-sha256.txt`
record the checked files' hashes.

## Local verification

The in-memory per-asset page/knob and source-hash checks are in
`catalog-page-check.json` and `catalog-page-output.txt`. The full local catalog
page build and copied-preview checks are recorded in
`local-pages-build-output.txt`, `local-page-check.json`, and
`local-page-check-output.txt`. `eslint-output.txt`, `quality-kit-output.txt`,
and `quality-global-output.txt` retain the lint and quality-audit output. The
global gate reports 2,402/2,402 assets passing (100.00%) across 50 rich kits;
the construction-equipment kit reports 60/60. The integration run passed all
15 tests across four files, including the full source rebuild and exact index
freshness check; output is in `vitest-output.txt`. These are local page checks,
separate from live website behavior.

## Video and claim limits

[`construction-equipment-machines.mp4`](construction-equipment-machines.mp4) is
a 15-second, 1280×720, 30 fps H.264 walkthrough assembled from the source
renders. `capture_equipment_demo.py` records the build invocation and
`inspect_equipment_video.py` decodes six samples; `mp4-inspection.json` and
`video-review/` contain the inspection evidence. `video-sha256.txt` records the
video hash. The inspected frames show the updated color and shape choices
legibly.

This bundle verifies local source builds and rendered catalog previews. It
does not represent deployed behavior, equipment operation or performance,
product fit, safety, or hardware acceptance.
