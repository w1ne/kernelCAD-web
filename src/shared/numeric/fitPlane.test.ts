// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { fitPlane } from './fitPlane';

describe('fitPlane', () => {
  it('recovers a tilted plane and reports noisy orthogonal residuals', () => {
    const points = [];
    for (let x = -3; x <= 3; x++) for (let y = -2; y <= 2; y++) {
      const noise = (((x * 17 + y * 13) % 5) - 2) * 0.0002;
      points.push([x, y, 4 + 0.5 * x - 0.25 * y + noise] as const);
    }
    const result = fitPlane(points);
    const expected = [-0.5, 0.25, 1].map(v => v / Math.hypot(0.5, 0.25, 1));
    expect(result.normal[0]).toBeCloseTo(expected[0], 3);
    expect(result.normal[1]).toBeCloseTo(expected[1], 3);
    expect(result.normal[2]).toBeCloseTo(expected[2], 3);
    expect(result.centroid[2]).toBeCloseTo(4 + 0.5 * result.centroid[0] - 0.25 * result.centroid[1], 3);
    expect(result.rms).toBeGreaterThan(0);
    expect(result.rms).toBeLessThan(0.003);
    expect(result.maxAbsResidual).toBeGreaterThanOrEqual(result.rms);
    expect(result.residuals).toHaveLength(points.length);
  });

  it('rejects degenerate and non-finite point clouds', () => {
    expect(() => fitPlane([[0, 0, 0], [1, 0, 0], [2, 0, 0]])).toThrow(/collinear/);
    expect(() => fitPlane([[0, 0, 0], [1, 1e-9, 0], [2, 2e-9, 0]])).toThrow(/collinear/);
    expect(() => fitPlane([[0, 0, 0], [1, 0, 0], [0, Number.NaN, 1]])).toThrow(/finite/);
  });

  it('rejects finite coordinates whose differences overflow', () => {
    expect(() => fitPlane([
      [-1e308, 0, 0], [1e308, 0, 0], [0, 1, 0],
    ])).toThrow(/differences exceed the finite numeric range/);
  });

  it('keeps residual summaries finite for large finite coordinates', () => {
    const result = fitPlane([
      [0, 0, 0], [1e200, 0, 1e200], [0, 1e200, 0], [1e200, 1e200, 0],
    ]);
    expect(result.residuals.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(result.rms)).toBe(true);
    expect(Number.isFinite(result.maxAbsResidual)).toBe(true);
  });

  it('recovers the same plane normal across small and large coordinate scales', () => {
    const unitPoints = [[0, 0, 0], [1, 0, 0.5], [0, 1, -0.25], [1, 1, 0.25], [0.5, 0.25, 0.1875]] as const;
    const expected = [-0.5, 0.25, 1].map(v => v / Math.hypot(0.5, 0.25, 1));
    for (const scale of [1e-8, 1e8]) {
      const result = fitPlane(unitPoints.map(p => p.map(v => v * scale) as [number, number, number]));
      result.normal.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 12));
      expect(result.rms / scale).toBeCloseTo(0, 12);
    }
  });

  it('reports residuals in the normalized frame for large coordinate offsets', () => {
    const localPoints = [
      [0, 0, 3.001], [0.01, 0, 3.005], [0, 0.01, 2.998],
      [0.01, 0.01, 3.002], [0.005, 0.0025, 3.004],
    ] as const;
    const offset = 1e12;
    const shiftedPoints = localPoints.map(([x, y, z]) => [offset + x, offset + y, offset + z] as const);
    const local = fitPlane(localPoints);
    const shifted = fitPlane(shiftedPoints);

    expect(shifted.rms).toBeLessThan(0.001);
    expect(shifted.rms).toBeCloseTo(local.rms, 3);
    shifted.residuals.forEach((residual, index) => expect(residual).toBeCloseTo(local.residuals[index], 3));
  });

  it('fits the full advertised 100,000-point limit', () => {
    const points = Array.from({ length: 100000 }, (_, index) => {
      const x = index % 400;
      const y = Math.floor(index / 400);
      return [x, y, 2 * x - 3 * y + 7] as const;
    });
    const result = fitPlane(points);
    expect(result.normal[0]).toBeCloseTo(-2 / Math.sqrt(14), 10);
    expect(result.normal[1]).toBeCloseTo(3 / Math.sqrt(14), 10);
    expect(result.normal[2]).toBeCloseTo(1 / Math.sqrt(14), 10);
    expect(result.residuals).toHaveLength(100000);
    expect(result.rms).toBeLessThan(1e-8);
  });

});
