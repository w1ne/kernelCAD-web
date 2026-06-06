import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import {
  runAndExport,
  runAndExportParts,
  stlNotWatertightDiagnostic,
  type ExportFormat,
} from '../../script-runtime/export';
import { formatHuman } from '../../../shared/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface ExportInput {
  file: string;
  format: ExportFormat;
  out: string;
  /** Watertight verify gate for STL; default-on (`--no-verify` to skip). */
  verify?: boolean;
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
      diagnostics: withNextActions([{
        target: 'export-occt', code: 'cli.file-read', severity: 'error',
        message: e instanceof Error ? e.message : String(e),
        hint: 'Check that the file path exists and is readable.',
      }]),
    };
  }
  let result;
  try {
    result = await runAndExport({
      code,
      fileName: filePath,
      format: input.format,
      scriptDir: dirname(filePath),
      ...(input.format === 'stl' && input.verify === false
        ? { options: { format: 'stl' as const, verify: false } }
        : {}),
    });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e, 'cli.export-exception');
    return {
      exitCode: 1, bytesWritten: 0,
      diagnostics: [diag],
    };
  }
  const fatal = result.diagnostics.filter(d => d.severity === 'error').length > 0;
  if (fatal || result.bytes.length === 0) {
    return { exitCode: 1, bytesWritten: 0, diagnostics: withNextActions(result.diagnostics) };
  }
  const outPath = resolve(input.out);
  await writeFile(outPath, result.bytes);
  return { exitCode: 0, bytesWritten: result.bytes.length, diagnostics: withNextActions(result.diagnostics) };
}

export interface ExportPartsCliInput {
  file: string;
  /** Part names to export; omit for all parts. */
  parts?: string[];
  /** Output directory for multi-part mode (`--parts all`, repeated `--part`). */
  outDir?: string;
  /** Output file path for single `--part NAME` mode. */
  outFile?: string;
  /** Watertight verify gate; default-on (`--no-verify` to skip). */
  verify: boolean;
}

export interface WrittenPart {
  name: string;
  path: string;
  triangleCount: number;
  watertight: boolean;
}

export interface ExportPartsCliResult {
  exitCode: number;
  written: WrittenPart[];
  diagnostics: CompilerDiagnostic[];
}

/**
 * Per-part STL export: run the script, resolve the returned Scene into
 * world-frame parts, write one binary STL per selected part. Files are
 * written even when a part fails the watertight gate (so the bad mesh can
 * be inspected), but the gate still fails the command with
 * `export.mesh.not-watertight` unless `verify` is false.
 */
export async function exportPartsScript(input: ExportPartsCliInput): Promise<ExportPartsCliResult> {
  await initOcct();
  const filePath = resolve(input.file);
  let code: string;
  try {
    code = await readFile(filePath, 'utf8');
  } catch (e) {
    return {
      exitCode: 2, written: [],
      diagnostics: withNextActions([{
        target: 'export-occt', code: 'cli.file-read', severity: 'error',
        message: e instanceof Error ? e.message : String(e),
        hint: 'Check that the file path exists and is readable.',
      }]),
    };
  }
  let result;
  try {
    result = await runAndExportParts({
      code,
      fileName: filePath,
      scriptDir: dirname(filePath),
      ...(input.parts !== undefined ? { parts: input.parts } : {}),
    });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e, 'cli.export-exception');
    return { exitCode: 1, written: [], diagnostics: [diag] };
  }
  const fatal = result.diagnostics.some(d => d.severity === 'error');
  if (fatal || result.parts.length === 0) {
    return { exitCode: 1, written: [], diagnostics: withNextActions(result.diagnostics) };
  }

  // Single `--part NAME -o file.stl` writes one file; everything else
  // (`--parts all`, repeated `--part`) writes `<outDir>/<fileSafeName>.stl`.
  const singleFile = result.parts.length === 1 && input.outFile !== undefined
    ? resolve(input.outFile)
    : undefined;
  let outDir: string | undefined;
  if (singleFile === undefined) {
    outDir = resolve(input.outDir ?? input.outFile ?? '.');
    await mkdir(outDir, { recursive: true });
  }

  const written: WrittenPart[] = [];
  const diagnostics: CompilerDiagnostic[] = [...result.diagnostics];
  for (const p of result.parts) {
    const path = singleFile ?? join(outDir!, `${p.fileSafeName}.stl`);
    await writeFile(path, p.bytes);
    written.push({ name: p.name, path, triangleCount: p.triangleCount, watertight: p.report.ok });
    if (input.verify && !p.report.ok) {
      diagnostics.push(stlNotWatertightDiagnostic(p.report, undefined, p.name));
    }
  }
  const gateFailed = input.verify && written.some(w => !w.watertight);
  return { exitCode: gateFailed ? 1 : 0, written, diagnostics: withNextActions(diagnostics) };
}

function collectParts(value: string, prev: string[]): string[] {
  return [...prev, value];
}

const SUPPORTED_FORMATS = new Set<ExportFormat>([
  'stl', 'step', 'dxf', '3mf', 'glb', 'urdf', 'srdf', 'sdf-gazebo',
]);

export function exportCommand(): Command {
  const cmd = new Command('export')
    .description('Export a .kcad.ts script to STL, STEP, DXF, 3MF, or GLB')
    .argument('<format>', 'stl | step | dxf | 3mf | glb | urdf | srdf | sdf-gazebo')
    .argument('<file>', 'path to .kcad.ts script')
    .requiredOption('-o, --out <path>', 'output file path (directory for --parts all)')
    .option('--part <name>', 'export a single named assembly part (STL only); repeat for a subset', collectParts, [] as string[])
    .option('--parts <all>', "export every assembly part as <out-dir>/<part>.stl (value must be 'all')")
    .option('--no-verify', 'skip the watertight verify gate after STL export')
    .option('--json', 'emit diagnostics as JSON')
    .action(async (format: string, file: string, opts: {
      out: string; json?: boolean; part?: string[]; parts?: string; verify?: boolean;
    }) => {
      if (!SUPPORTED_FORMATS.has(format as ExportFormat)) {
        console.error(`Unsupported format: ${format}. Use one of ${[...SUPPORTED_FORMATS].join(', ')}.`);
        process.exitCode = 2; return;
      }
      const partMode = (opts.part?.length ?? 0) > 0 || opts.parts !== undefined;
      if (partMode) {
        if (format !== 'stl') {
          console.error('--part/--parts are only supported for stl exports.');
          process.exitCode = 2; return;
        }
        if (opts.parts !== undefined && opts.parts !== 'all') {
          console.error("--parts only accepts 'all'. Use repeated --part <name> for a subset.");
          process.exitCode = 2; return;
        }
        const r = await exportPartsScript({
          file,
          ...(opts.parts === 'all' ? {} : { parts: opts.part }),
          ...(opts.parts === 'all' ? { outDir: opts.out } : { outFile: opts.out }),
          verify: opts.verify !== false,
        });
        if (opts.json) {
          console.log(JSON.stringify({
            ok: r.exitCode === 0,
            parts: r.written,
            diagnostics: r.diagnostics,
          }, null, 2));
        } else {
          if (r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
          for (const w of r.written) {
            const gate = w.watertight ? 'watertight' : 'NOT watertight';
            console.log(`wrote ${w.name} -> ${w.path} (${w.triangleCount} tris, ${gate})`);
          }
        }
        process.exitCode = r.exitCode;
        return;
      }
      const r = await exportScript({
        file, format: format as ExportFormat, out: opts.out,
        ...(opts.verify === false ? { verify: false } : {}),
      });
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
