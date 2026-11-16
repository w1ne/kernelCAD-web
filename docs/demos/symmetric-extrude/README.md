# Symmetric extrude demo bundle

This bundle records the `Sketch.extrude(depth, { symmetric: true })` workflow in [the cookbook example](../../../examples/cookbook-parity/mid-plane-link.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, about 8 seconds.
- [Capture source](capture.mts) — rebuilds the example with local OCCT, meshes its feature history, software-renders the OCCT triangles with a depth buffer, and encodes the frames with ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology validity, measurements, and capture provenance.
- [Hero frame](hero-frame.png) — the link bar with both bores and the z = 0 sketch plane.

Reproduce from the repository root:

```sh
timeout 300s npx tsx docs/demos/symmetric-extrude/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no build diagnostics, a valid topology check, 10 faces, bounds `[-6, -6, -4]` to `[66, 6, 4] mm`, and volume `6,324.98 mm³`. That volume equals the closed-form value for an 8 mm thick link bar (60 mm pin centres, 12 mm wide, full-round ends) minus two Ø5.2 mm bores. The video shows the bar nearly side-on with the orange sketch plane through its mid-height, the bar with both bores, and one full turn of the result. Its captions describe local replay and geometry validation only; this is not simulation, deployed behavior, or hardware acceptance.

The capture uses a small software triangle renderer. No browser was launched or closed for the capture.
