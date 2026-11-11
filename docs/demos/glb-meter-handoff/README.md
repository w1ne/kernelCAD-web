# Metre-scale GLB handoff demo

This bundle demonstrates the default PBR GLB export for the original
`examples/exports/glb-meter-handoff.kcad.ts` model. The part is authored at
700 × 300 × 12 mm; the emitted GLB applies a 0.001 scene scale so a standard
glTF viewer reads its dimensions as 0.7 × 0.3 × 0.012 m. Named part nodes and
PBR material names remain in the file.

## Reproduce

From the repository root, with dependencies and ffmpeg installed:

```sh
UPDATE_GLB_METER_DEMO=1 npx vitest run tests/integration/kernel/export/glbMeterScaleDemoCapture.test.ts --reporter=dot
npx tsx docs/demos/glb-meter-handoff/generate-video.mjs
```

The test runs the source through `runAndExport(format="glb")`, imports the
written bytes with `@gltf-transform/core`, and checks the physical bounding box,
root scale, unit metadata, part names, and material names. The opt-in writes
`handoff.glb` and `verification.json`; the default test run only verifies them
in memory.

## Provenance and scope

- Geometry and materials come from the linked kernelCAD source example.
- The MP4 renders the emitted GLB's actual triangle mesh with the repository's
  fixed-view software renderer and shows the measured bounds. It is **not** an
  interactive browser viewer, a standard viewer render, or a simulation.
- This proves local export serialization only; it does not claim deployed
  behavior or hardware acceptance.
- For a metadata-aware receiver that expects raw millimetre coordinates, pass
  `units: 'mm'`. Standard glTF viewers interpret raw coordinate values as
  metres regardless of custom extras.

The retained source, invocation, generated GLB, verification JSON, video
settings, and MP4 make the handoff reproducible.
