# Cutout up to a face demo bundle

This bundle records the `Shape.cutout(profile, { face, upToFace })` workflow in [the cookbook example](../../../examples/cookbook-parity/ledge-height-slot-block.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, about 8 seconds.
- [Capture source](capture.mts) — rebuilds the example with local OCCT, meshes its feature history, software-renders the OCCT triangles with a depth buffer, and encodes the frames with ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology validity, volume, slot-floor probes, and capture provenance.
- [Hero frame](hero-frame.png) — the stepped block with the slot and the z = 12 target plane.

Reproduce from the repository root (ffmpeg must be on `PATH`):

```sh
timeout 300s npx tsx docs/demos/cutout-up-to-face/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no build diagnostics, a valid topology check, 13 faces, and volume `30,000 mm³`. That volume equals the closed-form value: the 60 × 30 × 24 mm block, minus the 30 × 30 × 12 mm step, minus the 10 × 20 mm slot from z = 24 down to the z = 12 ledge plane. Two 2 × 2 × 0.02 mm probes inside the slot put the floor on the ledge plane: the probe at z = 12.05 holds `0 mm³` of material and the probe at z = 11.95 holds `0.08 mm³` (full). The slot depth is not written in the script; it comes from the ledge face. The video shows the stepped block with the orange target plane, the slot after the cut, and one full turn of the result. Its captions describe local replay and geometry validation only; this is not simulation, deployed behavior, or hardware acceptance.

The capture uses a small software triangle renderer. No browser was launched or closed for the capture.
