# Assembly part option validation replay

The clip shows the `assembly.part()` placement typo that used to be ignored, the new `feature.invalid-args` response, and the corrected `at: [120, 0, 0]` placement.

## Replay and settings

- Source: [`capture-demo.mts`](./capture-demo.mts)
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/assembly-part-option-keys-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, three 3-second scenes, H.264 (`libx264`, CRF 24), `yuv420p`.

The source executes the real `CaptureSession` and `Assembly.part()` APIs. It asserts that `att` raises `feature.invalid-args` at `opts.att`, then reads the captured `spacer` placement after the corrected `at` call and checks `[120, 0, 0]` mm. The first scene records the prior `origin/develop` behavior: `att` was ignored, leaving `opts.at` undefined, which the placement resolver defaults to `[0, 0, 0]`.

## Verification

The regression was red before the fix: `npx vitest run src/modeling/capture/assembly.partNameUniqueness.test.ts` accepted the unknown option and failed the new expectation. After the fix, the focused assembly suite passed:

```text
npx vitest run src/modeling/capture/assembly.partNameUniqueness.test.ts \
  src/modeling/capture/assembly.catalogConnectors.test.ts \
  src/modeling/capture/assembly.chaining.test.ts
3 test files passed · 33 tests passed
```

This artifact is a local API replay and source-test result. It does not show deployed behavior, a simulation, or hardware acceptance.
