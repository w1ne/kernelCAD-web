# Param-driven sheet-metal bend demo bundle

This bundle records issue #1763: `sheetMetal()` and `.bend()` accept `param()`
for thickness, k-factor, bend line, inner radius and angle. It replays
[the example](../../../examples/sheet-metal-param-driven-bend.kcad.ts) with
local OCCT, moves the param table, and lowers the same captured records again.

- [MP4 demo](demo.mp4) — 1280 × 720, 10 fps, 5.4 seconds.
- [Capture source](capture.mts) — captures once, measures the first table
  state, sets `Thickness = 3` and `BendLine = 20`, re-lowers, and rasterizes
  the real `flattenPatternWithHoles` Region with `sharp` + ffmpeg.
- [Verification record](verification.json) — both table states with volume,
  face count, topology validity, bounding box and flat-pattern extents.
- [Hero frame](hero-frame.png) — the flattened blank with the moved bend line.

Reproduce from the repository root (ffmpeg must be on `PATH`):

```sh
timeout 300s npx tsx docs/demos/sheetmetal-param-driven-bend/capture.mts
```

Measured locally: the fully param-driven part lowers to `13,245.24 mm³`, equal
to the same values written as literals (the capture compares both). After
`paramTable.set('Thickness', 3)` and `paramTable.set('BendLine', 20)` the same
records lower to `19,901.79 mm³`; the flat pattern reports one bend line at
`x = 20` instead of `x = 55`. Both results pass the local topology check and
carry no build diagnostics.

The video shows the actual `Region` returned by `flattenPatternWithHoles` and
the measured volumes. Its captions describe local replay and geometry
validation only; this is not simulation, deployed behavior, or hardware
acceptance. The capture uses `sharp`; no browser was launched.
