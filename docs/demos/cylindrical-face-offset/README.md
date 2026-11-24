# Cylindrical face offset demo

[Watch the 9-second MP4](demo.mp4). The frames are generated from local OCCT
measurements, not from a deployed browser session.

## Result

`Shape.offsetFaces(faces, distance)` now offsets a full 360° cylindrical face
by changing its radius. Before, the same call threw
`feature.face-edit.rejected` (`FACE_EDIT_NOT_PLANAR`).

- A Ø10 through bore in a 40 × 40 × 10 plate becomes Ø8 with `distance = 1`.
  The solid grows from 15214.602 mm³ to 15497.345 mm³: +282.743 mm³, equal to
  π(5² − 4²) × 10.
- The same bore becomes Ø12 with `distance = −1`: 14869.027 mm³.
- A Ø20 × 20 boss becomes Ø22 with `distance = 1`: 7602.654 mm³, equal to
  π × 11² × 20.
- Every result is one valid solid. A 4 mm deep blind bore keeps its floor at
  the same height and changes only its wall.

The lowerer cuts or fuses an annular sleeve over the selected face's own axial
span. It checks the exact annular volume and requires a coaxial cylinder with
the requested radius. A partial cylinder, a collapse to zero radius, or a
multi-face selection that contains a cylinder is refused with a named
diagnostic. `moveFaces` and the SMLib path remain planar.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/cylindrical-face-offset/capture.mts
npx vitest run tests/integration/modeling/cylindricalFaceOffset.test.ts --reporter=dot
npx vitest run tests/unit/modeling/faceEdit.test.ts --reporter=dot
```

The fixture is [`cylindrical-face-offset.kcad.ts`](cylindrical-face-offset.kcad.ts).
It declares `param('boreGrow', 1)` and applies it to a Ø10 through bore.

[`behavior-removed-test.log`](behavior-removed-test.log) is the same integration
test run against the old `faceEdit.ts`: all 7 cases fail with
`FACE_EDIT_NOT_PLANAR`. [`tests.log`](tests.log) is the passing run on the new
implementation: 22 tests in 2 files.

## MP4

The three 1280 × 720 PNG frames were encoded with:

```sh
ffmpeg -y -framerate 1/3 -start_number 1 \
  -i docs/demos/cylindrical-face-offset/frames/frame-%02d.png \
  -vf 'fps=24,format=yuv420p' -t 9 -an \
  -c:v libx264 -profile:v high -crf 19 -movflags +faststart \
  docs/demos/cylindrical-face-offset/demo.mp4
```

`ffprobe` reports H.264, 1280 × 720, `yuv420p`, 24 fps, 9 seconds. The encoded
frames were inspected. The video shows the before/after bore and the boss case.

This bundle records local model validation only. It makes no deployed-behavior
or hardware-acceptance claim. The model is not a manufacturing release check.
