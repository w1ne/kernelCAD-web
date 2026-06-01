// tests/integration/examples/luxoLampClevis.test.ts
//
// P2 integration smoke: the rewritten `examples/kinematic/luxo-lamp.kcad.ts`
// — which uses `joint.clevis(...)` at all three revolute joints (shoulder,
// elbow, wrist) AND three `fastened` springs — must pass the physics-
// grounded loop (`checkMechanismTruth`) with `mechanism: 'real'` and
// empty `mechanismFailures` at every sampled pose. The G1 build passed
// the legacy validator but `mechanism: 'broken'` under the new loop
// (55 cm³ base+lamp-head overlap at elbow:-150). The P2 rewrite ships
// the lamp such that the loop is the truth source, not the legacy
// gates.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-01-physics-loop-P2-luxo.md

import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const LUXO_SCRIPT_PATH = 'examples/kinematic/luxo-lamp.kcad.ts';

describe('Luxo lamp P2 — passes the physics-grounded loop', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('script source carries NO ignore[] entries (joint-pair contacts removed by joint.clevis)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    // The pre-G1 lamp passed `{ ignore: [...] }` to arm.solvedModel(). The
    // G1+P2 rewrites should have removed that array entirely. We assert no
    // `ignore:` key appears in the script source — the smoking gun that the
    // agent didn't silently re-introduce a workaround.
    expect(source).not.toMatch(/\bignore\s*:/);
  });

  it('declares joint.clevis at every revolute joint (3 calls, 3 mates)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    // The lamp's three revolute joints (shoulder, elbow, wrist) are each
    // built via joint.clevis(...). Asserting that the primitive's identity
    // is used at every joint is the structural contract.
    const clevisCalls = source.match(/=\s*joint\.clevis\s*\(/g) ?? [];
    expect(clevisCalls.length).toBe(3);
    // And three revolute mates (one per joint).
    const revoluteMates = source.match(/['"]revolute['"]/g) ?? [];
    expect(revoluteMates.length).toBeGreaterThanOrEqual(3);
  });

  it('passes the physics-grounded loop: mechanism: real with empty failures, CLI exit 0', async () => {
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
    });
    // The merge gate: mechanism === 'real' with empty failures.
    expect(r.mechanism).toBe('real');
    expect(r.mechanismFailures ?? []).toEqual([]);
    // CLI exit 0 = solved, no errors, no warnings.
    expect(r.exitCode).toBe(0);
  }, 240_000);
});
