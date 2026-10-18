// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/fabPackBom.ts
//
// MCP `fab_pack` tool, `scope: 'bom'`: the whole-assembly order pack. Every
// fabricated BOM row becomes single-body part files (STEP always, STL for
// 3d-print, DXF for sheet-cut when the flat pattern succeeds) plus a per-row
// drawing PDF where the drawing pipeline accepts the target; purchased rows
// contribute vendor handoff texts. The pack carries bom.csv/bom.json, a
// manifest, a README and one zip holding it all, and returns the public
// instant-quote pages of the services matching the pack's processes.
//
// The collection itself is the shared `collectOrderPack` — the same code
// behind `export({ format: 'order-pack' })` — so this tool and the export
// format ship byte-identical packs. Its per-row drawings are nested full
// script runs: accepted cost, one run per fabricated row (S5).
//
// Nothing is uploaded: the quote links are plain web pages the user opens.

import { mkdir, lstat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { loadMcpScriptSource } from '../runMcpScript';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { computeBom } from '../../script-runtime/bom';
import {
  collectOrderPack,
  selectOrderPackRows,
  type CollectedOrderPack,
  type OrderPackDeps,
  type OrderPackOptions,
} from '../../script-runtime/orderPackExport';
import { partFolderName, zipEntries, type OrderPackEntry } from '../../../kernel/export/order/orderPack';
import type { OrderPackBomRow } from '../../../kernel/export/order/orderRows';
import { runAndExport, type ExportInput } from '../../script-runtime/export';
import type { CaptureSession } from '../../../modeling/capture/captureSession';
import type { runScript } from '../../../composition/runScript';
import { checkWritableDestination, safeWriteFile } from '../../script-runtime/safeWriteFile';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { buildVendorLink, referralDisclosure } from '../../../shared/links/referral';
import { FAB_PROCESSES, type FabPackFormat, type FabProcess } from '../../../shared/fab';
import { FAB_SERVICES } from '../../../kernel/export/order/fabServices';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FabPackInput, FabPackOutput, FabPackFile, FabQuoteLink } from './fabPack';

const BOM_NOTE =
  'BOM order pack: per-part files, drawings, bom.csv/json and vendor handoff texts. ' +
  'Quote pages are public upload pages; nothing was sent.';

/** Same file-name contract as the single-part pack (fabPack.ts). */
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function bomFail(error: string, diagnostics: CompilerDiagnostic[] = []): FabPackOutput {
  return { ok: false, files: [], quote_links: [], note: BOM_NOTE, diagnostics, error };
}

function isProcessList(v: unknown): v is FabProcess[] {
  return Array.isArray(v) && v.every(p => FAB_PROCESSES.includes(p as FabProcess));
}

/** Validate the bom-scope call; returns an error message or undefined. */
function validateBomInput(input: FabPackInput): string | undefined {
  if (input.file === undefined && input.code === undefined) return 'Provide { file } or { code }.';
  if (typeof input.output_dir !== 'string' || input.output_dir.length === 0) return 'Required: output_dir';
  if (!NAME_RE.test(input.name ?? 'part')) return 'name must be 1-64 characters of letters, digits, ".", "_" or "-".';
  if (input.processes !== undefined && !isProcessList(input.processes)) {
    return "processes must be a list of '3d-print' | 'cnc' | 'sheet-cut'.";
  }
  return undefined;
}

/** Refuse an entry destination (or its pack `parts/` directory) that is
 *  protected or a symlink — the same guards the single-part path applies. */
async function entryDestinationError(dir: string, out: string): Promise<string | undefined> {
  const bad = await checkWritableDestination(out);
  if (bad !== undefined) return bad;
  const rel = relative(dir, out);
  if (rel !== 'parts' && !rel.startsWith(`parts${sep}`)) return undefined;
  const parts = join(dir, 'parts');
  try {
    if ((await lstat(parts)).isSymbolicLink()) return `Refusing to write under ${parts}: it is a symbolic link.`;
  } catch {
    // no parts/ yet: it is created below
  }
  return undefined;
}

/** Write every order-pack entry under `dir`, one guarded file at a time. */
async function writeBomEntries(dir: string, entries: readonly OrderPackEntry[]): Promise<string | undefined> {
  for (const entry of entries) {
    const out = join(dir, entry.path);
    const bad = await entryDestinationError(dir, out);
    if (bad !== undefined) return bad;
    try {
      await mkdir(dirname(out), { recursive: true });
    } catch (e) {
      return `Cannot create ${dirname(out)}: ${e instanceof Error ? e.message : String(e)}`;
    }
    const error = await safeWriteFile(out, entry.bytes);
    if (error !== undefined) return error;
  }
  return undefined;
}

/** Order-pack entry basename → the format token services accept. */
const ENTRY_FORMAT: Record<string, FabPackFormat> = {
  'model.step': 'step',
  'model.stl': 'stl',
  'model.dxf': 'dxf',
  'drawing.pdf': 'pdf-drawing',
};

