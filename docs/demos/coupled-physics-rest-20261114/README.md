# Mechanism physics: rest pose of a coupled mate

`demo.mp4` is a 12-second text replay of recorded `kernelcad validate
--include-interference` output for
`examples/robot-arm/skill-built-supported-arm.kcad.ts`. The gripper declares
`left-curl` with `pose: gripDeg` (10°) and couples `right-curl` to it with
ratio −1.

- `before.txt`: output on `origin/develop` `cd3eac756`. The physics check set
  the rest pose to `left-curl` 0°, `right-curl` −10°. It derived the driven
  coordinate from the authored source pose, but the source itself started at
  coordinate 0. The release check reported `mechanism.coupling-residual`:
  "maximum residual 10.0000° at rest pose" (tolerance 5°). 9 failures.
- `after.txt`: output on this branch. Each driven coordinate follows the
  coordinate that the physics pose gives its source (0 when the sample does
  not name it). The rest pose is `left-curl` 0°, `right-curl` 0°. No
  `mechanism.coupling-residual`. 8 failures.

The rest pose values are the `qpos` vectors passed to `session.setPose`,
recorded with a local probe on this example. The video is a text replay, not a
KernelCAD renderer capture. The mechanism is **broken** in both runs (exit code
2): the example also has three `mechanism.joint-mesh-gap` and three
`mechanism.mate-gap` failures. This change does not touch them. This is not a
deployed Studio capture or hardware acceptance result.

## Reproduce

```sh
npx tsx src/agent/cli/index.ts validate \
  examples/robot-arm/skill-built-supported-arm.kcad.ts --include-interference --epsilon 0.01
npx vitest run tests/integration/physics-loop/coupledRestPosePhysics.test.ts
node docs/demos/coupled-physics-rest-20261114/make-video.mjs
```

`make-video.mjs` reads `before.txt` and `after.txt`, writes the slides to a
temporary directory, and regenerates `demo.mp4`, `poster.png` and
`video-evidence.json` (hashes and media probe results).

## Regression evidence

`tests/integration/physics-loop/coupledRestPosePhysics.test.ts`, cases "starts
both coupled coordinates from the same rest coordinate" and "applies offsets
through a coupling chain declared out of order". Both fail with the
`mechanismTruthPhysics.ts` change reverted and pass with it.
