// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { comparisonFor, scalarComparison } from '../../../src/modeling/requirements/evaluate';
import type { RequirementPredicateSpec } from '../../../src/shared/intent/requirementRecord';

const spec = (over: Partial<RequirementPredicateSpec>): RequirementPredicateSpec => ({
  metric: 'distance',
  op: 'gte',
  limit: 1,
  ...over,
});

describe('requirement comparison math', () => {
  it('gte: passes at the limit and reports a signed margin', () => {
    expect(scalarComparison(1, spec({ op: 'gte', limit: 1 }))).toEqual({ status: 'pass', margin: 0 });
    expect(scalarComparison(0.6, spec({ op: 'gte', limit: 1 }))).toMatchObject({ status: 'fail', margin: -0.4 });
    expect(scalarComparison(1.7, spec({ op: 'gte', limit: 1 }))).toMatchObject({ status: 'pass', margin: 0.7 });
  });

  it('lte: margin is how far below the maximum the measurement sits', () => {
    expect(scalarComparison(2, spec({ op: 'lte', limit: 2 }))).toEqual({ status: 'pass', margin: 0 });
    expect(scalarComparison(2.5, spec({ op: 'lte', limit: 2 }))).toMatchObject({ status: 'fail', margin: -0.5 });
  });

  it('between: margin is the nearest band edge', () => {
    expect(scalarComparison(5, spec({ op: 'between', limit: [2, 5] }))).toEqual({ status: 'pass', margin: 0 });
    expect(scalarComparison(3, spec({ op: 'between', limit: [2, 5] }))).toEqual({ status: 'pass', margin: 1 });
    expect(scalarComparison(1, spec({ op: 'between', limit: [2, 5] }))).toMatchObject({ status: 'fail', margin: -1 });
  });

  it('eq: an exact count passes; over/under both fail with a signed delta', () => {
    expect(scalarComparison(4, spec({ metric: 'count', op: 'eq', limit: 4 }))).toEqual({ status: 'pass', margin: 0 });
    expect(scalarComparison(3, spec({ metric: 'count', op: 'eq', limit: 4 }))).toMatchObject({ status: 'fail', margin: -1 });
    expect(scalarComparison(5, spec({ metric: 'count', op: 'eq', limit: 4 }))).toMatchObject({ status: 'fail', margin: 1 });
  });

  it('within(number): a tolerance is an lte ceiling', () => {
    expect(scalarComparison(0.04, spec({ metric: 'coplanar', op: 'within', limit: 0.05 })).status).toBe('pass');
    expect(scalarComparison(0.04, spec({ metric: 'coplanar', op: 'within', limit: 0.05 })).margin).toBeCloseTo(0.01);
    expect(scalarComparison(0.06, spec({ metric: 'coplanar', op: 'within', limit: 0.05 })).status).toBe('fail');
    expect(scalarComparison(0.06, spec({ metric: 'coplanar', op: 'within', limit: 0.05 })).margin).toBeCloseTo(-0.01);
  });

  it('axis bands: every declared axis must hold; margin is the tightest', () => {
    const r = comparisonFor(
      { measured: [10, 10, 10], axes: { x: 10, y: 10, z: 10 } },
      { metric: 'bbox', op: 'within', limit: { x: [9, 11], y: [9, 11], z: [9, 10.5] } },
    );
    expect(r.status).toBe('pass');
    expect(r.margin).toBeCloseTo(0.5);
  });
});
