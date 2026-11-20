# NEMA 17 base-hole thickness regression

Watch the 12-second [MP4 demo](demo.mp4). It shows a thickness edit from 5 mm
to 8 mm, the STEP round-trip checks for both M5 base holes, and a seeded 7 mm
cutter that leaves a 2 mm skin in the base. The section drawing is schematic;
the pass/fail result comes from exporting and re-importing the actual bracket
STEP with OCCT.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/manufacturing/nema17BracketBenchmark.test.ts \
  -t 'base holes that keep their old cutter length' --reporter=dot
python3 docs/demos/benchmark-nema17-base-cutters-thickness-1227-20261119/capture_demo.py
python3 docs/demos/benchmark-nema17-base-cutters-thickness-1227-20261119/inspect_demo.py
```

The focused test confirms that the clean 8 mm bracket passes and that the
mutant's M5 depth, through-kind and volume checks fail while its outer bounds
remain valid. See [verification evidence](verification/verification.txt) and
the [video contact sheet](verification/video-contact-sheet.png). This is local
CAD/STEP regression evidence, not deployed behavior, machining inspection, fit,
or hardware acceptance.
