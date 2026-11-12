# Mechanism sweep skip hint

This bundle shows the local zero-budget check behind the revised diagnostic hint.
Two overlapping cubes are joined by a revolute mate, and the check runs with
`sweepBudget: 0`. The rest-pose overlap remains an error; the articulated travel
sweep is skipped and reports `sweepBudget is 0 (forced skip)`. The hint directs
the author to the diagnostic message and only suggests a larger budget when the
message says the work estimate exceeded a positive configured budget.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/mechanism-sweep-skip-hint/capture-demo.ts
python3 docs/demos/mechanism-sweep-skip-hint/render_demo.py
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of default=nw=1 docs/demos/mechanism-sweep-skip-hint/demo.mp4
```

The capture script builds the assembly with the local modeling API and calls
`checkMechanismTruth(arm, { sweepBudget: 0 })`. It saves the actual result and
the selected diagnostic messages and hints to [`demo-output.json`](demo-output.json).
The renderer creates a 7.5-second 1280×720 H.264 video at 24 fps from those
diagnostics.

## Retained artifacts

- [`capture-demo.ts`](capture-demo.ts): model, invocation, selected result fields.
- [`render_demo.py`](render_demo.py): video renderer and settings.
- [`demo-output.json`](demo-output.json): local validation result used by the video.
- [`demo.mp4`](demo.mp4): three-slide view of the invocation, diagnostic, hint, and scope.

The video shows local CAD validation. The sweep is skipped, no physics simulation
is run, and it does not show deployed behavior or hardware acceptance.
