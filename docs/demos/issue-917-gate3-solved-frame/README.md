# Gate 3 solved-frame replay

This bundle reproduces the legacy Gate 3 torque false pass for a revolute
child whose authored `at` differs from its solved mate placement. The fixture
uses a fixed base and a rotor authored at `[100, 0, 0]` mm. At a 90° pose, the
rotor's local connector `[10, 0, 0]` is solved onto the base connector. A
manually supplied world-space force of `[1000, 0, 0]` N then creates a 10 N·m
moment about the mate; the declared legacy limit is 5 N·m.

## Replay and artifacts

- [MP4 demo](gate3-solved-frame.mp4) — 1280×720, 24 fps, 8 seconds.
- [Fixture](gate3-solved-frame.kcad.ts) — native kernelCAD assembly source.
- [Capture source](capture-demo.ts) — executes the fixture, calls
  `checkLoadCapacity(..., { mode: 'stub' })`, and creates the MP4.
- [Settings](demo-settings.json) — invocation, dimensions, timing and claims.
- [Evidence](evidence.json) — local result, measured moment and limitations.

Recreate the evidence and video from the repository root:

```sh
npx tsx docs/demos/issue-917-gate3-solved-frame/capture-demo.ts
```

The script checks the actual diagnostic before writing artifacts. The
authored-frame estimate is 0 N·m; both the solved-frame calculation and the
validator diagnostic report 10 N·m, exceeding the 5 N·m limit.

## Scope of the result

This is a local validator replay of the deprecated manual-load lever-arm
sanity check. It does not simulate joint reactions or stress, verify deployed
behavior, or establish hardware acceptance. The MP4 diagrams show the solved
connector and part origins used for that calculation; they are not physics
simulation output.
