# Pi 4 tray USB-C width-edit regression

Watch the 12-second [MP4 demo](demo.mp4). It shows the tray Width edit from
95 mm to 120 mm, checks the USB-C opening against the exported and re-imported
STEP, then injects a port position that stays at the old X datum. The drawing is
schematic; the pass/fail result comes from local OCCT volume probes on the STEP
solid.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/manufacturing/pcbEnclosureBenchmark.test.ts \
  -t 're-imports from STEP|Width edit|USB-C opening left' --reporter=dot
python3 docs/demos/benchmark-pi4-usbc-width-edit-1227-20261119/capture_demo.py
python3 docs/demos/benchmark-pi4-usbc-width-edit-1227-20261119/inspect_demo.py
```

The focused run passes the clean baseline and resized fixture, and confirms that
the stale-X mutant passes the existing volume, bounds, and boss checks while
material remains at the expected USB-C centre. See [verification evidence](verification/verification.txt)
and the [video contact sheet](verification/video-contact-sheet.png). This is
local CAD/STEP regression evidence, not deployed behavior, board fit, machining
inspection, or hardware acceptance.
