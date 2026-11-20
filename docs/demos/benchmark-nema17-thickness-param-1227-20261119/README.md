# NEMA 17 bracket thickness parameter regression

Watch the 12-second [MP4 demo](demo.mp4). It shows the bracket thickness
changing from 5 mm to 8 mm, a clean STEP round-trip with the through holes
preserved, and a seeded 7 mm upright cutter that leaves the motor holes blind.
The section drawing is schematic; the pass/fail results come from exporting
and re-importing the actual bracket STEP with OCCT.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/manufacturing/nema17BracketBenchmark.test.ts \
  -t 'Thickness edit|old cutter length' --reporter=dot
python3 docs/demos/benchmark-nema17-thickness-param-1227-20261119/capture_demo.py
python3 docs/demos/benchmark-nema17-thickness-param-1227-20261119/inspect_demo.py
```

The clean edit checks the re-imported 22.5 mm motor bore, four 3.4 mm motor
clearance holes, and two 5.5 mm base holes at an 8 mm plate thickness. The
mutant holds the upright cutter at 7 mm after the edit; the STEP interface
oracle rejects its short, blind bore and four M3 holes while the outer bounds
remain valid.

See [verification evidence](verification/verification.txt) and the
[video contact sheet](verification/video-contact-sheet.png). This is local
CAD/STEP regression evidence, not deployed behavior, machining inspection,
fit, or hardware acceptance.
