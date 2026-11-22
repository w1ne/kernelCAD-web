// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  RSS_CONVENTION,
  TOLERANCE_STACK_DISCLAIMER,
  analyzeToleranceStack,
  type StackContributor,
} from './stackup';

const HOLE: StackContributor = {
  id: 'hole',
  nominalMm: 10,
  upperMm: 0.1,
  lowerMm: -0.1,
  sense: '+',
};
const SHAFT: StackContributor = {
  id: 'shaft',
  nominalMm: 9.8,
  upperMm: 0.05,
  lowerMm: -0.05,
  sense: '-',
};

function ok(result: ReturnType<typeof analyzeToleranceStack>) {
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe('analyzeToleranceStack', () => {
  it('computes a two-contributor gap at the worst-case limits', () => {
    const result = ok(analyzeToleranceStack([HOLE, SHAFT]));
    // Gap = hole − shaft. Limits: 9.9 − 9.85 = 0.05 and 10.1 − 9.75 = 0.35.
    expect(result.nominalMm).toBeCloseTo(0.2, 9);
    expect(result.worstCase.minMm).toBeCloseTo(0.05, 9);
    expect(result.worstCase.maxMm).toBeCloseTo(0.35, 9);
    expect(result.disclaimer).toBe(TOLERANCE_STACK_DISCLAIMER);
    expect(result.disclaimer).toMatch(/not a full GD&T/i);
    expect(result.contributors.map(c => c.sensitivity)).toEqual([1, -1]);
  });

  it('keeps the ±3σ RSS band inside the worst-case band and splits variance by half-width squared', () => {
    const result = ok(analyzeToleranceStack([HOLE, SHAFT]));
    const rssHalf = Math.hypot(0.1, 0.05);
    expect(result.rss.sigmaEquivalent).toBe(3);
    expect(result.rss.convention).toBe(RSS_CONVENTION);
    expect(result.rss.halfWidthMm).toBeCloseTo(rssHalf, 9);
    expect(result.rss.minMm).toBeCloseTo(0.2 - rssHalf, 9);
    expect(result.rss.maxMm).toBeCloseTo(0.2 + rssHalf, 9);
    expect(result.rss.minMm).toBeGreaterThan(result.worstCase.minMm);
    expect(result.rss.maxMm).toBeLessThan(result.worstCase.maxMm);
    const hole = result.contributors.find(c => c.id === 'hole');
    const shaft = result.contributors.find(c => c.id === 'shaft');
    expect(hole?.varianceShare).toBeCloseTo(0.8, 9);
    expect(shaft?.varianceShare).toBeCloseTo(0.2, 9);
  });

  it('refuses a contributor that has no tolerance instead of applying a general class', () => {
    const result = analyzeToleranceStack([
      { id: 'hole', nominalMm: 10, sense: '+' } as StackContributor,
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('cli.invalid-args');
    expect(result.error).toMatch(/hole/);
    expect(result.error).toMatch(/upper_mm/);
    expect(result.error).toMatch(/lower_mm/);
    expect(result.error).toMatch(/ISO 2768/i);
    expect(result.disclaimer).toMatch(/not a full GD&T/i);
  });

  it('accepts snake_case wire fields and keeps camelCase aliases', () => {
    const snake = ok(analyzeToleranceStack(
      [{ id: 'hole', nominal_mm: 10, upper_mm: 0.1, lower_mm: -0.1, sense: '+' }, SHAFT],
      { kind: 'gap', min_mm: 0.07 },
    ));
    expect(snake.nominalMm).toBeCloseTo(0.2, 9);
    expect(snake.requirement?.minMm).toBe(0.07);

    const mixed = ok(analyzeToleranceStack([{
      id: 'len',
      nominal_mm: 10,
      nominalMm: 1,
      upper_mm: 0.2,
      upperMm: 9,
      lower_mm: -0.2,
      lowerMm: -9,
      sense: '+',
    }]));
    expect(mixed.nominalMm).toBeCloseTo(10, 9);
    expect(mixed.worstCase).toMatchObject({ minMm: 9.8, maxMm: 10.2 });
  });

  it('fails a requirement the worst case misses and passes one both bands satisfy', () => {
    const fail = ok(analyzeToleranceStack([HOLE, SHAFT], { kind: 'gap', minMm: 0.07 }));
    expect(fail.requirement?.worstCase).toBe('fail');
    expect(fail.requirement?.rss).toBe('pass');
    expect(fail.requirement?.pass).toBe(false);

    const pass = ok(analyzeToleranceStack([HOLE, SHAFT], {
      kind: 'clearance',
      minMm: 0.04,
      maxMm: 0.4,
    }));
    expect(pass.requirement?.worstCase).toBe('pass');
    expect(pass.requirement?.rss).toBe('pass');
    expect(pass.requirement?.pass).toBe(true);
  });
});
