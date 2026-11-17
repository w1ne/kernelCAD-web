# Tapered fillet demo bundle

This bundle records the tapered `fillet` workflow in [the cookbook example](../../../examples/cookbook-parity/tapered-fillet-bracket.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, about 8 seconds.
- [Capture source](capture.mts) — rebuilds the example with local OCCT, meshes its feature history, software-renders the OCCT triangles with a depth buffer, and encodes the frames with ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology validity, measurements, and capture provenance.
- [Hero frame](hero-frame.png) — the bracket with its tapered inside root round.

Reproduce from the repository root:

```sh
timeout 300s npx tsx docs/demos/tapered-fillet/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no build diagnostics, a valid topology check, 15 faces, tessellated bounds `[0, 0, 0]` to `[60, 30, 40] mm`, and volume `14,435.041 mm³`. The round adds `185.041 mm³` to the `14,250 mm³` sharp-cornered bracket. That is between the `25.752 mm³` of a constant 2 mm round and the `412.036 mm³` of a constant 8 mm round, and 2.6 % above the `180.266 mm³` estimate that assumes a circular section of radius r(y) at each station; the kernel rolls a ball of varying radius, whose envelope is not exactly that section. The bounds come from the tessellated solid because the blend is a B-spline surface whose control-point box extends beyond the bracket. The video shows the sharp-cornered bracket, the tapered result, and one full turn of the result. Its captions describe local replay and geometry validation only; this is not simulation, deployed behavior, or hardware acceptance.

The capture uses a small software triangle renderer. No browser was launched or closed for the capture.
