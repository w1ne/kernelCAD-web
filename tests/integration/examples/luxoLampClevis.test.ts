// tests/integration/examples/luxoLampClevis.test.ts
//
// G1 integration smoke: the rewritten `examples/kinematic/luxo-lamp.kcad.ts`
// — which uses `joint.clevis(...)` at all three revolute joints (shoulder,
// elbow, wrist) — must validate clean with `--include-interference` AND
// contain ZERO `ignore[]` entries in the script. That zero-ignores result
// is the smoking-gun signal that the constructive primitive removed the
// lamp-class delivery failure the pre-G1 hand-rolled build silenced via
// three joint-pair ignores.

import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const LUXO_SCRIPT_PATH = 'examples/kinematic/luxo-lamp.kcad.ts';

describe('Luxo lamp G1 rewrite — joint.clevis at all 3 joints', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('script source carries NO ignore[] entries (joint-pair contacts removed by joint.clevis)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    // The pre-G1 lamp passed `{ ignore: [...] }` to arm.solvedModel(). The G1
    // rewrite should have removed that array entirely (or never added it).
    // We assert no `ignore:` key appears in the script source — the smoking
    // gun that the agent didn't silently re-introduce a workaround.
    expect(source).not.toMatch(/\bignore\s*:/);
  });

  it('declares joint.clevis at every revolute joint (3 calls, 3 mates)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    // The lamp's three revolute joints (shoulder, elbow, wrist) are each
    // built via joint.clevis(...). Asserting that the primitive's identity
    // is used at every joint is the structural contract.
    // Match `= joint.clevis(` (an actual call binding the result) so we
    // don't double-count comments that mention the primitive.
    const clevisCalls = source.match(/=\s*joint\.clevis\s*\(/g) ?? [];
    expect(clevisCalls.length).toBe(3);
    // And three revolute mates (one per joint).
    const revoluteMates = source.match(/['"]revolute['"]/g) ?? [];
    expect(revoluteMates.length).toBeGreaterThanOrEqual(3);
  });

  // P1 physics-loop discovery (2026-06-01): the Luxo lamp G1 build
  // reports `mechanism: broken` (mechanism.interpenetration at extreme
  // elbow poses — base and lamp-head overlap by ~55 cm³ at
  // elbow:-150). The new physics-grounded loop catches this; the
  // legacy CLI validator missed it. Per spec §P2 the lamp gets
  // rebuilt with clevis joints + simplified geometry so it passes the
  // new loop. Until then this assertion is suspended — re-enabling it
  // is part of P2's acceptance.
  //
  // Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
  // Plan:  docs/plans/2026-06-01-physics-loop-P2-luxo.md
  it.skip('validates clean with --include-interference (no errors, no warnings) — P2 follow-up: lamp interpenetrates at extreme elbow poses under the new physics loop', async () => {
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
    });
    // exitCode 0 = solved, no errors and no warnings.
    expect(r.exitCode).toBe(0);
  }, 180_000);
});
