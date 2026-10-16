// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/mech40/tasks.ts — discover the mech40 task set and run its harnesses.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { HarnessResult } from '../types';

export const MECH40_DIR = fileURLToPath(new URL('../tasks/mech40', import.meta.url));

export interface Mech40Task {
  id: string;
  dir: string;
  prompt: string;
  harness: string;
  solution: string;
}

/** Every task dir with prompt.md + harness.ts + solution-expert.kcad.ts, sorted. */
export function listMech40Tasks(root: string = MECH40_DIR, filter?: readonly string[]): Mech40Task[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((id) => statSync(join(root, id)).isDirectory())
    .filter((id) => filter === undefined || filter.length === 0 || filter.includes(id))
    .sort()
    .map((id) => ({
      id,
      dir: join(root, id),
      prompt: join(root, id, 'prompt.md'),
      harness: join(root, id, 'harness.ts'),
      solution: join(root, id, 'solution-expert.kcad.ts'),
    }))
    .filter((t) => existsSync(t.prompt) && existsSync(t.harness) && existsSync(t.solution));
}

type HarnessFn = ((scriptPath: string) => Promise<HarnessResult>) & { open?: Readonly<Record<string, string>> };

async function loadHarness(task: Mech40Task): Promise<HarnessFn> {
  return ((await import(pathToFileURL(task.harness).href)) as { default: HarnessFn }).default;
}

/** Run a task's harness against a script. */
export async function runHarness(task: Mech40Task, scriptPath: string): Promise<HarnessResult> {
  return (await loadHarness(task))(scriptPath);
}

/** The task's open (known-bug) checks, name → finding. */
export async function openChecks(task: Mech40Task): Promise<Readonly<Record<string, string>>> {
  return (await loadHarness(task)).open ?? {};
}

/** Names of the gates and checks that failed (empty = the script passes). */
export function failingChecks(r: HarnessResult): string[] {
  return Object.entries({ ...r.gates, ...r.scored }).filter(([, ok]) => !ok).map(([name]) => name);
}
