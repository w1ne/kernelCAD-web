# Revolve axis demo

[Watch the 9-second MP4](revolve-axis.mp4). The frames use measured geometry
from a local OCCT build of [`stepped-shaft.kcad.ts`](stepped-shaft.kcad.ts);
the video is a generated technical demo, not a deployed browser recording.

## Result

`Sketch.revolve` previously turned every profile about the sketch `x = 0` line
(world +Z). It now accepts an explicit in-plane axis:

```ts
profile.revolve({
  axis: { through: [0, 0], direction: [1, 0] },
});
```

The fixture draws a 100 mm stepped half-section (radii 30, 20 and 10 mm) on one
side of the sketch X axis and revolves it about that line. The result is a
stepped shaft along X, not a body around Z.

- Analytic volume: `π · (30² · 20 + 20² · 40 + 10² · 40) = 38000π = 119380.5208 mm³`.
- Measured volume: `119380.5208 mm³` (relative error `1.2e-16`).
- Bounding box: `100 × 60 × 60 mm`.
- Result: one solid, solid-level BRepCheck valid, mesh open edges `0`,
  STEP export `13293` bytes.

A profile that crosses the axis is still refused with
`feature.revolve.crosses-axis`; a zero direction is refused with
`feature.invalid-args`. The default `revolve()` path records no axis parameters
and keeps its previous geometry.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/revolve-axis/demo.ts
npx vitest run tests/integration/modeling/revolveAxis.test.ts --reporter=dot
```

The demo builds the script, checks solid-level BRepCheck, one solid, the
analytic volume, a watertight mesh and a STEP export, then writes
[`verification.json`](verification.json) and the three PNG frames.

[`behavior-removed-test.log`](behavior-removed-test.log) is the same regression
run with the lowerer forced back to the default axis: 5 geometry cases fail,
including the offset-axis, negative-side and horizontal-axis volumes.
[`tests.log`](tests.log)
is the passing run on the new implementation: 12 tests.

## Video

```sh
ffmpeg -y -framerate 1/3 -start_number 1 \
  -i docs/demos/revolve-axis/frames/frame-%02d.png \
  -vf 'fps=24,format=yuv420p' -t 9 -an \
  -c:v libx264 -profile:v high -crf 19 -movflags +faststart \
  docs/demos/revolve-axis/revolve-axis.mp4
```

`ffprobe` reports H.264, 1280×720, `yuv420p`, 24 fps, 9 seconds, 83,244 bytes.
The first frame shows the half-section and the axis line; the second mirrors the
section to show the 360° result; the third shows the measured solid checks.

The frame footer separates local model validation from deployment and hardware
acceptance. No deployed behavior or physical device is claimed.

See the [regression test](../../../tests/integration/modeling/revolveAxis.test.ts).
