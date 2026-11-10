# Industrial centrifugal chiller refinement

This handoff records an in-place visual and parametric refinement of
`industrial-plant/centrifugal-chiller`. The asset and kit counts did not change.

## What changed

- Replaced the box casing and two upright cylinders with horizontal dished-end
  evaporator and condenser shells, shell bands, water nozzles and flanges,
  support steel, a skid, centrifugal compressor, drive motor, connecting
  pipework and a controls cabinet.
- Added a `shellCapacity` choice (`compact` / `large`) that changes the vessel
  and support-frame geometry. The variant report measures a width change of at
  least 80 mm.
- Expanded from two generic color controls to four material controls:
  `shellSteel`, `frameSteel`, `compressorPaint` and `pipework`. The presets are
  `plant`, `weathered`, `highVisibility` and `stainless`.
- The default model is 3,968 triangles under a 4,500-triangle budget.
- No asset IDs or kits were added. `industrial-plant` remains 60/60 passing;
  the whole catalog remains 2,402/2,402 passing (100.00%). This was a visual
  refinement of an asset that already passed the material-and-preset gate, not
  a thin-to-rich pass-count promotion.

The [before preview](before/centrifugal-chiller.png) showed a plain rectangular
casing with upright cylinders. The updated [catalog preview](../../../catalog/kits/industrial-plant/previews/centrifugal-chiller.png)
shows the paired horizontal vessels, top compressor, pipes, frame, skid and
controls. The original [kernelCAD source](before/centrifugal-chiller.kcad.ts)
is retained here.

## Variants

Four local software renders are generated from the source-defined choice and
presets: [large plant](variants/centrifugal-chiller-large-plant.png),
[compact weathered](variants/centrifugal-chiller-compact-weathered.png),
[large high-visibility](variants/centrifugal-chiller-large-high-visibility.png)
and [compact stainless](variants/centrifugal-chiller-compact-stainless.png).
The source hash, dimensions, palette values and triangle counts are retained in
[variant-renders.json](variant-renders.json), with the invocation in
[render_chiller_variants.ts](render_chiller_variants.ts).

## Demo

- [15-second MP4](centrifugal-chiller-demo.mp4)
- [Poster](poster.png)
- [Decoded-frame contact sheet](video-review/contact-sheet.png)
- [Video inspection report](video-review/inspection.json)
- [Video source and settings](capture_demo.py), [demo settings](demo-settings.json)
- [Source/index/preview/page/check verification](verification.json)
- [Generated local detail page snapshot](local-page/catalog/industrial-plant/centrifugal-chiller/index.html)
- [Reproduction script](run_local_checks.sh)

The MP4 shows the source change, capacity and palette variants, and local check
summary. It shows local source and software rendering only. It does not show
deployed behavior, engineering performance, manufacturing suitability or
physical equipment acceptance.

## Verification and reproduction

The retained logs cover preview rendering, index regeneration and freshness,
the per-kit and full-catalog quality gates, ESLint, catalog integration tests,
and generated local detail-page checks. Open three of the rendered previews to
review object recognition and color separation: the default preview, compact
weathered and large high-visibility.

Run the complete local workflow from the repository root:

```sh
bash artifacts/catalog-demos/industrial-plant-chiller-quality-20261110/run_local_checks.sh
```

The feature branch is not deployed. The model-library route is reachable, but
the current public static detail route
`https://kernelcad.com/catalog/industrial-plant/centrifugal-chiller/` returned
404 during this round. The locally generated detail page snapshot confirms the
current source controls and presets. No public deployment or hardware acceptance
is claimed.

The dated comparison note is kept in the private `kernelCAD-private` workspace.
