// tests/integration/examples/luxoLampClevis.validate.test.ts
//
// Split out of luxoLampClevis.test.ts for CI shard balance (per-file
// vitest sharding). Hosts every assertion that reads the result of the
// kinematic-only mechanism-truth loop over
// `examples/kinematic/luxo-lamp.kcad.ts`.
//
// All four tests below previously each re-ran `runValidateCli` with the
// IDENTICAL input (same file, epsilon: 0.01, includeInterference: true,
// physical: false, json: true, includePhysics: false). The run is pure
// (read-only over the script file), so it is computed ONCE in beforeAll
// and the tests assert against the shared result — same assertions,
// same thresholds, same inputs, ~1/4 of the wall clock.
//
// The fourth test is the per-example entry of the physics-loop example
// sweep gate (tests/integration/physics-loop/exampleSweepGate.test.ts)
// for this example; it is hosted here so it can share the same validate
// run instead of paying a second ~2-minute loop. The sweep gate file
// explicitly delegates `examples/kinematic/luxo-lamp.kcad.ts` to this
// file (see HOSTED_IN_DEDICATED_FILE there).
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-01-physics-loop-P5-luxo-geometric-rebuild.md

import { beforeAll, describe, expect, it } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const LUXO_SCRIPT_PATH = 'examples/kinematic/luxo-lamp.kcad.ts';

type ValidateResult = Awaited<ReturnType<typeof runValidateCli>>;

describe('Luxo lamp — passes the physics-grounded loop', () => {
  let r: ValidateResult;

  beforeAll(async () => {
    r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: false,
    });
  }, 240_000);

  it('passes the kinematic-only mechanism-truth loop incl. criterion 8: mechanism: real (P11 Slice 3 wrap re-author)', async () => {
    // P9 made the lamp pass criteria 1-4 + 7. P11 Slice 2 added criterion
    // 8 (tendon-body-intersect), which flagged the straight springs
    // cutting through the arms. P11 Slice 3 routes each spring over a wrap
    // rail on the beam it spans, so no cable pierces a body — the lamp is
    // back to `mechanism: real` with the spring-through-structure bug
    // closed.
    expect(r.mechanism).toBe('real');
    expect(r.mechanismFailures ?? []).toEqual([]);
  }, 240_000);

  it('is interference-clean across the full pose sweep: ZERO mechanism.interpenetration diagnostics (2026-06-03 absolute 20 mm³ gate)', async () => {
    // The assertion that was MISSING and let the slop through (spec
    // sequencing step 6): under the absolute 20 mm³ interference gate the
    // lamp must have NO interpenetration at any sampled pose. The pre-redesign
    // 5%-of-bbox / 2500 mm³-revolute caps hid body-near-fork overlaps; the
    // clevis tongue-drill (decision #2), the head neck-stem restructure, and
    // the tightened elbow (-95°) / wrist (-50°) limits make every sampled pose
    // interference-clean. This is the `interferences === 0` contract.
    const interferences = (r.mechanismFailures ?? []).filter(
      (f) => f.code === 'mechanism.interpenetration',
    );
    expect(interferences).toEqual([]);
    expect(r.mechanism).toBe('real');
  }, 240_000);

  it('P8 joint-mesh-continuity gate sees NO joint-mesh-gap diagnostics on the post-P9 Luxo (GREEN after P9)', async () => {
    // P9 (2026-06-02): with the spring-boss posts on each arm and the
    // extended column / pulled-back head-neck, every mate connector
    // lies inside its body's mesh within 1 mm — no
    // `mechanism.joint-mesh-gap` diagnostics fire.
    const gaps = (r.mechanismFailures ?? []).filter(
      (f) => f.code === 'mechanism.joint-mesh-gap',
    );
    expect(gaps).toEqual([]);
    expect(r.mechanism).toBe('real');
  }, 240_000);

  // Example-sweep-gate entry for this example (moved here from
  // exampleSweepGate.test.ts to share the validate run above — identical
  // input). Sweep runs the KINEMATIC-only gate (criteria 1-4). The P6
  // physics gate (criteria 5+6) ships as opt-in with --include-physics
  // and is exercised on the dedicated `examples/kinematic/luxo-lamp.kcad.ts`
  // path in luxoLampPhysicsGate.test.ts (the bare-spring lamp correctly
  // fails the drop-test pending #361 — closed-loop spring API).
  it('examples/kinematic/luxo-lamp.kcad.ts passes the physics-grounded loop', async () => {
    const result = r;
    const examplePath = LUXO_SCRIPT_PATH;
    expect(
      result.mechanism === 'real' || result.mechanism === 'unverified',
      `${examplePath}: expected mechanism: real or unverified, got '${result.mechanism}'. ` +
        `Either fix the example or file an issue and add it to ISSUE_TRACKED in this file. ` +
        `Failures: ${JSON.stringify(result.mechanismFailures ?? [], null, 2)}`,
    ).toBe(true);
  }, 600_000);
});
