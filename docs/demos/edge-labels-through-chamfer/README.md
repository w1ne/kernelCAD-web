# Chamfer the exit rims after the entry rims

[demo.mp4](./demo.mp4) shows a NEMA 17 motor mount plate,
[`mount-plate.kcad.ts`](./mount-plate.kcad.ts): 60 × 60 × 6 mm, R5
outside corners, a Ø22.5 pilot bore and four Ø3.4 clearance holes on the
31 mm bolt square, all through. A first chamfer breaks the entry rims (top,
under the screw heads) by 0.5 mm. A second, later chamfer breaks the exit
rims (against the motor face) by 0.3 mm. Both pick their edges by created
edge label: `kc.q.edge(kc.q.derivedFrom(plate.id)).and(kc.q.withLabel('exit-rim'))`.

`fillet` and `chamfer` now keep the birth labels of the edges they leave
alone. OCCT's `BRepFilletAPI_MakeChamfer` and `BRepFilletAPI_MakeFillet`
report the untouched edges of a rebuilt face as deleted, although the
result keeps the same edges. The history reader in
`src/kernel/backends/occt/historyAwareEdgeFeatures.ts` trusted that report
and dropped their lineage. It now keeps any input sub-shape that the result
still contains.

- Volume 18847.615286 mm³. The closed form, blank with R5 corners − bores −
  one 45° chamfer ring of volume 2π(r + c/3)·c²/2 per rim, is
  18847.615286 mm³.
- Ten chamfer cones: five with area centroids at z 5.7518 to 5.7607 (top
  0.5 mm), five at z 0.1459 to 0.1493 (bottom 0.3 mm). The solid is a
  valid B-rep.
- After the entry chamfer alone, the result still carries
  `pilot.exit-rim` (1), `screws.exit-rim` (4), `top-perimeter` (4) and
  `bottom-perimeter` (4).
- The close-up tile, [`rim-closeup.kcad.ts`](./rim-closeup.kcad.ts), is a
  16 × 16 × 8 mm block with a Ø6 through hole: 1.5 mm on
  `thru.entry-rim`, then 1 mm on `thru.exit-rim`, seen from below.

Before this change (develop `8d535d15a`) the plate failed with
`query.empty` (the entry chamfer dropped every exit-rim label), and
`box(60, 60, 6).chamfer(0.5, { face: 'bottom' })` kept only the four
`corner` labels of its 20 edges.

## Limits

- The fix keeps a label when the result contains the same edge. An edge
  that the kernel rebuilds as a new edge with no `Modified()` entry still
  loses its label.
- No other CAD system opened the model, and no plate was made.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/edge-labels-through-chamfer/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/edge-labels-through-chamfer/make-video.mts`
  (ffmpeg on `PATH`)
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings, render invocations and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `tests/integration/edgeLabelsThroughEdgeFeature.test.ts`

The capture fails unless the plate is a valid B-rep with no error
diagnostic, its volume equals the closed form within 1 part in 1 000 000,
there are five chamfer cones in the top 0.5 mm and five in the bottom
0.3 mm, and the exit-rim labels survive the entry chamfer.

The three solid views (`plate-top.png`, `plate-bottom.png`,
`rim-closeup.png`) are `kernelcad render` output from the built CLI.
