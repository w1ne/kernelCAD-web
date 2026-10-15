// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/fabPack.ts
//
// MCP `fab_pack` tool: package a script's fabrication files (STEP, STL,
// 3MF, a PDF drawing, a BOM, and optionally a DXF) into one directory plus a
// zip, and return links to the public instant-quote / upload pages of common
// fabrication services. Every file comes from the existing `export` tool
// (exportModelTool), so formats and their gates behave exactly as in export.
//
// Quote links are plain public web pages where a person uploads the file and
// gets a price. kernelCAD does NOT call any vendor API and does not upload
// anything: the user opens the link and uploads the named file themselves.

import { readFile, mkdir, lstat, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { exportModelTool, type ExportModelOutput } from './exportModel';
import type { ExportFormat } from '../../script-runtime/export';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { checkWritableDestination, safeWriteFile } from '../../script-runtime/safeWriteFile';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { bomToCsv } from '../../script-runtime/bom';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { buildVendorLink, referralDisclosure } from '../../../shared/links/referral';

export type FabPackFormat = 'step' | 'stl' | '3mf' | 'pdf-drawing' | 'bom-csv' | 'dxf';
export type FabProcess = '3d-print' | 'cnc' | 'sheet-cut';

export const FAB_PACK_DEFAULT_FORMATS: readonly FabPackFormat[] = ['step', 'stl', '3mf', 'pdf-drawing', 'bom-csv'];

const EXT: Record<FabPackFormat, string> = {
  step: 'step', stl: 'stl', '3mf': '3mf', 'pdf-drawing': 'pdf', 'bom-csv': 'bom.csv', dxf: 'dxf',
};

export interface FabService {
  service: string;
  processes: FabProcess[];
  /** Public instant-quote / upload page (no API; the user uploads by hand). */
  url: string;
  /** File formats the service accepts, in our pack's terms, preferred first. */
  accepts: FabPackFormat[];
}

interface FabServiceEntry extends Omit<FabService, 'url'> {
  /** Quote page as host + path. Outbound URLs are only ever built through
   *  buildVendorLink (referral.ts), the single vendor-URL emitter. */
  host: string;
  path: string;
}

/** Public quote pages, checked reachable 2026-10-13. Plain web pages only. */
const FAB_SERVICE_ENTRIES: readonly FabServiceEntry[] = [
  { service: 'JLC3DP (JLCPCB 3D printing)', processes: ['3d-print'], host: 'jlc3dp.com', path: '/3d-printing-quote', accepts: ['stl', 'step', '3mf'] },
  { service: 'JLCCNC (JLCPCB CNC machining)', processes: ['cnc'], host: 'jlccnc.com', path: '/cnc-machining-quote', accepts: ['step'] },
  { service: 'PCBWay 3D printing', processes: ['3d-print'], host: 'www.pcbway.com', path: '/rapid-prototyping/3D-Printing/', accepts: ['stl', 'step'] },
  { service: 'PCBWay CNC / sheet metal', processes: ['cnc', 'sheet-cut'], host: 'www.pcbway.com', path: '/rapid-prototyping/manufacture/', accepts: ['step', 'dxf', 'pdf-drawing'] },
  { service: 'Xometry', processes: ['cnc', '3d-print', 'sheet-cut'], host: 'www.xometry.com', path: '/quoting/home/', accepts: ['step', 'stl', 'dxf', 'pdf-drawing'] },
  { service: 'SendCutSend', processes: ['sheet-cut'], host: 'app.sendcutsend.com', path: '/', accepts: ['dxf', 'step'] },
  { service: 'Craftcloud', processes: ['3d-print'], host: 'craftcloud3d.com', path: '/', accepts: ['stl', '3mf'] },
];

/** The quote-service table with clean (untagged) https URLs. */
export const FAB_SERVICES: readonly FabService[] = FAB_SERVICE_ENTRIES.map(({ host, path, ...rest }) => ({
  ...rest,
  url: new URL(path, `https://${host}`).toString(),
}));

export interface FabPackInput {
  file?: string;
  code?: string;
  /** Directory the pack is written into (created if missing). */
  output_dir: string;
  /** Base file name, default 'part'. */
  name?: string;
  /** Files to include. Default step, stl, 3mf, pdf-drawing, bom-csv. Add 'dxf' for flat / sheet parts. */
  formats?: FabPackFormat[];
  /** Filter the quote links to these processes. Default: all. */
  processes?: FabProcess[];
}

export interface FabPackFile {
  format: FabPackFormat;
  path?: string;
  /** Companion files the export wrote next to `path` (per-part DXFs under parts/). */
  part_files?: string[];
  byte_count?: number;
  ok: boolean;
  error?: string;
}

export interface FabQuoteLink extends FabService {
  /** Which pack file to upload there (first accepted format that was written). */
  upload_file?: string;
  /** True when the URL carries a kernelCAD referral tag. */
  referral: boolean;
}

export interface FabPackOutput {
  ok: boolean;
  output_dir?: string;
  zip_path?: string;
  files: FabPackFile[];
  quote_links: FabQuoteLink[];
  /** Plain note for the user: links are upload pages, nothing was sent. */
  note: string;
  /** Present when any quote link carries a referral tag. */
  referral_disclosure?: string;
  diagnostics: CompilerDiagnostic[];
  error?: string;
}

const NOTE =
  'Quote links are the services\' public instant-quote pages. kernelCAD sends nothing to them: open a link, ' +
  'upload the listed file from the pack (or the whole zip where the site accepts it), and choose material and quantity there.';

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function fail(error: string): FabPackOutput {
  return { ok: false, files: [], quote_links: [], note: NOTE, diagnostics: [], error };
}

export function quoteLinksFor(written: readonly FabPackFile[], processes?: readonly FabProcess[]): FabQuoteLink[] {
  const byFormat = new Map(written.filter(f => f.ok && f.path !== undefined).map(f => [f.format, f.path!]));
  return FAB_SERVICES
    .filter(s => processes === undefined || s.processes.some(p => processes.includes(p)))
    .map(s => {
      const fmt = s.accepts.find(a => byFormat.has(a));
      const link = buildVendorLink(s.url, { surface: 'export' });
      return {
        ...s, url: link.url, referral: link.referral, processes: [...s.processes], accepts: [...s.accepts],
        ...(fmt !== undefined ? { upload_file: basename(byFormat.get(fmt)!) } : {}),
      };
    });
}

/** True when an export failed only because bom-csv needs an assembly. */
function isNoAssemblyRefusal(r: ExportModelOutput): boolean {
  return (r.diagnostics ?? []).some(d => d.code === 'export.no-shape' && /assembly\.model\(\)/.test(d.message));
}

/** bom-csv needs an assembly; a single-shape script that builds cleanly still
 *  gets a one-row BOM (same columns as export bom-csv). A script that fails
 *  to build keeps its failure and its diagnostics. */
async function singlePartBom(input: FabPackInput, name: string, out: string): Promise<ExportModelOutput | undefined> {
  const { evaluation, model } = await evaluateAndBuildScript({ file: input.file, code: input.code });
  if (evaluation.exitCode !== 0 || evaluation.diagnostics.some(d => d.severity === 'error')) {
    return { ok: false, error: 'The script did not build, so no BOM was written.', diagnostics: evaluation.diagnostics };
  }
  const shape = model?.rootShape ?? model?.tailShape;
  if (shape === undefined) return undefined;
  const bb = shape.boundingBox();
  const csv = bomToCsv([{
    item: 1, name, quantity: 1, kind: 'fabricated', material: null, density: null,
    massGPerUnit: null, massGTotal: null,
    bboxMm: { min: [...bb.min] as [number, number, number], max: [...bb.max] as [number, number, number] },
    instancePaths: [name],
  }]);
  const err = await safeWriteFile(out, csv);
  if (err !== undefined) return { ok: false, error: err, diagnostics: evaluation.diagnostics };
  return { ok: true, output_path: out, byte_count: Buffer.byteLength(csv), format: 'bom-csv', diagnostics: evaluation.diagnostics };
}

const PROCESSES: readonly FabProcess[] = ['3d-print', 'cnc', 'sheet-cut'];

function isFormatList(v: unknown): v is FabPackFormat[] {
  return Array.isArray(v) && v.length > 0 && v.every(f => typeof f === 'string' && Object.hasOwn(EXT, f));
}

function isProcessList(v: unknown): v is FabProcess[] {
  return Array.isArray(v) && v.every(p => PROCESSES.includes(p as FabProcess));
}

/** Validate the call; returns the resolved output directory or an error message. */
function validateInput(input: FabPackInput): { dir: string } | string {
  if (input.file === undefined && input.code === undefined) return 'Provide { file } or { code }.';
  if (typeof input.output_dir !== 'string' || input.output_dir.length === 0) return 'Required: output_dir';
  const dirCheck = validateOutputPath(input.output_dir);
  if (!dirCheck.ok || dirCheck.resolved === undefined) return dirCheck.error ?? `Refusing to write to ${input.output_dir}.`;
  if (!NAME_RE.test(input.name ?? 'part')) return 'name must be 1-64 characters of letters, digits, ".", "_" or "-".';
  if (input.formats !== undefined && !isFormatList(input.formats)) {
    return `formats must be a non-empty list of ${Object.keys(EXT).join(', ')}.`;
  }
  if (input.processes !== undefined && !isProcessList(input.processes)) {
    return "processes must be a list of '3d-print' | 'cnc' | 'sheet-cut'.";
  }
  return { dir: resolve(dirCheck.resolved) };
}

/** Refuse a destination (or, for DXF, its parts/ directory) that is protected or a symlink. */
async function destinationError(format: FabPackFormat, out: string): Promise<string | undefined> {
  const bad = await checkWritableDestination(out);
  if (bad !== undefined || format !== 'dxf') return bad;
  try {
    if ((await lstat(join(dirname(out), 'parts'))).isSymbolicLink()) return `Refusing to write under ${join(dirname(out), 'parts')}: it is a symbolic link.`;
  } catch {
    // no parts/ yet: the export creates it
  }
  return undefined;
}

/** Export one pack file through the export tool (single-shape BOM fallback included). */
async function exportOne(input: FabPackInput, format: FabPackFormat, out: string, name: string): Promise<ExportModelOutput> {
  const bad = await destinationError(format, out);
  if (bad !== undefined) return { ok: false, error: bad };
  let r: ExportModelOutput;
  try {
    r = await exportModelTool({ file: input.file, code: input.code, output_path: out, format: format as ExportFormat });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (!r.ok && format === 'bom-csv' && isNoAssemblyRefusal(r)) return (await singlePartBom(input, name, out)) ?? r;
  return r;
}

function packFile(format: FabPackFormat, out: string, r: ExportModelOutput): FabPackFile {
  if (r.ok) {
    return {
      format, ok: true, path: r.output_path ?? out, byte_count: r.byte_count,
      ...(r.part_files !== undefined && r.part_files.length > 0 ? { part_files: [...r.part_files] } : {}),
    };
  }
  const error = r.error ?? r.diagnostics?.find(d => d.severity === 'error')?.message ?? 'export failed';
  return { format, ok: false, error };
}

function packReadme(name: string, files: readonly FabPackFile[], links: readonly FabQuoteLink[]): string {
  return [
    `Fabrication pack: ${name}`,
    '',
    'Files:',
    ...files.map(f => `  ${f.ok ? basename(f.path!) : `(${f.format} missing: ${f.error})`}`),
    '',
    'Get a quote (public upload pages, nothing was sent):',
    ...links.map(q => `  ${q.service}: ${q.url}${q.upload_file !== undefined ? ` (upload ${q.upload_file})` : ''}`),
    '',
    'Generated by kernelCAD.',
    '',
  ].join('\n');
}

/** Zip entry name for a written file: its path relative to the pack dir (parts/<x>.dxf), else its basename. */
function entryName(dir: string, path: string): string {
  const rel = relative(dir, path);
  return rel.startsWith('..') || rel === '' ? basename(path) : rel.split('\\').join('/');
}

/** Read one exported file for the zip only if it is a regular file (not a
 *  symlink) whose real path lies inside the pack directory; anything else
 *  could pull arbitrary local files into the archive. */
async function readPackEntry(dir: string, path: string): Promise<Uint8Array | string> {
  let st;
  try {
    st = await lstat(path);
  } catch (e) {
    return `Cannot read ${path}: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (st.isSymbolicLink()) return `Refusing to pack ${path}: it is a symbolic link.`;
  if (!st.isFile()) return `Refusing to pack ${path}: not a regular file.`;
  const [realDir, realPath] = await Promise.all([realpath(dir), realpath(path)]);
  const rel = relative(realDir, realPath);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return `Refusing to pack ${path}: it is outside the pack directory ${dir}.`;
  return new Uint8Array(await readFile(realPath));
}

/** Write manifest.json, README.txt and the zip (symlink-safe); returns the zip path or an error. */
async function writePack(dir: string, name: string, files: readonly FabPackFile[], links: readonly FabQuoteLink[]): Promise<{ zip: string } | string> {
  const manifest = JSON.stringify({
    name,
    created: new Date().toISOString(),
    files: files.map(f => ({
      format: f.format, file: f.path !== undefined ? basename(f.path) : undefined, ok: f.ok, error: f.error,
      ...(f.part_files !== undefined ? { part_files: f.part_files.map(p => entryName(dir, p)) } : {}),
    })),
    quote_links: links.map(q => ({ service: q.service, url: q.url, upload_file: q.upload_file })),
  }, null, 2) + '\n';
  const readme = packReadme(name, files, links);
  const entries: Record<string, Uint8Array> = { 'manifest.json': strToU8(manifest), 'README.txt': strToU8(readme) };
  for (const f of files) {
    if (!f.ok || f.path === undefined) continue;
    for (const p of [f.path, ...(f.part_files ?? [])]) {
      const data = await readPackEntry(dir, p);
      if (typeof data === 'string') return data;
      entries[entryName(dir, p)] = data;
    }
  }
  const zip = join(dir, `${name}-fab-pack.zip`);
  for (const [path, data] of [[join(dir, 'manifest.json'), manifest], [join(dir, 'README.txt'), readme], [zip, zipSync(entries)]] as const) {
    const err = await safeWriteFile(path, data);
    if (err !== undefined) return err;
  }
  return { zip };
}

export async function fabPackTool(input: FabPackInput): Promise<FabPackOutput> {
  const checked = validateInput(input);
  if (typeof checked === 'string') return fail(checked);
  const { dir } = checked;
  const name = input.name ?? 'part';
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    return fail(`Cannot create ${dir}: ${e instanceof Error ? e.message : String(e)}`);
  }

  const files: FabPackFile[] = [];
  const diagnostics: CompilerDiagnostic[] = [];
  for (const format of [...new Set(input.formats ?? FAB_PACK_DEFAULT_FORMATS)]) {
    const out = join(dir, `${name}.${EXT[format]}`);
    const r = await exportOne(input, format, out, name);
    diagnostics.push(...(r.diagnostics ?? []).filter(d => !r.ok || d.severity !== 'error'));
    files.push(packFile(format, out, r));
  }

  const quote_links = quoteLinksFor(files, input.processes);
  if (!files.some(f => f.ok)) {
    return { ok: false, output_dir: dir, files, quote_links: [], note: NOTE, diagnostics, error: 'No file of the pack could be exported.' };
  }
  let packed: { zip: string } | string;
  try {
    packed = await writePack(dir, name, files, quote_links);
  } catch (e) {
    packed = `Packaging failed: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (typeof packed === 'string') {
    return { ok: false, output_dir: dir, files, quote_links, note: NOTE, diagnostics, error: packed };
  }
  const zip_path = packed.zip;
  const failed = files.filter(f => !f.ok).map(f => f.format);
  const disclosure = referralDisclosure(quote_links);
  return {
    ok: failed.length === 0,
    output_dir: dir,
    zip_path,
    files,
    quote_links,
    note: NOTE,
    ...(disclosure !== undefined ? { referral_disclosure: disclosure } : {}),
    diagnostics,
    ...(failed.length > 0 ? { error: `Some files could not be exported: ${failed.join(', ')}.` } : {}),
  };
}
