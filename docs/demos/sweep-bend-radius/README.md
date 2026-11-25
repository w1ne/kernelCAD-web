# Sweep bend-radius demo

[Watch the 9-second MP4](sweep-bend-radius.mp4). The frames use measured
geometry from a local OCCT build of [`elbow.kcad.ts`](elbow.kcad.ts); the video
is a generated technical demo, not a deployed browser recording.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/sweep-bend-radius/demo.ts
npx vitest run tests/integration/modeling/sweepBendRadius1785.test.ts --reporter=dot
```

The demo builds the script, checks solid-level BRepCheck, one solid, the
analytic volume, a watertight mesh and a STEP export, then writes
[`verification.json`](verification.json) and the three PNG frames.

## Geometry and settings

- Profile: circle radius 4 mm (Ø8 tube), centred on the rail start.
- Rail: `[[0, 0, 0], [30, 0, 0], [30, 30, 0]]` mm, a 90° corner.
- Option: `{ bendRadius: 6 }` (mm centreline radius); default polyline spine
  and `transitionMode: 'right'`.
- Analytic cut length: `(30 − 6) + (30 − 6) + 6·π/2 = 57.4248 mm`.
- Analytic volume: `π·4² × 57.4248 = 2886.4842 mm³`.
- Measured volume: `2886.4842 mm³` (relative error `1.6e-16`).
- Result: one solid, solid-level BRepCheck valid, mesh open edges `0`,
  STEP export `20355` bytes.

The frame footer separates local model validation from deployment and hardware
acceptance. No deployed behavior or physical device is claimed.

## Video

```sh
ffmpeg -y -framerate 1/3 -start_number 1 \
  -i docs/demos/sweep-bend-radius/frames/frame-%02d.png \
  -vf 'fps=24,format=yuv420p' -t 9 -an \
  -c:v libx264 -profile:v high -crf 19 -movflags +faststart \
  docs/demos/sweep-bend-radius/sweep-bend-radius.mp4
```

`ffprobe` reports H.264, 1280×720, `yuv420p`, 24 fps, 9 seconds, 93,334 bytes.
The first frame shows the sharp mitre (60 mm path, `3015.93 mm³`); the third
shows the tangent-arc result and the measured solid checks.

See the [bend-radius guide](../../guide/swept-elbow-bend-radius.md) and the
[regression test](../../../tests/integration/modeling/sweepBendRadius1785.test.ts).
