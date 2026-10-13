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

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

/** Hard cap on imported file size. */
export const IMPORT_MAX_BYTES = 50 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
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

const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.168.0.0', 16], ['224.0.0.0', 3],
] as const) BLOCKED.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]] as const) {
  BLOCKED.addSubnet(net, prefix, 'ipv6');
}

/** True for loopback, private, link-local, CGNAT, multicast and unspecified addresses (and non-IPs). */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 0) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped !== null) return isPrivateAddress(mapped[1]);
  return BLOCKED.check(ip, v === 4 ? 'ipv4' : 'ipv6');
}

/** https only, no credentials, and the host must not resolve to a private address. */
export async function checkFetchUrl(raw: string): Promise<string | undefined> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'url is not a valid URL.';
  }
  if (u.protocol !== 'https:') return 'url must use https.';
  if (u.username !== '' || u.password !== '') return 'url must not carry credentials.';
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return 'url host is not public.';
  let addrs: string[];
  try {
    addrs = isIP(host) ? [host] : (await lookup(host, { all: true })).map(a => a.address);
  } catch {
    return `cannot resolve host '${host}'.`;
  }
  if (addrs.length === 0 || addrs.some(isPrivateAddress)) return 'url host is not public.';
  return undefined;
}

async function fetchBytes(url: string): Promise<Uint8Array | string> {
  const bad = await checkFetchUrl(url);
  if (bad !== undefined) return bad;
  let res: Response;
  try {
    // redirect: 'manual' so a public URL cannot bounce the fetch to a private host.
    res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    return `download failed: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    if (loc === null) return `download failed: HTTP ${res.status} without a location.`;
    const next = new URL(loc, url).toString();
    const badNext = await checkFetchUrl(next);
    if (badNext !== undefined) return `redirect refused: ${badNext}`;
    try {
      res = await fetch(next, { redirect: 'error', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    } catch (e) {
      return `download failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  if (!res.ok) return `download failed: HTTP ${res.status}.`;
  const declared = Number(res.headers.get('content-length') ?? '0');
  if (declared > IMPORT_MAX_BYTES) return `file is larger than ${MB} MB.`;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > IMPORT_MAX_BYTES) return `file is larger than ${MB} MB.`;
  return buf;
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
  if (text.length > (IMPORT_MAX_BYTES * 4) / 3 + 4) return `file is larger than ${MB} MB.`;
  return new Uint8Array(Buffer.from(text, 'base64'));
}

/** The file bytes and the best-known file name, or an error message. */
async function readSource(input: ImportStepInput): Promise<{ bytes: Uint8Array; fileName?: string } | string> {
  if (input.content_base64 !== undefined) {
    const bytes = decodeBase64(input.content_base64);
    return typeof bytes === 'string' ? bytes : { bytes, fileName: input.file_name };
  }
  const url = input.url ?? input.upload?.download_url;
  if (typeof url !== 'string' || url.length === 0) return 'upload.download_url is required.';
  const fileName = input.file_name ?? input.upload?.file_name ?? new URL(url, 'https://x/').pathname.split('/').pop();
  const bytes = await fetchBytes(url);
  return typeof bytes === 'string' ? bytes : { bytes, fileName };
}

async function prepareDir(outputDir: string | undefined): Promise<{ dir: string } | string> {
  if (outputDir === undefined) return { dir: await mkdtemp(join(tmpdir(), 'kernelcad-import-')) };
  const check = validateOutputPath(outputDir);
  if (!check.ok || check.resolved === undefined) return check.error ?? `Refusing to write to ${outputDir}.`;
  const dir = resolve(check.resolved);
  await mkdir(dir, { recursive: true });
  return { dir };
}

type Written = Required<Pick<ImportStepOutput, 'format' | 'model_path' | 'script_path' | 'code' | 'byte_count'>>;

/** Evaluate the starter script and report the body's bounding box. */
async function evaluateImport(written: Written): Promise<ImportStepOutput> {
  const built = await evaluateAndBuildScript({ file: written.script_path });
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

export async function importStepTool(input: ImportStepInput): Promise<ImportStepOutput> {
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
  await writeFile(written.model_path, source.bytes);
  await writeFile(written.script_path, written.code);
  return evaluateImport(written);
}
