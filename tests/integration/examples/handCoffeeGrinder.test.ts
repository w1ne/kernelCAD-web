import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const FILE = 'examples/gallery/hand-coffee-grinder.kcad.ts';

describe('hand coffee grinder gallery example', () => {
  it('evaluates the dual-bearing grinder assembly cleanly', async () => {
    const result = await evaluateScript({ file: FILE });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(60);
  }, 180_000);

  // Hosted here instead of the shared physics-loop sweep
  // (HOSTED_IN_DEDICATED_FILE in tests/integration/physics-loop/exampleSweepShared.ts);
  // identical runValidateCli options to assertExampleLoopClean.
  it('examples/gallery/hand-coffee-grinder.kcad.ts passes the physics-grounded loop', async () => {
    const result = await runValidateCli({
      file: FILE,
      json: true,
      includeInterference: true,
      epsilon: 0.01,
      physical: false,
      includePhysics: false,
    });
    expect(result.mechanism, JSON.stringify(result.mechanismFailures ?? [], null, 2)).toBe('real');
  }, 600_000);
});
