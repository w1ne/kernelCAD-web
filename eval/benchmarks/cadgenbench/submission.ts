// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/submission.ts
//
// Submission layout and zip, per the benchmark's submission contract
// (docs/benchmark/submission.md in the benchmark repo):
//
//   submission.zip
//   ├── meta.json          submitter_name, submission_name, agent_url, notes, agree_to_publish
//   ├── 101/output.step
//   ├── 102/               a task without a candidate keeps its (empty) folder:
//   └── ...                the grader records it as `missing` and scores it 0
//
// `agree_to_publish` stays false unless the caller sets it; the harness never
// uploads anything. Submitting is a separate, manual decision.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

export const CANDIDATE_NAME = 'output.step';

export interface SubmissionMeta {
  submitter_name: string;
  submission_name: string;
  agent_url: string | null;
  notes: string | null;
  agree_to_publish: boolean;
}

/** `<runDir>/submission/<taskId>` — one folder per task. */
export function taskSubmissionDir(runDir: string, taskId: string): string {
  return join(runDir, 'submission', taskId);
}

/** Where a task's accepted candidate lives. */
export function candidatePath(runDir: string, taskId: string): string {
  return join(taskSubmissionDir(runDir, taskId), CANDIDATE_NAME);
}

export function hasCandidate(runDir: string, taskId: string): boolean {
  const p = candidatePath(runDir, taskId);
  return existsSync(p) && statSync(p).size > 0;
}

export interface ZipReport {
  zipPath: string;
  tasks: number;
  withCandidate: number;
  missing: string[];
}

/**
 * Zip `<runDir>/submission/` into `zipPath`. Every id in `taskIds` gets a
 * folder entry; ids with a candidate also get `<id>/output.step`.
 */
export function buildSubmissionZip(runDir: string, taskIds: string[], meta: SubmissionMeta, zipPath: string): ZipReport {
  if (meta.notes !== null && meta.notes.length > 500) {
    throw new Error('meta.notes must be at most 500 characters');
  }
  const entries: Zippable = { 'meta.json': strToU8(JSON.stringify(meta, null, 2) + '\n') };
  const missing: string[] = [];
  for (const id of [...taskIds].sort()) {
    // An explicit directory entry keeps a candidate-less folder after extraction.
    entries[`${id}/`] = new Uint8Array(0);
    if (hasCandidate(runDir, id)) {
      entries[`${id}/${CANDIDATE_NAME}`] = new Uint8Array(readFileSync(candidatePath(runDir, id)));
    } else {
      missing.push(id);
    }
  }
  mkdirSync(dirname(zipPath), { recursive: true });
  writeFileSync(zipPath, zipSync(entries, { level: 6 }));
  return { zipPath, tasks: taskIds.length, withCandidate: taskIds.length - missing.length, missing };
}

/** List a zip's entry names (sorted). Used by tests and the run summary. */
export function listZipEntries(zipPath: string): string[] {
  return Object.keys(unzipSync(new Uint8Array(readFileSync(zipPath)))).sort();
}

/** Task ids that have a folder under `<runDir>/submission/`. */
export function submissionTaskIds(runDir: string): string[] {
  const dir = join(runDir, 'submission');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory()).sort();
}
