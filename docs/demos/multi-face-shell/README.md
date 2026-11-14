# Multi-face shell demo bundle

This bundle records the multi-face `shell` workflow in [the cookbook example](../../../examples/cookbook-parity/open-ended-duct-sleeve.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, about 8 seconds.
- [Capture source](capture.mts) — rebuilds the example with local OCCT, meshes its feature history, software-renders the OCCT triangles with a depth buffer, and encodes the frames with ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology validity, measurements, and capture provenance.
- [Hero frame](hero-frame.png) — the open-ended sleeve from the rendered workflow.

Reproduce from the repository root:

```sh
timeout 300s npx tsx docs/demos/multi-face-shell/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no build diagnostics, a valid topology check, 10 faces, bounds `[0, 0, 0]` to `[40, 30, 20] mm`, and volume `5,280 mm³`. That volume equals the closed-form value for a 40 × 30 mm section with a 36 × 26 mm bore through the full 20 mm length, so both the top and the bottom faces are open. The video shows the base block, the shelled result, and one full turn of the result. Its captions describe local replay and geometry validation only; this is not simulation, deployed behavior, or hardware acceptance.

The capture uses a small software triangle renderer. No browser was launched or closed for the capture.
