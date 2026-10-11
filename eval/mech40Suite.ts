// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/mech40Suite.ts
//
// Regression suite for the mech40 mechanical agent eval (eval/tasks/mech40):
// run each task's expert reference solution through its own checker and
// require every gate and scored check to pass. A checker that cannot pass
// its own reference is a broken task, and a kernel change that breaks a
// reference fails CI here before it skews an agent run.
//
// Checks a task lists as `open` (a known kernel bug) are reported in the
// harness metrics as `open: <name>`; the suite asserts each still fails, so
// it turns red the day the bug is fixed and the check can become a normal one.
// Split across several test files for CI shard balance.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { HarnessResult } from './types';
import { listMech40Tasks, openChecks, runHarness, failingChecks } from './mech40/tasks';

/** Build + checks + STEP export budget per task on a CI runner. */
const TASK_BUDGET_MS = 240_000;

export function defineMech40Suite(ids: readonly string[]): void {
  const tasks = listMech40Tasks(undefined, ids);
  it('every listed task exists', () => {
    expect(tasks.map((t) => t.id)).toEqual([...ids].sort());
  });
  for (const t of tasks) {
    describe(`mech40 ${t.id}`, () => {
      let result: HarnessResult;

      beforeAll(async () => {
        result = await runHarness(t, t.solution);
      }, TASK_BUDGET_MS);

      it('the prompt states concrete dimensions', () => {
        const prompt = readFileSync(t.prompt, 'utf8');
        expect(prompt).toMatch(/^# /);
        expect(prompt).toMatch(/\d+(\.\d+)? ?mm/);
      });

      it('the reference solution passes every check', () => {
        expect(failingChecks(result)).toEqual([]);
        expect(Object.keys(result.scored).length).toBeGreaterThan(1);
      });

      it('open (known-bug) checks: each still fails — drop it from `open` when it passes', async () => {
        const open = await openChecks(t);
        for (const [name, finding] of Object.entries(open)) {
          expect(result.metrics?.[`open: ${name}`], `${name} now passes (${finding}); make it a normal check`).toBe(false);
        }
      });
    });
  }
}
