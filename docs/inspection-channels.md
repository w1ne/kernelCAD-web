# Depth and normals inspection channels

## Current state

`kernelcad render inspect` emits an inspection-bundle shape with `rgb`, `mask`, `depth`, and `normals` channels. The CLI normalizes `--channels`, rejects anything outside those names before launching Chromium, calls `headlessRender`, writes `channels/<channel>/<view>.png`, and records the manifest in `src/agent/cli/commands/render.ts` (`SUPPORTED_INSPECT_CHANNELS`, `renderInspectBundle`).

The browser renderer is the source of truth for pixels. `src/agent/render/headlessRender.ts` launches Playwright, opens `/demo-player?headless=1`, loads serialized feature meshes through `window.__demoPlayer.loadFeatureMeshes`, applies object/reference/environment options, sets each view with `setRenderView`, then captures `page.screenshot()`. It has no direct access to the Three renderer, scene, camera, or GL context except through the demo-player bridge.

`src/studio/components/demoPlayer/DemoPlayerPage.tsx` owns the useful scene state. `DemoPlayerWindow` exposes render control, visibility filters, environment control, mask capture, offscreen `captureInspectionChannels`, and `dumpScene`. Internally it stores `{ scene, camera, renderer }`, builds one `THREE.Group` per feature mesh, creates one `THREE.Mesh` per face, and each face geometry already carries `position` and `normal` attributes. The bridge payload also preserves normals in `src/modeling/capture/featureMeshSerialize.ts`, and the worker type makes normals mandatory in `src/shared/worker/workerTypes.ts`.

`src/studio/components/demoPlayer/ViewerPane.tsx` creates the renderer with `preserveDrawingBuffer: true`, fixed pixel ratio `1`, sRGB output, Neutral tone mapping, and a continuous `requestAnimationFrame` render loop. That makes page/canvas screenshots reliable for the existing RGB channel, but it also means any channel captured from the visible canvas inherits display color management, antialiasing, background/watermark risks, and page-level capture behavior.

## Feasibility

Normals are captured through the demo-player bridge with an offscreen render target. The pass temporarily hides non-model overlays, replaces visible feature mesh materials with `THREE.MeshNormalMaterial`, renders the existing scene/camera, reads RGBA8 pixels, encodes a PNG in the page context, restores materials/state, and rerenders RGB. Because feature meshes already include per-vertex normals, no meshing changes are needed.

Depth is captured through the same bridge with a shader material that writes normalized linear camera depth packed into RGBA8. The manifest records camera `near`/`far`, units, encoding, and background sentinel so consumers can decode depth relative to the exact view.

The implementation uses `THREE.WebGLRenderTarget` plus `renderer.readRenderTargetPixels` from inside DemoPlayer, not Playwright `page.screenshot()`. Render targets keep the auxiliary pass separate from the visible RGB frame, avoid page chrome and watermark hazards, choose RGBA8 packing explicitly, and make channel semantics manifest-driven. Float render targets would be nice for raw depth, but RGBA8 PNG packing is the safer baseline under headless Chromium/SwiftShader because it avoids optional float readback support and still emits ordinary PNG bundle assets.

Implemented path:

1. `DemoPlayerWindow.captureInspectionChannels(input)` captures `depth` and `normals` for the current camera/view.
2. `headlessRender` keeps view selection centralized with `setRenderView(view)`, captures RGB/mask when requested, then asks DemoPlayer for depth/normals for that same camera state.
3. `renderInspectBundle` writes the requested channel directories and records `channelMetadata.depth` / `channelMetadata.normals`.

## API shape

CLI:

`kernelcad render inspect <file> <outDir> --channels rgb,depth,normals`

Default stays `rgb`. Unsupported channels should still fail before launching the browser. `requestedChannels` should preserve the user's normalized request; `emittedChannels` should list the channels actually written.

Headless API:

