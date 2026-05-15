import { describe, it, expect } from 'vitest';
import { runScript } from '../../../src/script-runtime/runScript';

describe('Shape.bend — capture-time behavior', () => {
  it('captures a kind:sheetMetalBend record', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
        return blank.bend({ face: 'top' }, 90, 3);
      `,
      fileName: 'test.kcad.ts',
    });
    const bend = records.find(r => r.kind === 'sheetMetalBend');
    expect(bend).toBeDefined();
    expect(bend!.params.angle.evaluated).toBe(90);
    expect(bend!.params.radius.evaluated).toBe(3);
    // Edge selector serialized into the FeatureRecord's `face` input ref
    // (canonical 'top' face).
    expect(bend!.inputs.face).toBeDefined();
    expect((bend!.inputs.face as { ref: { kind: string } }).ref.kind).toBe('canonical');
  });

  it('throws feature.invalid-args for radius <= 0', async () => {
    const run = runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 2, kFactor: 0.38 }).bend({ face: 'top' }, 90, 0);
      `,
      fileName: 'test.kcad.ts',
    });
    await expect(run).rejects.toMatchObject({ code: 'feature.invalid-args' });
  });

  it('throws feature.invalid-args for NaN angle', async () => {
    const run = runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 2, kFactor: 0.38 }).bend({ face: 'top' }, NaN, 3);
      `,
      fileName: 'test.kcad.ts',
    });
    await expect(run).rejects.toMatchObject({ code: 'feature.invalid-args' });
  });

  it('accepts an EdgeQuery selector form', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
        return blank.bend({ atY: 60 }, 90, 3);
      `,
      fileName: 'test.kcad.ts',
    });
    const bend = records.find(r => r.kind === 'sheetMetalBend');
    expect(bend).toBeDefined();
    expect(bend!.inputs.edges).toBeDefined();
  });
});
