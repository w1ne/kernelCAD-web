// src/agent/cli/commands/parts.ts
//
// `kernelcad parts <file>` — list solved-assembly parts with exact bbox,
// volume, surface area, and export-mesh triangle count. Backed by
// `listPartStats` so the MCP list_part_stats tool shares the same numbers.

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { listPartStats, type PartStats } from '../../script-runtime/partStats';
import { formatHuman } from '../../../shared/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

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
  const filePath = resolve(input.file);
  let code: string;
  try {
    code = await readFile(filePath, 'utf8');
  } catch (e) {
    return {
      exitCode: 2, parts: [],
      diagnostics: withNextActions([{
        target: 'export-occt', code: 'cli.file-read', severity: 'error',
        message: e instanceof Error ? e.message : String(e),
        hint: 'Check that the file path exists and is readable.',
      }]),
    };
  }
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
