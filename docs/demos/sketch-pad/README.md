# Sketch pad demo

[Watch the 9-second MP4](sketch-pad.mp4). The frames use measured geometry from
a local OCCT build of the demo scripts; the video is a generated technical
demo, not a deployed browser recording.

## Result

`Shape.cutout()` could subtract a sketch profile from a face, but there was no
additive counterpart: growing a boss or pad from a face meant building a
separate prism and unioning it by hand. `Shape.pad()` now does that as one
feature record:

```ts
plate.pad(profile, { face: 'top', depth: 5 });
plate.pad(profile, { face: 'top', upToFace: { atZ: 20, parallelTo: 'XY' } });
```

The profile starts on the selected planar face, grows outward along that
face's normal, and fuses into the body. Profile coordinates use the same face
frame as `cutout()` and `hole()`: millimetres from the centre of the face's
outer boundary. `depth` is a positive height; `upToFace` ends the pad exactly
on the plane of a planar body face ahead of the entry face.

The demo builds two pads on one plate:

- a 10 x 10 x 5 blind boss on the top face;
- a 10 x 10 bridge from the same face up to the tower top at z = 20.

## Measured result

| Case | Analytic volume | Measured volume | Bounding box |
|---|---|---|---|
| Blind pad | `12500 mm³` | `12500.0000 mm³` | `40 x 30 x 15 mm` |
| Pad to face | `16000 mm³` | `16000.0000 mm³` | `40 x 30 x 20 mm` |
| Combined fixture | `16500 mm³` | `16500.0000 mm³` | `40 x 30 x 20 mm` |

The combined fixture is one solid, solid-level BRepCheck valid, has `0` mesh
open edges, and exports a `57618` byte STEP file. Exact details are in
[`verification.json`](verification.json).

The fuse fails closed. A profile that misses the body reports
`pad: the result has 2 solids, not one connected body`; a target face at or
behind the entry face reports `feature.invalid-args`; a non-planar target is
refused by name. The pad adds no named created face refs in this slice; select
its walls and top with the existing face queries.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/sketch-pad/demo.ts
npx vitest run tests/integration/modeling/pad.test.ts --reporter=dot
```

[`tests.log`](tests.log) is the passing 12-test run. [`behavior-removed-test.log`](behavior-removed-test.log)
is the same suite with `pad` removed from the OCCT lowerer table: 8 tests fail,
including every geometry case and the up-to-face refusals.

## Video

```sh
ffmpeg -y -framerate 1/3 -start_number 1 \
  -i docs/demos/sketch-pad/frames/frame-%02d.png \
  -vf 'fps=24,format=yuv420p' -t 9 -an \
  -c:v libx264 -profile:v high -crf 19 -movflags +faststart \
  docs/demos/sketch-pad/sketch-pad.mp4
```

`ffprobe` reports H.264, 1280x720, `yuv420p`, 24 fps, 9 seconds, 78,980 bytes.
The first frame shows the two profiles in the face frame; the second adds the
blind boss; the third ends the bridge exactly on the tower top.

The frame footer separates local model validation from deployment and hardware
acceptance. No deployed behavior or physical device is claimed.

See the [regression test](../../../tests/integration/modeling/pad.test.ts) and
the [fixture](boss-and-bridge.kcad.ts).
