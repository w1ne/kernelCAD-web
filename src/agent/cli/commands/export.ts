// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Command } from 'commander';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir, open, realpath, rename, rm, stat } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
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
import { readScriptOrDiagnostic } from '../lib/readScript';

/** Structured `cli.file-write` diagnostic from an output mkdir/write failure. */
function fileWriteDiagnostic(e: unknown): CompilerDiagnostic {
  return {
    target: 'export-occt', code: 'cli.file-write', severity: 'error',
    message: e instanceof Error ? e.message : String(e),
    hint: 'Check that the output path is writable and that -o points at a directory when exporting multiple parts.',
  };
}

export interface ExportInput {
  file: string;
  format: ExportFormat;
  out: string;
  /** Watertight verify gate for STL; default-on (`--no-verify` to skip). */
  verify?: boolean;
  /** Output path for a numeric authored connector sidecar. */
  connectorManifest?: string;
  /** Catalog identity required for a connector-manifest sidecar. */
  manifestPartId?: string;
  /** Catalog family required for a connector-manifest sidecar. */
  manifestFamily?: string;
}

export interface ExportCliResult {
  exitCode: number;
  bytesWritten: number;
  diagnostics: CompilerDiagnostic[];
  /** Companion mesh files written next to the output (URDF / SDF exports). */
  meshFiles?: string[];
}

function manifestOptionError(input: Pick<ExportInput, 'format' | 'connectorManifest' | 'manifestPartId' | 'manifestFamily'>): string | undefined {
  const values = [input.connectorManifest, input.manifestPartId, input.manifestFamily];
  if (!values.some((value) => value !== undefined)) return undefined;
  if (values.some((value) => value === undefined)) {
    return '--connector-manifest, --manifest-part-id, and --manifest-family must be provided together.';
  }
  if (input.format !== 'step') {
    return '--connector-manifest is only supported for STEP exports.';
  }
  return undefined;
}

function invalidManifestOptionsResult(message: string): ExportCliResult {
  return {
    exitCode: 2,
    bytesWritten: 0,
    diagnostics: withNextActions([{
      target: 'export-occt',
      code: 'cli.invalid-args',
      severity: 'error',
      message,
      hint: 'Pass all three connector-manifest options with a STEP export, or omit all three.',
    }]),
  };
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && ((error as { code?: unknown }).code === 'ENOENT'
      || (error as { code?: unknown }).code === 'ENOTDIR');
}

/** Resolve the deepest existing path segment so sibling paths through a
 * symlinked directory compare as one output target even before either file
 * exists. Fall back to the lexical absolute path on inaccessible paths; the
 * normal write diagnostic remains responsible for reporting that failure. */
async function canonicalOutputPath(path: string): Promise<string> {
  const absolute = resolve(path);
  let probe = absolute;
  const missingSegments: string[] = [];
  while (true) {
    try {
      return join(await realpath(probe), ...missingSegments);
    } catch (error) {
      if (!isMissingPathError(error)) return absolute;
      const parent = dirname(probe);
      if (parent === probe) return absolute;
      missingSegments.unshift(basename(probe));
      probe = parent;
    }
  }
}

async function existingFileIdentity(path: string): Promise<{ dev: number; ino: number } | undefined> {
  try {
    const info = await stat(path);
    return { dev: info.dev, ino: info.ino };
  } catch {
    // The normal output write produces the user-facing diagnostic for paths
    // that cannot be stat'ed or written. No identity is available to compare.
    return undefined;
  }
}

/** Detect lexical, symlink, case-folded, and pre-existing hard-link aliases.
 * Calling this again after writing the STEP also catches case-folded aliases
 * that cannot be observed until the output path exists. */
async function outputPathsAlias(first: string, second: string): Promise<boolean> {
  const [firstCanonical, secondCanonical] = await Promise.all([
    canonicalOutputPath(first),
    canonicalOutputPath(second),
  ]);
  if (firstCanonical === secondCanonical) return true;
  const [firstIdentity, secondIdentity] = await Promise.all([
    existingFileIdentity(first),
    existingFileIdentity(second),
  ]);
  return firstIdentity !== undefined
    && secondIdentity !== undefined
    && firstIdentity.dev === secondIdentity.dev
    && firstIdentity.ino === secondIdentity.ino;
}

/**
 * Replace a sidecar destination without following a late file or symlink
 * alias. The staging file shares the destination directory, so `rename` is
 * atomic and replaces the destination entry rather than its target.
 *
 * @internal Exported solely for focused filesystem-boundary tests.
 */
