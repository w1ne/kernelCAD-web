# Hole-driven insert (`lib.insert`)

The 23-second `demo.mp4` is an annotated still sequence composed from local
`kernelcad render --preset publish` captures of the committed example. It is
not a screen recording, turntable, deployed-platform capture or hardware test.

Source: `examples/parts/hole-driven-insert.kcad.ts` — a plate with four Ø5.5
bores and two Ø3.4 bores. `lib.insert` sizes them to M5 countersunk bolts
(seat cut to the ISO 10642 head) and M3 socket-head screws (no seat), then
places every stack along the detected axis.

Reproduce from the repository root:

```sh
npx tsx examples/parts/verify-insert.mts
npx tsx src/agent/cli/index.ts render examples/parts/hole-driven-insert.kcad.ts --preset publish -o docs/demos/hole-driven-insert/insert.hero.png
npx tsx src/agent/cli/index.ts render examples/parts/hole-driven-insert.kcad.ts --preset publish --width 2048 --height 1536 --pose 0,0 -o docs/demos/hole-driven-insert/insert-front.png
convert docs/demos/hole-driven-insert/insert-front.pose-0-0.png -crop 760x700+540+260 +repage docs/demos/hole-driven-insert/insert-detail.png
python3 docs/demos/hole-driven-insert/make-review-video.py
```

Evidence:

- `geometry-evidence.json` — source hash, per-part bounds and volumes,
  105 part pairs with zero positive-volume overlaps, the countersink volume
  removed by the seats (377.66 mm³ for the four flat-head seats), and the
  scope statement.
- `video-evidence.json` — input image hashes, delivered video hash, slide
  durations and the exact render invocations.

Scope: digital envelope geometry only. The bores are read from the lowered
BREP (any `.hole()`, `.holes()`, pattern or imported hole behaves the same);
the thread is sized from the bore diameter, so a tapped hole reports its
modeled pilot diameter and is not classified as a thread. No thread contact,
strength, torque or preload is checked. The seated countersunk head is the
ISO 10642 envelope frustum: rim on the seat plane, small end at the nominal
Ø, matching the 90° countersink the seat cut makes.

Feature tests: `src/modeling/parts/holeInsert.test.ts` covers sizing,
similar-hole and pattern selection, blind holes, `headAt`, and the refusals.
