# Revolute joint option validation replay

`arm.revolute(...)` previously ignored unknown option keys. A typo such as
`limitsDg` recorded the joint without its intended angular limits. The fixed
capture path reports `feature.invalid-args` at `opts.limitsDg` before recording
the joint, while a valid `limitsDeg` and actuator capacity remain captured.

## Replay and settings

- Replay source: [`capture-demo.mts`](./capture-demo.mts)
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/assembly-revolute-option-keys-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, three 3-second scenes, H.264 (`libx264`),
  CRF 24, `yuv420p`.

The replay calls `Assembly.revolute()` through `CaptureSession`. It checks the
misspelled key fails with no joint recorded, then confirms the corrected
`limitsDeg: [-45, 45]` and `actuator: { torqueNm: 0.2 }` are preserved.
The baseline call was reproduced on `origin/develop` before the guard: it was
accepted and recorded an unbounded revolute joint.

## Verification

- `npx vitest run src/modeling/capture/assemblyRevoluteOptionKeys.test.ts src/modeling/capture/assembly.chaining.test.ts` — 2 files, 12 tests passed.
- `npm run typecheck` — passed.
- Focused ESLint on changed capture source and test — passed.

This is local API capture evidence. It does not claim a geometry-solver result,
simulation, deployed behavior, or hardware acceptance.
