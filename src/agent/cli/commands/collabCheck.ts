// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `kernelcad collab check` — the local gate for agents working in separate git
// worktrees/branches. Composition: capture base/head/yours → lift the
// change-set → merge onto head → footprint → gate the merged candidate.
//
// Exit 0 = pass, 1 = conflict or reject. Sources come from `git show <ref>:<path>`
// or from a directory containing the file (`--yours <dir>`).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { Command } from 'commander';
import { buildModel } from '../../../modeling/buildModel';
import { evaluateRequirementsOnModel } from '../../../modeling/requirements/evaluate';
import { captureFeatureGraph } from '../../../collab/featureGraph';
import { liftChangeSet } from '../../../collab/changeSet';
import { mergeChangeSet } from '../../../collab/merge';
import { footprint } from '../../../collab/footprint';
import { gateCandidate } from '../../../collab/gate';
import type {
  CollabConflict,
  EvaluatedRevision,
  GateVerdict,
  MergeResult,
} from '../../../collab/types';

export interface CollabCheckInput {
  file: string;
  base: string;
  head: string;
  yours: string;
  out?: string;
  json?: boolean;
}

export interface CollabCheckReport {
  status: 'pass' | 'conflict' | 'reject' | 'error';
  merge?: MergeResult;
  gate?: GateVerdict;
  error?: string;
}

export interface CollabCheckResult {
  exitCode: 0 | 1;
  report: CollabCheckReport;
  mergedSource?: string;
  message: string;
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repoRelative(cwd: string, file: string): string {
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  const path = relative(root, resolve(cwd, file));
  if (path.startsWith('..') || path.length === 0) {
    throw new Error(`--file must be inside the git repository (${root}): ${file}`);
  }
  return path.split(sep).join('/');
}

function show(cwd: string, ref: string, path: string): string {
  return execFileSync('git', ['show', `${ref}:${path}`], { cwd, encoding: 'utf8' });
}

function yoursSource(cwd: string, yours: string, file: string, gitPath: string): {
  source: string;
  fileName: string;
  scriptDir: string;
} {
  const candidate = resolve(cwd, yours);
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const chosen = resolve(candidate, basename(file));
    if (!existsSync(chosen)) throw new Error(`--yours directory has no ${basename(file)}: ${candidate}`);
    return { source: readFileSync(chosen, 'utf8'), fileName: basename(file), scriptDir: dirname(chosen) };
  }
  return {
    source: show(cwd, yours, gitPath),
    fileName: basename(file),
    scriptDir: dirname(resolve(cwd, file)),
  };
}

async function evaluateRevision(source: string, fileName: string, scriptDir: string): Promise<EvaluatedRevision> {
  const model = await buildModel({ code: source, fileName, scriptDir });
  const ledger = evaluateRequirementsOnModel(model);
  const features = new Map<string, 'ok' | 'error'>();
  for (const record of model.records) {
    features.set(record.id, model.health.get(record.id) === 'error' ? 'error' : 'ok');
  }
  return { revision: 1, features, requirements: ledger.entries, selections: model.selections };
}

function formatConflicts(conflicts: readonly CollabConflict[]): string {
  return conflicts.map((conflict) => `  ${conflict.code}: ${JSON.stringify(conflict)}`).join('\n');
}

export async function runCollabCheck(input: CollabCheckInput, cwd: string = process.cwd()): Promise<CollabCheckResult> {
  try {
    const gitPath = repoRelative(cwd, input.file);
    const baseSource = show(cwd, input.base, gitPath);
    const headSource = show(cwd, input.head, gitPath);
    const yours = yoursSource(cwd, input.yours, input.file, gitPath);
    const fileName = yours.fileName;
    const scriptDir = yours.scriptDir;

    const base = await captureFeatureGraph(baseSource, { fileName, scriptDir });
    const head = await captureFeatureGraph(headSource, { fileName, scriptDir });
    const yoursGraph = await captureFeatureGraph(yours.source, { fileName, scriptDir });
    const changeSet = liftChangeSet(base, yoursGraph, {
      baseRevision: 0,
      agentId: 'cli',
      idempotencyKey: `cli:${input.base}:${input.head}:${input.yours}:${gitPath}`,
    });

    const merge = await mergeChangeSet({
      baseSource,
      headSource,
      yoursSource: yours.source,
      base,
      head,
      yours: changeSet,
    });
    if (merge.status === 'conflict') {
      const report: CollabCheckReport = { status: 'conflict', merge };
      return {
        exitCode: 1,
        report,
        message: `collab check: CONFLICT\n${formatConflicts(merge.conflicts)}`,
      };
    }

    const fp = footprint(changeSet, head);
    const headRevision = await evaluateRevision(headSource, fileName, scriptDir);
    const gate = await gateCandidate(
      { head: headRevision, candidateSource: merge.source, footprint: fp },
      { evaluate: async (source) => evaluateRevision(source, fileName, scriptDir) },
    );
    if (gate.status === 'reject') {
      const report: CollabCheckReport = { status: 'reject', merge, gate };
      return {
        exitCode: 1,
        report,
        message: `collab check: REJECT\n${gate.reasons.map((reason) => `  ${reason.code}: ${JSON.stringify(reason)}`).join('\n')}`,
      };
    }

    if (input.out !== undefined) {
      writeFileSync(resolve(cwd, input.out), merge.source);
    }
    const report: CollabCheckReport = { status: 'pass', merge, gate };
    return {
      exitCode: 0,
      report,
      mergedSource: merge.source,
      message: `collab check: PASS (rebased: ${merge.rebased ? 'yes' : 'no'})${input.out !== undefined ? ` → ${input.out}` : ''}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, report: { status: 'error', error: message }, message: `collab check: ERROR\n  ${message}` };
  }
}

export function collabCheckCommand(): Command {
  const collab = new Command('collab').description('Collaborative edit checks for separate agent branches/worktrees.');
  collab
    .command('check')
    .description('Merge your edit onto head and gate the merged candidate against head requirements.')
    .requiredOption('--file <path>', 'model file, relative to the current directory')
    .requiredOption('--base <ref>', 'revision your edit started from')
    .requiredOption('--head <ref>', 'current head revision')
    .requiredOption('--yours <ref|dir>', 'your branch/ref, or a directory containing the model file')
    .option('--out <path>', 'write the merged source here on pass')
    .option('--json', 'print the MergeResult/GateVerdict as JSON')
    .action(async (opts: CollabCheckInput) => {
      const result = await runCollabCheck(opts);
      if (opts.json) process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
      else process.stdout.write(`${result.message}\n`);
      process.exitCode = result.exitCode;
    });
  return collab;
}
