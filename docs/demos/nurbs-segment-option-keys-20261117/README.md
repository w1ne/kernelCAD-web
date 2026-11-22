# NURBS segment option validation replay

`path().nurbsSegment()` previously ignored unknown option keys. A typo such as
`degre` silently dropped the requested degree and used the default. Capture now
reports `feature.invalid-args` at `opts.degre` before recording a segment; the
corrected `degree`, `weights`, and `knots` remain captured.

## Replay and settings

- Replay source: [`capture-demo.mts`](./capture-demo.mts)
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/nurbs-segment-option-keys-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, two 3-second scenes, H.264 (`libx264`),
  CRF 26, `yuv420p`.

The replay calls `PathBuilder.nurbsSegment()` through `CaptureSession`. It checks
that the misspelled option is rejected without recording a segment, then
confirms that the corrected degree, weights, and knot vector are captured.

## Verification

Results are recorded in [`evidence.json`](./evidence.json).

This is local API capture evidence. It does not claim geometry solver output,
simulation, deployed behavior, or hardware acceptance.
