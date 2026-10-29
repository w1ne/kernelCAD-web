# GLB rig pivots demo bundle

This bundle demonstrates the native kernelCAD GLB export of the original hinge
assembly in `examples/assemblies/glb-rig-hinge.kcad.ts`.

## Reproduce

From the repository root, with dependencies installed and ffmpeg available:

```sh
UPDATE_GLB_RIG_DEMO=1 npx vitest run tests/integration/kernel/export/glbRigDemoCapture.test.ts --reporter=dot
node docs/demos/glb-rig/generate-video.mjs
```

The first command exports the 35° posed hinge through `runAndExport`, checks
that the actual GLB JSON contains the pivot hierarchy and
`asset.extras.kernelcad.rig`, and (only with `UPDATE_GLB_RIG_DEMO=1`) writes
`demo.glb` and `verification.json` with the byte hash and node/rig evidence.
Without that opt-in, the integration test only verifies the emitted contents.
The second command builds a short MP4 from the verified GLB metadata.

## Provenance and scope

- Geometry is original kernelCAD box geometry from the linked `.kcad.ts` source.
- No Polyfork downloads, external meshes, or mesh decimation are involved.
- The MP4 uses a labelled side-view math schematic of the native box geometry,
  the 35° rest pose and the [-35°, 75°] relative range. It is **not** a three.js render or a simulation
  acceptance test. The separate unit test checks the 90-degree far-corner
  transform without three.js.
- This demonstrates exporter serialization and local transform math only; it
  does not claim animation clips, IK, hardware acceptance, or deployed behavior.

`demo.glb`, `demo.mp4`, and `verification.json` are generated deliverables;
the two scripts in this directory retain the invocation and video settings.
