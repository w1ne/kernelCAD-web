# Case 01 tray depth parameter regression

Watch the 12-second [MP4 demo](demo.mp4). It illustrates the Pi 4 tray's
re-imported STEP hole pattern before and after changing `Depth`, then shows a
seeded stale-Y mutation. The diagram is schematic; test results come from
exporting and re-importing the actual fixture with OCCT.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/manufacturing/pcbEnclosureBenchmark.test.ts \
  -t 'Depth edit|Y centre stays' --reporter=dot
python3 docs/demos/benchmark-pi4-depth-param-1227-20261119/capture_demo.py
python3 docs/demos/benchmark-pi4-depth-param-1227-20261119/inspect_demo.py
```

The clean edit changes the tray depth from 66 mm to 92 mm and checks the
re-imported outer bounds, closed-form volume, 58 x 49 mm mounting pattern and
its center at `(47.5, 46)` mm. The mutant leaves the Y center at its default
33 mm; the STEP oracle rejects that center even though tray volume, bounds and
hole pitch still pass.

See [verification evidence](verification/verification.txt) and the
[video contact sheet](verification/video-contact-sheet.png). This is local
CAD/STEP regression evidence, not deployed behavior, manufacturing inspection,
fit, or hardware acceptance.
