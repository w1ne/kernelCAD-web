#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/mech40/compare.ts — pass@1 regression gate for mech40 agent runs.
//
//   npx tsx eval/mech40/compare.ts eval/results/2026-10-11-claude-sonnet-4-6.json
//       [--baseline eval/results/baseline.json] [--threshold 0.05] [--write-baseline]
//
// Exit 1 when pass@1 dropped by more than the threshold (absolute, default
// 0.05 = 5 points) against the baseline, over the tasks both runs scored.
// Exit 2 when the runs are not comparable (model / k / skills differ, or no
// shared task). Infra-error samples are excluded from pass@ on both sides. A baseline with no pass@1 recorded
// passes with a notice; `--write-baseline` copies the run's summary into it.

import { readFileSync, writeFileSync } from 'node:fs';
import { compareToBaseline, type ResultsFile } from './metrics';
import { flagValue } from './runAgent';

export const DEFAULT_BASELINE = 'eval/results/baseline.json';
export const DEFAULT_THRESHOLD = 0.05;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** The baseline file a run becomes: its summary and per-task pass@1, no samples. */
export function toBaseline(r: ResultsFile, source: string): Record<string, unknown> {
  return {
    schema: r.schema,
    suite: r.suite,
    note: 'pass@1 baseline for eval/mech40/compare.ts; refresh with --write-baseline after an accepted run.',
    source,
    date: r.date,
    model: r.model,
    k: r.k,
    skills: r.skills,
    summary: r.summary,
    tasks: r.tasks.map((t) => ({ id: t.id, pass_at_1: t.pass_at_1, pass_at_k: t.pass_at_k })),
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const file = args.find((a, i) => !a.startsWith('--') && !['--baseline', '--threshold'].includes(args[i - 1]));
  if (!file) throw new Error('usage: compare.ts <results.json> [--baseline <file>] [--threshold 0.05] [--write-baseline]');
  const baselinePath = flagValue(args, '--baseline') ?? DEFAULT_BASELINE;
  const threshold = Number(flagValue(args, '--threshold') ?? DEFAULT_THRESHOLD);
  if (!(threshold >= 0 && threshold <= 1)) throw new Error('--threshold must be in [0, 1]');
  const current = readJson<ResultsFile>(file);
  if (args.includes('--write-baseline')) {
    writeFileSync(baselinePath, `${JSON.stringify(toBaseline(current, file), null, 2)}\n`);
    console.log(`wrote ${baselinePath} from ${file} (pass@1 ${current.summary.pass_at_1})`);
    return;
  }
  const verdict = compareToBaseline(current, readJson(baselinePath), threshold);
  for (const line of verdict.lines) console.log(line);
  const infra = current.summary.infra_errors ?? 0;
  if (infra > 0) console.log(`note: ${infra} sample(s) hit eval.infra-error and were left out of pass@ (not scored as failures)`);
  process.exit(verdict.ok ? 0 : verdict.refused ? 2 : 1);
}

const isEntrypoint = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isEntrypoint) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
}
