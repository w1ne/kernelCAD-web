# Case 08 ear-hole position regression

Watch [the 12-second MP4](demo.mp4). The video illustrates the SG90 plate's two
M2 ear-hole axes and a seeded 1 mm shift that preserves the volume and outer
bounding box. The result comes from the local STEP re-import regression; the
video is a schematic of that measured workflow.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/manufacturing/sg90LeverMountBenchmark.test.ts \
  -t 're-imports from STEP|ear hole moved off' --reporter=dot
python3 docs/demos/benchmark-sg90-ear-hole-pitch-1227-20261119/capture_demo.py
python3 docs/demos/benchmark-sg90-ear-hole-pitch-1227-20261119/inspect_demo.py
```

The regression exports the unmodified and shifted case 08 sources to STEP,
re-imports them, and reads the plate's cylindrical-hole axes. The shifted model
still passes the pre-existing volume and box checks, but its low ear hole is at
`(0, -17.95)` mm instead of the authored `(0, -18.95)` mm axis.

## Measured interface

- Plate: `24 × 46 × 4 mm`, with expected 2.4 mm through-hole axes at
  `(0, -18.95)` and `(0, 8.25)` mm.
- Mutation: move only the low M2 hole 1 mm in Y.
- Existing volume and bounding-box checks: pass for the mutation.
- Independent STEP hole-center check: rejects the mutation at a 0.01 mm
  location tolerance.

See [the focused verification record](verification/verification.txt) and
[video inspection contact sheet](verification/video-contact-sheet.png).
This is local benchmark evidence only; it does not establish deployed behavior,
manufacturing inspection, fit, or hardware acceptance.
