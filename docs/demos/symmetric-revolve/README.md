# Symmetric revolve demo bundle

This bundle records the `Sketch.revolve({ angleDeg, symmetric: true })` workflow in [the cookbook example](../../../examples/cookbook-parity/symmetric-pipe-elbow.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, about 8 seconds.
- [Capture source](capture.mts) — rebuilds the example with local OCCT, meshes its feature history, software-renders the OCCT triangles with a depth buffer, and encodes the frames with ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology validity, measurements, and capture provenance.
- [Hero frame](hero-frame.png) — the elbow with its bore and the y = 0 sketch plane.

Reproduce from the repository root (ffmpeg must be on `PATH`):

```sh
timeout 300s npx tsx docs/demos/symmetric-revolve/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no build diagnostics, a valid topology check, 6 faces, and volume `4,145.23 mm³`. That volume equals the closed-form (Pappus) value for a 90° elbow, Ø16 mm outside and Ø12 mm bore, on a 30 mm bend radius. The mesh bounds are `y = ±26.87 mm` (38 · sin 45°), so the bend spans −45° to +45° about the sketch plane. OCCT's own bounding box overshoots on the torus faces; the verification record keeps both. The video shows the outer revolve from above with the orange sketch plane through its middle, the elbow with its bore, and one full turn of the result. Its captions describe local replay and geometry validation only; this is not simulation, deployed behavior, or hardware acceptance.

The capture uses a small software triangle renderer. No browser was launched or closed for the capture.
