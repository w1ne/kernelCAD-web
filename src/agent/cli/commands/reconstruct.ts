// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/reconstruct.ts
//
// `kernelcad reconstruct <mesh> [-o out.kcad.ts]` — the CLI face of the
// `mesh_to_features` MCP tool: STL / OBJ / 3MF → editable .kcad.ts feature
// tree, verified against the mesh (volume IoU + surface deviation).
//
// Exit codes: 0 on a reconstruction (any verdict), 1 when --strict and the
// verdict is not `faithful`, 2 on unreadable input or a script that never
// evaluated.

import { Command } from 'commander';
import { formatHuman } from '../../../shared/diagnostics/formatter';
import { meshToFeaturesTool } from '../../mcp/tools/meshToFeatures';

export interface ReconstructCliInput {
  file: string;
  out?: string;
  json: boolean;
  strict: boolean;
  minIoU?: number;
  maxDeviationMm?: number;
  maxPasses?: number;
}

export async function runReconstructCli(input: ReconstructCliInput): Promise<{ exitCode: number }> {
  const r = await meshToFeaturesTool({
    file: input.file,
    out: input.out,
    minIoU: input.minIoU,
    maxDeviationMm: input.maxDeviationMm,
    maxPasses: input.maxPasses,
  });
  if (input.json) {
    console.log(JSON.stringify(r, null, 2));
  } else if (!r.ok) {
    console.error(r.error);
    if (r.diagnostics.length > 0) console.error(formatHuman(r.diagnostics));
  } else {
    const f = r.fidelity;
    console.log(
      `verdict: ${f.verdict}  volumeIoU=${f.volumeIoU.toFixed(4)}  maxDeviationMm=${f.maxDeviationMm.toFixed(3)}  rmsMm=${f.rmsMm.toFixed(3)}` +
        `  (faithful needs IoU >= ${f.thresholds.minIoU}, max dev <= ${f.thresholds.maxDeviationMm} mm; pass ${f.pass})`,
    );
    const holes = r.features.holes.map((h) => `${h.name} ${h.count}x Ø${h.diameterMm} ${h.kind}${h.counterbore ? ` cb Ø${h.counterbore.diameterMm}x${h.counterbore.depthMm}` : ''}`);
    const fillets = r.features.fillets.map((f) => `R${f.radiusMm} x${f.edges} edges`);
    console.log(`body: ${r.features.body} (${r.features.bodyBlocks})  holes: ${holes.length > 0 ? holes.join(', ') : 'none'}  fillets: ${fillets.length > 0 ? fillets.join(', ') : 'none'}  cutouts: ${r.features.cutouts}  boolean remainders: ${r.features.booleanRemainders}`);
    console.log(`params: ${r.features.params.map((p) => `${p.name}=${p.value}`).join(', ')}`);
    console.log(`mesh: ${r.mesh.triangles} triangles, watertight=${r.mesh.watertight}; unmatched regions: ${r.unmatchedRegions.length}; open ledger facts: ${r.ledger.unresolvedCount}`);
    if (r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
    if (r.written) console.log(`wrote ${r.written.script}\nwrote ${r.written.ledger}`);
    else console.log(r.script);
  }
  if (!r.ok) return { exitCode: 2 };
  return { exitCode: input.strict && r.fidelity.verdict !== 'faithful' ? 1 : 0 };
}

export function reconstructCommand(): Command {
  return new Command('reconstruct')
    .description('Rebuild an editable .kcad.ts feature tree from an STL/OBJ/3MF mesh and verify it against the mesh')
    .argument('<mesh>', 'path to a .stl, .obj or .3mf file')
    .option('-o, --out <file>', 'write the script here (the ledger goes to the sibling .ledger.json); default prints the script')
    .option('--json', 'print the full result as JSON')
    .option('--strict', 'exit 1 unless the verdict is faithful')
    .option('--min-iou <n>', 'volume IoU a faithful verdict requires (default 0.98)', (v) => parseFloat(v))
    .option('--max-deviation <mm>', 'max surface deviation a faithful verdict allows', (v) => parseFloat(v))
    .option('--passes <n>', 'refinement passes, 1-4 (default 4)', (v) => parseInt(v, 10))
    .action(async (mesh: string, opts: { out?: string; json?: boolean; strict?: boolean; minIou?: number; maxDeviation?: number; passes?: number }) => {
      const r = await runReconstructCli({
        file: mesh,
        out: opts.out,
        json: opts.json ?? false,
        strict: opts.strict ?? false,
        minIoU: opts.minIou,
        maxDeviationMm: opts.maxDeviation,
        maxPasses: opts.passes,
      });
      process.exitCode = r.exitCode;
    });
}
