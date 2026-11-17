# Partial planar DXF ellipse import

This demo exercises the actual `.kcad.ts` example against the ASCII DXF fixture,
then renders triangles meshed from the lowered OCCT B-rep. The MP4 shows the
closed half-ellipse profile, its two exact rational NURBS arcs, and the measured
solid volume. The source, invocation settings, poster and verification evidence
are retained beside the video.

## Reproduce

From the repository root, with project dependencies and FFmpeg installed:

```sh
npx tsx docs/demos/dxf-partial-ellipse-import/capture-demo.mts
npx vitest run src/kernel/import/importDxf.test.ts src/modeling/parts/fromVectorFormats.test.ts --reporter=dot
```

The DXF fixture defines a 10 mm major radius and 5 mm minor radius semi-ellipse,
closed by its 20 mm diameter. The example imports the profile and extrudes it by
3 mm. Verification checks two exact rational NURBS arcs, OCCT B-rep validity,
the bounding box, and the analytic volume `75π = 235.61945 mm³`.

The video is local geometry validation. It does not show deployment, simulation,
physical manufacturing, or hardware acceptance.
