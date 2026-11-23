# Case 01 floor parameter regression

Watch the 12-second [MP4 demo](demo.mp4). It illustrates the Pi 4 tray's
re-imported STEP pilot holes before and after changing `Floor`, then shows a
seeded stale cutter. The cross-section is schematic; measurements come from
exporting and re-importing the actual fixture with OCCT.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/manufacturing/pcbEnclosureBenchmark.test.ts \
  -t 'Floor edit|old height after a Floor edit' --reporter=dot
python3 docs/demos/benchmark-pi4-floor-param-1227-20261119/capture_demo.py
python3 docs/demos/benchmark-pi4-floor-param-1227-20261119/inspect_demo.py
```

The clean edit raises `Floor` from 2 mm to 3.5 mm and keeps the four 2.5 mm
blind pilots open at the 8.5 mm boss tops. The mutant leaves the cutters at
their original 3–7 mm height. It preserves STEP solid volume and outer bounds,
but the re-imported hole axes point the wrong way and their mouths measure at
3 mm instead of 8.5 mm.

See [verification evidence](verification/verification.txt) and the
[video contact sheet](verification/video-contact-sheet.png). This is local
CAD/STEP regression evidence, not deployed behavior, manufacturing inspection,
fit, or hardware acceptance.
