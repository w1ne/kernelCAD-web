// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/capture/shapeBeadCapture.test.ts

import { describe, expect, it } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';
import {
  beadInnerWidth,
  checkBeadInsideBlank,
  checkBeadVsBendZone,
  validateBeadOptions,
} from '../../../src/modeling/sheetMetalBead';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { Vec2 } from '../../../src/shared/intent/region';

describe('Shape.bead capture & pure-TS validation', () => {
  it('captures kind: sheetMetalBead with defaults (profile=round, side=top)', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        const blank = sheetMetal(s, { thickness: 1.5, kFactor: 0.4 });
        return blank.bead({ from: [15, 30], to: [85, 30], width: 8, height: 2 });
      `,
      fileName: 'bead-capture.kcad.ts',
    });

    const blankRec = records.find((r) => r.kind === 'sheetMetal');
    const rec = records.find((r) => r.kind === 'sheetMetalBead');
    expect(blankRec).toBeDefined();
    expect(rec).toBeDefined();
    expect(rec!.inputs.base).toEqual({ kind: 'feature', id: blankRec!.id });
    expect(rec!.params.fromX.evaluated).toBe(15);
    expect(rec!.params.fromY.evaluated).toBe(30);
    expect(rec!.params.toX.evaluated).toBe(85);
    expect(rec!.params.toY.evaluated).toBe(30);
    expect(rec!.params.width.evaluated).toBe(8);
    expect(rec!.params.height.evaluated).toBe(2);
    expect(rec!.metadata).toEqual({ profile: 'round', side: 'top' });
  });

  it('captures explicit profile, side, and ParamRef editables', async () => {
    const { records, paramTable } = await runScript({
      code: `
        const w = param('beadW', 10);
        const h = param('beadH', 2.5);
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 })
          .bead({ from: [20, 20], to: [80, 20], width: w, height: h, profile: 'u', side: 'bottom' });
      `,
      fileName: 'bead-capture-params.kcad.ts',
    });
    const rec = records.find((r) => r.kind === 'sheetMetalBead');
    expect(rec).toBeDefined();
    expect(rec!.params.width.paramRef).toBe('beadW');
    expect(rec!.params.height.paramRef).toBe('beadH');
    expect(paramTable.get('beadW')?.value).toBe(10);
    expect(paramTable.get('beadH')?.value).toBe(2.5);
    expect(rec!.metadata).toEqual({ profile: 'u', side: 'bottom', paramRefs: ['beadW', 'beadH'] });
  });

  it('rejects non-positive ParamRef width/height and zero-length ParamRef segment at capture time', async () => {
    const badWidth = runScript({
      code: `
        const w = param('beadW', 0);
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 })
          .bead({ from: [20, 20], to: [80, 20], width: w, height: 2 });
      `,
      fileName: 'bead-bad-width-param.kcad.ts',
    });
    await expect(badWidth).rejects.toMatchObject({ code: 'feature.invalid-args' });

    const badHeight = runScript({
      code: `
        const h = param('beadH', -1);
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 })
          .bead({ from: [20, 20], to: [80, 20], width: 8, height: h });
      `,
      fileName: 'bead-bad-height-param.kcad.ts',
    });
    await expect(badHeight).rejects.toMatchObject({ code: 'feature.invalid-args' });

    const zeroSeg = runScript({
      code: `
        const x = param('beadX', 30);
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 })
          .bead({ from: [x, 20], to: [x, 20], width: 8, height: 2 });
      `,
      fileName: 'bead-zero-seg-param.kcad.ts',
    });
    await expect(zeroSeg).rejects.toMatchObject({ code: 'feature.invalid-args' });
  });

  it('rejects zero-length segment with typed KernelError', () => {
    expect(() =>
      validateBeadOptions({ from: [30, 30], to: [30, 30], width: 8, height: 2 }),
    ).toThrow(KernelError);
    try {
      validateBeadOptions({ from: [30, 30], to: [30, 30], width: 8, height: 2 });
    } catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
    }
  });

  it('rejects non-finite and non-positive width/height', () => {
    for (const bad of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        validateBeadOptions({ from: [10, 20], to: [50, 20], width: bad, height: 2 }),
      ).toThrow(KernelError);
      expect(() =>
        validateBeadOptions({ from: [10, 20], to: [50, 20], width: 8, height: bad }),
      ).toThrow(KernelError);
    }
  });

  it('rejects unknown option keys, invalid profile, and invalid side', () => {
    expect(() =>
      validateBeadOptions({ from: [10, 20], to: [50, 20], width: 8, height: 2, bogus: 1 }),
    ).toThrow(KernelError);
    expect(() =>
      validateBeadOptions({ from: [10, 20], to: [50, 20], width: 8, height: 2, profile: 'square' }),
    ).toThrow(KernelError);
    expect(() =>
      validateBeadOptions({ from: [10, 20], to: [50, 20], width: 8, height: 2, side: 'left' }),
    ).toThrow(KernelError);
  });

  it('computes recess inner width correctly and returns null when width <= 2*thickness', () => {
    expect(beadInnerWidth(8, 1.5)).toBeCloseTo(5, 6);
    expect(beadInnerWidth(4, 1.8)).toBeCloseTo(1, 6);
    expect(beadInnerWidth(3, 1.5)).toBeNull();
    expect(beadInnerWidth(2, 1.5)).toBeNull();
  });

  it('validates footprint inside blank and bend-zone clearance', () => {
    const box = { min: [0, 0] as Vec2, max: [100, 60] as Vec2 };
    const poly: Vec2[] = [[0, 0], [100, 0], [100, 60], [0, 60]];
    const inside = { from: [20, 30] as Vec2, to: [80, 30] as Vec2, width: 8, height: 2, profile: 'round' as const, side: 'top' as const };
    const outside = { ...inside, from: [2, 30] as Vec2 };

    expect(checkBeadInsideBlank(inside, box, poly)).toBeNull();
    expect(checkBeadInsideBlank(outside, box, poly)).not.toBeNull();

    expect(checkBeadVsBendZone(inside, { orient: 'x', at: 90, bendAllowance: 4 })).toBeNull();
    expect(checkBeadVsBendZone(inside, { orient: 'x', at: 50, bendAllowance: 4 })).not.toBeNull();
  });
});
