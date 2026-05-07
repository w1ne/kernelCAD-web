import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/cli/commands/evaluate';

describe('pattern examples', () => {
  it('evaluates the servo vented plate grid-pattern example', async () => {
    const result = await evaluateScript({ file: 'examples/patterns/servo-vented-plate.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(5);
  });
});
