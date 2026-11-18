import { describe, it, expect } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';

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
  it('rejects an unknown or non-object sheetMetal option instead of dropping it', async () => {
    // `{ bendRadius: 3 }` used to be dropped: the blank built with no diagnostic.
    const cases: Array<[string, RegExp]> = [
      ["{ thickness: 2, kFactor: 0.38, bendRadius: 3 }", /opts\.bendRadius.*unknown option 'bendRadius'.*thickness, kFactor, faceLabels/],
      ["{ thickness: 2, kFactor: 0.38, material: '5052-H32' }", /opts\.material\b/],
      ['null', /opts —/],
      ["'2'", /opts —/],
    ];
    for (const [opts, message] of cases) {
      const run = runScript({
        code: `
          const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
          return sheetMetal(s, ${opts});
        `,
        fileName: 'test.kcad.ts',
      });
      await expect(run, opts).rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringMatching(message) });
    }
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 2, kFactor: 0.38, faceLabels: {} });
      `,
      fileName: 'test.kcad.ts',
    });
    expect(records.find(r => r.kind === 'sheetMetal')!.params.thickness.evaluated).toBe(2);
  });
});
