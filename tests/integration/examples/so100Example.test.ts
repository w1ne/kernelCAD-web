import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100.kcad.ts';

describe('so100 example', () => {
  it('composes a 2-DOF gripper subassembly from vendor STEPs + local plates', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics).toEqual([]);

    const records = result.model?.records ?? [];
    const importedSteps = records.filter((r) => r.kind === 'importedStep');
    const parts = records.filter((r) => r.kind === 'assemblyPart');

    // Four STEP imports: two STS3215 servos, the passive horn, the jaw.
    // Two locally-authored plates (base + bracket) round out the 6-part
    // assembly. Each piece becomes one assemblyPart under 'so100-gripper'
    // so the renderer fans them out into a SceneBackend with per-part
    // colors and the renderer + STEP exporter preserve identity.
    expect(importedSteps.length).toBe(4);
    expect(parts.length).toBe(6);

    // solvedModel() emits a solvedAssembly so the lowerer fans into a
    // SceneBackend; the last record must be solvedAssembly for the
    // multi-body render + STEP export paths to fire.
    expect(records.at(-1)?.kind).toBe('solvedAssembly');
  }, 120_000);
});
