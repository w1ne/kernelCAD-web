# Standalone surface offset demo

[Watch the 9-second MP4](demo.mp4). The frames are generated from local OCCT
measurements, not from a deployed browser session.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/surface-offset/capture.mts
npx vitest run tests/integration/modeling/surfaceOffset.test.ts --reporter=dot
```

The first command rebuilds [`verification.json`](verification.json) and the
three 1280×720 PNG frames from the real lowered geometry. The integration test
covers the planar and curved offset directions, ParamRef resolution, invalid
input refusal, unchanged planar area, and the downstream thicken path.

The MP4 was encoded from the three frames with:

```sh
ffmpeg -y -framerate 1/3 -start_number 1 \
  -i docs/demos/surface-offset/frames/frame-%02d.png \
  -vf 'fps=24,format=yuv420p' -t 9 -an \
  -c:v libx264 -profile:v high -crf 19 -movflags +faststart \
  docs/demos/surface-offset/demo.mp4
```

## Workflow and measured result

Source: [`surface-offset.kcad.ts`](surface-offset.kcad.ts).

1. Build a 30 × 40 mm, degree-2 × 2 NURBS panel. Measured peak: 3.000 mm.
2. Call `panel.offset(4)`. The offset surface peak rises by exactly 4.000 mm.
3. Call `.thicken(3)` on the offset surface. OCCT returns a valid solid:
   4056.051 mm³, 3.000 mm wall, bounds z = 3.881 … 10.000 mm.

The offset surface has no solid component. Its measured area is 1313.18 mm²;
the base area is 1212.41 mm². The area grows because the offset moves along the
local normal, not along world +Z.

`ffprobe` reports H.264, 1280×720, `yuv420p`, 24 fps, 9 seconds. This bundle
records local model validation only. It makes no deployed-behavior or hardware
acceptance claim.

See [the integration test](../../../tests/integration/modeling/surfaceOffset.test.ts)
and the `Surface.offset` entry in [`docs/cheat-sheet.md`](../../cheat-sheet.md).
