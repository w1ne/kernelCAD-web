// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/scripts/run-once.ts
//
// Run every monitor check once against prod from this machine and print the
// results. Anonymous and read-only (the same requests the Worker makes: one
// cube evaluate_script, one STEP export, an empty signup form). Checks run one
// after another to keep the rate low. No email, no D1.
//
//   npx tsx workers/uptime-monitor/scripts/run-once.ts

import { CHECKS, runCheck } from '../src/checks';

let failed = 0;
for (const def of CHECKS) {
  const r = await runCheck(def, (input, init) => fetch(input, init));
  if (!r.ok) failed++;
  const extra = r.detail
    ? ` commit=${r.detail.commit.slice(0, 12)} warm=${r.detail.warm} kills=${r.detail.kills} ` +
      `respawns=${r.detail.respawns} rssMb=[${r.detail.rssMb.join(',')}]`
    : '';
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${def.id.padEnd(16)} ${String(r.latencyMs).padStart(6)} ms${extra}${r.error ? `  ${r.error}` : ''}`);
}
console.log(`${CHECKS.length - failed}/${CHECKS.length} passed`);
process.exitCode = failed ? 1 : 0;
