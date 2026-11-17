# Unverified legacy joint load check

This bundle shows a topology-origin connector that the legacy synchronous
manual-load checker cannot resolve. The checker now returns an explicit
`assembly.joint.load-unverified` warning and states that no force or torque
comparison ran for that mate.

## Replay and artifacts

- [MP4 demo](demo.mp4) — 1280×720, 24 fps, 8 seconds.
- [Fixture](topology-load.kcad.ts) — native kernelCAD assembly source.
- [Capture source](capture-demo.ts) — runs the fixture, calls
  `checkLoadCapacity(..., { mode: 'stub' })`, verifies the warning, and builds
  the MP4 from the actual result.
- [Settings](demo-settings.json) — invocation, dimensions, timing and claims.
- [Evidence](evidence.json) — local output and limitations.

Regenerate from the repository root:

```sh
npx tsx docs/demos/joint-load-unverified-topology-1272/capture-demo.ts
```

This is local validation of the deprecated manual-load check. It is not
reaction propagation, FEA, deployed behavior, or hardware acceptance.
