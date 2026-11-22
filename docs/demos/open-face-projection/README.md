# Open-face curve projection demo

[Watch the 9-second MP4](open-face-projection.mp4). The frames use measured `Curve3D.sample()` output from the local OCCT feature call; the video is a generated technical demo rather than a deployed browser recording.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/modeling/projectCurveOpen.test.ts --reporter=dot
```

The integration test runs the source in [`demo.ts`](demo.ts), validates its measured geometry, and rebuilds the PNG frames plus [`verification.json`](verification.json). It also checks the ordinary face projection, both fragments across the through-hole, explicit source placement/direction validation, and use of a returned Curve3D as a `variableSweep` spine.

The MP4 was encoded from the three generated 1280×720 PNG frames with:

```sh
ffmpeg -y -framerate 1/3 -start_number 1 \
  -i docs/demos/open-face-projection/frames/frame-%02d.png \
  -vf 'fps=24,format=yuv420p' -t 9 -an \
  -c:v libx264 -profile:v high -crf 19 -movflags +faststart \
  docs/demos/open-face-projection/open-face-projection.mp4
```

## Geometry and settings

- Plate: 30 × 10 × 4 mm, centered on X/Y, top face at Z = 4 mm.
- Through-hole: diameter 6 mm, centered at X = Y = 0.
- Source: one open line from local `[-12, 0]` to `[12, 0]` mm.
- Source frame: origin `[0, 0, 50]` mm, normal `[0, 0, 1]`, X axis `[1, 0, 0]`.
- Projection direction: `[0, 0, -1]` in world coordinates.
- Measured result: two Curve3D fragments, each 9 mm long, with endpoints `[-12, 0, 4]` to `[-3, 0, 4]` and `[12, 0, 4]` to `[3, 0, 4]`.

`ffprobe` reports H.264, 1280×720, `yuv420p`, 24 fps, 9 seconds, 70,356 bytes. The frame footer distinguishes local model validation from deployment and hardware acceptance. No deployed behavior or physical device is claimed.

See the [open-face projection guide](../../guide/open-face-curve-projection.md) for the API contract and the [integration test](../../../tests/integration/modeling/projectCurveOpen.test.ts) for the executable regression.
