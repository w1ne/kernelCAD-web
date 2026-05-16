import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

describe('assembly examples', () => {
  it('evaluates the two-link connector arm example', async () => {
    const result = await evaluateScript({ file: 'examples/assemblies/two-link-connector-arm.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(8);
  });
});
