# Chamfer a hole's entry rim by name

[demo.mp4](./demo.mp4) shows a NEMA 17 motor mount plate,
[`mount-plate.kcad.ts`](./mount-plate.kcad.ts): 60 × 60 × 6 mm, a Ø22.5
pilot bore and four Ø3.4 clearance holes on the 31 mm bolt square, all
through. The entry rims (the top face, under the screw heads) get a 0.5 mm
deburr chamfer. The exit rims against the motor face stay sharp.

`hole()` and `holes()` now label the rim edges they create: `entry-rim`,
`exit-rim` (through) and `floor-rim` (blind). The plate selects the entry
rims of both features in one chamfer with
`kc.q.edge(kc.q.derivedFrom(plate.id)).and(kc.q.withLabel('entry-rim'))`.
`chamfer(r, { face: 'pilot.entry-rim' })` selects the rim of one named
feature.

- Volume 18981.621277 mm³. The closed form, plate − bores − five 45°
  chamfer rings of volume 2π(r + c/3)·c²/2, is 18981.621277 mm³.
- Five chamfer cones, with area centroids at z 5.7518 (pilot) and 5.7607
  (screws), all in the top 0.5 mm. The solid is a valid B-rep.
- The close-up tile, [`rim-closeup.kcad.ts`](./rim-closeup.kcad.ts), is a
  16 × 16 × 8 mm block with a Ø6 through hole and a 1.5 mm chamfer on
  `thru.entry-rim`, sized so the cone is visible at video scale.

Before this change (develop `eb2c992f2`) the plate failed with `query.empty`
(no edge carried a rim label), and `chamfer(0.5, { face: 'pilot.entry-rim'
})` failed with `feature.face-ref.not-resolvable`. The v0.6.3 created-refs
demo (`thruHole.entry-rim`) failed the same way.

## Limits

- At the time of this demo, a later `fillet` or `chamfer` did not keep the
  labels of the edges it left alone (`rimLabelsAfterChamfer` in
  `evidence.json` is empty). This is fixed; see
  [`../edge-labels-through-chamfer/`](../edge-labels-through-chamfer/).
- `cutout()` writes no rim refs.
- No other CAD system opened the model, and no plate was made.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/hole-rim-refs/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/hole-rim-refs/make-video.mts`
  (ffmpeg on `PATH`)
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings, render invocations and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `tests/integration/holeRimEdgeRefs.test.ts`

The capture fails unless the plate is a valid B-rep with no error
diagnostic, its volume equals the closed form within 1 part in 1 000 000,
and there are five chamfer cones, all between z 5.5 and 6.

The three solid views (`plate-top.png`, `plate-bottom.png`,
`rim-closeup.png`) are `kernelcad render` output from the built CLI.
