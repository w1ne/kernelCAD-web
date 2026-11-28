# Import disconnected shells from one 3MF mesh object

[demo.mp4](./demo.mp4) shows `lib.from3MF` importing a 10 mm cube and a
separated 5 mm tetrahedron from one 3MF mesh object. The capture confirms they
remain two valid B-rep solids inside one compound, then cuts a 4 mm through-hole
in the cube.

## Replay and verification

- Modeling script: [`import-two-shells.kcad.ts`](./import-two-shells.kcad.ts)
- Fixture source: [`make-fixture.mjs`](../../../examples/interoperability/3mf-disconnected-shells/make-fixture.mjs)
- Fixture generation: `node examples/interoperability/3mf-disconnected-shells/make-fixture.mjs`
- Fixture: [`two-disconnected-solids.3mf`](./two-disconnected-solids.3mf) (also generated at `examples/interoperability/3mf-disconnected-shells/two-disconnected-solids.3mf`)
- Capture invocation: `node --import tsx docs/demos/from3mf-disconnected-shells/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/from3mf-disconnected-shells/make-video.mts`
- Geometry and measurements: [`evidence.json`](./evidence.json) and [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)

The capture runs the adjacent `.kcad.ts` script through the local kernelCAD API
and OCCT recompute. It checks 16 input triangles, two separate solids, the
1000 + 125/6 mm³ compound volume, 25 × 10 × 10 mm bounds, B-rep validity, and a
boolean cut that removes 40π mm³ while retaining both solids. The rendered
geometry comes from the actual OCCT results saved by the capture.

Before the implementation, `npx vitest run src/modeling/backends/occt/from3MF.test.ts -t 'imports separated positive mesh shells'` failed because the importer rejected the fixture with `contains multiple mesh shells`. The focused test now passes with the measurements above. The [3MF Consortium documents](https://3mf.io/resources/faq/) its Positive fill rule for overlapping or self-intersecting model meshes; see its [current specification listing](https://3mf.io/spec/). The volume, bounds, solid count, and validity here are measured from the local kernelCAD and OCCT capture.

Multi-shell import accepts outward-facing shells only when their axis-aligned
bounds are pairwise disjoint. Touching, overlapping, nested, inward-facing, or
zero-volume shells are refused to preserve the 3MF Positive fill behavior.
This is local API and OCCT recompute replay; it does not show solver simulation,
deployed behavior, slicer acceptance, or hardware acceptance. The imported
faces remain planar triangles without analytic source surfaces or feature
history.
