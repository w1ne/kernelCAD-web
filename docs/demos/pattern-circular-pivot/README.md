# Circular pattern pivot demo

[Watch the 9-second MP4](pattern-circular-pivot.mp4). The frames use measured
geometry from a local OCCT build of [`flange-bolt-circle.kcad.ts`](flange-bolt-circle.kcad.ts);
the video is a generated technical demo, not a deployed browser recording.

## Result

`Shape.patternCircular` could only turn copies about the world origin. A bolt
circle around a boss or flange centre therefore needed a translate-pattern-
translate workaround that moved every other feature with the part. The call now
accepts a point on the rotation axis:

```ts
boss.patternCircular({ count: 4, axis: 'Z', pivot: [45, 35, 0] });
```

`pivot` is a point in world millimetres; the instances rotate about the axis
line that passes through it. Omitting `pivot` keeps the previous behaviour
exactly: copies rotate about the world origin, and existing records lower the
same way.

The fixture is a 90 x 70 x 10 mm flange with one Ø12 x 8 mm bolt boss at
(70, 35). The pattern turns it four times about the Z axis through (45, 35), so
all four bosses stay on the flange at a 25 mm bolt radius.

## Measured result

| Quantity | Analytic | Measured |
|---|---|---|
| Volume | `63000 + 4 · π · 6² · 8 = 66619.1147 mm³` | `66619.1147 mm³` |
| Bounding box | `90 x 70 x 18 mm` | `90 x 70 x 18 mm` |

The result is one solid, solid-level BRepCheck valid, has `0` mesh open edges,
and exports a `33357` byte STEP file. Exact details are in
[`verification.json`](verification.json).

The control case without `pivot` keeps the same volume but spreads the copies
around the world origin (`x -76 .. 90`), which is the pre-pivot placement.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/pattern-circular-pivot/demo.ts
npx vitest run tests/integration/patterns/circularPatternPivot.test.ts --reporter=dot
```

[`tests.log`](tests.log) is the passing 25-test run across the pivot fixture,
the capture contract and the MCP `add_pattern_feature` tool.
[`behavior-removed-test.log`](behavior-removed-test.log) is the pivot suite with
`pivot` ignored in the OCCT lowerer: both placement tests fail, while the
world-origin baseline and the capture refusals still pass.

## Video

```sh
ffmpeg -y -framerate 1/3 -start_number 1 \
  -i docs/demos/pattern-circular-pivot/frames/frame-%02d.png \
  -vf 'fps=24,format=yuv420p' -t 9 -an \
  -c:v libx264 -profile:v high -crf 19 -movflags +faststart \
  docs/demos/pattern-circular-pivot/pattern-circular-pivot.mp4
```

`ffprobe` reports H.264, 1280x720, `yuv420p`, 24 fps, 9 seconds, 83,387 bytes.
The first frame shows the source boss and the pivot; the second adds the four
positioned bosses; the third shows the fused flange with the measured volume.

The frame footer separates local model validation from deployment and hardware
acceptance. No deployed behaviour or physical part is claimed.

See the [regression test](../../../tests/integration/patterns/circularPatternPivot.test.ts).
