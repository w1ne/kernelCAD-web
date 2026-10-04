// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/usecaseSuite.ts
//
// Regression suite for the typical use cases (eval/tasks/usecase-*): run each
// task's expert solution through its own harness and require EVERY gate and
// scored check to pass. The harness is the same one the agent evals score
// with, so a kernel, export or API change that breaks a job our users do
// every day fails CI here instead of in front of a user.
//
// A check that fails today because of a known open bug is listed in `open`
// with a link to the finding. It runs as `it.fails`: the suite stays green,
// and the day the fix lands the test flips red so the entry gets removed.
// Split across several test files for CI shard balance (per-file sharding).

import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'node:path';
import type { HarnessResult } from './types';

export interface UsecaseTask {
  id: string;
  /** Check name → link to the open finding that makes it fail today. */
  open?: Record<string, string>;
  /** Build + checks budget when a case is heavier than the default. */
  budgetMs?: number;
}

/** Per-task budget: build + checks + every export, on a CI runner. */
const TASK_BUDGET_MS = 240_000;

export function defineUsecaseSuite(tasks: readonly UsecaseTask[]): void {
  for (const t of tasks) {
    describe(`typical use case ${t.id}`, () => {
      const dir = join(__dirname, 'tasks', t.id);
      let result: HarnessResult;

      beforeAll(async () => {
        const mod = (await import(join(dir, 'harness.ts'))) as {
          default: (scriptPath: string) => Promise<HarnessResult>;
        };
        result = await mod.default(join(dir, 'solution-expert.kcad.ts'));
      }, t.budgetMs ?? TASK_BUDGET_MS);

      it('expert solution passes every check', () => {
        const open = new Set(Object.keys(t.open ?? {}));
        const checks = { ...result.gates, ...result.scored };
        const failing = Object.entries(checks)
          .filter(([name, pass]) => !pass && !open.has(name))
          .map(([name]) => name);
        expect(failing).toEqual([]);
        // An open entry must name a real check, or it silently guards nothing.
        for (const name of open) expect(Object.keys(checks)).toContain(name);
      });

      for (const [name, link] of Object.entries(t.open ?? {})) {
        it.fails(`open: ${name} (${link})`, () => {
          expect({ ...result.gates, ...result.scored }[name]).toBe(true);
        });
      }
    });
  }
}
