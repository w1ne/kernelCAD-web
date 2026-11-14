import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

describe('ratchet stool gallery example', () => {
  it('evaluates the exposed ratchet stool model cleanly', async () => {
    const result = await evaluateScript({ file: 'examples/gallery/ratchet-stool.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(40);
  });

  // The P3 physics-loop sweep (2026-06-01, issue #351) flagged the stool's
  // overlaps. The model now bores and slots the sleeve and collar for the
  // sliding post and rack, welds the teeth edge-on to the rack face, keeps
  // the pawl group beside the rack with its nose in a tooth gap at both ends
  // of a whole-pitch travel, and seats the legs, struts and foot ring face to
  // face. Hosted here for the sweep gate (HOSTED_IN_DEDICATED_FILE in
  // exampleSweepShared.ts).
  it('examples/gallery/ratchet-stool.kcad.ts passes the physics-grounded loop', async () => {
    const result = await runValidateCli({
      file: 'examples/gallery/ratchet-stool.kcad.ts',
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: false,
    });

    expect(result.mechanismFailures ?? [], JSON.stringify(result.mechanismFailures ?? [])).toEqual([]);
    expect(result.mechanism).toBe('real');
  }, 120_000);
});
