import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { initOcct } from '../../backends/occt/occtBackend';
import { runAndExport, type ExportFormat } from '../../script-runtime/export';
import { formatHuman } from '../../diagnostics/formatter';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface ExportInput {
  file: string;
  format: ExportFormat;
  out: string;
}

export interface ExportCliResult {
  exitCode: number;
  bytesWritten: number;
  diagnostics: CompilerDiagnostic[];
}

export async function exportScript(input: ExportInput): Promise<ExportCliResult> {
  await initOcct();
  const filePath = resolve(input.file);
  let code: string;
  try {
    code = await readFile(filePath, 'utf8');
  } catch (e) {
    return {
      exitCode: 2, bytesWritten: 0,
      diagnostics: [{
        target: 'export-occt', code: 'cli.file-read', severity: 'error',
        message: e instanceof Error ? e.message : String(e),
        hint: 'Check that the file path exists and is readable.',
      }],
    };
  }
  let result;
  try {
    result = await runAndExport({ code, fileName: filePath, format: input.format });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e, 'cli.export-exception');
    return {
      exitCode: 1, bytesWritten: 0,
      diagnostics: [diag],
    };
  }
  const fatal = result.diagnostics.filter(d => d.severity === 'error').length > 0;
  if (fatal || result.bytes.length === 0) {
    return { exitCode: 1, bytesWritten: 0, diagnostics: result.diagnostics };
  }
  const outPath = resolve(input.out);
  await writeFile(outPath, result.bytes);
  return { exitCode: 0, bytesWritten: result.bytes.length, diagnostics: result.diagnostics };
}

export function exportCommand(): Command {
  const cmd = new Command('export')
    .description('Export a .kcad.ts script to STL or STEP')
    .argument('<format>', 'stl | step')
    .argument('<file>', 'path to .kcad.ts script')
    .requiredOption('-o, --out <path>', 'output file path')
    .option('--json', 'emit diagnostics as JSON')
    .action(async (format: string, file: string, opts: { out: string; json?: boolean }) => {
      if (format !== 'stl' && format !== 'step') {
        console.error(`Unsupported format: ${format}. Use 'stl' or 'step'.`);
        process.exitCode = 2; return;
      }
      const r = await exportScript({ file, format: format as ExportFormat, out: opts.out });
      if (opts.json) {
        console.log(JSON.stringify({
          ok: r.exitCode === 0,
          bytesWritten: r.bytesWritten,
          out: opts.out,
          diagnostics: r.diagnostics,
        }, null, 2));
      } else {
        if (r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
        if (r.exitCode === 0) console.log(`Wrote ${r.bytesWritten} bytes to ${opts.out}`);
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}
