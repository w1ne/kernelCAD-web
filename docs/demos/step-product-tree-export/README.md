# Export repeated assembly parts as STEP product instances

[demo.mp4](./demo.mp4) shows `examples/bom/panel-with-fasteners.kcad.ts`
exported to STEP and read back. The script places one standoff shape three
times and one catalog screw four times. The STEP file holds four products and
nine named placed instances, and the instance counts equal the BOM quantities.
The displayed geometry is one mesh per re-imported product, drawn once for each
instance placement.

## Replay and verification

- Source model: [`examples/bom/panel-with-fasteners.kcad.ts`](../../../examples/bom/panel-with-fasteners.kcad.ts)
- Capture invocation: `node --import tsx docs/demos/step-product-tree-export/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/step-product-tree-export/make-video.mts`
- Exported file: [`panel.step`](./panel.step)
- Tree, placements and BOM rows: [`evidence.json`](./evidence.json) and [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)

The capture exports through kernelCAD's Node API (the path behind
`kernelcad export step`), re-imports the written bytes with the OCCT XCAF STEP
reader, and fails unless:

- every BOM row maps to one STEP product with the same instance names and the
  same quantity (plate 1, standoff 3, bracket 1, screw 4);
- the standoff and screw placements equal the script's `at` values.

## Behavior

A scene that repeats a part is written as a root assembly with one product per
distinct part and one named placement per use. Parts are grouped when their
source feature content is identical: the same shape placed several times, or the
same calls repeated in a loop. Each candidate instance is then measured against
the first (source-frame bounds and volume); a part that does not match is written
as its own product. A colour difference also keeps parts apart. A scene with no
repeated part is written as before: a flat list of named world-frame bodies.

## Limits

This is local API export and OCCT re-import. No other CAD system opened the
file, and the demo shows no deployed behavior or hardware acceptance. A placement
that is baked into the shape before `part()` (for example `.translate(...)` or
`.rotate(...)`, or hardware placed by a hole-driven helper) makes a separate
product, so such parts are not instanced even when the BOM groups them. The
exported file hash is valid for this capture only: OCCT orders the colour style
entities of a multi-colour scene differently between writes.
