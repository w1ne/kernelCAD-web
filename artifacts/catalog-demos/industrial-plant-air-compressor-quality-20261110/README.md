# Industrial air compressor refinement

This handoff records a visual and parametric refinement of the existing
`industrial-plant/air-compressor` asset. Its ID and kit membership are
unchanged. The new preview shows the horizontal receiver supported by saddles
and a skid, with a belt-driven motor, finned pump heads, an open belt guard,
intake filter and pressure controls.

## What changed

- `receiverCapacity` changes the tank and skid between 80- and 120-gallon
  visual variants.
- `pumpArrangement` changes the pump between single and twin head geometry.
- Four material controls separate receiver steel, cast iron, motor paint and
  rubber. `plant`, `weathered` and `highVisibility` presets recolor those
  materials independently.
- The default preview is **4,594 triangles** under a **5,200-triangle
  budget**.
- No assets or kits were added. The catalog remains **2,402/2,402 passing
  (100.00%)**; industrial-plant remains **60/60 passing**.

The [before preview](before/air-compressor.png) and [updated preview](../../../catalog/kits/industrial-plant/previews/air-compressor.png)
show the silhouette change. The original source is retained at
[before/air-compressor.kcad.ts](before/air-compressor.kcad.ts). Rendered
[80-gallon single-pump weathered](variants/air-compressor-80-single-weathered.png),
[120-gallon twin-pump plant](variants/air-compressor-120-twin-plant.png), and
[120-gallon twin-pump high-visibility](variants/air-compressor-120-twin-high-visibility.png)
variants are backed by [variant source and settings](render_air_compressor_variants.ts)
and [variant render evidence](variant-renders.json).

## Demo

- [15-second MP4](air-compressor-demo.mp4)
- [Poster](poster.png)
- [Decoded-frame contact sheet](video-review/contact-sheet.png)
- [Video inspection report](video-review/inspection.json)
- [Video source and settings](capture_demo.py), [settings](demo-settings.json)
- [Source/index/preview/page/check verification](verification.json)
- [Reproduction script](run_local_checks.sh)

The video shows local source variants, software renders and local checks on
this branch. It does not show deployed behavior, engineering performance,
manufacturing suitability or physical acceptance.

## Verification and reproduction

The default source evaluates through the preview renderer and stays below its
triangle budget. The saved checks cover all 60 industrial-plant assets, the
full catalog quality gate, ESLint, catalog integration tests and a generated
local detail page with the capacity, arrangement, material and preset controls.
The three reviewed previews are the compressor, diesel generator and belt
conveyor. The current live library was not changed.

Rebuild the source previews and generated index from the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts air-compressor diesel-generator-set belt-conveyor
npx tsx scripts/buildAssetCatalog.ts
```

Run the full local variant, lint, integration, quality, page and demo workflow:

```sh
bash artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/run_local_checks.sh
```

The dated comparison note is kept in the private `kernelCAD-private` workspace.
