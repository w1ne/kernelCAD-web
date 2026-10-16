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

  it('leaves infra errors out of the pass@ denominators and failure codes, reporting them separately', () => {
    const a = summarizeTask('a', [s(true), s(false, 0, 'eval.infra-error'), s(false, 0, 'eval.infra-error')], 3);
    expect(a).toMatchObject({ n: 1, c: 1, infra_errors: 2, pass_at_1: 1, pass_at_k: 1 });
    const allInfra = summarizeTask('b', [s(false, 0, 'eval.infra-error')], 1);
    expect(allInfra).toMatchObject({ n: 0, pass_at_1: null, pass_at_k: null });
    const sum = summarize([a, allInfra, summarizeTask('c', [s(false, 2, 'check:holes')], 1)]);
    expect(sum.pass_at_1).toBe(0.5); // tasks a (1) and c (0); b has nothing scored
    expect(sum.infra_errors).toBe(3);
    expect(sum.samples).toBe(5);
    expect(sum.failure_codes).toEqual({ 'check:holes': 1 });
  });

  it('mean evals-to-success is null when nothing passed', () => {
    expect(summarize([summarizeTask('a', [s(false)], 1)]).mean_evals_to_success).toBeNull();
  });
});

describe('compareToBaseline', () => {
  const run = (p: number, tasks: { id: string; pass_at_1: number | null }[] = []) => ({ summary: { pass_at_1: p }, tasks });

  it('passes within the threshold and fails beyond it', () => {
    expect(compareToBaseline(run(0.6), run(0.62), 0.05).ok).toBe(true);
    const bad = compareToBaseline(run(0.5, [{ id: 'x', pass_at_1: 0 }]), run(0.6, [{ id: 'x', pass_at_1: 1 }]), 0.05);
    expect(bad.ok).toBe(false);
    expect(bad.drop).toBe(1); // on the one common task x: 1 → 0
    expect(bad.lines.join('\n')).toMatch(/regressed: x/);
  });

  it('compares a task-subset run on the common task ids only', () => {
    // Baseline: 5 hard tasks fail, 5 easy tasks pass (pass@1 0.5). A run of
    // just the 5 easy tasks, all still passing, is not a regression.
    const easy = ['e1', 'e2', 'e3', 'e4', 'e5'].map((id) => ({ id, pass_at_1: 1 }));
    const hard = ['h1', 'h2', 'h3', 'h4', 'h5'].map((id) => ({ id, pass_at_1: 0 }));
    const v = compareToBaseline(run(1, easy), run(0.5, [...easy, ...hard]), 0.05);
    expect(v.ok).toBe(true);
    expect(v.drop).toBe(0);
    expect(v.lines[0]).toMatch(/5 common task\(s\) \(run 5, baseline 10\)/);
    // A real drop inside the subset still fails.
    const worse = compareToBaseline(run(0.6, [...easy.slice(0, 3), { id: 'e4', pass_at_1: 0 }, { id: 'e5', pass_at_1: 0 }]),
      run(0.5, [...easy, ...hard]), 0.05);
    expect(worse.ok).toBe(false);
    expect(worse.refused).toBeUndefined();
    expect(worse.drop).toBeCloseTo(0.4);
    expect(worse.lines.join('\n')).toMatch(/regressed: e4/);
  });

  it('refuses when model, k or skills differ, or no task is shared', () => {
    const base = { ...run(0.6, [{ id: 'x', pass_at_1: 1 }]), model: 'm', k: 3, skills: 'a,b' };
    const same = { ...run(0.6, [{ id: 'x', pass_at_1: 1 }]), model: 'm', k: 3, skills: 'a,b' };
    expect(compareToBaseline(same, base, 0.05)).toMatchObject({ ok: true });
    for (const diff of [{ model: 'other' }, { k: 1 }, { skills: 'all' }]) {
      const v = compareToBaseline({ ...same, ...diff }, base, 0.05);
      expect(v).toMatchObject({ ok: false, refused: true, drop: null });
      expect(v.lines.join('\n')).toMatch(new RegExp(`refusing to compare[\\s\\S]*${Object.keys(diff)[0]}: current`));
    }
    const disjoint = compareToBaseline({ ...same, tasks: [{ id: 'y', pass_at_1: 1 }] }, base, 0.05);
    expect(disjoint).toMatchObject({ ok: false, refused: true });
    expect(disjoint.lines[0]).toMatch(/share no scored task/);
  });

  it('a task with only infra errors (pass@1 null) is not counted as a regression', () => {
    const v = compareToBaseline(run(1, [{ id: 'a', pass_at_1: 1 }, { id: 'b', pass_at_1: null }]),
      run(1, [{ id: 'a', pass_at_1: 1 }, { id: 'b', pass_at_1: 1 }]), 0.05);
    expect(v.ok).toBe(true);
    expect(v.lines[0]).toMatch(/1 common task/);
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
