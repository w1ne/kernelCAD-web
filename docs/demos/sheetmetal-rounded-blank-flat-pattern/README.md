# Rounded sheet-metal blank flat-pattern demo bundle

This bundle records the rounded-blank flat-pattern behavior for
[the example](../../../examples/sheet-metal-rounded-blank.kcad.ts).

- [MP4 demo](demo.mp4) — 1280 × 720, 10 fps, 6 seconds.
- [Capture source](capture.mts) — replays the example with local OCCT, folds
  the blank, reads the real `flattenPatternWithHoles` Region, and rasterizes it
  with `sharp` + ffmpeg.
- [Verification record](verification.json) — local build diagnostics, topology
  validity, folded volume against the analytic blank + bend sector, sampled
  outline span, and the measured chord sagitta.
- [Hero frame](hero-frame.png) — the flat pattern with all four R10 corners.

Reproduce from the repository root (ffmpeg must be on `PATH`):

```sh
timeout 300s npx tsx docs/demos/sheetmetal-rounded-blank-flat-pattern/capture.mts
```

The recorded result is a locally replayed OCCT B-rep with no diagnostics, a
valid topology check, and volume `11,873.6 mm³`. That equals the analytic
rounded blank (`100 × 60` minus four `R10` corners, 2 mm thick) plus the
K-factor bend sector minus the flat strip it replaces, within 1 mm³. The flat
pattern reports a `100 × 60 mm` outline with 105 sampled points, one bend line
at `x = 50`, and no holes.

`Region` wires are polylines, so the four tangent arcs are sampled at a
0.005 mm chord sagitta; the measured worst chord is `0.00493 mm`. Every sampled
vertex lies on the authored arc. This is a sampling tolerance, not an exact
arc record: the DXF cut layer carries the same polyline. Ellipse, NURBS and
spline segments in the blank profile are still refused by name.

The video shows the actual `Region` returned by `flattenPatternWithHoles`:
the sampled outer loop, its four source-corner circles, and the bend line. Its
captions describe local replay and geometry validation only; this is not
simulation, deployed behavior, or hardware acceptance. The capture uses
`sharp`; no browser was launched.
