// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { isKernelError } from '../shared/intent/kernelError';
import {
  cornerReliefMetadata,
  edgeFlangeToBendArgs,
  hemToBendArgs,
  normalizeCornerReliefOpts,
  normalizeEdgeFlangeOpts,
  normalizeHemOpts,
} from './sheetMetalFlange';

describe('sheetMetalFlange sugar', () => {
  it('normalizes edgeFlange defaults and bend args', () => {
    expect(normalizeEdgeFlangeOpts({ length: 20 })).toEqual({ length: 20, angle: 90, radius: null });
    expect(edgeFlangeToBendArgs({ length: 12, angle: 45, radius: 1.5 })).toEqual({
      angle: 45,
      radius: 1.5,
      metadata: { sheetMetalSugar: 'edgeFlange', flangeLength: 12, flangeAngle: 45 },
    });
  });

  it('maps hem types to near-180 bends', () => {
    expect(hemToBendArgs({ type: 'closed', length: 6, radius: 1 }).angle).toBe(180);
    expect(hemToBendArgs({ type: 'open', length: 6 }).angle).toBe(170);
    expect(hemToBendArgs({ type: 'teardrop', length: 4 }).metadata).toMatchObject({
      sheetMetalSugar: 'hem',
      hemType: 'teardrop',
      hemLength: 4,
    });
  });

  it('validates corner relief', () => {
    expect(normalizeCornerReliefOpts({ type: 'none' })).toEqual({ type: 'none', size: null });
    expect(cornerReliefMetadata({ type: 'circular', size: 2 })).toEqual({
      sheetMetalSugar: 'cornerRelief',
      reliefType: 'circular',
      reliefSize: 2,
    });
  });

  it('rejects non-positive lengths via invalidArgs/KernelError', () => {
    try {
      normalizeEdgeFlangeOpts({ length: 0 });
      expect.fail('expected throw');
    } catch (e) {
      expect(isKernelError(e)).toBe(true);
    }
    try {
      normalizeHemOpts({ type: 'closed', length: -1 });
      expect.fail('expected throw');
    } catch (e) {
      expect(isKernelError(e)).toBe(true);
    }
  });
});
