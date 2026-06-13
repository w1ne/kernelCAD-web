// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/parts.ts
//
// `kernelcad parts <file>` — list solved-assembly parts with exact bbox,
// volume, surface area, and export-mesh triangle count. Backed by
// `listPartStats` so the MCP list_part_stats tool shares the same numbers.

import { Command } from 'commander';
import { dirname } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { listPartStats, type PartStats } from '../../script-runtime/partStats';
import { formatHuman } from '../../../shared/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';
import { readScriptOrDiagnostic } from '../lib/readScript';

export interface PartsCliInput {
  file: string;
}

export interface PartsCliResult {
  exitCode: number;
  parts: PartStats[];
  diagnostics: CompilerDiagnostic[];
}

export async function partsScript(input: PartsCliInput): Promise<PartsCliResult> {
  await initOcct();
  const read = await readScriptOrDiagnostic(input.file);
  if (!read.ok) {
    return { exitCode: 2, parts: [], diagnostics: read.diagnostics };
  }
  const { filePath, code } = read;
  let r;
  try {
    r = await listPartStats({ code, fileName: filePath, scriptDir: dirname(filePath) });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e, 'cli.export-exception');
    return { exitCode: 1, parts: [], diagnostics: [diag] };
  }
  const fatal = r.diagnostics.some(d => d.severity === 'error');
  return {
    exitCode: fatal ? 1 : 0,
    parts: r.parts,
    diagnostics: withNextActions(r.diagnostics),
  };
}

export function partsCommand(): Command {
  return new Command('parts')
    .description('List solved-assembly parts with exact bbox, volume, surface area, and triangle count')
    .argument('<file>', 'path to .kcad.ts script')
    .option('--json', 'emit machine-readable JSON')
    .action(async (file: string, opts: { json?: boolean }) => {
      const r = await partsScript({ file });
      if (opts.json) {
        console.log(JSON.stringify({
          ok: r.exitCode === 0,
          parts: r.parts,
          diagnostics: r.diagnostics,
        }, null, 2));
      } else {
        if (r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
        for (const p of r.parts) {
          console.log(
            `${p.name}  bbox [${p.bbox.min.map(n => n.toFixed(2)).join(', ')}] .. ` +
            `[${p.bbox.max.map(n => n.toFixed(2)).join(', ')}]` +
            `  vol ${p.volumeMm3.toFixed(1)} mm^3  area ${p.surfaceAreaMm2.toFixed(1)} mm^2` +
            `  tris ${p.triangleCount}`,
          );
        }
      }
      process.exitCode = r.exitCode;
    });
}
