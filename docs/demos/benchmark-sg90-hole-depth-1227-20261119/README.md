# Case 08 M2 ear-hole depth regression

Watch the [12-second MP4](demo.mp4). It shows the authored 4 mm through holes,
a seeded 0.1 mm cap that preserves the existing volume, box and center checks,
and the measured STEP depth check that rejects the short bores.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/manufacturing/sg90LeverMountBenchmark.test.ts \
  -t 're-imports from STEP|ear hole moved off|stop 0.1 mm' --reporter=dot
python3 docs/demos/benchmark-sg90-hole-depth-1227-20261119/capture_demo.py
python3 docs/demos/benchmark-sg90-hole-depth-1227-20261119/inspect_demo.py
```

## Measured interface

- Plate: `24 × 46 × 4 mm` with two Ø2.4 mm ear holes at `(0, -18.95)` and
  `(0, 8.25)` mm.
- Mutation: the cylinders start at `z = 11.9 mm` and stop at `z = 15.8 mm`,
  leaving a `0.1 mm` top skin. Their STEP cylindrical walls measure `3.90 mm`.
- Existing volume, bounding-box, center and diameter gates still pass.
- STEP inspection labels these capped bores `through` because its `0.2 mm`
  near-end probe skips the thin cap; its measured `depthMm` still reports
  `3.90 mm`. The benchmark now requires the authored `4.00 mm` cylindrical
  depth within `0.01 mm`.

This is local STEP export/re-import benchmark evidence. It does not establish
deployed behavior, physical inspection, fit, or hardware acceptance. See the
[verification record](verification/verification.txt) and
[video inspection contact sheet](verification/video-contact-sheet.png).
