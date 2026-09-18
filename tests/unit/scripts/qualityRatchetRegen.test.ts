// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { planRegen, type Finding } from '../../../scripts/lib/qualityRatchet';
import { planCycleRegen } from '../../../scripts/lib/cycleRatchet';

describe('qualityBaselineRegen.planRegen', () => {
  const base: Finding = { rule: 'complexity', file: 'src/a.ts', symbol: "Function 'big'", value: 30 };

  it('writes the first baseline when none exists yet', () => {
    const r = planRegen([base], undefined, false);
    expect(r.write).toBe(true);
    expect(r.report[0]).toMatch(/no existing qualityBaseline\.json/);
  });

  it('refuses to write when a finding is new and --allow-new was not passed', () => {
    const extra: Finding = { ...base, symbol: "Function 'other'" };
    const r = planRegen([base, extra], [base], false);
    expect(r.write).toBe(false);
    expect(r.report).toEqual([`NEW      ${extra.file} ${extra.symbol} (${extra.rule}=${extra.value}) — split it or reduce below the threshold`]);
  });

  it('refuses to write when a finding grew and --allow-new was not passed', () => {
    const grown: Finding = { ...base, value: 31 };
    const r = planRegen([grown], [base], false);
    expect(r.write).toBe(false);
    expect(r.report).toEqual([`GREW     ${grown.file} ${grown.symbol} (${grown.rule}=${grown.value}) (was ${base.value})`]);
  });

  it('writes when --allow-new is passed despite growth', () => {
    const grown: Finding = { ...base, value: 31 };
    const r = planRegen([grown], [base], true);
    expect(r.write).toBe(true);
    expect(r.report).toEqual([]);
  });

  it('writes normally when findings only shrink or disappear', () => {
    const r1 = planRegen([{ ...base, value: 20 }], [base], false);
    expect(r1.write).toBe(true);
    const r2 = planRegen([], [base], false);
    expect(r2.write).toBe(true);
  });
});

describe('qualityBaselineRegen.planCycleRegen', () => {
  it('writes the first cycle baseline when none exists yet', () => {
    const r = planCycleRegen(['a > b'], undefined, false);
    expect(r.write).toBe(true);
    expect(r.report[0]).toMatch(/no existing cycleBaseline\.json/);
  });

  it('refuses to write when a new cycle appears and --allow-new was not passed', () => {
    const r = planCycleRegen(['a > b', 'x > y'], ['a > b'], false);
    expect(r.write).toBe(false);
    expect(r.report).toEqual(['NEW CYCLE   x > y']);
  });

  it('writes when --allow-new is passed despite a new cycle', () => {
    const r = planCycleRegen(['a > b', 'x > y'], ['a > b'], true);
    expect(r.write).toBe(true);
    expect(r.report).toEqual([]);
  });

  it('writes normally when a cycle disappears', () => {
    const r = planCycleRegen([], ['a > b'], false);
    expect(r.write).toBe(true);
  });
});