interface PackedPartFile {
  folder: string;
  format: FabPackFormat;
  path: string;
}

/** The per-part files inside the collected entries, in pack order. */
function packedPartFiles(entries: readonly OrderPackEntry[]): PackedPartFile[] {
  const out: PackedPartFile[] = [];
  for (const entry of entries) {
    const m = /^parts\/([^/]+)\/([^/]+)$/.exec(entry.path);
    const format = m !== null ? ENTRY_FORMAT[m[2]] : undefined;
    if (m === null || format === undefined) continue;
    out.push({ folder: m[1], format, path: entry.path });
  }
  return out;
}

/** Quote links for the packed rows: services whose processes intersect the
 *  pack's used processes, each pointed at the first written part file it
 *  accepts (the single-part quoteLinksFor shape, per-part instead of
 *  per-format). */
function bomQuoteLinks(entries: readonly OrderPackEntry[], rows: readonly OrderPackBomRow[]): FabQuoteLink[] {
  const files = packedPartFiles(entries);
  const rowByFolder = new Map(rows.map(row => [partFolderName(row), row]));
  const used = new Set<FabProcess>();
  for (const row of rows) if (row.process !== null) used.add(row.process);
  return FAB_SERVICES
    .filter(s => s.processes.some(p => used.has(p)))
    .map(s => {
      const file = files.find(f => {
        const process = rowByFolder.get(f.folder)?.process ?? null;
        return process !== null && s.processes.includes(process) && s.accepts.includes(f.format);
      });
      const link = buildVendorLink(s.url, { surface: 'export' });
      return {
        ...s, url: link.url, referral: link.referral, processes: [...s.processes], accepts: [...s.accepts],
        ...(file !== undefined ? { upload_file: basename(file.path) } : {}),
      };
    });
}

type Evaluated = Awaited<ReturnType<typeof evaluateAndBuildScript>>;
type ScriptRun = Awaited<ReturnType<typeof runScript>>;

/** Validate the call and create the pack directory; returns the resolved
 *  directory/name or an error message. */
async function prepareBomPackTarget(input: FabPackInput): Promise<{ dir: string; name: string } | string> {
  const inputError = validateBomInput(input);
  if (inputError !== undefined) return inputError;
  const dirCheck = validateOutputPath(input.output_dir);
  if (!dirCheck.ok || dirCheck.resolved === undefined) {
    return dirCheck.error ?? `Refusing to write to ${input.output_dir}.`;
  }
  const dir = resolve(dirCheck.resolved);
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    return `Cannot create ${dir}: ${e instanceof Error ? e.message : String(e)}`;
  }
  return { dir, name: input.name ?? 'part' };
}

/** Everything the collection needs from a built script: the captured
 *  assembly, the export input (same file→code mapping as the export tool)
 *  and the ScriptRun view with the session's ParamTable. */
interface BomPackSource {
  readonly evaluation: Evaluated['evaluation'];
  readonly arm: Assembly;
  readonly session: CaptureSession;
  readonly exportInput: ExportInput;
  readonly run: ScriptRun;
  readonly packOptions: OrderPackOptions;
  readonly deps: OrderPackDeps;
}

/** Evaluate the script, resolve the captured assembly and build the shared
 *  collection inputs. Returns a failure output when any step refuses. */
async function resolveBomPackSource(input: FabPackInput): Promise<BomPackSource | { output: FabPackOutput }> {
  const { evaluation, model } = await evaluateAndBuildScript({ file: input.file, code: input.code });
  if (evaluation.exitCode !== 0 || !model) {
    return { output: bomFail(
      evaluation.diagnostics.find(d => d.severity === 'error')?.message ?? 'Script evaluation failed.',
      evaluation.diagnostics,
    ) };
  }
  const assemblies = model.session.assemblies as Map<string, Assembly>;
  const arm: Assembly | undefined = assemblies.values().next().value;
  if (arm === undefined) {
    return { output: bomFail(
      "fab_pack({ scope: 'bom' }): no assembly captured by the script — the order pack needs assembly.model().",
      evaluation.diagnostics,
    ) };
  }

  // Same file→code mapping as the export tool: `lib.fromSTEP('parts/x.step')`
  // in the nested per-row drawing runs resolves under the script's directory.
  const source = await loadMcpScriptSource({ file: input.file, code: input.code });
  if (!source.ok) return { output: bomFail(source.error, evaluation.diagnostics) };
  const scriptDir = input.file !== undefined ? dirname(resolve(input.file)) : undefined;
  const packOptions: OrderPackOptions = input.processes !== undefined ? { processes: input.processes } : {};
  const exportInput: ExportInput = {
    code: source.code,
    fileName: source.fileName,
    format: 'order-pack',
    options: { format: 'order-pack', ...packOptions },
    ...(scriptDir !== undefined ? { scriptDir } : {}),
  };

  // The evaluation's BuiltModel carries the run's records/session/returnValue
  // but not the ScriptRun view; the session owns the ParamTable the order pack
  // needs for the sheet-metal flatten walk, so rebuild the run shape here.
  const run: ScriptRun = {
    records: model.records,
    session: model.session,
    paramTable: model.session.paramTable,
    returnValue: model.returnValue,
  };

  // The pack's per-row drawings are nested full `pdf-drawing` runs. Injecting
  // the runner here (rather than importing it inside orderPackExport) keeps
  // that module out of the export > exportPhases > orderPackExport cycle.
  const deps: OrderPackDeps = {
    drawingBytes: (featureId) => runAndExport({
      code: source.code,
      fileName: source.fileName,
      format: 'pdf-drawing',
      feature_id: featureId,
      ...(scriptDir !== undefined ? { scriptDir } : {}),
      options: { format: 'pdf-drawing' },
    }),
  };

  return { evaluation, arm, session: model.session, exportInput, run, packOptions, deps };
}

