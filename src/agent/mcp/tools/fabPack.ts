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

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { exportModelTool, type ExportModelOutput } from './exportModel';
import type { ExportFormat } from '../../script-runtime/export';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
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

/** bom-csv needs an assembly; a single-shape script still gets a one-row
 *  BOM (same columns as export bom-csv) so every pack carries one. */
async function singlePartBom(input: FabPackInput, name: string, out: string): Promise<ExportModelOutput | undefined> {
  try {
    const { model } = await evaluateAndBuildScript({ file: input.file, code: input.code });
    const shape = model?.rootShape ?? model?.tailShape;
    if (shape === undefined) return undefined;
    const bb = shape.boundingBox();
    const csv = bomToCsv([{
      item: 1, name, quantity: 1, kind: 'fabricated', material: null, density: null,
      massGPerUnit: null, massGTotal: null,
      bboxMm: { min: [...bb.min] as [number, number, number], max: [...bb.max] as [number, number, number] },
      instancePaths: [name],
    }]);
    await writeFile(out, csv);
    return { ok: true, output_path: out, byte_count: Buffer.byteLength(csv), format: 'bom-csv' };
  } catch {
    return undefined;
  }
}

const PROCESSES: readonly FabProcess[] = ['3d-print', 'cnc', 'sheet-cut'];

function isFormatList(v: unknown): v is FabPackFormat[] {
  return Array.isArray(v) && v.length > 0 && v.every(f => typeof f === 'string' && f in EXT);
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

/** Export one pack file through the export tool (single-shape BOM fallback included). */
async function exportOne(input: FabPackInput, format: FabPackFormat, out: string, name: string): Promise<ExportModelOutput> {
  let r: ExportModelOutput;
  try {
    r = await exportModelTool({ file: input.file, code: input.code, output_path: out, format: format as ExportFormat });
  } catch (e) {
    r = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (!r.ok && format === 'bom-csv') return (await singlePartBom(input, name, out)) ?? r;
  return r;
}

function packFile(format: FabPackFormat, out: string, r: ExportModelOutput): FabPackFile {
  if (r.ok) return { format, ok: true, path: r.output_path ?? out, byte_count: r.byte_count };
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

/** Write manifest.json, README.txt and the zip; returns the zip path. */
async function writePack(dir: string, name: string, files: readonly FabPackFile[], links: readonly FabQuoteLink[]): Promise<string> {
  const manifest = JSON.stringify({
    name,
    created: new Date().toISOString(),
    files: files.map(f => ({ format: f.format, file: f.path !== undefined ? basename(f.path) : undefined, ok: f.ok, error: f.error })),
    quote_links: links.map(q => ({ service: q.service, url: q.url, upload_file: q.upload_file })),
  }, null, 2) + '\n';
  const readme = packReadme(name, files, links);
  await writeFile(join(dir, 'manifest.json'), manifest);
  await writeFile(join(dir, 'README.txt'), readme);
  const entries: Record<string, Uint8Array> = { 'manifest.json': strToU8(manifest), 'README.txt': strToU8(readme) };
  for (const f of files) if (f.ok && f.path !== undefined) entries[basename(f.path)] = new Uint8Array(await readFile(f.path));
  const zipPath = join(dir, `${name}-fab-pack.zip`);
  await writeFile(zipPath, zipSync(entries));
  return zipPath;
}

export async function fabPackTool(input: FabPackInput): Promise<FabPackOutput> {
  const checked = validateInput(input);
  if (typeof checked === 'string') return fail(checked);
  const { dir } = checked;
  const name = input.name ?? 'part';
  await mkdir(dir, { recursive: true });

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
  const zip_path = await writePack(dir, name, files, quote_links);
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
