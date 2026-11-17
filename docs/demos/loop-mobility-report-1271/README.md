# Closed-loop mobility in the mechanism result

This bundle captures a local four-bar regression. `solveMates` already found a
loop lockup and mobility, but `checkMechanismTruth` previously dropped those
solver outputs. The repaired result carries the typed diagnostic and sampled
rank/mobility evidence into its coverage and structured mechanism summary.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/loop-mobility-report-1271/capture-demo.ts
python3 docs/demos/loop-mobility-report-1271/render_demo.py
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of default=nw=1 docs/demos/loop-mobility-report-1271/demo.mp4
```

The capture script builds the same 40/120/80/100 mm four-bar fixture used by
the focused regression, calls both `solveMates` and
`checkMechanismTruth(arm, { sweepBudget: 0 })`, and saves the actual diagnostic
and mobility result to [`verification.json`](verification.json). The Python
renderer makes an 8-second, 1280×720 H.264 video at 24 fps from that evidence.
The linkage drawing is a schematic of the fixture dimensions; it is not a
render of the solved geometry.

## Retained artifacts

- [`capture-demo.ts`](capture-demo.ts): fixture and real solver invocation.
- [`render_demo.py`](render_demo.py): video source and settings.
- [`verification.json`](verification.json): captured local result used by the video.
- [`demo.mp4`](demo.mp4): solver diagnostic and per-pose mobility evidence.

The BREP sweep is deliberately skipped by a zero budget and physics is off.
This demonstrates local CAD validation only; it does not show deployed behavior
or hardware acceptance.
