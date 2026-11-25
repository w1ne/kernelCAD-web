import { describe, it, expect } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { flattenPattern } from '../../../src/kernel/backends/occt/flattenPattern';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';

describe('sheetMetal(profile, opts) — capture-time behavior', () => {
  it('captures a kind:sheetMetal record from a closed sketch + thickness/kFactor', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
        return blank;
      `,
      fileName: 'test.kcad.ts',
    });
    // sketch + sheetMetal = 2 records (sketch is registered first by path...close()).
    const smr = records.find(r => r.kind === 'sheetMetal');
    expect(smr).toBeDefined();
    expect(smr!.params.thickness.evaluated).toBe(2);
    expect(smr!.params.kFactor.evaluated).toBeCloseTo(0.38, 9);
  });

  it('throws feature.sheetMetal.kfactor-invalid for kFactor > 1', async () => {
    const run = runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 10).lineTo(0, 10).close();
        return sheetMetal(s, { thickness: 2, kFactor: 1.5 });
      `,
      fileName: 'test.kcad.ts',
    });
    await expect(run).rejects.toMatchObject({ code: 'feature.sheetMetal.kfactor-invalid' });
  });

  it('throws feature.invalid-args for thickness <= 0', async () => {
    const run = runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 10).lineTo(0, 10).close();
        return sheetMetal(s, { thickness: 0, kFactor: 0.38 });
      `,
      fileName: 'test.kcad.ts',
    });
    await expect(run).rejects.toMatchObject({ code: 'feature.invalid-args' });
  });

  it('accepts kFactor = 0 (boundary)', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 10).lineTo(0, 10).close();
        return sheetMetal(s, { thickness: 2, kFactor: 0 });
      `,
      fileName: 'test.kcad.ts',
    });
    const smr = records.find(r => r.kind === 'sheetMetal');
    expect(smr).toBeDefined();
  });

  it('resolves param() sheetMetal + bead dimensions via session.resolvedRecords() for flattenPattern', () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const t = api.param('Thickness', 1.5);
    const k = api.param('KFactor', 0.4);
    const w = api.param('BeadW', 8);
    const h = api.param('BeadH', 2);
    const x0 = api.param('BeadX0', 20);
    const x1 = api.param('BeadX1', 80);
    const s = api.path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
    const part = api.sheetMetal(s, { thickness: t, kFactor: k })
      .bead({ from: [x0, 30], to: [x1, 30], width: w, height: h, profile: 'u', side: 'top' });
    const region = flattenPattern(session.resolvedRecords(), part.id);
    expect(region.beads).toEqual([
      { start: [20, 30], end: [80, 30], width: 8, height: 2, profile: 'u', side: 'top' },
    ]);
  });
});
