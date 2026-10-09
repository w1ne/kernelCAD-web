// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';

const runFeaToolMock = vi.hoisted(() => vi.fn());
vi.mock('./runFea', () => ({ runFeaTool: runFeaToolMock }));

import { checkLoadCapacityFea } from './checkLoadCapacityFea';

function summary(over: Record<string, unknown> = {}) {
  return {
    study: 'shelf', material: { name: 'petg', E: 2700, nu: 0.4, yield: 55 },
    maxVonMisesMPa: 31, maxVonMisesAt: [6, 20, 20], maxDisplacementMm: 4.9, maxDisplacementAt: [70, 17, 0],
    minSafetyFactor: 55 / 31, nodeCount: 1, elementCount: 11388, meshSizeMm: 2.5,
    trust: { meshTrusted: true, reasons: [] },
    hotSpots: [
      { region: '@kc[fillet_1/face/f8]', maxVonMisesMPa: 31, nodeId: 1, at: [6, 20, 20], safetyFactor: 55 / 31 },
      { region: '@kc[box_1/face/f2]', maxVonMisesMPa: 11, nodeId: 2, at: [0, 0, 10], safetyFactor: 5 },
    ],
    peakAtSupportMPa: 50, peakAtSupportRegion: '@kc[fillet_1/face/f8]',
    ...over,
  };
}

describe('checkLoadCapacityFea', () => {
  it('maps the FEA summary to the beam-mode shape in Pa', async () => {
    runFeaToolMock.mockResolvedValueOnce({ ok: true, summary: summary(), diagnostics: [] });
    const r = await checkLoadCapacityFea({ code: 'x' });
    expect(r).toMatchObject({
      ok: true, method: 'fea', study: 'shelf', material: 'petg', threshold: 1.5, failures: [],
      elements: [
        { partName: '@kc[fillet_1/face/f8]', stressPa: 31e6, yieldPa: 55e6, at: [6, 20, 20] },
        { partName: '@kc[box_1/face/f2]', stressPa: 11e6, yieldPa: 55e6, safetyFactor: 5 },
      ],
      fea: { peakStressPa: 31e6, maxDisplacementMm: 4.9, meshTrusted: true, peakAtSupportPa: 50e6 },
    });
    // A verdict does not render heatmaps unless asked.
    expect(runFeaToolMock.mock.calls[0]![0]).toMatchObject({ code: 'x', heatmaps: false });
  });

  it("uses the study's minSafetyFactor, and an explicit threshold over it", async () => {
    runFeaToolMock.mockResolvedValueOnce({ ok: true, summary: summary({ minSafetyFactorRequired: 2 }), diagnostics: [] });
    const r = await checkLoadCapacityFea({ code: 'x' });
    expect(r).toMatchObject({ ok: false, threshold: 2, failures: [{ element: '@kc[fillet_1/face/f8]', elementKind: 'region', reason: 'stress-exceeds-yield' }] });
    expect(r.ok === false && 'diagnostics' in r && r.diagnostics!.some(d => d.code === 'fea.safety-factor.below-min')).toBe(true);

    runFeaToolMock.mockResolvedValueOnce({ ok: true, summary: summary({ minSafetyFactorRequired: 2 }), diagnostics: [] });
    expect(await checkLoadCapacityFea({ code: 'x', safety_factor_threshold: 1.2 })).toMatchObject({ ok: true, threshold: 1.2 });
  });

  it('returns the solver failure as ok:false with its diagnostics', async () => {
    runFeaToolMock.mockResolvedValueOnce({
      ok: false,
      diagnostics: [{ code: 'fea.solver.unavailable', severity: 'error', message: 'no ccx' }],
    });
    expect(await checkLoadCapacityFea({ code: 'x' })).toMatchObject({
      ok: false, method: 'fea', error: 'no ccx', errorCode: 'fea.solver.unavailable',
    });
  });
});
