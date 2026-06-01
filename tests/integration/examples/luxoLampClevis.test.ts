// tests/integration/examples/luxoLampClevis.test.ts
//
// Integration test for `examples/kinematic/luxo-lamp.kcad.ts` — the
// canonical Luxo desk lamp built with `joint.clevis(...)` at all three
// revolute joints (shoulder, elbow, wrist) and three `fastened` tension
// springs (one per joint, each parented to the child arm of the joint
// it visually spans).
//
// #356 closed by P5: after P0.2 corrected the rigidity check's FK math,
// the lamp's spring geometry was rebuilt with real Anglepoise-shape
// shafts (no [10,0,0]-exploit alignment) and the head-detachment +
// column-visibility issues were fixed. The lamp now passes the
// physics-grounded loop with `mechanism: 'real'` and empty failures
// at every sampled pose.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-01-physics-loop-P5-luxo-geometric-rebuild.md

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const LUXO_SCRIPT_PATH = 'examples/kinematic/luxo-lamp.kcad.ts';

describe('Luxo lamp — passes the physics-grounded loop', () => {
  it('script source carries NO ignore[] entries (joint-pair contacts removed by joint.clevis)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    // The pre-G1 lamp passed `{ ignore: [...] }` to arm.solvedModel(). The
    // G1+P2+P5 rewrites should keep that array empty. We assert no
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

  it('passes the physics-grounded loop: mechanism: real with empty failures (#356 closed by P5)', async () => {
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
    });
    expect(r.mechanism).toBe('real');
    expect(r.mechanismFailures ?? []).toEqual([]);
  }, 240_000);
});
