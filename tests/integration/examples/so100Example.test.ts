import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100.kcad.ts';

describe('so100 example', () => {
  it('imports the SO-ARM-100 STEP and assembles it onto a desk', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics).toEqual([]);

    const records = result.model?.records ?? [];
    const importedSteps = records.filter((r) => r.kind === 'importedStep');
    const parts = records.filter((r) => r.kind === 'assemblyPart');

    // One STEP import (the assembled SO-ARM-100), plus the locally-authored
    // desk box. Both wrapped as assembly parts under the 'so100' name so
    // they mesh independently and the renderer colors them separately.
    expect(importedSteps.length).toBe(1);
    expect(parts.length).toBe(2);

    // solvedModel() emits a solvedAssembly so the lowerer fans into a
    // SceneBackend; the last record must be solvedAssembly for the
    // multi-body STEP export + render path to fire.
    expect(records.at(-1)?.kind).toBe('solvedAssembly');
  }, 120_000);
});
