# Luxo lamp connected-solids demo

This bundle records the repaired link solids in
[`luxo-lamp.kcad.ts`](../../../examples/kinematic/luxo-lamp.kcad.ts).
The MP4 is a static turntable of the repaired model with verification captions.

## Reproduce

From the repository root:

```sh
npx tsx src/agent/cli/index.ts evaluate examples/kinematic/luxo-lamp.kcad.ts --json
npx tsx src/agent/cli/index.ts validate examples/kinematic/luxo-lamp.kcad.ts --include-physics --include-interference --json
npx vitest run tests/integration/fast/exampleParseSmoke.test.ts -t 'luxo-lamp|classifies'
```

`capture-raw.mp4` comes from the local `kernelcad animate --turntable` command
recorded in `capture-settings.json`. `render-demo.sh` overlays the two caption
files to build [`demo.mp4`](demo.mp4). `inspection-frame.png` is the frame at
3 seconds, inspected visually.

## Scope and evidence

- On develop, `evaluate` fails with 5 `union.disconnected` and 5
  `union.member-overlap` errors. On this branch it returns `ok: true` with no
  diagnostics.
- `validate --include-physics --include-interference` reports
  `mechanism: real`: 8 poses across 3 joints, no collisions, and the lamp holds
  under gravity. The worst drop-test drift is 3.7° on the shoulder (develop:
  3.8°; limit: 5°).
- The video shows static geometry only. The turntable capture skips pose
  verification. Motion evidence comes from the CLI gates above.
- The shade renders dark, not brass, on develop too. This change does not
  affect it.
- These are software checks and a visual render. They are not
  hardware-acceptance evidence.