/** Write every collected entry under `dir` plus the zip; returns the zip
 *  path and bytes or an error message. */
async function writeBomZip(
  dir: string,
  name: string,
  collected: CollectedOrderPack,
): Promise<{ zipPath: string; zipBytes: Uint8Array } | string> {
  const writeError = await writeBomEntries(dir, collected.entries);
  if (writeError !== undefined) return writeError;
  const zipPath = join(dir, `${name}-order-pack.zip`);
  const zipBytes = zipEntries(collected.entries);
  const zipError = await safeWriteFile(zipPath, zipBytes);
  if (zipError !== undefined) return zipError;
  return { zipPath, zipBytes };
}

/** The tool result for a written pack: the order-pack file entry, quote
 *  links for the packed rows, referral disclosure and the note. */
async function assembleBomPackOutput(
  dir: string,
  zipPath: string,
  byteCount: number,
  collected: CollectedOrderPack,
  arm: Assembly,
  session: CaptureSession,
  packOptions: OrderPackOptions,
): Promise<FabPackOutput> {
  // `collectOrderPack` computed the BOM internally; the quote links need the
  // same rows (process per part folder) once more. computeBom reuses the
  // session's lowered-shape cache — a measurement pass, not a second build.
  const bom = await computeBom(arm, session);
  const quote_links = bomQuoteLinks(collected.entries, selectOrderPackRows(bom.rows, packOptions));
  const part_files = collected.entries.filter(e => e.path.startsWith('parts/')).map(e => e.path);
  const files: FabPackFile[] = [
    { format: 'order-pack', ok: true, path: zipPath, byte_count: byteCount, part_files },
  ];
  const disclosure = referralDisclosure(quote_links);
  const note = collected.notes.length > 0
    ? `${BOM_NOTE} ${collected.notes.length} note${collected.notes.length === 1 ? '' : 's'} in the manifest.`
    : BOM_NOTE;
  return {
    ok: collected.entries.length > 0,
    output_dir: dir,
    zip_path: zipPath,
    files,
    quote_links,
    note,
    ...(disclosure !== undefined ? { referral_disclosure: disclosure } : {}),
    diagnostics: collected.diagnostics,
  };
}

/**
 * MCP `fab_pack` tool, `scope: 'bom'` — packs the whole assembly's BOM into
 * `output_dir` plus one `<name>-order-pack.zip`, and returns per-process
 * quote links. Pass { file | code } and output_dir; optional name (default
 * 'part', used for the zip file name) and processes to narrow which
 * fabricated rows are packed (and which links come back).
 *
 * Returns the single-part tool's `FabPackOutput` shape, with one
 * `files[]` entry of `format: 'order-pack'` whose `part_files` lists the
 * per-part entry paths inside the zip.
 */
export async function fabPackBomTool(input: FabPackInput): Promise<FabPackOutput> {
  const target = await prepareBomPackTarget(input);
  if (typeof target === 'string') return bomFail(target);
  const { dir, name } = target;

  const source = await resolveBomPackSource(input);
  if ('output' in source) return source.output;
  const { evaluation, arm, session, exportInput, run, packOptions, deps } = source;

  let collected: CollectedOrderPack;
  try {
    collected = await collectOrderPack(exportInput, run, arm, evaluation.diagnostics, evaluation.featureCount, deps);
  } catch (e) {
    return bomFail(`Order pack failed: ${e instanceof Error ? e.message : String(e)}`, evaluation.diagnostics);
  }

  const written = await writeBomZip(dir, name, collected);
  if (typeof written === 'string') return bomFail(written, collected.diagnostics);

  return assembleBomPackOutput(dir, written.zipPath, written.zipBytes.byteLength, collected, arm, session, packOptions);
}
