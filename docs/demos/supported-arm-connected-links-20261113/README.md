# Supported-arm connected solids demo

This bundle records the repaired `upper-link` and `gripper-palm` solids in
[`skill-built-supported-arm.kcad.ts`](../../../examples/robot-arm/skill-built-supported-arm.kcad.ts).
The MP4 is a static turntable of the resulting CAD model with explicit
verification captions.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/fast/exampleParseSmoke.test.ts -t 'supported-arm|classifies'
```

The targeted smoke run passed 5 tests, including evaluation of this example.
This is the visual handoff for [PR #1380](https://github.com/w1ne/kernelCAD-web/pull/1380).

The source is rendered through kernelCAD's `render_preview` and
`capture_animation` tools. `capture-settings.json` retains the tool parameters,
source hash, server build, and output hashes. `capture-raw.mp4` is the raw
turntable result; `render-demo.sh` overlays the two caption files to build the
reviewable [`demo.mp4`](demo.mp4). `inspection-frame.png` is a frame extracted
from the final clip and visually inspected at 3 seconds.

## Scope and evidence

- The preview returned a valid scene with bounds **309.153 × 139.956 × 138 mm**.
- The video shows static geometry only. `capture_animation` ran with
  `no_verify: true`; its `verified` result is false. This is not a motion or
  collision check.
- The preview reported the existing `mechanism.joint-mesh-gap` and
  `mechanism.mate-gap` diagnostics tracked by #352. This change addresses solid
  connectivity in the example and does not claim that mechanism gate passes.
- The targeted smoke test and PR CI are software validation. The video is a
  visual render. Neither is deployed-behavior or hardware-acceptance evidence.
