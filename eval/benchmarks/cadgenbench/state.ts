// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/state.ts
//
// Per-task resume state: `<runDir>/tasks/<id>/state.json`, written atomically
// (tmp file + rename) so a killed run never leaves a half-written record.
//
// A task is finished when it reached a terminal status. `valid` is always
// skipped on resume; `invalid` and `failed` are skipped unless the caller
// asks to retry them; `needs_key` and `infra_error` always rerun, because
// they say nothing about the model, only about the environment. A task
// finished by a different producer (passthrough vs LLM) also reruns.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TaskType } from './dataset';

export type TaskStatus =
  /** Candidate written and it passed the validity pre-check. */
  | 'valid'
  /** Candidate written but it failed the pre-check even after repair. */
  | 'invalid'
  /** No candidate: the model never produced a script that evaluates and exports. */
  | 'failed'
  /** The step needs an LLM and no API key is configured. */
  | 'needs_key'
  /** Harness or tool crash; not a verdict on the model. */
  | 'infra_error';

export interface TaskState {
  id: string;
  type: TaskType;
  status: TaskStatus;
  /** How the candidate was produced. */
  mode: 'llm' | 'scripts-from' | 'passthrough' | 'none';
  model?: string;
  /** Set when an editing task submitted its unchanged input because no edit passed the gate. */
  fallback?: 'passthrough';
  attempts: number;
  /** True when the one post-loop repair iteration ran. */
  repaired: boolean;
  tokensIn: number;
  tokensOut: number;
  /** Estimated spend, when per-MTok prices were given. */
  costUsd: number | null;
  wallMs: number;
  precheck?: { valid: boolean; errors: string[]; faceCount: number; solidCount: number };
  /** Result of the benchmark's own validity gate, when `--official-check` ran. */
  official?: { valid: boolean; detail: string };
  error?: string;
  updatedAt: string;
}

export function taskWorkDir(runDir: string, id: string): string {
  return join(runDir, 'tasks', id);
}

export function writeTaskState(runDir: string, state: TaskState): void {
  const dir = taskWorkDir(runDir, state.id);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, 'state.json');
  writeFileSync(`${target}.tmp`, JSON.stringify(state, null, 2) + '\n');
  renameSync(`${target}.tmp`, target);
}

/** Null when absent or unreadable — the caller reruns the task. */
export function readTaskState(runDir: string, id: string): TaskState | null {
  const path = join(taskWorkDir(runDir, id), 'state.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as TaskState;
  } catch {
    return null;
  }
}

/**
 * True when a resumed run should skip this task. With `mode`, a task finished
 * by a different producer (e.g. a no-LLM passthrough) is rerun.
 */
export function isFinished(
  state: TaskState | null,
  opts: { retryFailed?: boolean; mode?: TaskState['mode'] } = {},
): boolean {
  if (state === null) return false;
  if (opts.mode !== undefined && state.mode !== opts.mode) return false;
  if (state.status === 'valid') return true;
  if (state.status === 'invalid' || state.status === 'failed') return !opts.retryFailed;
  return false;
}
