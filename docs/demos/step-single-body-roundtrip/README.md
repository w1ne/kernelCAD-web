# Keep the name and colour of a single part through STEP

[demo.mp4](./demo.mp4) shows a STEP round trip of one part without an assembly:
[`motor-plate.kcad.ts`](./motor-plate.kcad.ts), a 100 x 80 x 4 mm NEMA 17
adapter plate that the script returns as a bare shape with `.color('#3366cc')`.
The part is exported to STEP, imported as a KernelCAD project, and exported to
STEP again. Each file holds one product named `motor-plate` with one solid, and
the colour reads back as `#3366cc` from each file.

## Replay and verification

- Source model: [`motor-plate.kcad.ts`](./motor-plate.kcad.ts)
- Capture invocation: `node --import tsx docs/demos/step-single-body-roundtrip/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/step-single-body-roundtrip/make-video.mts`
- First exported file: [`motor-plate.step`](./motor-plate.step)
- Read-back values and comparison: [`evidence.json`](./evidence.json) and [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)

The capture uses kernelCAD's Node API: the export path behind
`kernelcad export step` and the project writer behind `kernelcad import-step`.
It reads both STEP files back with the OCCT XCAF STEP reader and fails unless,
for each file:

- there is one product and one body, named `motor-plate`;
- the colour is `#3366cc`;
- the volume is the plate less its nine holes, 29954.069 mm3, within 0.01 mm3
  (measured difference: 0.0002 mm3);
- the bounds and the placement of the body are equal in both files;
- `import-step` reports no renamed part.

## Behavior

`kernelcad export step` on a script that returns a bare shape now writes one
named STEP product. The name is the script file name without its directory and
`.kcad.ts` extension. The colour is the shape colour found on the returned
feature or on its primary upstream features, the same rule as the single-shape
GLB export; a role token such as `'plate'` is written as its palette colour. A
shape without a colour is written without a colour. Before this change the
product was named `Open CASCADE STEP translator 8.0 1` and the file had no
colour. The geometry in the file is unchanged.

## Limits

This is local API export, import and OCCT read-back. No other CAD system opened
the files, and the demo shows no deployed behavior or hardware acceptance. A
script cannot set a product name other than its file name for a bare shape.
The colour entity in the file is `COLOUR_RGB('',0.4845,0.6652,0.9063)`: OCCT
applies its sRGB transfer curve to the channel values `0.2, 0.4, 0.8` that
kernelCAD passes, and the OCCT reader applies the inverse. The same applies to
assembly STEP export. A different CAD system can therefore show a lighter
colour than `#3366cc`; this was not measured.
