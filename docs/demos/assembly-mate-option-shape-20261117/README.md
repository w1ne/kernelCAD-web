# Assembly mate option-shape validation replay

The baseline accepted `[]` in the fifth `arm.mate(...)` argument as if options
were omitted, silently creating an unbounded revolute mate. The fixed runtime
rejects `null`, arrays, and primitives with `feature.invalid-args` at `opts`
before recording a mate. A normal options object still preserves `limitsDeg`.

## Replay and settings

- Fixed replay source: [`capture-demo.mts`](./capture-demo.mts)
- Baseline reproducer: [`baseline-repro.mts`](./baseline-repro.mts), run on baseline `b93aa9011a45a04dac172d48dca9c205e536ae21`
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/assembly-mate-option-shape-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, three 3-second scenes, H.264 (`libx264`), CRF 24, `yuv420p`.

The fixed replay runs `CaptureSession` and `Assembly.mate()`. It asserts typed
errors for `null`, `[]`, and `42`, verifies that rejected calls create no mate
record, and checks that `{ limitsDeg: [-45, 45] }` remains on the captured mate.

## Verification

The regression test failed before the fix for all three malformed shapes: each
call returned normally. After the fix, the focused test passes:

```text
npx vitest run src/modeling/capture/assemblyMateOptionKeys.test.ts
1 test file passed · 6 tests passed
```

`npm run typecheck` and ESLint on the changed TypeScript files also pass.

This is local capture evidence. It does not claim a geometry-solver run,
deployed behavior, or hardware acceptance.
