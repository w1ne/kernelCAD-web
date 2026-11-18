# Assembly mate plain-options replay

`assembly.mate(..., opts)` previously treated `new Date()` as an omitted
options bag: it is an object, but it has no enumerable keys. The capture path
recorded an unbounded revolute mate. The fixed path rejects non-plain objects
with `feature.invalid-args` at `opts`, before recording a mate.

## Replay and settings

- Fixed replay source: [`capture-demo.mts`](./capture-demo.mts)
- Baseline reproducer: [`baseline-repro.mts`](./baseline-repro.mts), run against
  `origin/develop` at `fafb4063e897f0d979ed3bc301ad33bb6ff75ef6`
- Video: [`demo.mp4`](./demo.mp4)
- Machine-readable evidence: [`evidence.json`](./evidence.json)
- Invocation: `npx tsx docs/demos/assembly-mate-plain-options-20261117/capture-demo.mts`
- Video settings: 1280×720, 24 fps, three 3-second scenes, H.264 (`libx264`),
  CRF 24, `yuv420p`.

The replay calls `Assembly.mate()` through `CaptureSession`. It checks that a
`Date` throws a typed `opts` error and creates no mate, that an ordinary options
object retains `limitsDeg`, and that a null-prototype record remains accepted.

## Verification

A pre-fix focused run confirmed that the `Date` call returned normally. A strict
same-realm prototype check also failed the isolated-script test, so the final
guard accepts native object literals from that VM realm. The focused suite now
passes all 10 tests. Typecheck and focused ESLint results are recorded in
`evidence.json`.

This is local capture evidence. It does not claim geometry-solver behavior,
deployed behavior, simulation, or hardware acceptance.
