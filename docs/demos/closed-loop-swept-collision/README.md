# Closed-loop swept-collision overlap report

This bundle demonstrates the native `checkSweptCollision` workflow on the
four-bar cookbook fixture. The `verification.json` result is captured by the
local `check_swept_collision` MCP-tool wrapper from an actual BREP sweep.

The MP4 uses a 2D closed-form pose illustration to show the solved four-bar
path. The reported overlap interval, cutoff, worst volume, and unknown count
come from the local engine result. The support bracket is omitted from the
illustration for clarity.

## Reproduce

From the repository root:

```sh
sh docs/demos/closed-loop-swept-collision/render-demo.sh
```

The capture runs `check_swept_collision` on
`src/agent/skills/kernelcad-kinematic/cookbook/09-four-bar-loop-swept.kcad.ts`
with `joint: crank`, `range: [120, 200, 2]`, and the default 0.01 mm³ cutoff.
The renderer reads `verification.json` and creates the H.264 video at 1280×720,
24 fps, 10 seconds.
`visual-inspection.png` is a contact sheet of inspected entry, overlap, and exit
frames from that MP4.

## Captured result

- 41 coarse poses and 12 closed-loop refinement poses.
- `rocker` / `stop` overlap interval: 136.90625°–167.34375°.
- Bisection bracket at each end: 0.03125°; volume cutoff: 0.01 mm³.
- Worst measured volume: 177.05 mm³ at crank 150°.
- Unknown poses: 0.
- Closed-form geometric contact: approximately 136.852°–167.441°; the thresholded report excludes sub-cutoff slivers.

This is local source validation. It is not a deployed-runtime replay or hardware
acceptance.
