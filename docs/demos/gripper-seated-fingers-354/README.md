# Two-finger gripper: fingers seated on the palm (#354)

`demo.mp4` (H.264, 1280×720, 20 fps, 10.1 s) shows
`examples/robot-hand/two-finger-coupled-gripper.kcad.ts` before and after
the repair. Every frame is a local `kernelcad render` of the example source;
no frame is edited.

| Segment | Source | View |
|---|---|---|
| 0–2.5 s | `origin/develop` eb3dfd567 | iso |
| 2.5–5 s | this branch, grip 0° | iso |
| 5–7.5 s | this branch, grip 20° | top |
| 7.5–10 s | this branch, grip 40° (upper limit) | top |

The 20° and 40° frames come from temporary copies of the example with the
`grip` mate `pose` set to that angle. The repository source keeps
`pose: gripMin`.

## Measured result

`runValidateCli({ includeInterference: true, epsilon: 0.01, physical: false, includePhysics: false })`,
the physics-loop sweep options:

| Source | `mechanism` | `mechanismFailures` |
|---|---|---|
| `origin/develop` eb3dfd567 | `broken` | 18 (`mechanism.rest-interpenetration`, `mechanism.interpenetration`) |
| this branch | `real` | 0 |

Before the repair, at rest: palm/finger 369.66 mm³ each, finger/finger
591.38 mm³, driver hub/finger 63.94 mm³ each.

## Reproduce

```bash
npx vitest run tests/integration/examples/twoFingerCoupledGripper.test.ts \
  tests/integration/physics-loop/exampleSweepGate.test.ts
npx tsx src/agent/cli/index.ts render examples/robot-hand/two-finger-coupled-gripper.kcad.ts \
  --separate -o /tmp/gripper.png --width 1280 --height 720
```
