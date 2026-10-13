// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/importStep.ts
//
// MCP `import_step` tool: bring a user's own STEP or STL file in as the base
// body of a new script. On the hosted connector the server cannot read the
// user's disk, and Claude does not forward chat attachments to remote MCP
// servers, so `lib.fromSTEP(path)` alone gives a chat user no way in. This
// tool takes the file from:
//   - `url`: a public https link (direct download), fetched once, or
//   - `upload`: a ChatGPT file reference ({ download_url, file_id, ... }),
//     declared through `_meta['openai/fileParams']`, or
//   - `content_base64`: the raw bytes, for small files a client inlines.
// It writes the file plus a starter `<name>.kcad.ts` (`lib.fromSTEP` /
// `lib.fromSTL`) into output_dir, evaluates it, and returns the script path,
// its code and the body's bounding box so the agent can keep modelling on it.

import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { checkWritableDestination, safeWriteFile } from '../../script-runtime/safeWriteFile';
import { fetchPublicBytes, parseFetchUrl, resolvePinned } from './importStepFetch';

export { isPrivateAddress } from './importStepFetch';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

/** Hard cap on imported file size. */
export const IMPORT_MAX_BYTES = 50 * 1024 * 1024;
const MB = IMPORT_MAX_BYTES / 1024 / 1024;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export interface OpenAiFileRef {
  download_url: string;
  file_id: string;
  mime_type?: string;
  file_name?: string;
}

export interface ImportStepInput {
  url?: string;
  upload?: OpenAiFileRef;
  content_base64?: string;
  /** Original file name; used for format detection when bytes are inlined. */
  file_name?: string;
  /** 'step' | 'stl'; detected from the bytes when omitted. */
  format?: 'step' | 'stl';
  /** Directory for the imported file and starter script (default: a fresh temp dir). */
  output_dir?: string;
  /** Base name for the written files, default 'imported'. */
  name?: string;
  /** STL only: accept a non-watertight mesh as an open shell. */
  allow_open?: boolean;
}

export interface ImportStepOutput {
  ok: boolean;
  format?: 'step' | 'stl';
  /** The imported file as written to disk. */
  model_path?: string;
  /** Starter script whose base body is the imported file; pass it as { file } to other tools. */
  script_path?: string;
  code?: string;
  byte_count?: number;
  bbox?: { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] };
  diagnostics: CompilerDiagnostic[];
  error?: string;
}

function fail(error: string, diagnostics: CompilerDiagnostic[] = []): ImportStepOutput {
  return { ok: false, diagnostics, error };
}

/** https only, no credentials, and the host must resolve only to public addresses. */
export async function checkFetchUrl(raw: string): Promise<string | undefined> {
  const u = parseFetchUrl(raw);
  if (typeof u === 'string') return u;
  try {
    await resolvePinned(u);
  } catch (e) {
    return (e as Error).message;
  }
  return undefined;
}

/** STEP by its ISO-10303-21 header, else STL (binary size match or ASCII 'solid'), else the extension. */
export function detectFormat(bytes: Uint8Array, fileName?: string): 'step' | 'stl' | undefined {
  const head = Buffer.from(bytes.subarray(0, 512)).toString('latin1').trimStart();
  if (head.startsWith('ISO-10303-21')) return 'step';
  if (bytes.byteLength >= 84) {
    const n = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).readUInt32LE(80);
    if (84 + 50 * n === bytes.byteLength) return 'stl';
  }
  if (/^solid[\s\S]*facet/i.test(Buffer.from(bytes.subarray(0, 4096)).toString('latin1').trimStart())) return 'stl';
  const ext = fileName?.toLowerCase().match(/\.(step|stp|stl)$/)?.[1];
  if (ext === 'step' || ext === 'stp') return 'step';
  if (ext === 'stl') return 'stl';
  return undefined;
}

export function starterScript(fileBase: string, format: 'step' | 'stl', allowOpen: boolean): string {
  const call = format === 'step'
    ? `await lib.fromSTEP('./${fileBase}')`
    : `await lib.fromSTL('./${fileBase}'${allowOpen ? ', { allowOpen: true }' : ''})`;
  return [
    `// Base body imported by import_step from ${fileBase}.`,
    `const base = ${call};`,
    '// Add features to `base` (e.g. base.subtract(...), base.union(...)) and return the result.',
    'return base;',
    '',
  ].join('\n');
}

function validateInput(input: ImportStepInput): string | undefined {
  const sources = [input.url, input.upload, input.content_base64].filter(s => s !== undefined);
  if (sources.length !== 1) return 'Provide exactly one of url, upload or content_base64.';
  if (!NAME_RE.test(input.name ?? 'imported')) return 'name must be 1-64 characters of letters, digits, ".", "_" or "-".';
  if (input.format !== undefined && input.format !== 'step' && input.format !== 'stl') return "format must be 'step' or 'stl'.";
  return undefined;
}

