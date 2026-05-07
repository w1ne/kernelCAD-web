import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';

describe('robot arm kit example', () => {
  it('evaluates the desktop robot arm kit vertical workflow', async () => {
    const result = await evaluateAndBuildScript({
      file: 'examples/robot-arm/desktop-3axis.kcad.ts',
    });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics).toEqual([]);
    expect(result.evaluation.featureCount).toBeGreaterThanOrEqual(20);

    const records = result.model?.records ?? [];
    expect(records.filter(record => record.kind === 'assemblyPart')).toHaveLength(5);
    expect(records.filter(record => record.kind === 'assemblyJoint')).toHaveLength(4);
    expect(records.at(-1)).toMatchObject({ kind: 'assemblyModel' });
  });
});
