import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

describe('ratchet stool gallery example', () => {
  it('evaluates the exposed ratchet stool model cleanly', async () => {
    const result = await evaluateScript({ file: 'examples/gallery/ratchet-stool.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(40);
  });
});
