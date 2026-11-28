# Import a nested core 3MF component assembly

[demo.mp4](./demo.mp4) shows the adjacent `.kcad.ts` workflow importing two
transformed component instances, then subtracting a cylinder from one instance.
The displayed geometry is tessellated from the actual OCCT results captured by
the script.

## Replay and verification

- Script: [`import-and-drill.kcad.ts`](./import-and-drill.kcad.ts)
- Fixture source: [`make-fixture.mts`](./make-fixture.mts)
- Fixture generation: `node --import tsx docs/demos/from3mf-component-assembly/make-fixture.mts`
- Fixture: [`two-block-assembly.3mf`](./two-block-assembly.3mf)
- Capture invocation: `node --import tsx docs/demos/from3mf-component-assembly/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/from3mf-component-assembly/make-video.mts`
- Geometry and measurements: [`evidence.json`](./evidence.json) and [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)

The capture runs the script through kernelCAD's Node API and OCCT recompute. It
checks the 2,000 mm³ assembly, the expected transformed bounds, two independent
solids, B-rep validity, and a boolean that removes 40π mm³ while retaining both
solids. The fixture contains one nested component resource with two references
to a closed 10 mm cube; the second instance is mirrored, and component and build
transforms place the two cubes apart.

This is local API and OCCT recompute replay. It does not show solver simulation,
deployed behavior, slicer acceptance, or hardware acceptance. Import is limited
to core component trees made from closed, consistently oriented triangle meshes.
Required extensions, unresolved or cyclic references, non-mesh resources, open
meshes, non-manifold meshes, and material appearance are not imported. A mesh
object can contain separate outward-facing shells when their axis-aligned bounds
are pairwise disjoint; touching, overlapping, nested, inward-facing, or
zero-volume shells are refused. See the
[disconnected shells demo](../from3mf-disconnected-shells/README.md). The result
has planar triangle faces, without analytic source surfaces or feature history.
