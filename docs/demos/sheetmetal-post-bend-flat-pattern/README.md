# Post-bend flat-pattern cuts demo bundle

This bundle records the `flattenPatternWithHoles` behavior for cuts made after
`.bend()` in [the example](../../../examples/sheet-metal-post-bend-flat-pattern.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 10 fps, 6 seconds.
- [Capture source](capture.mts) — replays the example with local OCCT, reads the
  real `flattenPatternWithHoles` Region, and rasterizes it with `sharp` + ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology
  validity, folded volume, hole centres and spans.
- [Hero frame](hero-frame.png) — the flat pattern with both post-bend holes.

Reproduce from the repository root (ffmpeg must be on `PATH`):

```sh
timeout 300s npx tsx docs/demos/sheetmetal-post-bend-flat-pattern/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no build diagnostics,
a valid topology check, 12 faces, and volume `13,184.4 mm³`. The folded volume is
`45.2 mm³` above the flat blank minus the two holes because the K-factor bend
arc replaces the straight strip; the script-level check allows up to `100 mm³`
of bend-volume difference. The flat pattern reports a `110 × 60 mm` outer
outline, two `Ø4.4 mm` holes centred at `(20, 15)` and `(20, 45)`, and one bend
line at `x = 55`.

The video shows the actual `Region` returned by `flattenPatternWithHoles`: the
outer cut loop, both holes, and the bend line. Its captions describe local
replay and geometry validation only; this is not simulation, deployed behavior,
or hardware acceptance. The capture uses `sharp`; no browser was launched.
