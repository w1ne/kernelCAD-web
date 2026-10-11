#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/mech40/selfCheck.ts — run every mech40 expert solution through its own
// checker. `npx tsx eval/mech40/selfCheck.ts [task-id ...]`. Exit 1 on a failure.
import { failingChecks, listMech40Tasks, runHarness } from './tasks';

async function main(): Promise<void> {
  const tasks = listMech40Tasks(undefined, process.argv.slice(2));
  let passed = 0;
  for (const t of tasks) {
    const start = Date.now();
    const failing = failingChecks(await runHarness(t, t.solution));
    const secs = ((Date.now() - start) / 1000).toFixed(1);
    if (failing.length === 0) passed += 1;
    console.log(`${failing.length === 0 ? 'PASS' : 'FAIL'} ${t.id} (${secs}s)${failing.length ? `: ${failing.join('; ')}` : ''}`);
  }
  console.log(`\n${passed}/${tasks.length} reference solutions pass their checker`);
  process.exit(passed === tasks.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
