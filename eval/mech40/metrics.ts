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

/** Harness/infra failure (API outage, crash) — not the agent's fault. */
export const INFRA_ERROR_CODE = 'eval.infra-error';

export const isInfraError = (s: SampleResult): boolean => !s.pass && s.failureCode === INFRA_ERROR_CODE;

export interface TaskResults {
  id: string;
  /** Scored samples: every sample except infra errors (the pass@k denominator). */
  n: number;
  /** Passing samples. */
  c: number;
  /** Samples lost to infra errors, excluded from n. */
  infra_errors?: number;
  /** null when every sample was an infra error (nothing was scored). */
  pass_at_1: number | null;
  pass_at_k: number | null;
  samples: SampleResult[];
}

export interface ResultsSummary {
  tasks: number;
  /** Every sample taken, infra errors included. */
  samples: number;
  /** Samples lost to infra errors; excluded from pass@ and failure_codes. */
  infra_errors?: number;
  /** Mean over tasks with at least one scored sample. */
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
  const infra = samples.filter(isInfraError).length;
  const n = samples.length - infra;
  const c = samples.filter((s) => s.pass).length;
  return {
    id, n, c, infra_errors: infra,
    pass_at_1: n === 0 ? null : passAtK(n, c, 1),
    pass_at_k: n === 0 ? null : passAtK(n, c, k),
    samples,
  };
}

const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const round = (x: number): number => Math.round(x * 10_000) / 10_000;

const scoredValues = (xs: readonly (number | null)[]): number[] => xs.filter((x): x is number => x !== null);

export function summarize(tasks: readonly TaskResults[]): ResultsSummary {
  const all = tasks.flatMap((t) => t.samples);
  const passing = all.filter((s) => s.pass);
  const codes = new Map<string, number>();
  for (const s of all) {
    if (s.pass || isInfraError(s)) continue;
    const code = s.failureCode ?? 'eval.unknown';
    codes.set(code, (codes.get(code) ?? 0) + 1);
  }
  return {
    tasks: tasks.length,
    samples: all.length,
    infra_errors: all.filter(isInfraError).length,
    pass_at_1: round(mean(scoredValues(tasks.map((t) => t.pass_at_1)))),
    pass_at_k: round(mean(scoredValues(tasks.map((t) => t.pass_at_k)))),
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
  /**
   * The runs are not comparable (different model / k / skills, or no common
   * tasks): no verdict on quality was reached. `ok` is false.
   */
  refused?: boolean;
  /** baseline − current pass@1 (positive = worse); null without a baseline. */
  drop: number | null;
  lines: string[];
}

interface Comparable {
  model?: string | null;
  k?: number | null;
  skills?: string | null;
  summary: { pass_at_1: number | null };
  tasks?: readonly { id: string; pass_at_1: number | null }[];
}

/** Run settings that must match for pass@1 to be comparable. */
const CONFIG_KEYS = ['model', 'k', 'skills'] as const;

function configMismatches(current: Comparable, baseline: Comparable): string[] {
  const out: string[] = [];
  for (const key of CONFIG_KEYS) {
    const b = baseline[key];
    if (b === null || b === undefined) continue; // baseline predates the field
    if (current[key] !== b) out.push(`${key}: current ${JSON.stringify(current[key] ?? null)} vs baseline ${JSON.stringify(b)}`);
  }
  return out;
}

const scoredMap = (r: Comparable): Map<string, number> =>
  new Map((r.tasks ?? []).filter((t) => t.pass_at_1 !== null).map((t) => [t.id, t.pass_at_1 as number]));

/** Per-task lines for tasks that went from passing to failing. */
function taskRegressions(cur: Map<string, number>, before: Map<string, number>): string[] {
  return [...cur]
    .filter(([id, p]) => (before.get(id) ?? 0) > 0 && p === 0)
    .map(([id]) => `  regressed: ${id} (pass@1 ${before.get(id)} → 0)`);
}

interface PassPair { cur: number; base: number; scope: string }

/**
 * pass@1 of both runs over the tasks they share (both scored). A task subset
 * run is compared against the baseline's same tasks, not its full mean.
 * Falls back to the summaries when either run has no per-task list.
 */
function commonPassAt1(current: Comparable, baseline: Comparable): PassPair | string {
  const cur = scoredMap(current);
  const base = scoredMap(baseline);
  if (cur.size === 0 || base.size === 0) {
    const c = current.summary.pass_at_1;
    if (c === null || c === undefined) return 'current results have no pass@1';
    return { cur: c, base: baseline.summary.pass_at_1 as number, scope: 'summary' };
  }
  const common = [...cur.keys()].filter((id) => base.has(id));
  if (common.length === 0) return 'the run and the baseline share no scored task ids';
  const avg = (m: Map<string, number>): number => round(mean(common.map((id) => m.get(id) as number)));
  return { cur: avg(cur), base: avg(base), scope: `${common.length} common task(s) (run ${cur.size}, baseline ${base.size})` };
}

/**
 * Fail when pass@1 dropped by more than `threshold` (absolute, 0..1) against
 * the baseline, over the tasks both runs scored. Refuses (ok false,
 * `refused`) when model / k / skills differ or no task is shared. A baseline
 * without a recorded pass@1 passes with a notice.
 */
export function compareToBaseline(current: Comparable, baseline: Comparable, threshold: number): RegressionVerdict {
  const base = baseline.summary.pass_at_1;
  if (base === null || base === undefined) {
    return { ok: true, drop: null, lines: [`baseline has no pass@1 yet — current pass@1 ${current.summary.pass_at_1}; record it with --write-baseline`] };
  }
  const mismatches = configMismatches(current, baseline);
  if (mismatches.length > 0) {
    return {
      ok: false, refused: true, drop: null,
      lines: ['refusing to compare: the run settings differ from the baseline', ...mismatches.map((m) => `  ${m}`),
        'rerun with the baseline settings, or record a new baseline with --write-baseline'],
    };
  }
  const pair = commonPassAt1(current, baseline);
  if (typeof pair === 'string') return { ok: false, refused: true, drop: null, lines: [`refusing to compare: ${pair}`] };
  const drop = round(pair.base - pair.cur);
  const ok = drop <= threshold;
  return {
    ok,
    drop,
    lines: [
      `pass@1 ${pair.cur} vs baseline ${pair.base} on ${pair.scope} (drop ${drop}, threshold ${threshold}) → ${ok ? 'OK' : 'REGRESSION'}`,
      ...taskRegressions(scoredMap(current), scoredMap(baseline)),
    ],
  };
}
