# Spline option validation replay

`path().spline()` previously ignored unknown option keys. A typo such as
`endTanget` silently dropped the intended endpoint tangent constraint. The
capture path now reports `feature.invalid-args` at `opts.endTanget` before
recording a spline; the corrected `endTangent` remains captured.

## Replay and settings

- Replay source: [`capture-demo.mts`](./capture-demo.mts)
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/sketch-spline-option-keys-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, two 3-second scenes, H.264 (`libx264`),
  CRF 26, `yuv420p`.

The replay calls `PathBuilder.spline()` through `CaptureSession`. It checks that
the typo is rejected without recording a spline, then confirms the corrected
start and end tangent vectors are captured.

## Verification

- `npx vitest run src/modeling/capture/sketchSplineTangent.test.ts` — 1 file passed; 6 tests passed.
- `npx eslint src/modeling/capture/splinePhases.ts src/modeling/capture/sketch.ts src/modeling/capture/sketchSplineTangent.test.ts` — passed.
- `npm run typecheck` — passed.
- `npm run skill:references` — passed.
- `git diff --check` — passed.

This is local API capture evidence. It does not claim geometry solver output,
simulation, deployed behavior, or hardware acceptance.
