# Missing-mate regression — manufacturing benchmark case 08

This bundle records a seeded defect in the SG90 lever fixture: remove only the `swing` revolute mate while keeping the purchased servo, printed plate, horn, and fixed servo-to-plate mate. The local mechanism check rejects the detached arm with `mechanism.orphan-part`.

Watch [demo.mp4](demo.mp4). The capture source, settings, verification output, and inspected frames are retained here. The drawing is a topology schematic; the pass/fail result comes from the actual local test.

## Reproduction

```bash
npx vitest run tests/integration/manufacturing/sg90LeverMountBenchmark.test.ts --reporter=dot -t 'catches a missing revolute mate'
```

The test edits the fixture in memory by removing:

```ts
mount.mate('swing', 'servo.shaft', 'arm.hub', 'revolute', { limitsDeg: [0, 180] });
```

It asserts `ok: false`, `mechanism: 'broken'`, and the `mechanism.orphan-part` diagnostic. The original clean assembly remains covered by the other benchmark tests.

## Verification scope

The focused local Vitest case passed (1 passed, 11 skipped), ESLint passed on the changed test, and `npm run typecheck` passed. This is local source-level mechanism verification only; no deployment, rendered animation, supplier fit, or hardware acceptance is claimed.