function decodeBase64(text: unknown): Uint8Array | string {
  if (typeof text !== 'string' || !/^[A-Za-z0-9+/=\s]+$/.test(text)) return 'content_base64 must be base64 text.';
  if (text.length > Math.ceil(IMPORT_MAX_BYTES / 3) * 4 + 1024) return `file is larger than ${MB} MB.`;
  const bytes = new Uint8Array(Buffer.from(text, 'base64'));
  if (bytes.byteLength > IMPORT_MAX_BYTES) return `file is larger than ${MB} MB.`;
  return bytes;
}

/** The file bytes and the best-known file name, or an error message. */
async function readSource(input: ImportStepInput): Promise<{ bytes: Uint8Array; fileName?: string } | string> {
  if (input.content_base64 !== undefined) {
    const bytes = decodeBase64(input.content_base64);
    return typeof bytes === 'string' ? bytes : { bytes, fileName: input.file_name };
  }
  const url = input.url ?? input.upload?.download_url;
  if (typeof url !== 'string' || url.length === 0) return 'upload.download_url is required.';
  const parsed = parseFetchUrl(url);
  if (typeof parsed === 'string') return parsed;
  const fileName = input.file_name ?? input.upload?.file_name ?? parsed.pathname.split('/').pop();
  const bytes = await fetchPublicBytes(url, IMPORT_MAX_BYTES);
  return typeof bytes === 'string' ? bytes : { bytes, fileName };
}

async function prepareDir(outputDir: string | undefined): Promise<{ dir: string } | string> {
  if (outputDir === undefined) return { dir: await mkdtemp(join(tmpdir(), 'kernelcad-import-')) };
  const check = validateOutputPath(outputDir);
  if (!check.ok || check.resolved === undefined) return check.error ?? `Refusing to write to ${outputDir}.`;
  const dir = resolve(check.resolved);
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    return `Cannot create ${dir}: ${e instanceof Error ? e.message : String(e)}`;
  }
  return { dir };
}

type Written = Required<Pick<ImportStepOutput, 'format' | 'model_path' | 'script_path' | 'code' | 'byte_count'>>;

/** Evaluate the starter script and report the body's bounding box. */
async function evaluateImport(written: Written): Promise<ImportStepOutput> {
  let built: Awaited<ReturnType<typeof evaluateAndBuildScript>>;
  try {
    built = await evaluateAndBuildScript({ file: written.script_path });
  } catch (e) {
    return { ok: false, ...written, diagnostics: [], error: `evaluation failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  const diagnostics = built.evaluation.diagnostics;
  const shape = built.model?.rootShape ?? built.model?.tailShape;
  if (built.evaluation.exitCode !== 0 || shape === undefined) {
    const error = diagnostics.find(d => d.severity === 'error')?.message ?? 'the imported file did not produce a solid.';
    return { ok: false, ...written, diagnostics, error };
  }
  const bb = shape.boundingBox();
  const min = [...bb.min] as [number, number, number];
  const max = [...bb.max] as [number, number, number];
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return { ok: true, ...written, bbox: { min, max, size }, diagnostics };
}

/** Write the model and starter script; refuses symlinked or existing non-file destinations. */
async function writeImport(written: Written, bytes: Uint8Array): Promise<string | undefined> {
  for (const p of [written.model_path, written.script_path]) {
    const bad = await checkWritableDestination(p);
    if (bad !== undefined) return bad;
  }
  const err = (await safeWriteFile(written.model_path, bytes)) ?? (await safeWriteFile(written.script_path, written.code));
  if (err !== undefined) await Promise.all([written.model_path, written.script_path].map(p => rm(p, { force: true }).catch(() => undefined)));
  return err;
}

async function runImport(input: ImportStepInput): Promise<ImportStepOutput> {
  const invalid = validateInput(input);
  if (invalid !== undefined) return fail(invalid);
  const source = await readSource(input);
  if (typeof source === 'string') return fail(source);
  if (source.bytes.byteLength === 0) return fail('the file is empty.');
  const format = input.format ?? detectFormat(source.bytes, source.fileName);
  if (format === undefined) return fail('could not tell whether the file is STEP or STL; pass format.');
  const target = await prepareDir(input.output_dir);
  if (typeof target === 'string') return fail(target);

  const name = input.name ?? 'imported';
  const fileBase = `${name}.${format}`;
  const written: Written = {
    format,
    model_path: join(target.dir, fileBase),
    script_path: join(target.dir, `${name}.kcad.ts`),
    code: starterScript(fileBase, format, input.allow_open === true),
    byte_count: source.bytes.byteLength,
  };
  const writeErr = await writeImport(written, source.bytes);
  if (writeErr !== undefined) return fail(writeErr);
  return evaluateImport(written);
}

export async function importStepTool(input: ImportStepInput): Promise<ImportStepOutput> {
  try {
    return await runImport(input);
  } catch (e) {
    return fail(`import failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
