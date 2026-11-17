# Ball-mate torque rating is unverified

This replay uses a ball mate with an explicit 50 N·m torque rating and a
75 N·m external torque. The legacy synchronous check still compares its
500 N force against the 1000 N force rating, and now reports that the ball
mate's torque rating was not checked.

## Replay and artifacts

- [MP4 demo](demo.mp4) — 1280×720, 24 fps, 8 seconds.
- [Fixture](ball-load.kcad.ts) — two-part native kernelCAD assembly.
- [Capture source](capture-demo.ts) — captures the fixture, invokes
  `checkLoadCapacity(..., { mode: 'stub' })`, checks the actual warning, and
  builds the MP4 from the returned diagnostic.
- [Settings](demo-settings.json) — input loads, ratings, timing and claim scope.
- [Evidence](evidence.json) — fixture hash and actual local result.

Regenerate from the repository root:

```sh
npx tsx docs/demos/joint-load-ball-torque-1272/capture-demo.ts
```

This is local validation of the deprecated manual-load checker. The warning
does not compare the ball-mate torque rating; it is not a torque-capacity pass,
reaction propagation, FEA, deployed behavior, or hardware acceptance.
