# Assembly mate option validation replay

The clip reproduces a revolute joint whose `limitsDeg` was misspelled as
`limtsDeg`. On the base revision, capture accepted the call and omitted the
range, leaving the joint unbounded. The fixed capture reports the unknown key
before recording a mate; the corrected `limitsDeg` is preserved on the record.

## Replay and settings

- Source: [`capture-demo.mts`](./capture-demo.mts)
- Baseline reproducer: [`baseline-repro.mts`](./baseline-repro.mts), run on baseline revision `642f9a398`
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/assembly-mate-option-keys-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, three 3-second scenes, H.264 (`libx264`, CRF 24), `yuv420p`.

The source executes `CaptureSession` and `Assembly.mate()`. The baseline
reproducer captures the unbounded hinge on `642f9a398`. The replay asserts that
`limtsDeg` raises `feature.invalid-args` at `opts.limtsDeg` without recording a
mate, then checks that the corrected `limitsDeg: [-45, 45]` appears in the
captured record.

## Verification

Before the fix, the same call captured `{ name: 'hinge', type: 'revolute' }`
with no `limitsDeg`. The regression test failed because no `KernelError` was
raised. After the fix:

```text
npx vitest run src/modeling/capture/assemblyMateOptionKeys.test.ts
1 test file passed · 2 tests passed
```

This is local capture evidence. It does not claim a geometry-solver run,
deployed behavior, or hardware acceptance.
