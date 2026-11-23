# Rib geometry demo bundle

This bundle records the `rib` workflow in [the cookbook example](../../../examples/cookbook-parity/rib-stiffened-plate.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, about 8 seconds.
- [Capture source](capture.mts) — rebuilds the example with local OCCT, meshes its feature history, software-renders the OCCT triangles with a depth buffer, and encodes the frames with ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology validity, measurements, and capture provenance.
- [Hero frame](hero-frame.png) — final fused result from the rendered workflow.

Reproduce from the repository root:

```sh
timeout 180s npx tsx docs/demos/rib-geometry/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no build diagnostics, a valid topology check, volume `13,194 mm³`, and bounds `[0, 0, 0]` to `[40, 30, 29.9] mm`. The video shows the base body, the rib extrusion, and their fused result. Its captions describe local replay and geometry validation only; this is not simulation, deployed behavior, or hardware acceptance.

The capture uses a small software triangle renderer because the existing Chrome session could not create a WebGL context in this environment. No browser was launched or closed for the capture.
