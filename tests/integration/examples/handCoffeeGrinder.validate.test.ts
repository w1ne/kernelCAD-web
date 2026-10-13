import { describe, expect, it } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const FILE = 'examples/gallery/hand-coffee-grinder.kcad.ts';

// Split from handCoffeeGrinder.test.ts: vitest shards per FILE, so the ~3 min
// evaluate and the ~9 min validate land on different CI runners instead of
// stacking past the 20 min test-shard timeout.
describe('hand coffee grinder gallery example (validate)', () => {
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
  }, 1_080_000); // ~950 s observed on CI runners; stays under the 20 min shard timeout
});
