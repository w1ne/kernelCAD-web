// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  aggregateMuseSamples,
  ZERO_CATEGORIES,
  type JudgeCategories,
  type MuseSample,
} from '../eval/lib/museAggregate';
import type { Score } from '../eval/types';

export interface RunEnvelope {
  runId?: string;
  model: string;
  judgeModel?: string;
  baseUrl?: string;
  protocol?: string;
  skills?: string[];
  workers?: number;
  temperature?: number;
  caseCount?: number;
  tokens?: { tokensIn?: number; tokensOut?: number };
  wallMs?: number;
}

interface CaseArtifact {
  case: string;
  infra: boolean;
  sandboxOk: boolean;
  overlapFree: boolean;
  categories?: JudgeCategories;
  forcedZero: boolean;
  score?: Score;
  firstFailureCode?: string;
}

function loadCase(root: string, name: string): CaseArtifact {
  const dir = join(root, 'cases', name);
  const statePath = join(dir, 'state.json');
  const state = existsSync(statePath)
    ? (JSON.parse(readFileSync(statePath, 'utf8')) as { phase?: string })
    : undefined;
  const score: Score | undefined = existsSync(join(dir, 'score.json'))
    ? (JSON.parse(readFileSync(join(dir, 'score.json'), 'utf8')) as Score)
    : undefined;
  const metrics = (score?.metrics ?? {}) as Record<string, unknown>;
  let categories: JudgeCategories | undefined;
  let forcedZero = false;
  if (existsSync(join(dir, 'judge.json'))) {
    const judge = JSON.parse(readFileSync(join(dir, 'judge.json'), 'utf8')) as {
      categories?: JudgeCategories;
      forcedZero?: boolean;
    };
    categories = { ...ZERO_CATEGORIES, ...(judge.categories ?? {}) };
    forcedZero = judge.forcedZero === true;
  }
  return {
    case: name,
    infra: state?.phase === 'infra_error',
    sandboxOk: metrics.muse_sandbox_ok === true,
    overlapFree: metrics.muse_overlap_free === true,
    categories,
    forcedZero,
    score,
    firstFailureCode: score?.firstFailureCode,
  };
}

function toCsv(rows: Array<Record<string, string | number | null>>): string {
  if (rows.length === 0) return '';
  const header = Object.keys(rows[0]);
  const cell = (v: string | number | null | undefined): string =>
    v === null || v === undefined ? '' : String(v);
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(header.map((h) => cell(row[h])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function writeReports(runRoot: string): void {
  const run: RunEnvelope = existsSync(join(runRoot, 'run.json'))
    ? (JSON.parse(readFileSync(join(runRoot, 'run.json'), 'utf8')) as RunEnvelope)
    : { model: 'unknown' };
  const casesDir = join(runRoot, 'cases');
  const names = existsSync(casesDir) ? readdirSync(casesDir).sort() : [];
  const artifacts = names.map((n) => loadCase(runRoot, n));

  const samples: MuseSample[] = artifacts.map((a) => ({
    case: a.case,
    infra: a.infra,
    sandboxOk: a.sandboxOk,
    overlapFree: a.overlapFree,
    categories: a.categories,
  }));
  const { row, forcedZeroCases, infraCases } = aggregateMuseSamples(samples, {
    model: `${run.model} + kernelCAD`,
  });

  const leaderboard = {
    judge: run.judgeModel ?? 'google/gemini-3.1-pro',
    n_cases: artifacts.length,
    evaluated_cases: row.cases,
    infra_cases: infraCases.length,
    updated: new Date().toISOString(),
    validator_status: 'unpublished',
    rows: [row],
  };
  writeFileSync(join(runRoot, 'leaderboard.json'), JSON.stringify(leaderboard, null, 2));
  writeFileSync(
    join(runRoot, 'leaderboard.csv'),
    toCsv([row as unknown as Record<string, string | number | null>]),
  );

  const failureCounts = new Map<string, number>();
  for (const a of artifacts) {
    const code = a.firstFailureCode ?? 'none';
    failureCounts.set(code, (failureCounts.get(code) ?? 0) + 1);
  }
  const failureLines = [...failureCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => `- ${code}: ${count}`);

  const summary = [
    `# MUSE 106 sweep summary — ${run.model}`,
    '',
    `Cases attempted: ${artifacts.length} | evaluated (denominator): ${row.cases} | judged: ${row.judged} | forced-zero: ${forcedZeroCases.length} | infra errors: ${infraCases.length}`,
    `Sandbox pass: ${row.sandbox}% | Overlap-free: ${row.overlap_free}% | Final: ${row.final}`,
    '',
    '## Pillars',
    '',
    `- Functionality: ${row.functionality}`,
    `- Manufacturability: ${row.manufacturability}`,
    `- Assemblability: ${row.assemblability}`,
    '',
    '## First failure codes',
    '',
    ...(failureLines.length > 0 ? failureLines : ['- none']),
    '',
    '## Forced-zero cases',
    '',
    ...(forcedZeroCases.length > 0 ? forcedZeroCases.map((c) => `- ${c}`) : ['- none']),
    '',
    '## Infra errors (excluded from denominators)',
    '',
    ...(infraCases.length > 0 ? infraCases.map((c) => `- ${c}`) : ['- none']),
    '',
  ].join('\n');
  writeFileSync(join(runRoot, 'summary.md'), summary);

  const protocol = [
    '# Sweep protocol and deviations',
    '',
    `- Driver: ${run.model}; protocol version ${run.protocol ?? 'muse-v1'}; temperature ${run.temperature ?? 0.2}; skills: ${(run.skills ?? []).join(', ') || 'n/a'}.`,
    '- Generation: kernelCAD product loop — 1 sample per case, up to 2 diagnostic-driven repairs, candidates=1.',
    '- Geometry submission: MUSE sandbox runs a CadQuery shim importing a kernelCAD-exported STEP (no CadQuery authored by kernelCAD).',
    '- Judge: MUSE `generate_score_sp` + `_run_alignment_judge`, model google/gemini-3.1-pro served via DeepInfra (upstream default serving is OpenRouter preview).',
    '- Candidate image: MUSE VTK render for all 106 cases; upstream uses DrawCAD 4-view PNGs for the 97 non-render-only cases (DrawCAD unpublished).',
    '- Stage 2: MUSE external `validator` module is unpublished; watertight/manifold/self-intersection and the official `geom_valid` column cannot be computed locally. Overlap-free is computed with MUSE code. Forced-zero locally covers sandbox and overlap only.',
    '- Aggregation mirrors upstream `generate_latex_tables_gemini.py@547a724^`; validator columns are null in leaderboard.json.',
    '',
  ].join('\n');
  writeFileSync(join(runRoot, 'protocol.md'), protocol);
}
