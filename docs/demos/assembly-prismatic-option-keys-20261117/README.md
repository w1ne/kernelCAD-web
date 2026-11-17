# Prismatic joint option validation replay

`arm.prismatic(...)` previously ignored unknown option keys. A typo such as
`limitsMM` silently left the slide without its intended travel limits. The fixed
capture path reports `feature.invalid-args` at `opts.limitsMM` before recording
any joint; a valid `limitsMm` and actuator force remain captured.

## Replay and settings

- Replay source: [`capture-demo.mts`](./capture-demo.mts)
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/assembly-prismatic-option-keys-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, three 3-second scenes, H.264 (`libx264`),
  CRF 24, `yuv420p`.

The replay calls `Assembly.prismatic()` through `CaptureSession`. It checks that
the typo is rejected without recording a joint, then confirms the corrected
`limitsMm: [0, 120]` and `actuator: { forceN: 25 }` are preserved.

## Verification

- `npx vitest run src/modeling/capture/assemblyPrismaticOptionKeys.test.ts src/modeling/capture/assembly.chaining.test.ts` — 2 files passed; 12 tests passed.
- Focused ESLint on `assemblyJoints.ts` and `assemblyPrismaticOptionKeys.test.ts` — passed.
- `npm run typecheck` — passed.
- `git diff --check` — passed.

This is local API capture evidence. It does not claim solver simulation,
deployed behavior, or hardware acceptance.
