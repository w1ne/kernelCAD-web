# Import a core 3MF mesh as a faceted B-rep solid

[demo.mp4](./demo.mp4) shows the adjacent `.kcad.ts` script importing a 10 mm
cube from 3MF, subtracting a through cylinder, and reporting measured geometry.
The two rendered solids are tessellated from the actual OCCT results captured by
the script.

## Replay and verification

- Script: [`import-and-drill.kcad.ts`](./import-and-drill.kcad.ts)
- Fixture: [`generic-cube.3mf`](./generic-cube.3mf)
- Capture invocation: `node --import tsx docs/demos/from3mf-brep-import/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/from3mf-brep-import/make-video.mts`
- Geometry and measurements: [`evidence.json`](./evidence.json) and [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)

The capture runs the source through kernelCAD's Node script API and OCCT
recompute. It checks the imported solid and boolean result with
`BRepCheck_Analyzer`, verifies the source's 1,000 mm³ volume and 10 mm bounds,
and checks that the through-hole removes 40π mm³. The video is a replay of that
local model evaluation; it does not show a separate solver simulation, deployed
behavior, slicer acceptance, or hardware acceptance.

This capture uses one core mesh object placed in `<build>`. The importer also
resolves nested component references made from core mesh leaves, applies their
component/build transforms in the declared model units, and preserves each
instance as a separate solid; see the [component assembly demo](../from3mf-component-assembly/README.md).
Required extensions, non-mesh resources, multi-shell objects, open meshes,
non-manifold meshes, and material appearance are not imported. The result is
faceted B-rep geometry, without analytic source surfaces or feature history.
