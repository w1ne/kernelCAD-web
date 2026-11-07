// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  OFFLINE_COST_RATES,
  OFFLINE_ESTIMATE_DISCLAIMER,
  estimateJob,
  roundCostUsd,
  type JobPart,
} from './offlineEstimate';

const CUBE: JobPart = {
  name: 'shape',
  geometry: { volumeMm3: 8000, bboxMm: { x: 20, y: 20, z: 20 } },
  modelProcess: '3d-print',
  processSource: 'inferred',
};

function priced(part: JobPart, input: { process?: JobPart['modelProcess']; material?: string; quantity?: number }) {
  const result = estimateJob({ parts: [part], ...input });
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe('offline cost estimate', () => {
  it('prices a solid as a labelled PLA print estimate', () => {
    const result = priced(CUBE, { process: '3d-print', material: 'pla', quantity: 2 });
    const estimate = result.estimates[0];
    const density = 1240;
    const materialUsd = roundCostUsd((8000 / 1e9) * density * OFFLINE_COST_RATES.pricePerKgUsd.pla * 2);
    const cycleUsd = roundCostUsd((8000 / OFFLINE_COST_RATES.printMm3PerHour) * 2 * OFFLINE_COST_RATES.machineUsdPerHour['3d-print']);
    const setupUsd = OFFLINE_COST_RATES.setupUsd['3d-print'];

    expect(result.currencyLabel).toBe('USD estimate');
    expect(result.quote).toBe(false);
    expect(result.disclaimer).toBe(OFFLINE_ESTIMATE_DISCLAIMER);
    expect(result.compared).toBe(false);
    expect(estimate.process).toBe('3d-print');
    expect(estimate.material).toMatchObject({ name: 'pla', source: 'request', densityKgPerM3: density });
    expect(estimate.breakdown.materialUsd).toBe(materialUsd);
    expect(estimate.breakdown.setupUsd).toBe(setupUsd);
    expect(estimate.breakdown.cycleUsd).toBe(cycleUsd);
    expect(estimate.breakdown.totalUsd).toBe(roundCostUsd(materialUsd + setupUsd + cycleUsd));
    expect(estimate.drivers).toMatchObject({ partVolumeMm3: 8000, quantity: 2, process: '3d-print' });
    expect(result.keyDrivers).toEqual(expect.arrayContaining(['partVolumeMm3', 'bboxMm', 'process', 'quantity']));
  });

  it('compares cnc and print as separate material, setup, and cycle lines', () => {
    const result = priced(CUBE, {});
    const byProcess = Object.fromEntries(result.estimates.map(estimate => [estimate.process, estimate]));

    expect(result.compared).toBe(true);
    expect(result.estimates.map(estimate => estimate.process)).toEqual(['3d-print', 'cnc', 'sheet-cut']);
    for (const estimate of result.estimates) {
      const { materialUsd, setupUsd, cycleUsd, totalUsd } = estimate.breakdown;
      expect(totalUsd).toBe(roundCostUsd(materialUsd + setupUsd + cycleUsd));
      expect(estimate.quote).toBe(false);
      expect(estimate.drivers.partVolumeMm3).toBe(8000);
    }
    expect(byProcess.cnc.breakdown.setupUsd).toBeGreaterThan(byProcess['3d-print'].breakdown.setupUsd);
    expect(byProcess.cnc.breakdown.totalUsd).not.toBe(byProcess['3d-print'].breakdown.totalUsd);
    expect(byProcess['3d-print'].material.name).toBe('pla');
    expect(byProcess.cnc.material.name).toBe('aluminum-6061');
  });

  it('refuses when no part has positive volume', () => {
    const result = estimateJob({ parts: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('estimate.no-geometry');
    expect(result.quote).toBe(false);
  });

  it('uses declared blank volume for CNC material when StockSpec is present', () => {
    const stock = { kind: 'blank' as const, lengthMm: 40, widthMm: 30, heightMm: 20 };
    const withStock = priced(
      { ...CUBE, stock, declaredMaterial: 'aluminum-6061', modelProcess: 'cnc', processSource: 'declared' },
      { process: 'cnc' },
    );
    const without = priced(
      { ...CUBE, declaredMaterial: 'aluminum-6061', modelProcess: 'cnc', processSource: 'declared' },
      { process: 'cnc' },
    );
    const stocked = withStock.estimates[0];
    const envelope = without.estimates[0];

    expect(stocked.drivers.materialVolumeMm3).toBe(40 * 30 * 20);
    expect(stocked.drivers.partVolumeMm3).toBe(8000);
    expect(envelope.drivers.materialVolumeMm3).toBe(20 * 20 * 20);
    expect(stocked.drivers.materialVolumeMm3).toBeGreaterThan(envelope.drivers.materialVolumeMm3);
    expect(stocked.breakdown.materialUsd).toBeGreaterThan(envelope.breakdown.materialUsd);
    expect(stocked.drivers.removedVolumeMm3).toBe(40 * 30 * 20 - 8000);
    expect(stocked.notes.join(' ')).toMatch(/declared stock/i);
    expect(withStock.keyDrivers).toContain('stock');
    expect(stocked.confidence).toBe('high');
    expect(envelope.confidence).not.toBe('high');
  });
});
