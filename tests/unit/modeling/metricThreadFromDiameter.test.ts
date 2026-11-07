// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Nominal (and tap-drill) diameter → ISO 261 coarse designation.
// Clearance bores stay on clearanceFitForHoleDiameter; they are not taps.
import { describe, expect, it } from 'vitest';
import { KernelError } from '../../../src/shared/intent/kernelError';
import { metricThreadFromDiameter } from '../../../src/modeling/threads';
import { runScript } from '../../../src/modeling/runtime/runScript';

function refuse(diameter: number, kind?: 'nominal' | 'tap_drill' | 'auto', toleranceMm?: number): KernelError {
  try {
    metricThreadFromDiameter(diameter, { ...(kind ? { kind } : {}), ...(toleranceMm !== undefined ? { toleranceMm } : {}) });
  } catch (error) {
    expect(error).toBeInstanceOf(KernelError);
    return error as KernelError;
  }
  throw new Error(`expected metricThreadFromDiameter(${diameter}) to refuse`);
}

describe('metricThreadFromDiameter', () => {
  it('maps an exact nominal diameter to the ISO 261 coarse spec', () => {
    expect(metricThreadFromDiameter(12)).toMatchObject({ spec: 'M12x1.75', diameter: 12, pitch: 1.75, coarse: true, tapDrill: 10.25 });
    expect(metricThreadFromDiameter(6, { kind: 'nominal' })).toMatchObject({ spec: 'M6x1', pitch: 1, tapDrill: 5 });
  });

  it('snaps a near nominal within 0.05 mm and refuses past that', () => {
    expect(metricThreadFromDiameter(12.04)).toMatchObject({ spec: 'M12x1.75' });
    const far = refuse(12.06);
    expect(far.code).toBe('feature.invalid-args');
    expect(far.message).toMatch(/0\.05/);
  });

  it('maps a tap drill (D − P) to the coarse spec', () => {
    expect(metricThreadFromDiameter(5, { kind: 'tap_drill' })).toMatchObject({ spec: 'M6x1', diameter: 6, pitch: 1, tapDrill: 5 });
    expect(metricThreadFromDiameter(10.25, { kind: 'tap_drill' })).toMatchObject({ spec: 'M12x1.75' });
  });

  it('auto tries nominal first, then tap drill, and never treats a clearance bore as a tap', () => {
    expect(metricThreadFromDiameter(12, { kind: 'auto' })).toMatchObject({ spec: 'M12x1.75' });
    expect(metricThreadFromDiameter(5, { kind: 'auto' })).toMatchObject({ spec: 'M5x0.8' });
    expect(metricThreadFromDiameter(10.25, { kind: 'auto' })).toMatchObject({ spec: 'M12x1.75' });
    const clearance = refuse(13.5, 'nominal');
    expect(clearance.message).toMatch(/clearanceFitForHoleDiameter/);
    expect(clearance.message).toMatch(/threadForHoleDiameter/);
    expect(clearance.message).not.toMatch(/M12x1\.75/);
    const autoClearance = refuse(13.5, 'auto');
    expect(autoClearance.code).toBe('feature.invalid-args');
    expect(autoClearance.message).toMatch(/clearanceFitForHoleDiameter/);
  });

  it('refuses an unknown diameter and an equidistant pair', () => {
    const unknown = refuse(7.3);
    expect(unknown.code).toBe('feature.invalid-args');
    expect(unknown.message).toMatch(/7\.3/);
    const ambiguous = refuse(1.1, 'nominal', 0.1);
    expect(ambiguous.message).toMatch(/M1x0\.25/);
    expect(ambiguous.message).toMatch(/M1\.2x0\.25/);
  });
});

describe('hole thread: true', () => {
  it('records the coarse pitch for a nominal diameter', async () => {
    const run = await runScript({
      code: `return box(40, 40, 12).hole('top', { u: 0, v: 0, diameter: 12, depth: 8, thread: true });`,
      fileName: 'm12-from-diameter.kcad.ts',
    });
    const hole = run.records.find((record) => record.kind === 'hole');
    expect(hole?.params.threadPitch?.evaluated).toBe(1.75);
    expect(hole?.params.diameter?.evaluated).toBe(12);
    expect(hole?.metadata.threadSpec).toBe('M12x1.75');
  });

  it('fills the same pitch from thread: { fromDiameter: true } on holes()', async () => {
    const run = await runScript({
      code: `return box(40, 20, 8).holes('top', { positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }], diameter: 6, depth: 'through', thread: { fromDiameter: true } });`,
      fileName: 'm6-holes.kcad.ts',
    });
    const holes = run.records.find((record) => record.kind === 'holes');
    expect(holes?.params.threadPitch?.evaluated).toBe(1);
    expect(holes?.metadata.threadSpec).toBe('M6x1');
  });

  it('keeps an explicit pitch and refuses a pitch that disagrees with the coarse table', async () => {
    const kept = await runScript({
      code: `return box(20, 20, 8).hole('top', { u: 0, v: 0, diameter: 6, depth: 8, thread: { pitch: 0.75 } });`,
      fileName: 'fine.kcad.ts',
    });
    const fine = kept.records.find((record) => record.kind === 'hole');
    expect(fine?.params.threadPitch?.evaluated).toBe(0.75);
    expect(fine?.metadata.threadSpec).toBeUndefined();

    await expect(runScript({
      code: `return box(20, 20, 8).hole('top', { u: 0, v: 0, diameter: 6, depth: 8, thread: { pitch: 0.75, fromDiameter: true } });`,
      fileName: 'disagree.kcad.ts',
    })).rejects.toThrow(/M6x1/);
  });

  it('resolves threadedHole({ diameter }) and refuses a spec that disagrees', async () => {
    const run = await runScript({
      code: `return box(40, 40, 12).threadedHole('top', { u: 0, v: 0, diameter: 12, depth: 8 });`,
      fileName: 'threaded-diameter.kcad.ts',
    });
    const hole = run.records.find((record) => record.kind === 'hole');
    expect(hole?.params.diameter?.evaluated).toBe(12);
    expect(hole?.params.threadPitch?.evaluated).toBe(1.75);
    expect(hole?.metadata.threadSpec).toBe('M12x1.75');

    await expect(runScript({
      code: `return box(40, 40, 12).threadedHole('top', { u: 0, v: 0, spec: 'M6', diameter: 12, depth: 8 });`,
      fileName: 'threaded-clash.kcad.ts',
    })).rejects.toThrow(/must agree/);
  });

  it('exposes metricThreadFromDiameter as a script global', async () => {
    const run = await runScript({
      code: `const info = metricThreadFromDiameter(6, { kind: 'nominal' });
        if (info.spec !== 'M6x1') throw new Error(info.spec);
        return box(10, 10, 10);`,
      fileName: 'global.kcad.ts',
    });
    expect(run.returnValue).toBeDefined();
  });
});
