# Hole up to a face demo bundle

This bundle replays the `hole(..., { upToFace })` API on the stepped ledge
model in [model.kcad.ts](model.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, 8 seconds.
- [Capture source](capture.mts) — locally builds the model with OCCT, measures
  the B-rep, checks the bore floor with probes, meshes feature history, and
  encodes the actual triangles with a software renderer.
- [Settings and invocation](demo-settings.json).
- [Verification evidence](verification.json) — diagnostics, volume, B-rep
  validity, bounds, and probes above and below the target plane.
- [Hero frame](hero-frame.png) — the bore in the tall section and the target
  ledge plane.

Reproduce from the repository root (ffmpeg must be on `PATH`):

```sh
timeout 300s npx tsx docs/demos/hole-up-to-face/capture.mts
```

The local replay reports no error diagnostics, valid topology, and a volume of
`11,874.3363 mm³`: the `12,000 mm³` stepped block minus a 4 mm bore extending
10 mm to the z = 10 ledge plane. A 2 × 2 × 0.02 mm probe inside the bore has
`0 mm³` at z = 10.05 and `0.08 mm³` at z = 9.95. The video shows the actual
meshed geometry, the selected plane, and the measured result. It is local
replay and geometry validation only; it does not claim simulation, deployed
behavior, or hardware acceptance. The renderer uses no browser or GPU.
