// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// examples/drawing-to-cad/run-drawing-to-cad.ts
//
// Runs the `drawing_to_cad` MCP tool on motor-mount-bracket.pdf, writes the
// rebuilt part to motor-mount-bracket.kcad.ts and its assumption ledger to
// motor-mount-bracket.ledger.json, and prints what was read, the fidelity
// verdict, and every ledger fact.
//
// Run:
//   npx tsx examples/drawing-to-cad/run-drawing-to-cad.ts
//
// See README.md in this directory for the expected output.

import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawingToCadTool } from '../../src/agent/mcp/tools/drawingToCad';

const here = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const r = await drawingToCadTool({
    path: join(here, 'motor-mount-bracket.pdf'),
    out: join(here, 'motor-mount-bracket.kcad.ts'),
  });
  console.log(`ok: ${r.ok}`);
  console.log(`sheet: scale ${r.sheet?.scale.text} (${r.sheet?.scale.source}), ${r.sheet?.units}, ${r.sheet?.projection}`);
  console.log(`views: ${r.views.map(v => `${v.name} (${v.identifiedBy})`).join(', ')}`);
  const rec = r.reconstruction;
  if (rec) {
    console.log(`build: ${rec.kind} of the ${rec.profileView} view along ${rec.axis.toUpperCase()}, ${rec.holeCount} hole(s), extents ${rec.extents.x} x ${rec.extents.y} x ${rec.extents.z} mm`);
  }
  console.log(`params: ${r.params.map(p => `${p.name}=${p.value}`).join(', ')}`);
  if (r.fidelity) {
    console.log(`fidelity: ${r.fidelity.verdict} — holes ${r.fidelity.holes.actual.join(', ')} mm; silhouette IoU ${r.fidelity.silhouettes.map(s => `${s.view} ${s.iou}`).join(', ')}`);
  }
  console.log(`ledger: ${r.ledger.facts.length} facts, ${r.ledger.unresolvedCount} open`);
  for (const f of r.ledger.facts) {
    console.log(`  ${f.resolution.padEnd(9)} ${f.kind.padEnd(8)} ${f.id}: ${f.statement}`);
  }
  for (const d of r.diagnostics) console.log(`diagnostic: ${d.severity} ${d.code}`);
  if (r.scriptPath) console.log(`wrote ${relative(process.cwd(), r.scriptPath)}`);
  if (r.ledgerPath) console.log(`wrote ${relative(process.cwd(), r.ledgerPath)}`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
