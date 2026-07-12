import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';

const EXAMPLE_PATH = 'examples/robot-hand/workflow-candidates-comparison.kcad.ts';

describe('robot hand workflow candidate models', () => {
  it('builds the five actual visual candidate models without relying on sketch fonts', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.evaluation.featureCount).toBeGreaterThan(250);
  }, 60_000);
});
