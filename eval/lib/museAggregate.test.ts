// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { aggregateMuseSamples, type MuseSample } from './museAggregate';

const judged = (overrides: Partial<MuseSample> = {}): MuseSample => ({
  case: 'c',
  sandboxOk: true,
  overlapFree: true,
  categories: {
    assembly_readiness: 1,
    joint_design: 0,
    tolerance: 1,
    functional_adaptation: 1,
    usage_stability: 0,
    manufacturability: 1,
  },
  ...overrides,
});

describe('aggregateMuseSamples', () => {
  it('maps the six categories to the three pillars and final', () => {
    const { row, forcedZeroCases, judgedCases } = aggregateMuseSamples([judged()], {
      model: 'm+kcad',
    });
    expect(row.functional).toBe(100);
    expect(row.robust).toBe(0);
    expect(row.functionality).toBe(50);
    expect(row.well_toleranced).toBe(100);
    expect(row.manufacturable).toBe(100);
    expect(row.manufacturability).toBe(100);
    expect(row.assembly_ready).toBe(100);
    expect(row.connectable).toBe(0);
    expect(row.assemblability).toBe(50);
    expect(row.final).toBe(66.67);
    expect(row.sandbox).toBe(100);
    expect(row.overlap_free).toBe(100);
    expect(row.watertight).toBeNull();
    expect(row.manifold).toBeNull();
    expect(row.self_int_free).toBeNull();
    expect(row.geom_valid).toBeNull();
    expect(row.judged).toBe(1);
    expect(row.cases).toBe(1);
    expect(judgedCases).toBe(1);
    expect(forcedZeroCases).toEqual([]);
  });

  it('zeroes all categories when stage 1 or overlap fails', () => {
    const { row, forcedZeroCases, judgedCases } = aggregateMuseSamples(
      [
        judged({ case: 'stage1-fail', sandboxOk: false }),
        judged({ case: 'overlap-fail', overlapFree: false, categories: judged().categories }),
      ],
      { model: 'm+kcad' },
    );
    expect(row.final).toBe(0);
    expect(row.robust).toBe(0);
    expect(row.well_toleranced).toBe(0);
    expect(row.sandbox).toBe(50);
    expect(row.overlap_free).toBe(0);
    expect(forcedZeroCases).toEqual(['stage1-fail', 'overlap-fail']);
    expect(judgedCases).toBe(0);
  });

  it('averages across cases and counts judged samples', () => {
    const { row, forcedZeroCases, judgedCases } = aggregateMuseSamples(
      [judged({ case: 'ok' }), judged({ case: 'no-sandbox', sandboxOk: false })],
      { model: 'm+kcad' },
    );
    expect(row.cases).toBe(2);
    expect(row.judged).toBe(1);
    expect(row.sandbox).toBe(50);
    expect(row.final).toBe(33.33);
    expect(judgedCases).toBe(1);
    expect(forcedZeroCases).toEqual(['no-sandbox']);
  });

  it('keeps unjudged samples in the denominator without forcing zero', () => {
    const { row, forcedZeroCases, judgedCases, infraCases } = aggregateMuseSamples(
      [judged({ case: 'unjudged', categories: undefined })],
      { model: 'm+kcad' },
    );
    expect(row.cases).toBe(1);
    expect(row.sandbox).toBe(100);
    expect(row.judged).toBe(0);
    expect(row.final).toBe(0);
    expect(judgedCases).toBe(0);
    expect(forcedZeroCases).toEqual([]);
    expect(infraCases).toEqual([]);
  });

  it('excludes infra errors from denominators and reports them', () => {
    const { row, forcedZeroCases, judgedCases, infraCases } = aggregateMuseSamples(
      [judged({ case: 'good' }), judged({ case: 'bad', infra: true, sandboxOk: false })],
      { model: 'm+kcad' },
    );
    expect(row.cases).toBe(1);
    expect(row.sandbox).toBe(100);
    expect(row.final).toBe(66.67);
    expect(row.judged).toBe(1);
    expect(judgedCases).toBe(1);
    expect(forcedZeroCases).toEqual([]);
    expect(infraCases).toEqual(['bad']);
  });

  it('returns zeroed rates for empty input', () => {
    const { row, forcedZeroCases, judgedCases, infraCases } = aggregateMuseSamples([], {
      model: 'm+kcad',
    });
    expect(row.cases).toBe(0);
    expect(row.judged).toBe(0);
    expect(row.sandbox).toBe(0);
    expect(row.overlap_free).toBe(0);
    expect(row.final).toBe(0);
    expect(judgedCases).toBe(0);
    expect(forcedZeroCases).toEqual([]);
    expect(infraCases).toEqual([]);
  });
});
