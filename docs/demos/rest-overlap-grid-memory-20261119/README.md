# Rest-pose overlap grid memory in `evaluate_script`

`evaluate_script` of `examples/gallery/turbojet-engine.kcad.ts` aborted at the
768 MB JavaScript heap limit of the hosted evaluator. The rest-pose penetration
check sized its voxel grid from the volume of the bounding-box overlap of a part
pair. For two wide faces in contact the overlap box is a slab thinner than one
cell, and the 96^3 cell cap did not hold: one casing pair got 8 832 000 ray
columns and about 1.5 GB of live heap.

The fix grows the cell until the grid fits the cap, puts the one layer of grid
points of a thin axis on the mid-plane of the slab, and stores the ray hits in
flat typed arrays.

| Measurement | Before | After |
| --- | --- | --- |
| Grid of two 460 x 1200 mm plates in contact | 8 832 000 cells, 14.5 s | 874 290 cells, 0.2 s |
| Turbojet `evaluate_script`, 768 MB heap limit | abort (heap out of memory) | completed, 3 of 3 runs |
| Turbojet peak RSS (cap 1024 MB) | 1383 MB sampled at abort | 728 to 783 MB |
| Turbojet diagnostics | 50 (with a 6000 MB heap) | 50, same SHA-256 |

[demo.mp4](demo.mp4) shows these measurements. Results are in
[measurements.json](verification/measurements.json).

## Repeat

```sh
npx vitest run tests/unit/assemblies/restPoseContactGate.test.ts
node docs/demos/rest-overlap-grid-memory-20261119/evaluator-harness/build.mjs .
node docs/demos/rest-overlap-grid-memory-20261119/evaluator-harness/evaluate.mjs \
  . examples/gallery/turbojet-engine.kcad.ts /tmp/turbojet-evaluate.json
rm -r .tmp-eval-rest-overlap
python3 docs/demos/rest-overlap-grid-memory-20261119/make_demo.py
```

`evaluator-harness/` runs the tool in a forked Node child with the vendor
evaluator flags and records the peak RSS of the child. One run takes about
260 s.

## Limits

This is local measurement and test evidence, not a deployed-runtime claim. The
turbojet example still returns `ok: false`: 50
`assembly.mechanical.connector-not-in-solid` errors, the same before and after.
A pair with a large overlap box is sampled on a coarser grid (0.79 mm for the
plate pair) as before for every pair at the cell cap; the thickness of each
sampled overlap is exact.
