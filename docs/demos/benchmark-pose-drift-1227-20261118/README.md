# Case 04 placement-drift regression

This evidence bundle shows the case 04 fixture's independent pose oracle catching a 1 mm world-placement error that leaves its internal mate graph valid. Watch [demo.mp4](demo.mp4); [capture source](capture_demo.py), [settings](demo-settings.json), [test evidence](verification/verification.txt), and [video inspection](verification/video-inspection.json) are retained here.

## Reproduction

The clean source is [pi-camera-mount.kcad.ts](../../../tests/fixtures/manufacturing/pi-camera-mount.kcad.ts). The test injects one change to the mount's `at` value: `[20, -2, patternHeight]` becomes `[21, -2, patternHeight]`. The mount and camera still mate, and `evaluate_script` reports `ok: true` with `mechanism: real`; both solved world X positions become 21 mm instead of the fixture's expected 20 mm.

Run the case:

```bash
npx vitest run tests/integration/manufacturing/piCameraMountBenchmark.test.ts --reporter=dot
```

Create the video from the retained capture source and settings:

```bash
python3 docs/demos/benchmark-pose-drift-1227-20261118/capture_demo.py
```

## Result

`demo.mp4` presents the clean fixture, the one-millimetre mutation, and the regression outcome. The full case file passed 9/9 tests locally, including exact assertions that both `mount` and `camera` moved to x=21 mm and violate the independent x=20 mm datum. The [contact sheet](verification/video-contact-sheet.png) contains the inspected 1 s, 5 s, and 9 s frames.

This records local kernelCAD regression behavior. It does not claim deployed behavior, a physical camera module fit, or hardware acceptance.
