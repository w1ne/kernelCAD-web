# Write and read STEP colours in the correct colour space

[demo.mp4](./demo.mp4) shows the colour of one part through STEP export and
import. The part is
[`motor-plate.kcad.ts`](../step-single-body-roundtrip/motor-plate.kcad.ts), a
100 x 80 x 4 mm NEMA 17 adapter plate with `.color('#3366cc')`.

- Export: the file holds `COLOUR_RGB('',0.2,0.4,0.8)`, the channels of
  `#3366cc`. Before this change the file held
  `COLOUR_RGB('',0.4845,0.6652,0.9063)`, which is `#7caae7`.
- Import: a file that holds `COLOUR_RGB('',0.2,0.4,0.8)` reads as `#3366cc`.
  Before this change it read as `#08229a`.
- Export then import returns `#3366cc`. That result is the same as before,
  because the two errors cancelled.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/step-colour-space/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/step-colour-space/make-video.mts`
- Values and file hash: [`evidence.json`](./evidence.json); mesh for the video: [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression test: `src/kernel/backends/occt/stepColour.test.ts`

The capture exports the part through the path behind `kernelcad export step`,
reads the colour entity from the file text, and reads the file back with the
OCCT XCAF STEP reader. It fails unless the written channels are within 1e-6 of
`0.2, 0.4, 0.8` (measured maximum error: 1.1e-8), the read-back colour is
`#3366cc`, and a copy of the file with the entity text
`COLOUR_RGB('',0.2,0.4,0.8)` also reads as `#3366cc`.

The "before" values are not measured by the capture. They were measured on
develop `9b7ba3241` by the failing run of the regression test and are recorded
in the capture script.

## Behavior

A kernelCAD hex colour and a STEP `COLOUR_RGB` are both sRGB (display) values.
OCCT holds a colour as linear RGB and applies the sRGB transfer curve when it
writes or reads STEP. kernelCAD passed hex channels to OCCT without
linearizing them and formatted OCCT's linear channels as hex without encoding
them. It now converts in both directions at the OCCT boundary
(`src/kernel/backends/occt/stepColour.ts`). This applies to single-part and
assembly STEP export and to `import-step`. Geometry, names and placements are
unchanged.

## Limits

This is local API export and OCCT read-back. No other CAD system opened the
file, and the demo shows no deployed behavior or hardware acceptance. The
"imported file" in the video is the exported file with its colour entity text
replaced, not a file from another CAD system. A project that an earlier
kernelCAD version imported from STEP keeps the darker colour that version
read. Alpha is unchanged. An assembly part without a colour is still written
as red.
