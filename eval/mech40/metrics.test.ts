// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { compareToBaseline, passAtK, resultsFileName, summarize, summarizeTask, type SampleResult } from './metrics';

const s = (pass: boolean, evals = 1, failureCode?: string): SampleResult =>
  ({ pass, evals, ...(failureCode ? { failureCode } : {}), tokensIn: 10, tokensOut: 5, ms: 1 });

describe('passAtK', () => {
  it('is the unbiased estimator', () => {
    expect(passAtK(3, 0, 3)).toBe(0);
    expect(passAtK(3, 1, 1)).toBeCloseTo(1 / 3);
    expect(passAtK(3, 1, 3)).toBe(1);
    expect(passAtK(5, 2, 2)).toBeCloseTo(1 - 3 / 10); // 1 − C(3,2)/C(5,2)
    expect(passAtK(0, 0, 1)).toBe(0);
  });
});

describe('summarize', () => {
  it('aggregates pass@1, pass@k, evals-to-success and failure codes', () => {
    const tasks = [
      summarizeTask('a', [s(true, 1), s(true, 3), s(false, 3, 'feature.invalid-args')], 3),
      summarizeTask('b', [s(false, 3, 'check:holes'), s(false, 3, 'feature.invalid-args'), s(false, 2, 'eval.no-script-extracted')], 3),
    ];
    const sum = summarize(tasks);
    expect(sum.pass_at_1).toBeCloseTo((2 / 3 + 0) / 2, 4);
    expect(sum.pass_at_k).toBe(0.5);
    expect(sum.mean_evals_to_success).toBe(2);
    expect(sum.failure_codes).toEqual({ 'feature.invalid-args': 2, 'check:holes': 1, 'eval.no-script-extracted': 1 });
    expect(Object.keys(sum.failure_codes)[0]).toBe('feature.invalid-args');
    expect(sum.tokens).toEqual({ input: 60, output: 30 });
  });

  it('mean evals-to-success is null when nothing passed', () => {
    expect(summarize([summarizeTask('a', [s(false)], 1)]).mean_evals_to_success).toBeNull();
  });
});

describe('compareToBaseline', () => {
  const run = (p: number, tasks: { id: string; pass_at_1: number }[] = []) => ({ summary: { pass_at_1: p }, tasks });

  it('passes within the threshold and fails beyond it', () => {
    expect(compareToBaseline(run(0.6), run(0.62), 0.05).ok).toBe(true);
    const bad = compareToBaseline(run(0.5, [{ id: 'x', pass_at_1: 0 }]), run(0.6, [{ id: 'x', pass_at_1: 1 }]), 0.05);
    expect(bad.ok).toBe(false);
    expect(bad.drop).toBeCloseTo(0.1);
    expect(bad.lines.join('\n')).toMatch(/regressed: x/);
  });

  it('an empty baseline passes with a notice', () => {
    const v = compareToBaseline(run(0.4), { summary: { pass_at_1: null } }, 0.05);
    expect(v.ok).toBe(true);
    expect(v.drop).toBeNull();
  });
});

describe('resultsFileName', () => {
  it('is <date>-<model>.json with a safe model name', () => {
    expect(resultsFileName(new Date('2026-10-11T05:00:00Z'), 'claude-sonnet-4-6')).toBe('2026-10-11-claude-sonnet-4-6.json');
    expect(resultsFileName(new Date('2026-10-11T05:00:00Z'), 'org/model:v1')).toBe('2026-10-11-org_model_v1.json');
  });
});
