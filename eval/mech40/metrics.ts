// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/mech40/metrics.ts — pure aggregation of mech40 agent samples into the
// committed results format, and the pass@1 regression gate.

export const RESULTS_SCHEMA = 'kernelcad.mech40.results/v1';

/** One agent attempt-loop on one task. */
export interface SampleResult {
  /** Final script passed every gate and check of the task harness. */
  pass: boolean;
  /** evaluate calls the loop made (the evals-to-success when `pass`). */
  evals: number;
  /** Why it failed: a diagnostic code, `check:<name>`, or an `eval.*` code. */
  failureCode?: string;
  failedChecks?: string[];
  tokensIn: number;
  tokensOut: number;
  ms: number;
}

export interface TaskResults {
  id: string;
  n: number;
  /** Passing samples. */
  c: number;
  pass_at_1: number;
  pass_at_k: number;
  samples: SampleResult[];
}

export interface ResultsSummary {
  tasks: number;
  samples: number;
  pass_at_1: number;
  pass_at_k: number;
  /** Mean evals-to-success over passing samples; null when nothing passed. */
  mean_evals_to_success: number | null;
  /** Failure code → count over failing samples, most frequent first. */
  failure_codes: Record<string, number>;
  tokens: { input: number; output: number };
}

export interface ResultsFile {
  schema: typeof RESULTS_SCHEMA;
  suite: 'mech40';
  date: string;
  model: string;
  k: number;
  skills: string;
  max_attempts: number;
  temperature: number | null;
  mock: boolean;
  summary: ResultsSummary;
  tasks: TaskResults[];
}

function choose(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  let out = 1;
  for (let i = 1; i <= r; i++) out = (out * (n - r + i)) / i;
  return out;
}

/**
 * Unbiased pass@k estimator (Chen et al. 2021): the probability that at
 * least one of k samples drawn from the n taken passes, given c passed.
 */
export function passAtK(n: number, c: number, k: number): number {
  if (n <= 0) return 0;
  const kk = Math.min(k, n);
  if (n - c < kk) return 1;
  return 1 - choose(n - c, kk) / choose(n, kk);
}

export function summarizeTask(id: string, samples: SampleResult[], k: number): TaskResults {
  const n = samples.length;
  const c = samples.filter((s) => s.pass).length;
  return { id, n, c, pass_at_1: passAtK(n, c, 1), pass_at_k: passAtK(n, c, k), samples };
}

const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const round = (x: number): number => Math.round(x * 10_000) / 10_000;

export function summarize(tasks: readonly TaskResults[]): ResultsSummary {
  const all = tasks.flatMap((t) => t.samples);
  const passing = all.filter((s) => s.pass);
  const codes = new Map<string, number>();
  for (const s of all) {
    if (s.pass) continue;
    const code = s.failureCode ?? 'eval.unknown';
    codes.set(code, (codes.get(code) ?? 0) + 1);
  }
  return {
    tasks: tasks.length,
    samples: all.length,
    pass_at_1: round(mean(tasks.map((t) => t.pass_at_1))),
    pass_at_k: round(mean(tasks.map((t) => t.pass_at_k))),
    mean_evals_to_success: passing.length === 0 ? null : round(mean(passing.map((s) => s.evals))),
    failure_codes: Object.fromEntries([...codes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    tokens: { input: all.reduce((a, s) => a + s.tokensIn, 0), output: all.reduce((a, s) => a + s.tokensOut, 0) },
  };
}

/** `eval/results/<YYYY-MM-DD>-<model>.json` file name (model sanitised). */
export function resultsFileName(date: Date, model: string): string {
  const day = date.toISOString().slice(0, 10);
  return `${day}-${model.replace(/[^A-Za-z0-9._-]+/g, '_')}.json`;
}

export interface RegressionVerdict {
  ok: boolean;
  /** baseline − current pass@1 (positive = worse); null without a baseline. */
  drop: number | null;
  lines: string[];
}

interface Comparable {
  summary: { pass_at_1: number | null };
  tasks?: readonly { id: string; pass_at_1: number }[];
}

/** Per-task lines for tasks that went from passing to failing. */
function taskRegressions(current: Comparable, baseline: Comparable): string[] {
  const before = new Map((baseline.tasks ?? []).map((t) => [t.id, t.pass_at_1]));
  return (current.tasks ?? [])
    .filter((t) => (before.get(t.id) ?? 0) > 0 && t.pass_at_1 === 0)
    .map((t) => `  regressed: ${t.id} (pass@1 ${before.get(t.id)} → 0)`);
}

/**
 * Fail when pass@1 dropped by more than `threshold` (absolute, 0..1) against
 * the baseline. A baseline without a recorded pass@1 passes with a notice.
 */
export function compareToBaseline(current: Comparable, baseline: Comparable, threshold: number): RegressionVerdict {
  const cur = current.summary.pass_at_1;
  const base = baseline.summary.pass_at_1;
  if (base === null || base === undefined) {
    return { ok: true, drop: null, lines: [`baseline has no pass@1 yet — current pass@1 ${cur}; record it with --write-baseline`] };
  }
  if (cur === null || cur === undefined) {
    return { ok: false, drop: null, lines: ['current results have no pass@1'] };
  }
  const drop = round(base - cur);
  const ok = drop <= threshold;
  return {
    ok,
    drop,
    lines: [
      `pass@1 ${cur} vs baseline ${base} (drop ${drop}, threshold ${threshold}) → ${ok ? 'OK' : 'REGRESSION'}`,
      ...taskRegressions(current, baseline),
    ],
  };
}
