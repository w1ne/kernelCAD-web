# USD coupling warning demo

This bundle runs a two-mate assembly through kernelCAD's `usd-isaac` serializer.
The source couples `output` to `input` at a ratio of `-0.5`. The emitted stage
contains an independent `PhysicsRevoluteJoint "output"` and a warning that
names the dropped relation. The simple cylinders are a topology fixture; they
do not model gear teeth or contact.

## Reproduce

From the repository root, with dependencies and `ffmpeg` installed:

```sh
npx tsx docs/demos/usd-coupling-warning-20261115/capture-demo.ts
node docs/demos/usd-coupling-warning-20261115/render-demo.mjs
npx vitest run tests/unit/modeling/export/usd/usdCoupledMate.test.ts --reporter=dot
```

`capture-demo.ts` writes the actual USDA stage, diagnostics, and
`verification.json`, including the stage hash and local serialization checks.
`render-demo.mjs` uses those generated files as captions in `demo.mp4`; the
encoding settings are 1280×720, H.264, 24 fps, three static 3-second cards,
CRF 27, with no audio. `video-inspection.json` records the final file metadata,
the inspected frames, and the checks run for this bundle.

## Recorded verification

- Focused regression: `tests/unit/modeling/export/usd/usdCoupledMate.test.ts`,
  2 tests passed on 2026-11-15.
- `npm run typecheck` passed.
- ESLint passed for the changed serializer, diagnostic registry, regression,
  and both demo scripts.
- The final MP4 was visually checked at 1, 4, and 7 seconds. Captions keep
  local serialization separate from simulation/replay, deployment, and hardware
  acceptance.

## Scope

- The focused test and generated stage verify local serializer behavior.
- No Isaac Sim runtime replay, deployed behavior, physical gear simulation, or
  hardware acceptance is claimed.
- The warning describes what this serializer emits. Backend-specific mimic APIs
  are outside this export contract.
