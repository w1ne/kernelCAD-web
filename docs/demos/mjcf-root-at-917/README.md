# MJCF root placement handoff demo

This bundle reproduces issue #917's root-part placement failure. A centered
20 mm cube authored at `[125, -40, 60]` mm is serialized into an MJCF root body
at `[0.125, -0.04, 0.06]` metres, then checked through MuJoCo's compiled rest
pose.

## Reproduce

From the repository root, with dependencies and `ffmpeg`/`ffprobe` installed:

```sh
npx tsx docs/demos/mjcf-root-at-917/capture-demo.mts
KCAD_SLOW=1 npx vitest run src/modeling/runtime/mjcfExport.test.ts --reporter=dot
```

The capture script writes the actual emitted XML to `model.xml`, verifies the
body position with MuJoCo `forward()` and `xposNow()` without advancing a
simulation step, and renders the resulting workflow summary to `demo.mp4`.
`verification.json` records the model hash, measured rest pose, invocation and
video encoding settings.

## Scope

- The regression test verifies local MJCF serialization for the exported root
  body; the MuJoCo forward call checks its compiled rest pose.
- No physics integration step, deployed behavior, or hardware acceptance is
  claimed.
