# STEP blind-bore classification at a thin end cap

Watch the [12-second MP4](demo.mp4). It shows a 9.90 mm cylindrical bore in a
10 mm plate, the remaining 0.10 mm cap, and the inspector's blind/through
result before and after the near-end probe correction.

## Reproduce

From the repository root:

```sh
npx vitest run src/kernel/backends/occt/holeDetection.test.ts \
  -t 'reports a through hole|measurable 0.1 mm end cap' --reporter=dot
python3 docs/demos/step-bore-cap-classification-20261119/capture_demo.py
python3 docs/demos/step-bore-cap-classification-20261119/inspect_demo.py
```

The fixture measures the full cylindrical wall and classifies its closed end.
An uncapped 10.00 mm bore remains `through`; a 9.90 mm bore with a 0.10 mm
cap is `blind`. This is local OCCT/B-rep validation and test evidence, not a
deployed-runtime or physical inspection claim. See the
[verification record](verification/verification.txt) and
[video inspection contact sheet](verification/video-contact-sheet.png).
