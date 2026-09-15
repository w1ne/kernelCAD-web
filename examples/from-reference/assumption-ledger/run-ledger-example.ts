// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// examples/from-reference/assumption-ledger/run-ledger-example.ts
//
// Runnable example for the trace_from_image assumption ledger +
// resolve_assumptions MCP tool. Exercises the real orchestrator (no stubs)
// against reference-square.png (the same uniform-bg opencv-path fixture used
// by src/agent/vision/orchestrator.test.ts), so it needs no ANTHROPIC_API_KEY.
//
// Run:
//   npx tsx examples/from-reference/assumption-ledger/run-ledger-example.ts
//
// See README.md in this directory for the expected output.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { traceFromImage } from '../../../src/agent/vision/index';
import { resolveAssumptionsTool } from '../../../src/agent/mcp/tools/resolveAssumptions';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imageUrl = `file://${join(__dirname, 'reference-square.png')}`;
const ledgerPath = join(__dirname, 'bracket-from-trace.ledger.json');

async function main() {
  console.log('--- Step 1: trace without a scale anchor ---');
  const traced = await traceFromImage({
    imageUrl,
    features: [{ label: 'silhouette', kind: 'silhouette' }],
    backend: 'opencv',
  });
  console.log('ok:', traced.ok);
  console.log('unresolvedCount:', traced.ledger.unresolvedCount);
  for (const fact of traced.ledger.facts) {
    console.log(`  fact ${fact.id}: kind=${fact.kind} confidence=${fact.confidence} resolution=${fact.resolution}`);
  }
  console.log('diagnostics:', traced.diagnostics.map((d) => `${d.severity}:${d.code}`));

  const { writeFile } = await import('node:fs/promises');
  await writeFile(ledgerPath, JSON.stringify(traced.ledger, null, 2) + '\n', 'utf8');
  console.log(`\nledger persisted to ${ledgerPath}`);

  console.log('\n--- Step 2: resolve the open scale fact ---');
  const resolved = await resolveAssumptionsTool({
    ledgerPath,
    resolutions: [{ id: 'scale', value: 0.1548 }],
  });
  console.log('ok:', resolved.ok);
  console.log('unresolvedCount:', resolved.ledger?.unresolvedCount);
  console.log('paramOverrides:', resolved.paramOverrides);

  console.log('\n--- Step 3: retrace with the scale anchor supplied up front ---');
  const groundedTrace = await traceFromImage({
    imageUrl,
    features: [{ label: 'silhouette', kind: 'silhouette' }],
    backend: 'opencv',
    scaleAnchor: { pixelDistance: 100, realDistance: 15.48, unit: 'mm' },
  });
  console.log('ok:', groundedTrace.ok);
  console.log('unresolvedCount:', groundedTrace.ledger.unresolvedCount);
  console.log('scale:', groundedTrace.ledger.scale);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
