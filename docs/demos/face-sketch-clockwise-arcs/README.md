# Keep clockwise corner arcs when a sketch is read from a face

[demo.mp4](./demo.mp4) shows [`cover-gasket.kcad.ts`](./cover-gasket.kcad.ts):
a 60 × 40 × 6 mm cover plate with R5 corners and four Ø4.5 mm holes. The
script reads the top face with `faceSketch('top')` and extrudes the profile
1.5 mm to make a gasket.

- Now: the profile has four 90° corner arcs. The gasket volume is
  3472.384 mm³, equal to the closed-form value. The solid is a valid B-rep.
- Before this change: three of the four corners came back as the 270° arc on
  the same circle. The profile cut into the part at those corners. The gasket
  volume was 3166.539 mm³ (8.8 % low) and there was no error diagnostic.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/face-sketch-clockwise-arcs/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/face-sketch-clockwise-arcs/make-video.mts`
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `src/kernel/backends/occt/sketchFromShape.test.ts` and
  `tests/integration/sketchFromShape.test.ts`

The capture runs the script, then fails unless: the sketch has one outline
and four hole loops; each corner arc has |bulge| = tan(π/8); the gasket is a
valid B-rep of 60 × 40 × 1.5 mm with the closed-form volume (tolerance
0.001 mm³); the flat profile behind `kernelcad export dxf` has five loops and
the closed-form outline area; and the DXF export returns no error.

The "before" values are not measured by the capture. They are recorded from a
run of the same script on develop `d6737bdc1`. In the video, the "before"
profile is that recorded command list drawn with an even-odd fill. It is not a
picture of the solid that the old version built.

## Behavior

`faceSketch`, `sectionSketch`, the flat and section DXF profiles and
the `inspect` section report read each circular edge through `edgeToSegments`
(`src/kernel/backends/occt/sketchFromShape.ts`). For an open arc, it computes
a DXF bulge from the start, middle and end points. An arc that runs clockwise
in the sketch frame and sweeps less than 180° got the bulge of the opposite
arc: a clockwise 90° arc (bulge −0.4142) was returned as a counter-clockwise
270° arc (bulge +2.4142). The start and end points were correct, so the
bounding box did not change and no check failed.

The direction of an edge depends on how OCCT stores it. On the top face of
the cover plate, three corner edges run clockwise in the sketch frame. The
mid-height section of a 40 × 20 mm plate with R3 corners (a regression test
case) was correct before this change: none of its corner edges was read
clockwise.

Lines, full circles, counter-clockwise arcs and arcs of 180° or more are
unchanged.

## Limits

This is local API evaluation and OCCT measurement. No other CAD or CAM system
opened the DXF file, no gasket was cut, and the demo shows no deployed
behavior. A sketch or DXF file made with an earlier version keeps the wrong
arcs; run the script or the export again.
