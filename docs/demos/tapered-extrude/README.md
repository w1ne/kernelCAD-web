# Tapered extrude demo bundle

This bundle records the `Sketch.extrude(depth, { taperDeg })` workflow in [the cookbook example](../../../examples/cookbook-parity/drafted-boss-plate.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, about 8 seconds.
- [Capture source](capture.mts) — rebuilds the example with local OCCT, meshes its feature history, software-renders the OCCT triangles with a depth buffer, and encodes the frames with ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology validity, measurements, and capture provenance.
- [Hero frame](hero-frame.png) — the plate with two drafted bosses from the rendered workflow.

Reproduce from the repository root:

```sh
timeout 300s npx tsx docs/demos/tapered-extrude/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no build diagnostics, a valid topology check, 16 faces, bounds `[0, 0, 0]` to `[60, 40, 14] mm`, and volume `10,390.99 mm³`. That volume equals the closed-form value for a 60 × 40 × 4 mm plate plus two cone-frustum bosses (Ø8 mm base, Ø6.95 mm top, 10 mm tall, 3° draft) minus two Ø2.5 × 9 mm pilot holes. The video shows one boss nearly side-on so the drafted walls are visible, the plate with both bosses, and one full turn of the result. Its captions describe local replay and geometry validation only; this is not simulation, deployed behavior, mould-flow analysis, or hardware acceptance.

The capture uses a small software triangle renderer. No browser was launched or closed for the capture.
