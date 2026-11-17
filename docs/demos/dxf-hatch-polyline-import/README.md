# DXF HATCH polyline boundary import

This demo runs the actual `.kcad.ts` example against the ASCII DXF fixture, then
renders triangles meshed from its lowered OCCT B-rep. The MP4 shows the closed
HATCH polyline outline, its exact semicircular bulge, and the measured solid
volume. The source, invocation settings, poster and verification evidence are
retained in this directory.

## Reproduce

From the repository root, with project dependencies and FFmpeg installed:

```sh
npx tsx docs/demos/dxf-hatch-polyline-import/capture-demo.mts
npx vitest run src/kernel/import/importDxf.test.ts src/modeling/parts/fromVectorFormats.test.ts --reporter=dot
```

The fixture defines a 40 × 20 mm rectangle with one outward semicircle of
radius 20 mm. The example imports the one-path HATCH boundary and extrudes it by
5 mm. Verification checks one exact bulge arc, OCCT B-rep validity, the bounding
box, and analytic volume `(800 + 200π) × 5 = 7,141.59 mm³`.

The video documents local geometry validation. It does not show deployment,
simulation, physical manufacturing, or hardware acceptance.
