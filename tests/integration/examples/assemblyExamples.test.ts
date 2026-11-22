import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { PER_EXAMPLE_TIMEOUT_MS } from '../physics-loop/exampleSweepShared';

describe('assembly examples', () => {
  it('evaluates the two-link connector arm example', async () => {
    const result = await evaluateScript({ file: 'examples/assemblies/two-link-connector-arm.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(8);
  });

  it('evaluates the twelve-part assembly sequence gearbox example', async () => {
    const result = await evaluateScript({ file: 'examples/assemblies/assembly-sequence-gearbox.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(12);
  });

  it('evaluates the static-stability bracket example', async () => {
    const result = await evaluateScript({ file: 'examples/assemblies/assembly-stability-bracket.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(3);
  });

  // Issue #349: the link's `root` and `wrist` connectors sat at the
  // link's mid-height, so `connect` sank the link 3 mm into the base and
  // the tool 3 mm into the link. Both connectors now sit on the mating
  // faces, so the loop must report a clean, real mechanism.
  it(
    'examples/assemblies/two-link-connector-arm.kcad.ts passes the physics-grounded loop',
    async () => {
      const result = await runValidateCli({
        file: 'examples/assemblies/two-link-connector-arm.kcad.ts',
        json: true,
        includeInterference: true,
        epsilon: 0.01,
        physical: false,
        includePhysics: false,
      });

      expect(result.mechanismFailures ?? []).toEqual([]);
      expect(result.mechanism).toBe('real');
    },
    PER_EXAMPLE_TIMEOUT_MS,
  );
});
