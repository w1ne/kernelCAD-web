# Keep STEP product instances through import and a second export

[demo.mp4](./demo.mp4) shows a STEP round trip of
`examples/bom/panel-with-fasteners.kcad.ts`. The example is exported to STEP
(4 products, 9 placed instances), imported as a KernelCAD project, and exported
to STEP again. The second file holds the same 4 products and 9 placed
instances, and every instance has the part name it had in the first file. The displayed geometry is one mesh per product of the second file,
drawn once for each instance placement.

## Replay and verification

- Source model: [`examples/bom/panel-with-fasteners.kcad.ts`](../../../examples/bom/panel-with-fasteners.kcad.ts)
- Capture invocation: `node --import tsx docs/demos/step-instance-roundtrip/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/step-instance-roundtrip/make-video.mts`
- Second exported file: [`panel-roundtrip.step`](./panel-roundtrip.step)
- Trees, placements and comparison: [`evidence.json`](./evidence.json) and [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)

The capture uses kernelCAD's Node API: the export path behind
`kernelcad export step` and the project writer behind `kernelcad import-step`.
It reads both STEP files back with the OCCT XCAF STEP reader and fails unless:

- the product count and the instance count are equal in both files;
- every product has the same instance count, solid count, volume and
  source-frame bounds in both files;
- every instance is found by its exact part name in both files;
- every instance has the same colour and the same placement matrix within
  1e-6 (measured largest difference: 0 after rounding to 1e-9).

## Behavior

The project that `import-step` generates loads one BREP asset per STEP product
and places each occurrence with `.rotate(...)` and `.translate(...)` on the
shape. STEP export now treats the translates and rotates that end a part's
shape as placement. Parts with the same content before that placement are one
product, and each part is one instance placed by its shape transforms and its
`at` offset. This also applies to hand-written scripts, for example
`asm.part('pin_side', pin.rotateY(90).translate(0, 20, 3))`. A scale or a
reflect changes the geometry and stays part of the product. Each candidate
instance is still measured against the first (source-frame bounds and volume);
a part that does not match is written as its own product.

## Limits

This is local API export, import and OCCT read-back. No other CAD system opened
the files, and the demo shows no deployed behavior or hardware acceptance. The
imported project drops the root product name from each part name; a nested
part is named by its sub-assembly path, and a name with characters other than
letters, digits, `_` and `-` is changed and reported. The example
sets no colours; its parts read back as `#ff0000` from the first export, and
the imported project carries that as an explicit `.color(...)`. Hardware placed
by a hole-driven helper is not instanced. The exported file hashes are valid for
this capture only: OCCT orders the colour style entities of a multi-colour
scene differently between writes.
