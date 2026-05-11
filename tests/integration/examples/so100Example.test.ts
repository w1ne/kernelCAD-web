import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100.kcad.ts';

describe('so100 example', () => {
  it('composes a 2-DOF gripper subassembly from vendor STEPs + local plates', async () => {
    // The v0.5 so100 example has known interferences between the vendor
    // servo STEPs and the locally-authored plates (the plates clamp around
    // the servo body by design). v0.6's interference hard gate
    // (`KERNELCAD_VALIDATE_DEFAULT=error`) is for new mate-driven authoring;
    // pin this v0.5 evaluation to warn-mode so the legacy example still
    // exercises the multi-body lower without the new gate flagging the
    // known clamp overlaps.
    const prev = process.env.KERNELCAD_VALIDATE_DEFAULT;
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
    let result;
    try {
      result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    } finally {
      if (prev === undefined) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
      else process.env.KERNELCAD_VALIDATE_DEFAULT = prev;
    }

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
