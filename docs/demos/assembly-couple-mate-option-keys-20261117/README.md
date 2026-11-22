# Coupled mate option validation replay

`assembly.coupleMates(driven, opts)` previously ignored misspelled option keys.
For example, `{ source: 'input', ratio: -0.25, offest: 12 }` recorded a coupling
without the intended offset. The fixed capture path rejects the unknown key at
`opts.offest` before recording it, while a valid `offset` remains captured.

## Replay and settings

- Replay source: [`capture-demo.mts`](./capture-demo.mts)
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/assembly-couple-mate-option-keys-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, three 3-second scenes, H.264 (`libx264`),
  CRF 24, `yuv420p`.

The replay calls `Assembly.coupleMates()` through `CaptureSession`. It confirms
the typo produces `feature.invalid-args` with no coupling recorded, then checks
that the corrected `offset` is preserved. The baseline result was reproduced
on `origin/develop` before the guard: the same typo was accepted and the
coupling was recorded with its offset omitted.

## Verification

- `npx vitest run src/modeling/capture/assemblyCoupleMateOptionKeys.test.ts src/modeling/capture/assemblyMateOptionKeys.test.ts` — 2 files, 14 tests passed.
- `npm run typecheck` — passed.
- Focused ESLint on changed capture source and tests — passed.

This is local API capture evidence. It does not claim a geometry-solver result,
simulation, deployed behavior, or hardware acceptance.