export async function writeManifestSidecarAtomically(destination: string, contents: string): Promise<void> {
  const path = resolve(destination);
  const stagedPath = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let stagedHandle: Awaited<ReturnType<typeof open>> | undefined;
  let stagedCreated = false;

  try {
    stagedHandle = await open(stagedPath, 'wx');
    stagedCreated = true;
    await stagedHandle.writeFile(contents, 'utf8');
    await stagedHandle.close();
    stagedHandle = undefined;
    await rename(stagedPath, path);
  } catch (error) {
    if (stagedHandle !== undefined) await stagedHandle.close().catch(() => undefined);
    if (stagedCreated) await rm(stagedPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function postStepManifestAliasResult(
  bytes: Uint8Array,
  diagnostics: readonly CompilerDiagnostic[],
): ExportCliResult {
  return {
    exitCode: 1,
    bytesWritten: bytes.length,
    diagnostics: withNextActions([...diagnostics, {
      target: 'export-occt',
      code: 'cli.invalid-args',
      severity: 'error',
      message: 'The STEP output was written, but --connector-manifest now aliases it; the sidecar was not written.',
      hint: 'Choose a distinct --connector-manifest path and retry; the STEP output remains intact.',
    }]),
  };
}

export async function exportScript(input: ExportInput): Promise<ExportCliResult> {
  const manifestError = manifestOptionError(input);
  if (manifestError !== undefined) return invalidManifestOptionsResult(manifestError);
  const manifestPath = input.connectorManifest === undefined ? undefined : resolve(input.connectorManifest);
  const outPath = resolve(input.out);
  if (manifestPath !== undefined && await outputPathsAlias(outPath, manifestPath)) {
    return invalidManifestOptionsResult('--connector-manifest must not overwrite the STEP output path.');
  }
  await initOcct();
  const read = await readScriptOrDiagnostic(input.file);
  if (!read.ok) {
    return { exitCode: 2, bytesWritten: 0, diagnostics: read.diagnostics };
  }
  const { filePath, code } = read;
  let result;
  try {
    result = await runAndExport({
      code,
      fileName: filePath,
      format: input.format,
      scriptDir: dirname(filePath),
      ...(input.connectorManifest === undefined
        ? {}
        : {
            connectorManifest: {
              partId: input.manifestPartId!,
              family: input.manifestFamily!,
            },
          }),
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
  if (result.bytes.length === 0) {
    return { exitCode: 1, bytesWritten: 0, diagnostics: withNextActions(result.diagnostics) };
  }
  // Write-then-fail: a verify-gate failure (export.mesh.not-watertight)
  // still carries the mesh bytes, so the file is written for inspection
  // BEFORE the gate fails the command — same contract as part-mode.
  const meshFiles: string[] = [];
  try {
    await writeFile(outPath, result.bytes);
    if (manifestPath !== undefined) {
      if (await outputPathsAlias(outPath, manifestPath)) {
        return postStepManifestAliasResult(result.bytes, result.diagnostics);
      }
      if (result.connectorManifest === undefined) {
        throw new Error('STEP export completed without the requested connector manifest.');
      }
      await writeManifestSidecarAtomically(
        manifestPath,
        `${JSON.stringify(result.connectorManifest, null, 2)}\n`,
      );
    }
    // Robot-description exports (URDF / SDF) reference per-link mesh files
    // by relative path — write them next to the output file so the
    // document is consumable as-is.
    for (const m of result.meshes ?? []) {
      const meshPath = join(dirname(outPath), m.relPath);
      await mkdir(dirname(meshPath), { recursive: true });
      await writeFile(meshPath, m.bytes);
      meshFiles.push(meshPath);
    }
  } catch (e) {
    return {
      exitCode: 1, bytesWritten: 0,
      diagnostics: withNextActions([...result.diagnostics, fileWriteDiagnostic(e)]),
    };
  }
  return {
    exitCode: fatal ? 1 : 0,
    bytesWritten: result.bytes.length,
    diagnostics: withNextActions(result.diagnostics),
    ...(meshFiles.length > 0 ? { meshFiles } : {}),
  };
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
  const read = await readScriptOrDiagnostic(input.file);
  if (!read.ok) {
    return { exitCode: 2, written: [], diagnostics: read.diagnostics };
  }
  const { filePath, code } = read;
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
  if (fatal) {
    return { exitCode: 1, written: [], diagnostics: withNextActions(result.diagnostics) };
  }
  if (result.parts.length === 0) {
    // No error diagnostic explains the empty result (the part-not-found and
    // no-shape paths are fatal above) — emit one so the failure is
    // self-explanatory instead of a bare exit 1.
    return {
      exitCode: 1, written: [],
      diagnostics: withNextActions([...result.diagnostics, {
        target: 'export-occt', code: 'cli.invalid-args', severity: 'error',
        message: input.parts !== undefined && input.parts.length === 0
          ? 'No parts selected: the part selection is empty. Pass --part <name> (repeatable) or --parts all.'
          : 'The script resolved to zero assembly parts; nothing to export.',
        hint: 'Run `kernelcad parts <file>` to list the available part names.',
      }]),
    };
  }

  // Single `--part NAME -o file.stl` writes one file; everything else
  // (`--parts all`, repeated `--part`) writes `<outDir>/<fileSafeName>.stl`.
  const singleFile = result.parts.length === 1 && input.outFile !== undefined
    ? resolve(input.outFile)
    : undefined;

  const written: WrittenPart[] = [];
  const diagnostics: CompilerDiagnostic[] = [...result.diagnostics];
  try {
    let outDir: string | undefined;
    if (singleFile === undefined) {
      outDir = resolve(input.outDir ?? input.outFile ?? '.');
      await mkdir(outDir, { recursive: true });
    }
    for (const p of result.parts) {
      const path = singleFile ?? join(outDir!, `${p.fileSafeName}.stl`);
      await writeFile(path, p.bytes);
      written.push({ name: p.name, path, triangleCount: p.triangleCount, watertight: p.report.ok });
      if (input.verify && !p.report.ok) {
        diagnostics.push(stlNotWatertightDiagnostic(p.report, undefined, p.name));
      }
    }
  } catch (e) {
    diagnostics.push(fileWriteDiagnostic(e));
    return { exitCode: 1, written, diagnostics: withNextActions(diagnostics) };
  }
  const gateFailed = input.verify && written.some(w => !w.watertight);
  return { exitCode: gateFailed ? 1 : 0, written, diagnostics: withNextActions(diagnostics) };
}

function collectParts(value: string, prev: string[]): string[] {
  return [...prev, value];
}

const SUPPORTED_FORMATS = new Set<ExportFormat>([
  'stl', 'step', 'dxf', '3mf', 'glb', 'svg-drawing', 'urdf', 'srdf', 'sdf-gazebo',
]);

export function exportCommand(): Command {
  const cmd = new Command('export')
    .description('Export a .kcad.ts script to STL, STEP, DXF, 3MF, GLB, or an SVG engineering-drawing sheet')
    .argument('<format>', 'stl | step | dxf | 3mf | glb | svg-drawing | urdf | srdf | sdf-gazebo')
    .argument('<file>', 'path to .kcad.ts script')
    .requiredOption('-o, --out <path>', 'output file path (output directory for --parts all and repeated --part)')
    .option('--part <name>', 'export a single named assembly part (STL only); repeat for a subset (-o is then a directory)', collectParts, [] as string[])
    .option('--parts <all>', "export every assembly part as <out-dir>/<part>.stl (value must be 'all')")
    .option('--connector-manifest <path>', 'write numeric authored connector manifest beside a STEP export')
    .option('--manifest-part-id <id>', 'catalog part id for --connector-manifest')
    .option('--manifest-family <family>', 'catalog family for --connector-manifest')
    .option('--no-verify', 'skip the watertight verify gate after STL export')
    .option('--json', 'emit diagnostics as JSON')
    .action(async (format: string, file: string, opts: {
      out: string; json?: boolean; part?: string[]; parts?: string; verify?: boolean;
      connectorManifest?: string; manifestPartId?: string; manifestFamily?: string;
    }) => {
      if (!SUPPORTED_FORMATS.has(format as ExportFormat)) {
        console.error(`Unsupported format: ${format}. Use one of ${[...SUPPORTED_FORMATS].join(', ')}.`);
        process.exitCode = 2; return;
      }
      const manifestError = manifestOptionError({
        format: format as ExportFormat,
        connectorManifest: opts.connectorManifest,
        manifestPartId: opts.manifestPartId,
        manifestFamily: opts.manifestFamily,
      });
      if (manifestError !== undefined) {
        console.error(manifestError);
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
        ...(opts.connectorManifest === undefined
          ? {}
          : {
              connectorManifest: opts.connectorManifest,
              manifestPartId: opts.manifestPartId,
              manifestFamily: opts.manifestFamily,
            }),
        ...(opts.verify === false ? { verify: false } : {}),
      });
      if (opts.json) {
        console.log(JSON.stringify({
          ok: r.exitCode === 0,
          bytesWritten: r.bytesWritten,
          out: opts.out,
          ...(r.meshFiles !== undefined ? { meshFiles: r.meshFiles } : {}),
          diagnostics: r.diagnostics,
        }, null, 2));
      } else {
        if (r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
        if (r.exitCode === 0) console.log(`Wrote ${r.bytesWritten} bytes to ${opts.out}`);
        for (const m of r.meshFiles ?? []) console.log(`wrote mesh ${m}`);
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}