```ts
type InspectionChannel = 'rgb' | 'depth' | 'normals';

interface HeadlessRenderOpts {
  inspectionChannels?: readonly InspectionChannel[];
}

interface HeadlessRenderResult {
  pngsByView: Partial<Record<RenderView, Buffer>>;
  inspectionPngsByChannel?: Partial<Record<InspectionChannel, Partial<Record<RenderView, Buffer>>>>;
}
```

Demo-player bridge:

```ts
interface InspectionCaptureRequest {
  channels: readonly Exclude<InspectionChannel, 'rgb'>[];
  width: number;
  height: number;
}

interface InspectionCaptureResult {
  channels: Record<string, Record<RenderView, Uint8Array | string>>;
  metadata: {
    depth?: { encoding: 'linear-camera-depth-rgba8'; near: number; far: number; units: 'mm' };
    normals?: { encoding: 'view-space-normal-rgb8'; handedness: 'three-camera' };
  };
}
```

Keep view selection in `headlessRender`: it should call `setRenderView(view)`, capture RGB if requested, then ask DemoPlayer for depth/normals for that same camera state. That avoids duplicating camera-fit logic and keeps object filters, tail-feature visibility, reference-image visibility, and environment overrides shared.

## Manifest semantics and caveats

Add per-channel manifest entries rather than only path maps:

```json
{
  "channels": {
    "rgb": { "front": "channels/rgb/front.png" },
    "depth": { "front": "channels/depth/front.png" },
    "normals": { "front": "channels/normals/front.png" }
  },
  "channelMetadata": {
    "depth": {
      "encoding": "linear-camera-depth-rgba8",
      "units": "mm",
      "near": 0.1,
      "far": 1234.5,
      "background": "rgba(0,0,0,0)",
      "meaning": "nearest visible model surface after the active object filter, measured along the camera view direction and normalized from near to far"
    },
    "normals": {
      "encoding": "view-space-normal-rgb8",
      "mapping": "rgb = round((normal_view * 0.5 + 0.5) * 255)",
      "background": "rgba(0,0,0,0)",
      "meaning": "visible model-surface normal in the camera coordinate frame after the active object filter"
    }
  }
}
```

Caveats to include:

- Channels are view-dependent and reflect the same camera, visibility filter, tail-feature filtering, and reference-image visibility used for RGB.
- Depth is not topology identity and must not be used as a stable part/face ID.
- Depth precision is bounded by RGBA8 packing and the camera near/far range recorded in the manifest.
- Normals are rasterized visual normals, not OCCT analytic face normals; triangulation, smoothing, and double-sided materials can affect edge pixels.
- Transparent/transmissive materials should be treated as opaque geometry for inspection channels in v1 unless a later manifest field says otherwise.
- Antialiasing at silhouettes may blend foreground and background unless the offscreen pass explicitly disables MSAA or documents MSAA samples.
- Background pixels use a sentinel and should be ignored by consumers.

## Minimal tests

Unit tests for `src/agent/cli/commands/render.ts`:

- `--channels rgb,depth,normals` normalizes to unique channels and passes `inspectionChannels` into `headlessRender`.
- The bundle writer creates `channels/depth/<view>.png` and `channels/normals/<view>.png` from mocked renderer output.
- Manifest includes `requestedChannels`, `emittedChannels`, path maps, channel metadata, filters, and existing object visibility.
- Unsupported channels still fail before rendering.

Demo-player tests:

- With a mocked or real Three scene, `captureInspectionChannels` restores original mesh materials, visibility, render target, clear color, and renderer size after capture.
- Normal capture on a single front-facing plane produces the expected encoded dominant normal.
- Depth capture on two boxes at different camera distances produces ordered depth values.

Integration smoke:

- Run `kernelcad render inspect examples/bracket-with-hole.kcad.ts /tmp/kcad-inspect-channels --channels rgb,depth,normals` against the dev server.
- Assert all three channel directories contain four non-empty PNGs, the manifest records near/far and encoding metadata, and RGB remains byte-present after auxiliary passes.
