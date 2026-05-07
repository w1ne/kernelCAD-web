import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

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

  it('evaluates a generated per-part package source', async () => {
    const kcad = createApi({ session: new CaptureSession() });
    const pkg = kcad.robotArmKit({ name: 'desktop arm' }).exportPackage();
    const shoulderSource = pkg.files.find(file => file.path === 'parts/shoulder-link.kcad.ts');

    expect(shoulderSource).toBeDefined();

    const result = await evaluateAndBuildScript({
      code: shoulderSource!.contents,
      file: shoulderSource!.path,
    });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics).toEqual([]);
    expect(result.evaluation.featureCount).toBeGreaterThan(0);
  });
});
