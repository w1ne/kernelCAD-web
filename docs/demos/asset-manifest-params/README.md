# Asset manifest local demo

This bundle demonstrates the actual checked-in mounting-plate example through
the local kernelCAD build path and the registered `asset_manifest` MCP handler.
It does not start a browser, deploy, publish, or claim fabrication acceptance.

## Reproduce

From the repository root:

```sh
TMPDIR=/Volumes/LabWired/tmp node --import tsx docs/demos/asset-manifest-params/capture.mts
TMPDIR=/Volumes/LabWired/tmp node docs/demos/asset-manifest-params/render.mjs
```

The capture script builds `examples/params/asset-manifest-mounting-plate.kcad.ts`,
activates its `CaptureSession`, calls `callMcpTool('asset_manifest', {})`, validates
the returned payload with `AssetManifestSchema`, and writes `asset-manifest.json`.
`render.mjs` turns that captured result and the authoring workflow into
`asset-manifest.mp4` (1280×720, 30 fps, three 3-second cards).

## Verification evidence

- Source: `capture.mts`, `render.mjs`, and the example linked above.
- Captured response: `asset-manifest.json`.
- Video: `asset-manifest.mp4`.
- Invocation/settings: the commands above; output is deterministic for the
  captured manifest and uses FFmpeg H.264 (`yuv420p`, CRF 24).
- Claim boundary: local script/build/MCP-handler replay only. No live deployment,
  remote hosted MCP, print simulation, or hardware acceptance is represented.
