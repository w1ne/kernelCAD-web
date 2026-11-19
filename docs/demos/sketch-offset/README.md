# Offset a sketch profile: a wall and a lid plug from one outline

[demo.mp4](./demo.mp4) shows [`tray-and-lid.kcad.ts`](./tray-and-lid.kcad.ts).
The script draws one outline, 60 × 40 mm with R6 corners, and derives two
profiles from it:

- `await outline.offset(-2)` is the tray cavity. The sides move in 2 mm and
  the corners become R4, so the wall is 2 mm thick everywhere.
- `await outline.offset(-2.2)` is the lid plug. It is 0.2 mm from the wall on
  every side.

Measured in this run: cavity area 2002.265 mm², plug area 1966.965 mm², tray
volume 11341.168 mm³, lid volume 10639.088 mm³. Each value equals the closed
form to 0.001. The tray and the seated lid do not overlap (0.000 mm³). The
distance from the plug to the tray wall is 0.200 mm. Both solids are valid
B-reps.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/sketch-offset/capture-demo.mts`
- Section image: `kernelcad render docs/demos/sketch-offset/tray-and-lid.kcad.ts -o section.png --section y=0 --section-flip --pose 12,18 --width 1000 --height 640`
  (the pose file it writes is stored as [`section.png`](./section.png))
- Video invocation: `node --import tsx docs/demos/sketch-offset/make-video.mts`
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `tests/integration/sketchOffset.test.ts`

The capture runs the script, then fails unless: each offset is one loop of
four lines and four quarter-circle arcs; the arc radii are 4 mm and 3.8 mm;
the areas and the two volumes equal the closed form; both solids are valid;
the tray and the lid have no common volume; and the OCCT minimum distance from
the plug to the tray is 0.2 mm.

## Behavior

`Sketch.offset(distance, { corners })` returns a new sketch. It is async, like
`sectionSketch`: write `(await outline.offset(-2)).extrude(5)`.

- The profile is the region inside the first loop and outside the hole loops.
  A positive distance grows the region: the outline moves outward and holes
  become smaller. A negative distance shrinks it.
- Lines stay lines and arcs stay arcs.
- `corners: 'round'` (default) joins a corner that moves outward with an arc
  of radius `|distance|`. `corners: 'sharp'` extends the adjacent segments
  until they meet.
- A result that is not one profile is refused:
  `feature.sketch-offset.collapsed` when nothing is left,
  `feature.sketch-offset.split` when a neck or gap closes, a hole reaches the
  boundary, or the profile touches itself at exactly that distance.

## Limits

- The offset is computed when the script runs. A `param()` distance and a
  profile with `param()` coordinates are refused with `feature.invalid-args`,
  because the result could not follow a later parameter edit.
- A profile with a spline segment is refused.
- The section image has open cut faces: the renderer clips the surface mesh
  and does not fill the cut.
- This is local API evaluation and OCCT measurement. No part was printed or
  machined, no fit was tested on hardware, and the demo shows no deployed
  behavior.
