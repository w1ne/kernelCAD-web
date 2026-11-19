# Mesh point-in-solid test with the parity ray in a face plane

`TriangleBvh.pointInside` counts the surface crossings of one axis-aligned ray.
When the ray ran in the plane of a face, it met the neighbour faces on their
shared edges and counted each as a crossing. A point inside the solid then
read as outside.

The rest-pose joint check uses this test. `evaluate_script` reported
`mechanism.joint-mesh-gap` ("nearest solid is 45.0mm from the pivot origin")
for a slide connector at the base of a rail that is one solid with its deck,
although the connector is inside the solid.

The fix marks a forward hit on a triangle edge or vertex as a graze. A query
with a graze is repeated along tilted rays, and the first ray with no graze
decides.

| Measurement | Before | After |
| --- | --- | --- |
| 3 points where a post meets a slab (inside the solid) | outside, outside, outside | inside, inside, inside |
| 2 mm lattice in an 80 000-triangle sphere mesh, wrong answers | 120 of 226 831 | 0 of 226 831 |
| Time for the 226 981 lattice points, best of 3 | 249 ms | 265 ms |
| Rail on a deck, slide connector at the rail base | `mechanism.joint-mesh-gap`, 45.0 mm | no `mechanism.joint-mesh-gap` |
| `evaluate_script` of `examples/gallery/kspray-klift.kcad.ts` | 33 diagnostics | 32 diagnostics |

[demo.mp4](demo.mp4) shows these measurements. Results are in
[measurements.json](verification/measurements.json).

## Repeat

```sh
npx vitest run tests/unit/dfm/meshBvh.test.ts src/modeling/runtime/jointMeshContinuity.test.ts
npx tsx docs/demos/point-inside-face-plane-parity-20261119/measure.ts
python3 docs/demos/point-inside-face-plane-parity-20261119/make_demo.py
```

`measure.ts` prints the junction and sphere results for the checked-out source.
The "before" values come from the same script on `origin/develop` `3f97dc065`.

## Limits

- These are local measurements in Node. They are not a result from the
  deployed runtime.
- The K-Lift example still returns `ok: false`. Its other 32 diagnostics are
  defects of the example: scene parts fastened far from their material, 5 mm
  hinge gaps, and animated growth on fastened parts.
- `pointInsideMesh` in `src/modeling/runtime/meshPointQuery.ts` and
  `pointInside` in `src/kernel/cfd/meshGeom.ts` are separate implementations.
  This change does not touch them.
