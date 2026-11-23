# Write no STEP colour for a part that has none

[demo.mp4](./demo.mp4) shows the STEP export of
[`examples/bom/panel-with-fasteners.kcad.ts`](../../../examples/bom/panel-with-fasteners.kcad.ts),
an assembly of 4 products and 9 placed instances that sets no colours.

- Export: the file holds no colour entity. Before this change it held
  `DRAUGHTING_PRE_DEFINED_COLOUR('red')`, and all 9 instances read back as
  `#ff0000`.
- Import: the project that `import-step` generates has no `.color(...)` call
  (31 lines). Before this change each part had `.color("#ff0000")` (40 lines).

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/step-uncoloured-parts/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/step-uncoloured-parts/make-video.mts`
- Values and file hash: [`evidence.json`](./evidence.json); meshes for the video: [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `src/kernel/backends/occt/stepUncolouredPart.test.ts` and
  `tests/integration/lowering/sceneStepExport.test.ts`

The capture exports the example through the path behind
`kernelcad export step`, reads the file back with the OCCT XCAF STEP reader,
and writes the project with the writer behind `kernelcad import-step`. It
fails unless the file text has no `COLOUR_RGB` or `PRE_DEFINED_COLOUR` entity,
the file holds 4 products and 9 instances, no instance reads back with a
colour, and the generated script has no `.color(` call.

The "before" values are not measured by the capture. They are recorded from
`docs/demos/step-instance-roundtrip/evidence.json` on develop `5f6868265`, a
capture of the same example. In the video the "before" assembly is drawn in
the colour that file stated, and the "now" assembly is drawn in `#bfc4c8`, the
colour kernelCAD uses for a part without one.

## Behavior

Assembly STEP export (the flat body list and the product tree) attached red
to every part without a colour. That default came from replicad's exporter.
The file then stated a colour that the author never set, and a re-import
returned it as the author's. The writer
(`src/kernel/backends/occt/stepAssemblyExport.ts`) now attaches a colour only
when the part has one. A colour token that does not resolve to a hex value
is treated the same way. A set colour, part names, placements and geometry
are unchanged; the regression tests check a coloured part next to an
uncoloured part in one file.

## Limits

This is local API export, OCCT read-back and import. No other CAD system
opened the file, and the demo shows no deployed behavior or hardware
acceptance. Another CAD system applies its own default appearance to a part
without a colour. A project imported from STEP with an earlier kernelCAD
version keeps the red `.color(...)` calls in its script.
