// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { OFFLINE_COST_RATES, roundCostUsd } from '../../../shared/cost/offlineEstimate';
import { estimateCostTool, type EstimateCostOutput } from './estimateCost';

function ok(result: EstimateCostOutput): Extract<EstimateCostOutput, { ok: true }> {
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe('estimate_cost', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('prices a solid as a labelled PLA print estimate', async () => {
    const result = ok(await estimateCostTool({
      code: 'return box(20, 20, 20);',
      process: '3d-print',
      material: 'pla',
      quantity: 2,
    }));
    const estimate = result.estimates[0];
    const volume = estimate.drivers.partVolumeMm3;
    const materialUsd = roundCostUsd((volume / 1e9) * 1240 * OFFLINE_COST_RATES.pricePerKgUsd.pla * 2);
    const cycleUsd = roundCostUsd((volume / OFFLINE_COST_RATES.printMm3PerHour) * 2 * OFFLINE_COST_RATES.machineUsdPerHour['3d-print']);

    expect(volume).toBeCloseTo(8000, 1);
    expect(result.currencyLabel).toBe('USD estimate');
    expect(result.quote).toBe(false);
    expect(result.disclaimer).toMatch(/not a supplier quote/i);
    expect(result.compared).toBe(false);
    expect(estimate.breakdown.materialUsd).toBeCloseTo(materialUsd, 4);
    expect(estimate.breakdown.setupUsd).toBe(OFFLINE_COST_RATES.setupUsd['3d-print']);
    expect(estimate.breakdown.cycleUsd).toBeCloseTo(cycleUsd, 4);
    expect(estimate.breakdown.totalUsd).toBeCloseTo(materialUsd + estimate.breakdown.setupUsd + cycleUsd, 4);
    expect(result.keyDrivers).toEqual(expect.arrayContaining(['partVolumeMm3', 'bboxMm', 'process']));
  });

  it('compares cnc and print as separate material, setup, and cycle lines', async () => {
    const result = ok(await estimateCostTool({ code: 'return box(20, 20, 20);' }));
    const byProcess = Object.fromEntries(result.estimates.map(estimate => [estimate.process, estimate]));

    expect(result.compared).toBe(true);
    expect(result.estimates.map(estimate => estimate.process)).toEqual(['3d-print', 'cnc', 'sheet-cut']);
    for (const estimate of result.estimates) {
      const { materialUsd, setupUsd, cycleUsd, totalUsd } = estimate.breakdown;
      expect(totalUsd).toBeCloseTo(materialUsd + setupUsd + cycleUsd, 4);
      expect(estimate.drivers.bboxMm).toBeDefined();
    }
    expect(byProcess.cnc.breakdown.setupUsd).toBeGreaterThan(byProcess['3d-print'].breakdown.setupUsd);
    expect(byProcess.cnc.breakdown.totalUsd).not.toBe(byProcess['3d-print'].breakdown.totalUsd);
  });

  it('refuses when the script has no solid geometry', async () => {
    const result = await estimateCostTool({ code: 'const unused = 1;' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('estimate.no-geometry');
    expect(result.quote).toBe(false);
    expect(result.currencyLabel).toBe('USD estimate');
  });

  it('uses declared blank volume for CNC material when StockSpec is present', async () => {
    const result = ok(await estimateCostTool({
      process: 'cnc',
      code: `
        const arm = assembly('job');
        arm.part('block', box(20, 20, 20), {
          material: 'aluminum-6061',
          process: 'cnc',
          stock: { kind: 'blank', lengthMm: 40, widthMm: 30, heightMm: 20 },
        });
        return arm.model();
      `,
    }));
    const estimate = result.estimates[0];

    expect(estimate.drivers.partVolumeMm3).toBeCloseTo(8000, 1);
    expect(estimate.drivers.materialVolumeMm3).toBe(40 * 30 * 20);
    expect(estimate.drivers.materialVolumeMm3).toBeGreaterThan(estimate.drivers.partVolumeMm3);
    expect(estimate.drivers.removedVolumeMm3).toBeCloseTo(40 * 30 * 20 - 8000, 1);
    expect(result.parts[0].stock).toEqual({ kind: 'blank', lengthMm: 40, widthMm: 30, heightMm: 20 });
    expect(result.parts[0].processSource).toBe('declared');
    expect(result.keyDrivers).toContain('stock');
    expect(estimate.notes.join(' ')).toMatch(/declared stock/i);
    expect(estimate.confidence).toBe('high');
  });
});
