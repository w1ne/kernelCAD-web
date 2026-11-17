# Full planar DXF ellipse import

This local demo shows the actual example script importing the rotated ellipse
fixture, extruding the returned `Sketch`, then validating the lowered OCCT
B-rep and measuring its volume. The [MP4](demo.mp4) rotates the mesh generated
from that B-rep. The [poster](poster.png), [capture source](capture-demo.mts),
[settings](settings.json), and [verification evidence](verification.json) are
kept with the bundle. The model source and input are
[import-ellipse.kcad.ts](../../../examples/interoperability/dxf-ellipse/import-ellipse.kcad.ts)
and [ellipse-profile.dxf](../../../examples/interoperability/dxf-ellipse/ellipse-profile.dxf).

## Reproduce

From the repository root, with project dependencies and FFmpeg installed:

```sh
npx tsx docs/demos/dxf-ellipse-import/capture-demo.mts
npx vitest run src/kernel/import/importDxf.test.ts src/modeling/parts/fromVectorFormats.test.ts --reporter=dot
```

The fixture defines a 20 mm major radius, 10 mm minor radius ellipse centered
at `(40, 30)` mm with a rotated major-axis vector. The script uses
`lib.fromDXF('ellipse-profile.dxf')` and `profile.extrude(5)`. The capture
source checks that the imported sketch contains four rational NURBS segments,
that OCCT accepts the B-rep, and that its volume matches
`π × 20 × 10 × 5 = 3,141.59265 mm³`.

This is local geometry validation. It does not show deployment, simulation,
physical manufacturing, or hardware acceptance.
