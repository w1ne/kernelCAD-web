// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/report.ts
//
// Run summary: per-task table (status, producer, attempts, tokens, cost,
// time, pre-check and official gate verdicts) plus the valid counts. The
// CAD Score itself cannot be computed locally — the ground truth is private
// and only the leaderboard's grader reads it — so the summary reports
// validity, which is the gate every scored candidate must clear.

import type { TaskState } from './state';

export interface RunSummary {
  tasks: number;
  byType: Record<'generation' | 'editing', { tasks: number; valid: number }>;
  statusCounts: Record<string, number>;
  /** Tasks whose candidate passed the local pre-check. */
  precheckValid: number;
  /** Tasks whose candidate passed the benchmark's own gate; null when it did not run. */
  officialValid: number | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number | null;
  wallMs: number;
  localScore: null;
  localScoreNote: string;
}

const LOCAL_SCORE_NOTE =
  'CAD Score is not computable locally: the ground truth is private and scored only by the leaderboard grader.';

/** Valid for the summary = official verdict when present, else the pre-check. */
export function isValidCandidate(s: TaskState): boolean {
  if (s.official) return s.official.valid;
  return s.status === 'valid';
}

export function summarize(states: TaskState[]): RunSummary {
  const byType = { generation: { tasks: 0, valid: 0 }, editing: { tasks: 0, valid: 0 } };
  const statusCounts: Record<string, number> = {};
  let officialRan = false;
  let officialValid = 0;
  let cost: number | null = null;
  for (const s of states) {
    byType[s.type].tasks++;
    if (isValidCandidate(s)) byType[s.type].valid++;
    const key = s.fallback ? `${s.status} (passthrough)` : s.status;
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
    if (s.official) {
      officialRan = true;
      if (s.official.valid) officialValid++;
    }
    if (s.costUsd !== null) cost = (cost ?? 0) + s.costUsd;
  }
  return {
    tasks: states.length,
    byType,
    statusCounts,
    precheckValid: states.filter((s) => s.status === 'valid').length,
    officialValid: officialRan ? officialValid : null,
    tokensIn: states.reduce((a, s) => a + s.tokensIn, 0),
    tokensOut: states.reduce((a, s) => a + s.tokensOut, 0),
    costUsd: cost,
    wallMs: states.reduce((a, s) => a + s.wallMs, 0),
    localScore: null,
    localScoreNote: LOCAL_SCORE_NOTE,
  };
}

function secs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function usd(v: number | null): string {
  return v === null ? '—' : `$${v.toFixed(3)}`;
}

export function renderSummaryMarkdown(states: TaskState[], header: Record<string, string>): string {
  const sum = summarize(states);
  const lines: string[] = ['# CADGenBench run', ''];
  for (const [k, v] of Object.entries(header)) lines.push(`- ${k}: ${v}`);
  lines.push('');
  lines.push(
    `Valid: ${sum.byType.generation.valid + sum.byType.editing.valid}/${sum.tasks} ` +
      `(generation ${sum.byType.generation.valid}/${sum.byType.generation.tasks}, ` +
      `editing ${sum.byType.editing.valid}/${sum.byType.editing.tasks})`,
  );
  lines.push(`Pre-check valid: ${sum.precheckValid}; official gate valid: ${sum.officialValid ?? 'not run'}`);
  lines.push(
    `Tokens: ${sum.tokensIn} in / ${sum.tokensOut} out; cost ${usd(sum.costUsd)}; task time ${secs(sum.wallMs)}`,
  );
  lines.push(`Local score: n/a. ${sum.localScoreNote}`);
  lines.push('');
  lines.push('| task | type | status | mode | attempts | repair | tokens in/out | cost | time | pre-check | official |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of states) {
    const pre = s.precheck ? (s.precheck.valid ? 'valid' : `invalid: ${s.precheck.errors[0] ?? ''}`) : '—';
    const off = s.official ? (s.official.valid ? 'valid' : `invalid: ${s.official.detail}`) : '—';
    const status = s.error && s.status !== 'valid' ? `${s.status}: ${s.error}` : s.status;
    lines.push(
      `| ${s.id} | ${s.type} | ${status.replace(/\|/g, '/')} | ${s.mode}${s.fallback ? ' (passthrough fallback)' : ''} | ${s.attempts} | ` +
        `${s.repaired ? 'yes' : 'no'} | ${s.tokensIn}/${s.tokensOut} | ${usd(s.costUsd)} | ${secs(s.wallMs)} | ` +
        `${pre.replace(/\|/g, '/')} | ${off.replace(/\|/g, '/')} |`,
    );
  }
  return lines.join('\n') + '\n';
}
